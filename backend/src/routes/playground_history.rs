use super::AppState;
use crate::{
    accounts::ensure_account_principal,
    error::AppResult,
    playground_history::{
        create_playground_history, list_playground_history, validate_create_input,
        validate_pagination, CreatePlaygroundHistoryRequest, PlaygroundHistoryPage,
        PlaygroundHistoryRecord,
    },
};
use axum::{
    extract::{Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use serde::Deserialize;

pub fn router() -> Router<AppState> {
    Router::new().route(
        "/api/playground/history",
        get(list_history).post(create_history),
    )
}

#[derive(Deserialize)]
struct HistoryQuery {
    offset: Option<i64>,
    limit: Option<i64>,
}

async fn create_history(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<CreatePlaygroundHistoryRequest>,
) -> AppResult<Json<PlaygroundHistoryRecord>> {
    let input = validate_create_input(input)?;
    let principal = state.trust.authenticate(&headers).await?;
    let account = ensure_account_principal(&state.pool, &principal).await?;
    Ok(Json(
        create_playground_history(&state.pool, account.id, input).await?,
    ))
}

async fn list_history(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<HistoryQuery>,
) -> AppResult<Json<PlaygroundHistoryPage>> {
    let pagination = validate_pagination(query.offset, query.limit)?;
    let principal = state.trust.authenticate(&headers).await?;
    let account = ensure_account_principal(&state.pool, &principal).await?;
    Ok(Json(
        list_playground_history(&state.pool, account.id, pagination).await?,
    ))
}
