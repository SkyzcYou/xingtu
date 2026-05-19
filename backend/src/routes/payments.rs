use super::AppState;
use crate::{
    error::{AppError, AppResult},
    models::{PaymentOrder, PaymentOrderResponse, PaymentStatus},
    qingke::QingkeCreatePaymentInput,
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
        .route("/api/pay/notify", get(handle_notify))
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
    let order = insert_order(
        &state.pool,
        &out_trade_no,
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
    let qingke_response = state
        .qingke
        .create_payment(QingkeCreatePaymentInput {
            method: "jump".to_string(),
            device: request.device.unwrap_or_else(|| "pc".to_string()),
            pay_channel,
            out_trade_no: out_trade_no.clone(),
            notify_url: format!("{}/api/pay/notify", state.config.public_base_url),
            return_url,
            name,
            money: order.amount.to_string(),
            clientip: client_ip(&headers),
            param: request.param,
        })
        .await;

    let qingke_response = match qingke_response {
        Ok(response) if response.code == 0 => response,
        Ok(response) => {
            mark_order_failed(&state.pool, &out_trade_no).await?;
            return Err(AppError::external(
                response
                    .msg
                    .unwrap_or_else(|| "qingke create payment failed".to_string()),
            ));
        }
        Err(error) => {
            mark_order_failed(&state.pool, &out_trade_no).await?;
            return Err(error);
        }
    };

    let order = update_order_qingke_trade_no(
        &state.pool,
        &out_trade_no,
        qingke_response.trade_no.as_deref(),
    )
    .await?;

    Ok(Json(CreateOrderResponse {
        order: order.into(),
        pay_type: qingke_response.pay_type,
        pay_info: qingke_response.pay_info,
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
    let qingke_response = state.qingke.query_payment(&order.out_trade_no).await?;
    if qingke_response.code != 0 {
        return Err(AppError::external(
            qingke_response
                .msg
                .unwrap_or_else(|| "qingke query payment failed".to_string()),
        ));
    }

    if let Some(money) = &qingke_response.money {
        let remote_amount = parse_amount(money)?;
        if remote_amount != order.amount {
            return Err(AppError::bad_request("qingke order amount mismatch"));
        }
    }

    let status = qingke_response
        .status
        .map(PaymentStatus::from_qingke_status)
        .unwrap_or(PaymentStatus::Pending);
    let updated = update_order_from_qingke_query(
        &state.pool,
        &out_trade_no,
        qingke_response.trade_no.as_deref(),
        qingke_response.api_trade_no.as_deref(),
        qingke_response.buyer.as_deref(),
        status,
    )
    .await?;

    Ok(Json(updated.into()))
}

async fn handle_notify(
    State(state): State<AppState>,
    Query(params): Query<BTreeMap<String, String>>,
) -> AppResult<&'static str> {
    let out_trade_no = params.get("out_trade_no").cloned();
    let trade_no = params.get("trade_no").cloned();

    if let Err(error) = state.qingke.verify_notify(&params) {
        insert_notify_event(
            &state.pool,
            out_trade_no.as_deref(),
            trade_no.as_deref(),
            &params,
            false,
            false,
            &error.to_string(),
        )
        .await?;
        return Err(error);
    }

    if params.get("pid").map(String::as_str) != Some(state.qingke.pid()) {
        insert_notify_event(
            &state.pool,
            out_trade_no.as_deref(),
            trade_no.as_deref(),
            &params,
            true,
            false,
            "pid mismatch",
        )
        .await?;
        return Err(AppError::bad_request("pid mismatch"));
    }

    if params.get("trade_status").map(String::as_str) != Some("TRADE_SUCCESS") {
        insert_notify_event(
            &state.pool,
            out_trade_no.as_deref(),
            trade_no.as_deref(),
            &params,
            true,
            false,
            "trade_status is not TRADE_SUCCESS",
        )
        .await?;
        return Err(AppError::bad_request("trade_status is not TRADE_SUCCESS"));
    }

    let out_trade_no = out_trade_no.ok_or_else(|| AppError::bad_request("missing out_trade_no"))?;
    let order = find_order(&state.pool, &out_trade_no).await?;
    let remote_amount = params
        .get("money")
        .ok_or_else(|| AppError::bad_request("missing money"))
        .and_then(|money| parse_amount(money))?;
    if remote_amount != order.amount {
        insert_notify_event(
            &state.pool,
            Some(&out_trade_no),
            trade_no.as_deref(),
            &params,
            true,
            false,
            "amount mismatch",
        )
        .await?;
        return Err(AppError::bad_request("amount mismatch"));
    }

    mark_order_paid(
        &state.pool,
        &out_trade_no,
        trade_no.as_deref(),
        params.get("api_trade_no").map(String::as_str),
        params.get("buyer").map(String::as_str),
        &params,
    )
    .await?;
    insert_notify_event(
        &state.pool,
        Some(&out_trade_no),
        trade_no.as_deref(),
        &params,
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

fn validate_pay_channel(pay_channel: Option<&str>) -> AppResult<String> {
    let pay_channel = pay_channel.unwrap_or("alipay");
    match pay_channel {
        "alipay" | "wxpay" => Ok(pay_channel.to_string()),
        _ => Err(AppError::bad_request("pay_channel must be alipay or wxpay")),
    }
}

fn parse_amount(amount: &str) -> AppResult<Decimal> {
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

fn append_out_trade_no(return_url: String, out_trade_no: &str) -> String {
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
    name: &str,
    amount: Decimal,
    pay_channel: &str,
    param: Option<&str>,
) -> AppResult<PaymentOrder> {
    sqlx::query_as::<_, PaymentOrder>(ORDER_RETURNING_SQL)
        .bind(Uuid::new_v4())
        .bind(out_trade_no)
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
        "SELECT id, out_trade_no, qingke_trade_no, api_trade_no, name, amount, pay_channel, status, param, buyer, notify_payload, created_at, updated_at, paid_at
         FROM payment_orders WHERE out_trade_no = $1",
    )
    .bind(out_trade_no)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::not_found("order not found"))
}

async fn update_order_qingke_trade_no(
    pool: &PgPool,
    out_trade_no: &str,
    qingke_trade_no: Option<&str>,
) -> AppResult<PaymentOrder> {
    sqlx::query_as::<_, PaymentOrder>(
        "UPDATE payment_orders
         SET qingke_trade_no = COALESCE($2, qingke_trade_no), updated_at = now()
         WHERE out_trade_no = $1
         RETURNING id, out_trade_no, qingke_trade_no, api_trade_no, name, amount, pay_channel, status, param, buyer, notify_payload, created_at, updated_at, paid_at",
    )
    .bind(out_trade_no)
    .bind(qingke_trade_no)
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

async fn update_order_from_qingke_query(
    pool: &PgPool,
    out_trade_no: &str,
    trade_no: Option<&str>,
    api_trade_no: Option<&str>,
    buyer: Option<&str>,
    status: PaymentStatus,
) -> AppResult<PaymentOrder> {
    sqlx::query_as::<_, PaymentOrder>(
        "UPDATE payment_orders
         SET qingke_trade_no = COALESCE($2, qingke_trade_no),
             api_trade_no = COALESCE($3, api_trade_no),
             buyer = COALESCE($4, buyer),
             status = $5,
             paid_at = CASE WHEN $5 = 'paid' AND paid_at IS NULL THEN now() ELSE paid_at END,
             updated_at = now()
         WHERE out_trade_no = $1
         RETURNING id, out_trade_no, qingke_trade_no, api_trade_no, name, amount, pay_channel, status, param, buyer, notify_payload, created_at, updated_at, paid_at",
    )
    .bind(out_trade_no)
    .bind(trade_no)
    .bind(api_trade_no)
    .bind(buyer)
    .bind(status.as_str())
    .fetch_one(pool)
    .await
    .map_err(Into::into)
}

async fn mark_order_paid(
    pool: &PgPool,
    out_trade_no: &str,
    trade_no: Option<&str>,
    api_trade_no: Option<&str>,
    buyer: Option<&str>,
    params: &BTreeMap<String, String>,
) -> AppResult<()> {
    sqlx::query(
        "UPDATE payment_orders
         SET qingke_trade_no = COALESCE($2, qingke_trade_no),
             api_trade_no = COALESCE($3, api_trade_no),
             buyer = COALESCE($4, buyer),
             notify_payload = $5,
             status = 'paid',
             paid_at = COALESCE(paid_at, now()),
             updated_at = now()
         WHERE out_trade_no = $1",
    )
    .bind(out_trade_no)
    .bind(trade_no)
    .bind(api_trade_no)
    .bind(buyer)
    .bind(json!(params))
    .execute(pool)
    .await?;
    Ok(())
}

async fn insert_notify_event(
    pool: &PgPool,
    out_trade_no: Option<&str>,
    trade_no: Option<&str>,
    params: &BTreeMap<String, String>,
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
    .bind(json!(params))
    .bind(signature_valid)
    .bind(processed)
    .bind(message)
    .execute(pool)
    .await?;
    Ok(())
}

const ORDER_RETURNING_SQL: &str =
    "INSERT INTO payment_orders (id, out_trade_no, name, amount, pay_channel, status, param)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6)
     RETURNING id, out_trade_no, qingke_trade_no, api_trade_no, name, amount, pay_channel, status, param, buyer, notify_payload, created_at, updated_at, paid_at";

#[cfg(test)]
mod tests {
    use super::{append_out_trade_no, parse_amount, validate_pay_channel};

    #[test]
    fn amount_allows_two_decimals() {
        assert!(parse_amount("1.00").is_ok());
        assert!(parse_amount("0.001").is_err());
        assert!(parse_amount("0").is_err());
    }

    #[test]
    fn only_known_channels_are_allowed() {
        assert!(validate_pay_channel(Some("alipay")).is_ok());
        assert!(validate_pay_channel(Some("wxpay")).is_ok());
        assert!(validate_pay_channel(Some("bank")).is_err());
    }

    #[test]
    fn appends_order_to_return_url() {
        assert_eq!(
            append_out_trade_no("http://localhost:5174".to_string(), "XT1"),
            "http://localhost:5174?out_trade_no=XT1"
        );
        assert_eq!(
            append_out_trade_no("http://localhost:5174?return=1".to_string(), "XT1"),
            "http://localhost:5174?return=1&out_trade_no=XT1"
        );
    }
}
