use crate::error::{AppError, AppResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

#[derive(Debug, Clone, Copy)]
pub enum CreditRequestType {
    Chat,
    ImageGeneration,
    ImageEdit,
    Agent,
}

impl CreditRequestType {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Chat => "chat",
            Self::ImageGeneration => "image_generation",
            Self::ImageEdit => "image_edit",
            Self::Agent => "agent",
        }
    }

    fn parse(value: &str) -> Option<Self> {
        match value {
            "chat" => Some(Self::Chat),
            "image_generation" => Some(Self::ImageGeneration),
            "image_edit" => Some(Self::ImageEdit),
            "agent" => Some(Self::Agent),
            _ => None,
        }
    }
}

#[derive(Debug)]
pub enum CreditChargeError {
    PriceUnavailable,
    InsufficientCredits,
    App(AppError),
}

impl From<AppError> for CreditChargeError {
    fn from(error: AppError) -> Self {
        Self::App(error)
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCreditPricesRequest {
    pub prices: Vec<UpdateCreditPriceInput>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCreditPriceInput {
    pub model_id: String,
    pub request_type: String,
    pub credits_per_request: i64,
    pub enabled: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdjustCreditsRequest {
    pub delta: i64,
    pub note: Option<String>,
}

#[derive(Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ModelCreditPriceResponse {
    pub model_id: String,
    pub request_type: String,
    pub credits_per_request: i64,
    pub enabled: bool,
    pub updated_at: DateTime<Utc>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreditPricesResponse {
    pub prices: Vec<ModelCreditPriceResponse>,
}

#[derive(Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct CreditAccountSummaryResponse {
    pub principal_id: Uuid,
    pub trust_subject: String,
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub balance: i64,
    pub last_login_at: Option<DateTime<Utc>>,
    pub last_activity_at: Option<DateTime<Utc>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreditAccountsResponse {
    pub accounts: Vec<CreditAccountSummaryResponse>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreditAccountDetailResponse {
    pub account: CreditAccountSummaryResponse,
    pub ledger: Vec<CreditLedgerEntryResponse>,
}

#[derive(Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct CreditLedgerEntryResponse {
    pub id: Uuid,
    pub delta: i64,
    pub balance_after: i64,
    pub reason: String,
    pub model_id: Option<String>,
    pub request_type: Option<String>,
    pub request_id: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

pub struct CreditCharge {
    pub cost: i64,
    pub balance_after: i64,
}

#[derive(FromRow)]
struct CreditPriceRow {
    credits_per_request: i64,
    enabled: bool,
}

pub async fn list_model_credit_prices(pool: &PgPool) -> AppResult<CreditPricesResponse> {
    let prices = sqlx::query_as::<_, ModelCreditPriceResponse>(
        "SELECT model_id, request_type, credits_per_request, enabled, updated_at
         FROM model_credit_prices
         ORDER BY request_type, model_id",
    )
    .fetch_all(pool)
    .await?;
    Ok(CreditPricesResponse { prices })
}

pub async fn upsert_model_credit_prices(
    pool: &PgPool,
    input: UpdateCreditPricesRequest,
) -> AppResult<CreditPricesResponse> {
    let mut tx = pool.begin().await?;
    for price in input.prices {
        let model_id = validate_model_id(&price.model_id)?;
        let request_type = CreditRequestType::parse(&price.request_type)
            .ok_or_else(|| AppError::bad_request("requestType 无效"))?;
        if price.credits_per_request < 0 {
            return Err(AppError::bad_request("积分价格不能为负数"));
        }
        sqlx::query(
            r#"
            INSERT INTO model_credit_prices (model_id, request_type, credits_per_request, enabled)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (model_id, request_type)
            DO UPDATE SET
                credits_per_request = EXCLUDED.credits_per_request,
                enabled = EXCLUDED.enabled,
                updated_at = now()
            "#,
        )
        .bind(model_id)
        .bind(request_type.as_str())
        .bind(price.credits_per_request)
        .bind(price.enabled)
        .execute(&mut *tx)
        .await?;
    }
    tx.commit().await?;
    list_model_credit_prices(pool).await
}

pub async fn search_account_credit_summaries(
    pool: &PgPool,
    query: Option<&str>,
) -> AppResult<CreditAccountsResponse> {
    let query = query.map(str::trim).filter(|value| !value.is_empty());
    let accounts = if let Some(query) = query {
        let pattern = format!("%{query}%");
        sqlx::query_as::<_, CreditAccountSummaryResponse>(ACCOUNT_SUMMARY_FILTERED_SQL)
            .bind(pattern)
            .fetch_all(pool)
            .await?
    } else {
        sqlx::query_as::<_, CreditAccountSummaryResponse>(ACCOUNT_SUMMARY_SQL)
            .fetch_all(pool)
            .await?
    };
    Ok(CreditAccountsResponse { accounts })
}

pub async fn get_account_credit_detail(
    pool: &PgPool,
    principal_id: Uuid,
) -> AppResult<CreditAccountDetailResponse> {
    let account = sqlx::query_as::<_, CreditAccountSummaryResponse>(ACCOUNT_DETAIL_SQL)
        .bind(principal_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::not_found("账号不存在"))?;
    let ledger = sqlx::query_as::<_, CreditLedgerEntryResponse>(
        "SELECT id, delta, balance_after, reason, model_id, request_type, request_id, metadata, created_at
         FROM account_credit_ledger
         WHERE principal_id = $1
         ORDER BY created_at DESC
         LIMIT 100",
    )
    .bind(principal_id)
    .fetch_all(pool)
    .await?;
    Ok(CreditAccountDetailResponse { account, ledger })
}

pub async fn adjust_account_credits(
    pool: &PgPool,
    principal_id: Uuid,
    input: AdjustCreditsRequest,
) -> AppResult<CreditAccountDetailResponse> {
    if input.delta == 0 {
        return Err(AppError::bad_request("调整积分不能为 0"));
    }
    let note = input
        .note
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    let mut tx = pool.begin().await?;
    ensure_balance_row(&mut tx, principal_id).await?;
    let balance_after = if input.delta > 0 {
        sqlx::query_scalar::<_, i64>(
            "UPDATE account_credit_balances
             SET balance = balance + $2, updated_at = now()
             WHERE principal_id = $1
             RETURNING balance",
        )
        .bind(principal_id)
        .bind(input.delta)
        .fetch_one(&mut *tx)
        .await?
    } else {
        sqlx::query_scalar::<_, i64>(
            "UPDATE account_credit_balances
             SET balance = balance + $2, updated_at = now()
             WHERE principal_id = $1 AND balance + $2 >= 0
             RETURNING balance",
        )
        .bind(principal_id)
        .bind(input.delta)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(|| AppError::bad_request("积分余额不足，无法扣减"))?
    };
    sqlx::query(
        "INSERT INTO account_credit_ledger (id, principal_id, delta, balance_after, reason, metadata)
         VALUES ($1, $2, $3, $4, 'admin_adjustment', $5)",
    )
    .bind(Uuid::new_v4())
    .bind(principal_id)
    .bind(input.delta)
    .bind(balance_after)
    .bind(json!({ "note": note }))
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    get_account_credit_detail(pool, principal_id).await
}

pub async fn charge_model_request(
    pool: &PgPool,
    principal_id: Uuid,
    model_id: &str,
    request_type: CreditRequestType,
    request_id: &str,
) -> Result<CreditCharge, CreditChargeError> {
    let mut tx = pool.begin().await.map_err(AppError::from)?;
    let price = sqlx::query_as::<_, CreditPriceRow>(
        "SELECT credits_per_request, enabled
         FROM model_credit_prices
         WHERE model_id = $1 AND request_type = $2",
    )
    .bind(model_id)
    .bind(request_type.as_str())
    .fetch_optional(&mut *tx)
    .await
    .map_err(AppError::from)?
    .ok_or(CreditChargeError::PriceUnavailable)?;
    if !price.enabled {
        return Err(CreditChargeError::PriceUnavailable);
    }
    ensure_balance_row(&mut tx, principal_id)
        .await
        .map_err(CreditChargeError::from)?;
    let balance_after = sqlx::query_scalar::<_, i64>(
        "UPDATE account_credit_balances
         SET balance = balance - $2, updated_at = now()
         WHERE principal_id = $1 AND balance >= $2
         RETURNING balance",
    )
    .bind(principal_id)
    .bind(price.credits_per_request)
    .fetch_optional(&mut *tx)
    .await
    .map_err(AppError::from)?
    .ok_or(CreditChargeError::InsufficientCredits)?;
    sqlx::query(
        "INSERT INTO account_credit_ledger (id, principal_id, delta, balance_after, reason, model_id, request_type, request_id)
         VALUES ($1, $2, $3, $4, 'model_request', $5, $6, $7)",
    )
    .bind(Uuid::new_v4())
    .bind(principal_id)
    .bind(-price.credits_per_request)
    .bind(balance_after)
    .bind(model_id)
    .bind(request_type.as_str())
    .bind(request_id)
    .execute(&mut *tx)
    .await
    .map_err(AppError::from)?;
    tx.commit().await.map_err(AppError::from)?;
    Ok(CreditCharge {
        cost: price.credits_per_request,
        balance_after,
    })
}

pub async fn refund_model_request(pool: &PgPool, request_id: &str) -> AppResult<bool> {
    let mut tx = pool.begin().await?;
    let charge = sqlx::query_as::<_, (Uuid, i64)>(
        "SELECT principal_id, delta
         FROM account_credit_ledger
         WHERE request_id = $1 AND reason = 'model_request'",
    )
    .bind(request_id)
    .fetch_optional(&mut *tx)
    .await?;
    let Some((principal_id, delta)) = charge else {
        tx.commit().await?;
        return Ok(false);
    };
    let already_refunded = sqlx::query_scalar::<_, Uuid>(
        "SELECT id FROM account_credit_ledger WHERE request_id = $1 AND reason = 'refund'",
    )
    .bind(request_id)
    .fetch_optional(&mut *tx)
    .await?;
    if already_refunded.is_some() {
        tx.commit().await?;
        return Ok(false);
    }
    let refund_delta = -delta;
    let balance_after = sqlx::query_scalar::<_, i64>(
        "UPDATE account_credit_balances
         SET balance = balance + $2, updated_at = now()
         WHERE principal_id = $1
         RETURNING balance",
    )
    .bind(principal_id)
    .bind(refund_delta)
    .fetch_one(&mut *tx)
    .await?;
    sqlx::query(
        "INSERT INTO account_credit_ledger (id, principal_id, delta, balance_after, reason, request_id)
         VALUES ($1, $2, $3, $4, 'refund', $5)",
    )
    .bind(Uuid::new_v4())
    .bind(principal_id)
    .bind(refund_delta)
    .bind(balance_after)
    .bind(request_id)
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(true)
}

async fn ensure_balance_row(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    principal_id: Uuid,
) -> AppResult<()> {
    sqlx::query(
        "INSERT INTO account_credit_balances (principal_id, balance)
         VALUES ($1, 0)
         ON CONFLICT (principal_id) DO NOTHING",
    )
    .bind(principal_id)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

fn validate_model_id(value: &str) -> AppResult<String> {
    let value = value.trim();
    if value.is_empty() {
        return Err(AppError::bad_request("modelId 不能为空"));
    }
    if value.len() > 200 {
        return Err(AppError::bad_request("modelId 过长"));
    }
    Ok(value.to_string())
}

const ACCOUNT_SUMMARY_SQL: &str =
    "SELECT p.id AS principal_id, p.trust_subject, p.display_name, p.email,
            COALESCE(b.balance, 0) AS balance, p.last_login_at,
            (SELECT MAX(l.created_at) FROM account_credit_ledger l WHERE l.principal_id = p.id) AS last_activity_at
     FROM account_principals p
     LEFT JOIN account_credit_balances b ON b.principal_id = p.id
     ORDER BY p.updated_at DESC
     LIMIT 50";

const ACCOUNT_SUMMARY_FILTERED_SQL: &str =
    "SELECT p.id AS principal_id, p.trust_subject, p.display_name, p.email,
            COALESCE(b.balance, 0) AS balance, p.last_login_at,
            (SELECT MAX(l.created_at) FROM account_credit_ledger l WHERE l.principal_id = p.id) AS last_activity_at
     FROM account_principals p
     LEFT JOIN account_credit_balances b ON b.principal_id = p.id
     WHERE p.trust_subject ILIKE $1 OR p.display_name ILIKE $1 OR p.email ILIKE $1
     ORDER BY p.updated_at DESC
     LIMIT 50";

const ACCOUNT_DETAIL_SQL: &str =
    "SELECT p.id AS principal_id, p.trust_subject, p.display_name, p.email,
            COALESCE(b.balance, 0) AS balance, p.last_login_at,
            (SELECT MAX(l.created_at) FROM account_credit_ledger l WHERE l.principal_id = p.id) AS last_activity_at
     FROM account_principals p
     LEFT JOIN account_credit_balances b ON b.principal_id = p.id
     WHERE p.id = $1";
