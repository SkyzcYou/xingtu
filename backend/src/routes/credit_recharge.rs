use super::AppState;
use crate::{
    accounts::ensure_account_principal,
    credit_recharge::{
        find_recharge_package, get_credit_balance, get_credit_usage, list_recharge_orders,
        list_recharge_packages, CreditBalanceResponse, CreditUsageResponse, RechargeOrdersResponse,
        RechargePackagesResponse,
    },
    error::{AppError, AppResult},
    models::{PaymentOrder, PaymentOrderResponse},
    payment_provider::CreatePaymentInput,
};
use axum::{extract::State, http::HeaderMap, routing::get, Json, Router};
use chrono::Utc;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/credit-recharge-packages", get(get_packages))
        .route("/api/credit-balance", get(get_balance))
        .route("/api/credit-usage", get(get_usage))
        .route(
            "/api/credit-recharge-orders",
            get(get_recharge_orders).post(create_recharge_order),
        )
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateRechargeOrderRequest {
    package_id: String,
    pay_channel: Option<String>,
    device: Option<String>,
    return_url: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CreateRechargeOrderResponse {
    order: PaymentOrderResponse,
    pay_type: Option<String>,
    pay_info: Option<String>,
}

async fn get_packages() -> Json<RechargePackagesResponse> {
    Json(list_recharge_packages())
}

async fn get_balance(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> AppResult<Json<CreditBalanceResponse>> {
    let principal = state.trust.authenticate(&headers).await?;
    let account = ensure_account_principal(&state.pool, &principal).await?;
    Ok(Json(get_credit_balance(&state.pool, account.id).await?))
}

async fn get_usage(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> AppResult<Json<CreditUsageResponse>> {
    let principal = state.trust.authenticate(&headers).await?;
    let account = ensure_account_principal(&state.pool, &principal).await?;
    Ok(Json(get_credit_usage(&state.pool, account.id).await?))
}

async fn get_recharge_orders(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> AppResult<Json<RechargeOrdersResponse>> {
    let principal = state.trust.authenticate(&headers).await?;
    let account = ensure_account_principal(&state.pool, &principal).await?;
    Ok(Json(list_recharge_orders(&state.pool, account.id).await?))
}

async fn create_recharge_order(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<CreateRechargeOrderRequest>,
) -> AppResult<Json<CreateRechargeOrderResponse>> {
    let principal = state.trust.authenticate(&headers).await?;
    let account = ensure_account_principal(&state.pool, &principal).await?;
    let package = find_recharge_package(&request.package_id)?;
    let pay_channel = validate_pay_channel(request.pay_channel.as_deref())?;
    let amount = Decimal::from_str_exact(package.amount)
        .map_err(|_| AppError::config("充值套餐金额配置无效"))?;
    let out_trade_no = create_out_trade_no();
    let provider = state.payment_providers.default_provider()?;
    let order = insert_recharge_order(
        &state.pool,
        &out_trade_no,
        provider.kind().as_str(),
        package.name,
        amount,
        &pay_channel,
        account.id,
        package.id,
        package.credits,
    )
    .await?;
    let return_url = append_out_trade_no(
        request
            .return_url
            .unwrap_or_else(|| format!("{}/api/pay/return", state.config.public_base_url)),
        &out_trade_no,
    );
    let payment_response = provider
        .create_payment(CreatePaymentInput {
            device: request.device,
            pay_channel,
            out_trade_no: out_trade_no.clone(),
            notify_url: format!("{}/api/pay/notify", state.config.public_base_url),
            return_url,
            name: package.name.to_string(),
            amount: order.amount,
            client_ip: client_ip(&headers),
            param: Some(format!("credit_recharge:{}", package.id)),
        })
        .await;
    let payment_response = match payment_response {
        Ok(response) => response,
        Err(error) => {
            mark_order_failed(&state.pool, &out_trade_no).await?;
            return Err(error);
        }
    };
    let order = update_order_provider_trade_no(
        &state.pool,
        &out_trade_no,
        payment_response.provider_trade_no.as_deref(),
        payment_response.api_trade_no.as_deref(),
    )
    .await?;
    Ok(Json(CreateRechargeOrderResponse {
        order: order.into(),
        pay_type: payment_response.pay_type,
        pay_info: payment_response.pay_info,
    }))
}

fn validate_pay_channel(pay_channel: Option<&str>) -> AppResult<String> {
    let pay_channel = pay_channel.unwrap_or("alipay");
    match pay_channel {
        "alipay" | "wxpay" => Ok(pay_channel.to_string()),
        _ => Err(AppError::bad_request("payChannel must be alipay or wxpay")),
    }
}

fn create_out_trade_no() -> String {
    let suffix = Uuid::new_v4().simple().to_string();
    format!("XT{}{}", Utc::now().format("%Y%m%d%H%M%S"), &suffix[..8])
}

fn client_ip(headers: &HeaderMap) -> String {
    headers
        .get("x-forwarded-for")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(',').next())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .or_else(|| {
            headers
                .get("x-real-ip")
                .and_then(|value| value.to_str().ok())
        })
        .unwrap_or("127.0.0.1")
        .to_string()
}

fn append_out_trade_no(return_url: String, out_trade_no: &str) -> String {
    let separator = if return_url.contains('?') { '&' } else { '?' };
    format!("{return_url}{separator}out_trade_no={out_trade_no}")
}

async fn insert_recharge_order(
    pool: &PgPool,
    out_trade_no: &str,
    payment_provider: &str,
    name: &str,
    amount: Decimal,
    pay_channel: &str,
    principal_id: Uuid,
    package_id: &str,
    credit_amount: i64,
) -> AppResult<PaymentOrder> {
    sqlx::query_as::<_, PaymentOrder>(
        "INSERT INTO payment_orders (id, out_trade_no, payment_provider, name, amount, pay_channel, status, param, principal_id, credit_package_id, credit_amount)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10)
         RETURNING id, out_trade_no, qingke_trade_no, api_trade_no, payment_provider, provider_trade_no, name, amount, pay_channel, status, param, buyer, notify_payload,
                   principal_id, credit_package_id, credit_amount, credit_ledger_id, credited_at,
                   created_at, updated_at, paid_at",
    )
    .bind(Uuid::new_v4())
    .bind(out_trade_no)
    .bind(payment_provider)
    .bind(name)
    .bind(amount)
    .bind(pay_channel)
    .bind(format!("credit_recharge:{package_id}"))
    .bind(principal_id)
    .bind(package_id)
    .bind(credit_amount)
    .fetch_one(pool)
    .await
    .map_err(Into::into)
}

async fn update_order_provider_trade_no(
    pool: &PgPool,
    out_trade_no: &str,
    provider_trade_no: Option<&str>,
    api_trade_no: Option<&str>,
) -> AppResult<PaymentOrder> {
    sqlx::query_as::<_, PaymentOrder>(
        "UPDATE payment_orders
         SET provider_trade_no = COALESCE($2, provider_trade_no),
             qingke_trade_no = COALESCE($2, qingke_trade_no),
             api_trade_no = COALESCE($3, api_trade_no),
             updated_at = now()
         WHERE out_trade_no = $1
         RETURNING id, out_trade_no, qingke_trade_no, api_trade_no, payment_provider, provider_trade_no, name, amount, pay_channel, status, param, buyer, notify_payload,
                   principal_id, credit_package_id, credit_amount, credit_ledger_id, credited_at,
                   created_at, updated_at, paid_at",
    )
    .bind(out_trade_no)
    .bind(provider_trade_no)
    .bind(api_trade_no)
    .fetch_one(pool)
    .await
    .map_err(Into::into)
}

async fn mark_order_failed(pool: &PgPool, out_trade_no: &str) -> AppResult<()> {
    sqlx::query(
        "UPDATE payment_orders SET status = 'failed', updated_at = now() WHERE out_trade_no = $1",
    )
    .bind(out_trade_no)
    .execute(pool)
    .await?;
    Ok(())
}
