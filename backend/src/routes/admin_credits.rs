use super::{auth::authenticate_admin, AppState};
use crate::{
    credit_settings::{
        get_credit_settings, update_credit_settings, CreditSettingsResponse,
        UpdateCreditSettingsRequest,
    },
    credits::{
        adjust_account_credits, get_account_credit_detail, list_model_credit_prices,
        search_account_credit_summaries, upsert_model_credit_prices, AdjustCreditsRequest,
        CreditAccountDetailResponse, CreditAccountsResponse, CreditPricesResponse,
        UpdateCreditPricesRequest,
    },
    error::AppResult,
};
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use uuid::Uuid;

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/api/admin/credit-settings",
            get(get_settings).put(update_settings),
        )
        .route(
            "/api/admin/credit-prices",
            get(list_prices).put(update_prices),
        )
        .route("/api/admin/credit-accounts", get(list_accounts))
        .route("/api/admin/credit-accounts/:principal_id", get(get_account))
        .route(
            "/api/admin/credit-accounts/:principal_id/adjustments",
            post(adjust_account),
        )
}

#[derive(Deserialize)]
struct AccountQuery {
    query: Option<String>,
}

async fn get_settings(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> AppResult<Json<CreditSettingsResponse>> {
    authenticate_admin(&state, &headers).await?;
    Ok(Json(get_credit_settings(&state.pool).await?))
}

async fn update_settings(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<UpdateCreditSettingsRequest>,
) -> AppResult<Json<CreditSettingsResponse>> {
    authenticate_admin(&state, &headers).await?;
    Ok(Json(update_credit_settings(&state.pool, input).await?))
}

async fn list_prices(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> AppResult<Json<CreditPricesResponse>> {
    authenticate_admin(&state, &headers).await?;
    Ok(Json(list_model_credit_prices(&state.pool).await?))
}

async fn update_prices(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<UpdateCreditPricesRequest>,
) -> AppResult<Json<CreditPricesResponse>> {
    authenticate_admin(&state, &headers).await?;
    Ok(Json(upsert_model_credit_prices(&state.pool, input).await?))
}

async fn list_accounts(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<AccountQuery>,
) -> AppResult<Json<CreditAccountsResponse>> {
    authenticate_admin(&state, &headers).await?;
    Ok(Json(
        search_account_credit_summaries(&state.pool, query.query.as_deref()).await?,
    ))
}

async fn get_account(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(principal_id): Path<Uuid>,
) -> AppResult<Json<CreditAccountDetailResponse>> {
    authenticate_admin(&state, &headers).await?;
    Ok(Json(
        get_account_credit_detail(&state.pool, principal_id).await?,
    ))
}

async fn adjust_account(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(principal_id): Path<Uuid>,
    Json(input): Json<AdjustCreditsRequest>,
) -> AppResult<Json<CreditAccountDetailResponse>> {
    authenticate_admin(&state, &headers).await?;
    Ok(Json(
        adjust_account_credits(&state.pool, principal_id, input).await?,
    ))
}
