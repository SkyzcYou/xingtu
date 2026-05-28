use super::{auth::authenticate_admin, AppState};
use crate::{
    error::AppResult,
    messages::{
        archive_admin_message, create_admin_message, list_admin_messages, publish_admin_message,
        update_admin_message, AdminMessageResponse, AdminMessagesResponse, MessageListQuery,
        UpsertMessageRequest,
    },
};
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::{get, post, put},
    Json, Router,
};
use uuid::Uuid;

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/api/admin/messages",
            get(list_messages).post(create_message),
        )
        .route("/api/admin/messages/:id", put(update_message))
        .route("/api/admin/messages/:id/publish", post(publish_message))
        .route("/api/admin/messages/:id/archive", post(archive_message))
}

async fn list_messages(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<MessageListQuery>,
) -> AppResult<Json<AdminMessagesResponse>> {
    authenticate_admin(&state, &headers).await?;
    Ok(Json(list_admin_messages(&state.pool, query).await?))
}

async fn create_message(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<UpsertMessageRequest>,
) -> AppResult<Json<AdminMessageResponse>> {
    let principal = authenticate_admin(&state, &headers).await?;
    Ok(Json(
        create_admin_message(&state.pool, &principal.subject, input).await?,
    ))
}

async fn update_message(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Json(input): Json<UpsertMessageRequest>,
) -> AppResult<Json<AdminMessageResponse>> {
    authenticate_admin(&state, &headers).await?;
    Ok(Json(update_admin_message(&state.pool, id, input).await?))
}

async fn publish_message(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> AppResult<Json<AdminMessageResponse>> {
    authenticate_admin(&state, &headers).await?;
    Ok(Json(publish_admin_message(&state.pool, id).await?))
}

async fn archive_message(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> AppResult<Json<AdminMessageResponse>> {
    authenticate_admin(&state, &headers).await?;
    Ok(Json(archive_admin_message(&state.pool, id).await?))
}
