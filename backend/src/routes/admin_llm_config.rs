use super::AppState;
use crate::{
    error::{AppError, AppResult},
    llm_config::{
        get_admin_llm_config, get_llm_config_models, test_llm_config, update_llm_config,
        UpdateLlmConfigRequest,
    },
};
use axum::{extract::State, http::HeaderMap, routing::get, Json, Router};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/admin/llm-config", get(get_config).put(update_config))
        .route(
            "/api/admin/llm-config/test",
            axum::routing::post(test_config),
        )
        .route(
            "/api/admin/llm-config/models",
            axum::routing::post(get_models),
        )
}

async fn get_config(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> AppResult<Json<crate::llm_config::AdminLlmConfigResponse>> {
    authenticate_admin(&state, &headers).await?;
    Ok(Json(get_admin_llm_config(&state.pool).await?))
}

async fn update_config(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<UpdateLlmConfigRequest>,
) -> AppResult<Json<crate::llm_config::AdminLlmConfigResponse>> {
    authenticate_admin(&state, &headers).await?;
    let response = update_llm_config(&state.pool, input).await?;
    state.llm_config_cache.invalidate();
    Ok(Json(response))
}

async fn test_config(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<UpdateLlmConfigRequest>,
) -> AppResult<Json<crate::llm_config::TestLlmConfigResponse>> {
    authenticate_admin(&state, &headers).await?;
    Ok(Json(
        test_llm_config(&state.pool, &state.http_client, input).await?,
    ))
}

async fn get_models(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<UpdateLlmConfigRequest>,
) -> AppResult<Json<crate::llm_config::LlmModelsResponse>> {
    authenticate_admin(&state, &headers).await?;
    Ok(Json(
        get_llm_config_models(&state.pool, &state.http_client, input).await?,
    ))
}

async fn authenticate_admin(state: &AppState, headers: &HeaderMap) -> AppResult<()> {
    let principal = state.trust.authenticate(headers).await?;
    let required_role = state.config.admin_required_role.trim();
    if required_role.is_empty()
        || principal.has_role(required_role, &state.config.admin_role_client_id)
    {
        return Ok(());
    }
    Err(AppError::forbidden("当前账号没有管理员权限"))
}
