use super::{
    llm_proxy::{app_error_response, openai_error_response},
    AppState,
};
use crate::{
    accounts::{ensure_account_principal, AccountPrincipal},
    credits::{charge_model_request, refund_model_request, CreditChargeError, CreditRequestType},
};
use axum::{
    body::Bytes,
    http::{header, HeaderMap, StatusCode},
    response::Response,
};
use serde_json::Value;
use uuid::Uuid;

pub(super) async fn authenticate_account(
    state: &AppState,
    headers: &HeaderMap,
) -> Result<AccountPrincipal, Response> {
    let principal = state
        .trust
        .authenticate(headers)
        .await
        .map_err(app_error_response)?;
    ensure_account_principal(&state.pool, &principal)
        .await
        .map_err(app_error_response)
}

pub(super) async fn charge_request(
    state: &AppState,
    account: &AccountPrincipal,
    model: &str,
    request_type: CreditRequestType,
    request_id: &str,
) -> Result<(), Response> {
    match charge_model_request(&state.pool, account.id, model, request_type, request_id).await {
        Ok(charge) => {
            tracing::info!(
                principal_id = %account.id,
                %model,
                request_type = request_type.as_str(),
                request_id,
                cost = charge.cost,
                balance_after = charge.balance_after,
                "charged llm request credits"
            );
            Ok(())
        }
        Err(error) => Err(credit_error_response(error)),
    }
}

pub(super) async fn refund_after_send_failure(state: &AppState, request_id: &str) {
    if let Err(error) = refund_model_request(&state.pool, request_id).await {
        tracing::warn!(?error, request_id, "failed to refund llm request credits");
    }
}

pub(super) async fn refund_if_unsuccessful(
    state: &AppState,
    status: reqwest::StatusCode,
    request_id: &str,
) {
    if status.is_success() {
        return;
    }
    refund_after_send_failure(state, request_id).await;
}

pub(super) fn parse_model_request(
    headers: &HeaderMap,
    body: &Bytes,
    allowed_models: &[String],
    invalid_request_message: &str,
) -> Result<String, Response> {
    let model = if is_multipart(headers) {
        parse_multipart_model(body)
    } else {
        parse_json_model(body, invalid_request_message)?
    };
    let Some(model) = model.filter(|value| !value.is_empty()) else {
        return Err(openai_error_response(
            StatusCode::BAD_REQUEST,
            "缺少 model 字段",
            "invalid_request_error",
            Some("missing_model"),
        ));
    };
    if allowed_models.is_empty() || allowed_models.iter().any(|allowed| allowed == &model) {
        Ok(model)
    } else {
        Err(openai_error_response(
            StatusCode::BAD_REQUEST,
            "当前模型不在服务端允许列表中",
            "invalid_request_error",
            Some("model_not_allowed"),
        ))
    }
}

pub(super) fn request_id(headers: &HeaderMap) -> String {
    headers
        .get("x-request-id")
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty() && value.len() <= 200)
        .map(str::to_string)
        .unwrap_or_else(|| Uuid::new_v4().to_string())
}

fn parse_json_model(body: &[u8], invalid_json_message: &str) -> Result<Option<String>, Response> {
    let payload = serde_json::from_slice::<Value>(body).map_err(|_| {
        openai_error_response(
            StatusCode::BAD_REQUEST,
            invalid_json_message,
            "invalid_request_error",
            Some("invalid_json"),
        )
    })?;
    Ok(payload
        .get("model")
        .and_then(Value::as_str)
        .map(str::trim)
        .map(str::to_string))
}

fn is_multipart(headers: &HeaderMap) -> bool {
    headers
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| {
            value
                .to_ascii_lowercase()
                .starts_with("multipart/form-data")
        })
}

fn parse_multipart_model(body: &[u8]) -> Option<String> {
    let body = String::from_utf8_lossy(body);
    body.split("\r\n--").find_map(|part| {
        if !part.contains("name=\"model\"") {
            return None;
        }
        part.split_once("\r\n\r\n")
            .and_then(|(_, value)| value.lines().next())
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string)
    })
}

fn credit_error_response(error: CreditChargeError) -> Response {
    match error {
        CreditChargeError::PriceUnavailable => openai_error_response(
            StatusCode::PAYMENT_REQUIRED,
            "当前模型未配置积分价格或已停用",
            "insufficient_quota",
            Some("credit_price_unavailable"),
        ),
        CreditChargeError::InsufficientCredits => openai_error_response(
            StatusCode::PAYMENT_REQUIRED,
            "积分余额不足",
            "insufficient_quota",
            Some("insufficient_credits"),
        ),
        CreditChargeError::App(error) => app_error_response(error),
    }
}
