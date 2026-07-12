use super::AppState;
use crate::{
    credit_recharge::credit_paid_recharge_order,
    error::{AppError, AppResult},
    models::{PaymentOrder, PaymentOrderResponse, PaymentStatus},
    payment_provider::{CreatePaymentInput, PaymentProviderKind, PaymentWebhookInput},
};
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    response::Html,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::PgPool;
use std::{collections::BTreeMap, str::FromStr};
use uuid::Uuid;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/health", get(health))
        .route("/api/orders", post(create_order))
        .route("/api/orders/:out_trade_no", get(get_order))
        .route("/api/orders/:out_trade_no/query", post(query_order))
        .route(
            "/api/pay/notify",
            get(handle_qingke_notify).post(handle_noipay_notify),
        )
        .route("/api/pay/return", get(pay_return))
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse { status: "ok" })
}

#[derive(Deserialize)]
struct CreateOrderRequest {
    name: String,
    amount: String,
    pay_channel: Option<String>,
    device: Option<String>,
    return_url: Option<String>,
    param: Option<String>,
}

#[derive(Serialize)]
struct CreateOrderResponse {
    order: PaymentOrderResponse,
    pay_type: Option<String>,
    pay_info: Option<String>,
}

async fn create_order(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<CreateOrderRequest>,
) -> AppResult<Json<CreateOrderResponse>> {
    let name = validate_name(&request.name)?;
    let amount = parse_amount(&request.amount)?;
    let pay_channel = validate_pay_channel(request.pay_channel.as_deref())?;
    let out_trade_no = create_out_trade_no();
    let provider = state.payment_providers.default_provider()?;
    let order = insert_order(
        &state.pool,
        &out_trade_no,
        provider.kind().as_str(),
        &name,
        amount,
        &pay_channel,
        request.param.as_deref(),
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
            name,
            amount: order.amount,
            client_ip: client_ip(&headers),
            param: request.param,
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

    Ok(Json(CreateOrderResponse {
        order: order.into(),
        pay_type: payment_response.pay_type,
        pay_info: payment_response.pay_info,
    }))
}

async fn get_order(
    State(state): State<AppState>,
    Path(out_trade_no): Path<String>,
) -> AppResult<Json<PaymentOrderResponse>> {
    let order = find_order(&state.pool, &out_trade_no).await?;
    Ok(Json(order.into()))
}

async fn query_order(
    State(state): State<AppState>,
    Path(out_trade_no): Path<String>,
) -> AppResult<Json<PaymentOrderResponse>> {
    let order = find_order(&state.pool, &out_trade_no).await?;
    let provider = state.payment_providers.provider_for_order(&order)?;
    let payment_response = provider.query_payment(&order).await?;

    if let Some(remote_amount) = payment_response.amount {
        if remote_amount != order.amount {
            return Err(AppError::bad_request("payment order amount mismatch"));
        }
    }

    let status = payment_response.status;
    let updated = update_order_from_provider_query(
        &state.pool,
        &out_trade_no,
        payment_response.provider_trade_no.as_deref(),
        payment_response.api_trade_no.as_deref(),
        payment_response.buyer.as_deref(),
        status,
    )
    .await?;
    if status == PaymentStatus::Paid {
        credit_paid_recharge_order(&state.pool, &out_trade_no).await?;
    }

    Ok(Json(
        find_order(&state.pool, &updated.out_trade_no).await?.into(),
    ))
}

async fn handle_qingke_notify(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<BTreeMap<String, String>>,
) -> AppResult<&'static str> {
    handle_provider_notify(
        &state,
        PaymentProviderKind::Qingke,
        PaymentWebhookInput {
            headers,
            query_params: params,
            raw_body: Vec::new(),
        },
    )
    .await
}

async fn handle_noipay_notify(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: axum::body::Bytes,
) -> AppResult<&'static str> {
    let result = handle_provider_notify(
        &state,
        PaymentProviderKind::Noipay,
        PaymentWebhookInput {
            headers,
            query_params: BTreeMap::new(),
            raw_body: body.to_vec(),
        },
    )
    .await;

    if let Err(error) = result {
        tracing::warn!(?error, "noipay webhook acknowledged after processing error");
    }

    Ok("success")
}

async fn handle_provider_notify(
    state: &AppState,
    kind: PaymentProviderKind,
    input: PaymentWebhookInput,
) -> AppResult<&'static str> {
    let provider = state.payment_providers.provider(kind)?;
    let event = match provider.parse_webhook(input).await {
        Ok(event) => event,
        Err(error) => {
            insert_notify_event(
                &state.pool,
                None,
                None,
                &json!({ "provider": kind.as_str() }),
                false,
                false,
                &error.to_string(),
            )
            .await?;
            return Err(error);
        }
    };

    let order = match event.out_trade_no.as_deref() {
        Some(out_trade_no) => find_order(&state.pool, out_trade_no).await?,
        None => {
            find_order_by_provider_trade_no(
                &state.pool,
                kind.as_str(),
                event
                    .provider_trade_no
                    .as_deref()
                    .ok_or_else(|| AppError::bad_request("missing provider trade number"))?,
            )
            .await?
        }
    };

    if order.amount != event.amount {
        insert_notify_event(
            &state.pool,
            Some(&order.out_trade_no),
            event.provider_trade_no.as_deref(),
            &event.payload,
            true,
            false,
            "amount mismatch",
        )
        .await?;
        return Err(AppError::bad_request("amount mismatch"));
    }

    update_order_from_provider_query(
        &state.pool,
        &order.out_trade_no,
        event.provider_trade_no.as_deref(),
        event.api_trade_no.as_deref(),
        event.buyer.as_deref(),
        event.status,
    )
    .await?;
    if event.status == PaymentStatus::Paid {
        credit_paid_recharge_order(&state.pool, &order.out_trade_no).await?;
    }
    insert_notify_event(
        &state.pool,
        Some(&order.out_trade_no),
        event.provider_trade_no.as_deref(),
        &event.payload,
        true,
        true,
        "processed",
    )
    .await?;

    Ok("success")
}

async fn pay_return(Query(params): Query<BTreeMap<String, String>>) -> Html<String> {
    let out_trade_no = params
        .get("out_trade_no")
        .cloned()
        .unwrap_or_else(|| "未知订单".to_string());
    Html(format!(
        "<!doctype html><html lang=\"zh-CN\"><meta charset=\"utf-8\"><title>支付返回</title><body><h1>已返回商户页</h1><p>订单号：{}</p><p>页面返回不代表支付成功，最终状态以异步通知或订单查询为准。</p></body></html>",
        html_escape(&out_trade_no)
    ))
}

fn validate_name(name: &str) -> AppResult<String> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::bad_request("name is required"));
    }
    if name.len() > 120 {
        return Err(AppError::bad_request("name is too long"));
    }
    Ok(name.to_string())
}

pub(super) fn validate_pay_channel(pay_channel: Option<&str>) -> AppResult<String> {
    let pay_channel = pay_channel.unwrap_or("alipay");
    match pay_channel {
        "alipay" | "wxpay" => Ok(pay_channel.to_string()),
        _ => Err(AppError::bad_request("pay_channel must be alipay or wxpay")),
    }
}

pub(super) fn parse_amount(amount: &str) -> AppResult<Decimal> {
    let amount = Decimal::from_str(amount.trim())
        .map_err(|_| AppError::bad_request("amount must be a decimal number"))?;
    if amount <= Decimal::ZERO {
        return Err(AppError::bad_request("amount must be greater than zero"));
    }
    if amount.scale() > 2 {
        return Err(AppError::bad_request("amount supports at most 2 decimals"));
    }
    Ok(amount)
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

pub(super) fn append_out_trade_no(return_url: String, out_trade_no: &str) -> String {
    let separator = if return_url.contains('?') { '&' } else { '?' };
    format!("{return_url}{separator}out_trade_no={out_trade_no}")
}

fn html_escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

async fn insert_order(
    pool: &PgPool,
    out_trade_no: &str,
    payment_provider: &str,
    name: &str,
    amount: Decimal,
    pay_channel: &str,
    param: Option<&str>,
) -> AppResult<PaymentOrder> {
    sqlx::query_as::<_, PaymentOrder>(ORDER_RETURNING_SQL)
        .bind(Uuid::new_v4())
        .bind(out_trade_no)
        .bind(payment_provider)
        .bind(name)
        .bind(amount)
        .bind(pay_channel)
        .bind(param)
        .fetch_one(pool)
        .await
        .map_err(Into::into)
}

async fn find_order(pool: &PgPool, out_trade_no: &str) -> AppResult<PaymentOrder> {
    sqlx::query_as::<_, PaymentOrder>(
        "SELECT id, out_trade_no, qingke_trade_no, api_trade_no, payment_provider, provider_trade_no, name, amount, pay_channel, status, param, buyer, notify_payload, principal_id, credit_package_id, credit_amount, credit_ledger_id, credited_at, created_at, updated_at, paid_at
         FROM payment_orders WHERE out_trade_no = $1",
    )
    .bind(out_trade_no)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::not_found("order not found"))
}

async fn find_order_by_provider_trade_no(
    pool: &PgPool,
    payment_provider: &str,
    provider_trade_no: &str,
) -> AppResult<PaymentOrder> {
    sqlx::query_as::<_, PaymentOrder>(
        "SELECT id, out_trade_no, qingke_trade_no, api_trade_no, payment_provider, provider_trade_no, name, amount, pay_channel, status, param, buyer, notify_payload, principal_id, credit_package_id, credit_amount, credit_ledger_id, credited_at, created_at, updated_at, paid_at
         FROM payment_orders
         WHERE payment_provider = $1 AND provider_trade_no = $2",
    )
    .bind(payment_provider)
    .bind(provider_trade_no)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::not_found("order not found"))
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
         RETURNING id, out_trade_no, qingke_trade_no, api_trade_no, payment_provider, provider_trade_no, name, amount, pay_channel, status, param, buyer, notify_payload, principal_id, credit_package_id, credit_amount, credit_ledger_id, credited_at, created_at, updated_at, paid_at",
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

async fn update_order_from_provider_query(
    pool: &PgPool,
    out_trade_no: &str,
    provider_trade_no: Option<&str>,
    api_trade_no: Option<&str>,
    buyer: Option<&str>,
    status: PaymentStatus,
) -> AppResult<PaymentOrder> {
    sqlx::query_as::<_, PaymentOrder>(
        "UPDATE payment_orders
         SET provider_trade_no = COALESCE($2, provider_trade_no),
             qingke_trade_no = COALESCE($2, qingke_trade_no),
             api_trade_no = COALESCE($3, api_trade_no),
             buyer = COALESCE($4, buyer),
             status = $5,
             paid_at = CASE WHEN $5 = 'paid' AND paid_at IS NULL THEN now() ELSE paid_at END,
             updated_at = now()
         WHERE out_trade_no = $1
         RETURNING id, out_trade_no, qingke_trade_no, api_trade_no, payment_provider, provider_trade_no, name, amount, pay_channel, status, param, buyer, notify_payload, principal_id, credit_package_id, credit_amount, credit_ledger_id, credited_at, created_at, updated_at, paid_at",
    )
    .bind(out_trade_no)
    .bind(provider_trade_no)
    .bind(api_trade_no)
    .bind(buyer)
    .bind(status.as_str())
    .fetch_one(pool)
    .await
    .map_err(Into::into)
}

async fn insert_notify_event(
    pool: &PgPool,
    out_trade_no: Option<&str>,
    trade_no: Option<&str>,
    payload: &serde_json::Value,
    signature_valid: bool,
    processed: bool,
    message: &str,
) -> AppResult<()> {
    sqlx::query(
        "INSERT INTO payment_notify_events (id, out_trade_no, trade_no, payload, signature_valid, processed, message)
         VALUES ($1, $2, $3, $4, $5, $6, $7)",
    )
    .bind(Uuid::new_v4())
    .bind(out_trade_no)
    .bind(trade_no)
    .bind(payload)
    .bind(signature_valid)
    .bind(processed)
    .bind(message)
    .execute(pool)
    .await?;
    Ok(())
}

const ORDER_RETURNING_SQL: &str =
    "INSERT INTO payment_orders (id, out_trade_no, payment_provider, name, amount, pay_channel, status, param)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
     RETURNING id, out_trade_no, qingke_trade_no, api_trade_no, payment_provider, provider_trade_no, name, amount, pay_channel, status, param, buyer, notify_payload, principal_id, credit_package_id, credit_amount, credit_ledger_id, credited_at, created_at, updated_at, paid_at";
