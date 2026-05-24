use super::AppState;
use crate::{
    error::AppError,
    llm_config::{fetch_upstream_model_ids, LlmProxyConfig},
};
use axum::{
    body::{Body, Bytes},
    extract::{Path, State},
    http::{header, HeaderMap, HeaderName, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde::Serialize;
use serde_json::{json, Value};
use std::time::Duration;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/v1/chat/completions", post(proxy_chat_completions))
        .route("/v1/images/generations", post(proxy_image_generations))
        .route("/v1/images/edits", post(proxy_image_edits))
        .route("/v1/models", get(list_models))
        .route("/v1/models/:model", get(retrieve_model))
}

#[derive(Serialize)]
struct ModelListResponse {
    object: &'static str,
    data: Vec<ModelResponse>,
}

#[derive(Serialize)]
struct ModelResponse {
    id: String,
    object: &'static str,
    created: i64,
    owned_by: &'static str,
}

async fn proxy_chat_completions(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    if let Err(error) = state.trust.authenticate(&headers).await {
        return app_error_response(error);
    }

    let config = match state.llm_config_cache.get_or_load(&state.pool).await {
        Ok(config) => config,
        Err(error) => return app_error_response(error),
    };

    if let Err(response) = validate_chat_request(&body, &config.allowed_models) {
        return response;
    }

    let upstream_url = join_upstream_url(&config.base_url, "chat/completions");
    let upstream = state
        .http_client
        .post(upstream_url)
        .bearer_auth(&config.api_key)
        .timeout(Duration::from_secs(config.timeout_seconds))
        .header(reqwest::header::CONTENT_TYPE, "application/json")
        .header(
            reqwest::header::ACCEPT,
            "application/json, text/event-stream",
        )
        .body(body)
        .send()
        .await;

    match upstream {
        Ok(response) => upstream_response(response),
        Err(error) => {
            tracing::warn!(
                ?error,
                is_timeout = error.is_timeout(),
                timeout_seconds = config.timeout_seconds,
                "llm chat completions upstream request failed"
            );
            openai_error_response(
                StatusCode::BAD_GATEWAY,
                "上游 LLM 请求失败",
                "server_error",
                None,
            )
        }
    }
}

async fn proxy_image_generations(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    if let Err(error) = state.trust.authenticate(&headers).await {
        return app_error_response(error);
    }

    let config = match state.llm_config_cache.get_or_load(&state.pool).await {
        Ok(config) => config,
        Err(error) => return app_error_response(error),
    };

    if let Err(response) = validate_model_request(
        &body,
        &config.allowed_models,
        "请求体必须是有效的 OpenAI Images JSON",
    ) {
        return response;
    }

    proxy_upstream_body(&state, &config, &headers, "images/generations", body).await
}

async fn proxy_image_edits(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    if let Err(error) = state.trust.authenticate(&headers).await {
        return app_error_response(error);
    }

    let config = match state.llm_config_cache.get_or_load(&state.pool).await {
        Ok(config) => config,
        Err(error) => return app_error_response(error),
    };

    proxy_upstream_body(&state, &config, &headers, "images/edits", body).await
}

async fn proxy_upstream_body(
    state: &AppState,
    config: &LlmProxyConfig,
    headers: &HeaderMap,
    path: &str,
    body: Bytes,
) -> Response {
    let upstream_url = join_upstream_url(&config.base_url, path);
    tracing::info!(
        %upstream_url,
        timeout_seconds = config.timeout_seconds,
        allowed_models_count = config.allowed_models.len(),
        "proxying llm request"
    );
    let mut request = state
        .http_client
        .post(upstream_url)
        .bearer_auth(&config.api_key)
        .timeout(Duration::from_secs(config.timeout_seconds))
        .header(reqwest::header::ACCEPT, "application/json")
        .body(body);

    if let Some(content_type) = headers.get(header::CONTENT_TYPE) {
        request = request.header(reqwest::header::CONTENT_TYPE, content_type.clone());
    }

    match request.send().await {
        Ok(response) => upstream_response(response),
        Err(error) => {
            tracing::warn!(
                ?error,
                %path,
                is_timeout = error.is_timeout(),
                timeout_seconds = config.timeout_seconds,
                "llm upstream request failed"
            );
            openai_error_response(
                StatusCode::BAD_GATEWAY,
                "上游 LLM 请求失败",
                "server_error",
                None,
            )
        }
    }
}

async fn list_models(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if let Err(error) = state.trust.authenticate(&headers).await {
        return app_error_response(error);
    }

    let config = match state.llm_config_cache.get_or_load(&state.pool).await {
        Ok(config) => config,
        Err(error) => return app_error_response(error),
    };

    let models = match list_available_model_ids(&state, &config).await {
        Ok(models) => models,
        Err(error) => return app_error_response(error),
    };

    Json(ModelListResponse {
        object: "list",
        data: models.into_iter().map(openai_model).collect(),
    })
    .into_response()
}

async fn retrieve_model(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(model): Path<String>,
) -> Response {
    if let Err(error) = state.trust.authenticate(&headers).await {
        return app_error_response(error);
    }

    let config = match state.llm_config_cache.get_or_load(&state.pool).await {
        Ok(config) => config,
        Err(error) => return app_error_response(error),
    };

    let models = match list_available_model_ids(&state, &config).await {
        Ok(models) => models,
        Err(error) => return app_error_response(error),
    };

    if models.iter().any(|item| item == &model) {
        Json(openai_model(model)).into_response()
    } else {
        openai_error_response(
            StatusCode::NOT_FOUND,
            "模型不存在或未启用",
            "invalid_request_error",
            Some("model_not_found"),
        )
    }
}

async fn list_available_model_ids(
    state: &AppState,
    config: &LlmProxyConfig,
) -> Result<Vec<String>, AppError> {
    let mut models = fetch_upstream_model_ids(
        &state.http_client,
        &config.base_url,
        &config.api_key,
        config.timeout_seconds,
    )
    .await?;
    if !config.allowed_models.is_empty() {
        models.retain(|model| config.allowed_models.iter().any(|allowed| allowed == model));
    }
    if models.is_empty() {
        return Err(AppError::bad_request("上游模型列表为空"));
    }
    Ok(models)
}

fn validate_chat_request(body: &[u8], allowed_models: &[String]) -> Result<(), Response> {
    validate_model_request(
        body,
        allowed_models,
        "请求体必须是有效的 OpenAI Chat Completions JSON",
    )
}

fn validate_model_request(
    body: &[u8],
    allowed_models: &[String],
    invalid_json_message: &str,
) -> Result<(), Response> {
    if allowed_models.is_empty() {
        return Ok(());
    }

    let payload = serde_json::from_slice::<Value>(body).map_err(|_| {
        openai_error_response(
            StatusCode::BAD_REQUEST,
            invalid_json_message,
            "invalid_request_error",
            Some("invalid_json"),
        )
    })?;

    let model = payload
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or_default();
    if model.is_empty() {
        return Err(openai_error_response(
            StatusCode::BAD_REQUEST,
            "缺少 model 字段",
            "invalid_request_error",
            Some("missing_model"),
        ));
    }

    if allowed_models.iter().any(|allowed| allowed == model) {
        Ok(())
    } else {
        Err(openai_error_response(
            StatusCode::BAD_REQUEST,
            "当前模型不在服务端允许列表中",
            "invalid_request_error",
            Some("model_not_allowed"),
        ))
    }
}

fn openai_model(id: String) -> ModelResponse {
    ModelResponse {
        id,
        object: "model",
        created: 0,
        owned_by: "xingtu",
    }
}

fn upstream_response(response: reqwest::Response) -> Response {
    let status = response.status().as_u16();
    let headers = response.headers().clone();
    let mut builder = Response::builder().status(status);

    for (name, value) in headers.iter() {
        if should_forward_response_header(name) {
            builder = builder.header(name.as_str(), value.clone());
        }
    }

    builder
        .body(Body::from_stream(response.bytes_stream()))
        .unwrap_or_else(|error| {
            tracing::warn!(?error, "failed to build llm proxy response");
            openai_error_response(
                StatusCode::BAD_GATEWAY,
                "上游响应构建失败",
                "server_error",
                None,
            )
        })
}

fn should_forward_response_header(name: &HeaderName) -> bool {
    let name = name.as_str().to_ascii_lowercase();
    name == "content-type"
        || name == "openai-request-id"
        || name == "x-request-id"
        || name.starts_with("x-ratelimit-")
}

fn app_error_response(error: AppError) -> Response {
    let (status, message, code) = match error {
        AppError::Unauthorized(message) => (StatusCode::UNAUTHORIZED, message, "unauthorized"),
        AppError::Forbidden(message) => (StatusCode::FORBIDDEN, message, "forbidden"),
        AppError::BadRequest(message) => (
            StatusCode::SERVICE_UNAVAILABLE,
            message,
            "llm_config_unavailable",
        ),
        AppError::NotFound(message) => (StatusCode::NOT_FOUND, message, "not_found"),
        AppError::External(message) => (StatusCode::BAD_GATEWAY, message, "external_error"),
        AppError::Config(message) => (StatusCode::INTERNAL_SERVER_ERROR, message, "config_error"),
        AppError::Internal => (
            StatusCode::INTERNAL_SERVER_ERROR,
            "internal server error".to_string(),
            "internal_error",
        ),
    };
    openai_error_response(status, &message, "server_error", Some(code))
}

fn openai_error_response(
    status: StatusCode,
    message: &str,
    error_type: &str,
    code: Option<&str>,
) -> Response {
    (
        status,
        [(header::CONTENT_TYPE, "application/json")],
        Json(json!({
            "error": {
                "message": message,
                "type": error_type,
                "param": null,
                "code": code,
            }
        })),
    )
        .into_response()
}

fn join_upstream_url(base_url: &str, path: &str) -> String {
    format!(
        "{}/{}",
        base_url.trim_end_matches('/'),
        path.trim_start_matches('/')
    )
}
