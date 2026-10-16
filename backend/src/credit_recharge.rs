use crate::{
    error::{AppError, AppResult},
    models::PaymentOrder,
};
use rust_decimal::Decimal;
use serde::Serialize;
use serde_json::json;
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct RechargePackage {
    pub id: &'static str,
    pub name: &'static str,
    pub amount: &'static str,
    pub credits: i64,
}

#[derive(Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct RechargePackagesResponse {
    pub packages: Vec<RechargePackage>,
}

#[derive(Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreditBalanceResponse {
    pub principal_id: Uuid,
    pub balance: i64,
}

#[derive(Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct RechargeOrdersResponse {
    pub orders: Vec<crate::models::PaymentOrderResponse>,
}

#[derive(Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreditUsageResponse {
    pub principal_id: Uuid,
    pub balance: i64,
    pub ledger: Vec<CreditUsageLedgerEntryResponse>,
}

#[derive(Serialize, FromRow, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreditUsageLedgerEntryResponse {
    pub id: Uuid,
    pub delta: i64,
    pub balance_after: i64,
    pub reason: String,
    pub model_id: Option<String>,
    pub request_type: Option<String>,
    pub request_id: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(FromRow)]
struct RechargeOrderRow {
    id: Uuid,
    out_trade_no: String,
    amount: Decimal,
    pay_channel: String,
    principal_id: Option<Uuid>,
    credit_package_id: Option<String>,
    credit_amount: Option<i64>,
    credited_at: Option<chrono::DateTime<chrono::Utc>>,
}

const RECHARGE_PACKAGES: [RechargePackage; 3] = [
    RechargePackage {
        id: "starter",
        name: "入门包",
        amount: "9.90",
        credits: 1000,
    },
    RechargePackage {
        id: "standard",
        name: "标准包",
        amount: "29.90",
        credits: 3500,
    },
    RechargePackage {
        id: "pro",
        name: "专业包",
        amount: "99.00",
        credits: 13000,
    },
];

pub fn list_recharge_packages() -> RechargePackagesResponse {
    RechargePackagesResponse {
        packages: RECHARGE_PACKAGES.to_vec(),
    }
}

pub fn find_recharge_package(package_id: &str) -> AppResult<RechargePackage> {
    RECHARGE_PACKAGES
        .iter()
        .copied()
        .find(|package| package.id == package_id)
        .ok_or_else(|| AppError::bad_request("充值套餐不存在"))
}

pub async fn get_credit_balance(
    pool: &PgPool,
    principal_id: Uuid,
) -> AppResult<CreditBalanceResponse> {
    let balance = sqlx::query_scalar::<_, i64>(
        "SELECT COALESCE(balance, 0) FROM account_credit_balances WHERE principal_id = $1",
    )
    .bind(principal_id)
    .fetch_optional(pool)
    .await?
    .unwrap_or(0);
    Ok(CreditBalanceResponse {
        principal_id,
        balance,
    })
}

pub async fn get_credit_usage(pool: &PgPool, principal_id: Uuid) -> AppResult<CreditUsageResponse> {
    let balance = get_credit_balance(pool, principal_id).await?.balance;
    let ledger = sqlx::query_as::<_, CreditUsageLedgerEntryResponse>(
        "SELECT id, delta, balance_after, reason, model_id, request_type, request_id, created_at
         FROM account_credit_ledger
         WHERE principal_id = $1
         ORDER BY created_at DESC
         LIMIT 20",
    )
    .bind(principal_id)
    .fetch_all(pool)
    .await?;
    Ok(CreditUsageResponse {
        principal_id,
        balance,
        ledger,
    })
}

pub async fn list_recharge_orders(
    pool: &PgPool,
    principal_id: Uuid,
) -> AppResult<RechargeOrdersResponse> {
    let orders = sqlx::query_as::<_, PaymentOrder>(
        "SELECT id, out_trade_no, qingke_trade_no, api_trade_no, payment_provider, provider_trade_no, name, amount, pay_channel, status, param, buyer, notify_payload,
                principal_id, credit_package_id, credit_amount, credit_ledger_id, credited_at,
                created_at, updated_at, paid_at
         FROM payment_orders
         WHERE principal_id = $1 AND credit_package_id IS NOT NULL
         ORDER BY created_at DESC
         LIMIT 50",
    )
    .bind(principal_id)
    .fetch_all(pool)
    .await?;
    Ok(RechargeOrdersResponse {
        orders: orders.into_iter().map(Into::into).collect(),
    })
}

pub async fn credit_paid_recharge_order(pool: &PgPool, out_trade_no: &str) -> AppResult<bool> {
    let mut tx = pool.begin().await?;
    let order = sqlx::query_as::<_, RechargeOrderRow>(
        "SELECT id, out_trade_no, amount, pay_channel, principal_id, credit_package_id, credit_amount, credited_at
         FROM payment_orders
         WHERE out_trade_no = $1 AND status = 'paid'
         FOR UPDATE",
    )
    .bind(out_trade_no)
    .fetch_optional(&mut *tx)
    .await?;
    let Some(order) = order else {
        tx.commit().await?;
        return Ok(false);
    };
    let (Some(principal_id), Some(credit_amount), Some(package_id)) = (
        order.principal_id,
        order.credit_amount,
        order.credit_package_id.as_deref(),
    ) else {
        tx.commit().await?;
        return Ok(false);
    };
    if order.credited_at.is_some() {
        tx.commit().await?;
        return Ok(false);
    }

    sqlx::query(
        "INSERT INTO account_credit_balances (principal_id, balance)
         VALUES ($1, 0)
         ON CONFLICT (principal_id) DO NOTHING",
    )
    .bind(principal_id)
    .execute(&mut *tx)
    .await?;
    let balance_after = sqlx::query_scalar::<_, i64>(
        "UPDATE account_credit_balances
         SET balance = balance + $2, updated_at = now()
         WHERE principal_id = $1
         RETURNING balance",
    )
    .bind(principal_id)
    .bind(credit_amount)
    .fetch_one(&mut *tx)
    .await?;
    let ledger_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO account_credit_ledger (id, principal_id, delta, balance_after, reason, request_id, metadata)
         VALUES ($1, $2, $3, $4, 'payment_recharge', $5, $6)",
    )
    .bind(ledger_id)
    .bind(principal_id)
    .bind(credit_amount)
    .bind(balance_after)
    .bind(&order.out_trade_no)
    .bind(json!({
        "outTradeNo": order.out_trade_no,
        "packageId": package_id,
        "amount": order.amount.to_string(),
        "payChannel": order.pay_channel,
    }))
    .execute(&mut *tx)
    .await?;
    sqlx::query(
        "UPDATE payment_orders
         SET credit_ledger_id = $2, credited_at = now(), updated_at = now()
         WHERE id = $1",
    )
    .bind(order.id)
    .bind(ledger_id)
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(true)
}
