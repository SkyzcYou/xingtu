use super::AppState;
use crate::{
    accounts::ensure_account_principal,
    error::AppResult,
    message_events::MessageEvent,
    messages::{
        get_account_unread_count, is_message_visible_to_account, list_account_messages,
        list_public_messages, mark_account_message_read, mark_all_account_messages_read,
        MessagesResponse, UnreadCountResponse,
    },
};
use async_stream::stream;
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    response::sse::{Event, KeepAlive, Sse},
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use sqlx::PgPool;
use std::{convert::Infallible, time::Duration};
use tokio::sync::broadcast;
use uuid::Uuid;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/public/messages", get(get_public_messages))
        .route("/api/public/messages/events", get(public_events))
        .route("/api/messages", get(get_messages))
        .route("/api/messages/events", get(account_events))
        .route("/api/messages/unread-count", get(get_unread_count))
        .route("/api/messages/read-all", post(read_all_messages))
        .route("/api/messages/:id/read", post(read_message))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListQuery {
    limit: Option<i64>,
}

async fn get_public_messages(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> AppResult<Json<MessagesResponse>> {
    Ok(Json(
        list_public_messages(&state.pool, query.limit.unwrap_or(50)).await?,
    ))
}

async fn get_messages(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<ListQuery>,
) -> AppResult<Json<MessagesResponse>> {
    let principal = state.trust.authenticate(&headers).await?;
    let account = ensure_account_principal(&state.pool, &principal).await?;
    Ok(Json(
        list_account_messages(&state.pool, account.id, query.limit.unwrap_or(50)).await?,
    ))
}

async fn get_unread_count(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> AppResult<Json<UnreadCountResponse>> {
    let principal = state.trust.authenticate(&headers).await?;
    let account = ensure_account_principal(&state.pool, &principal).await?;
    Ok(Json(
        get_account_unread_count(&state.pool, account.id).await?,
    ))
}

async fn read_message(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> AppResult<Json<UnreadCountResponse>> {
    let principal = state.trust.authenticate(&headers).await?;
    let account = ensure_account_principal(&state.pool, &principal).await?;
    Ok(Json(
        mark_account_message_read(&state.pool, account.id, id).await?,
    ))
}

async fn read_all_messages(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> AppResult<Json<UnreadCountResponse>> {
    let principal = state.trust.authenticate(&headers).await?;
    let account = ensure_account_principal(&state.pool, &principal).await?;
    Ok(Json(
        mark_all_account_messages_read(&state.pool, account.id).await?,
    ))
}

async fn public_events(
    State(state): State<AppState>,
) -> Sse<impl futures_core::Stream<Item = Result<Event, Infallible>>> {
    let mut receiver = state.message_events.subscribe();
    let stream = stream! {
        loop {
            match receiver.recv().await {
                Ok(event) if event.audience == "public" => {
                    if let Some(event) = to_sse_event(&event) {
                        yield Ok(event);
                    }
                }
                Ok(_) => {}
                Err(broadcast::error::RecvError::Lagged(skipped)) => {
                    tracing::debug!(skipped, "public message SSE receiver lagged");
                }
                Err(broadcast::error::RecvError::Closed) => break,
            }
        }
    };

    Sse::new(stream).keep_alive(KeepAlive::new().interval(Duration::from_secs(15)))
}

async fn account_events(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> AppResult<Sse<impl futures_core::Stream<Item = Result<Event, Infallible>>>> {
    let principal = state.trust.authenticate(&headers).await?;
    let account = ensure_account_principal(&state.pool, &principal).await?;
    let pool = state.pool.clone();
    let mut receiver = state.message_events.subscribe();
    let stream = stream! {
        loop {
            match receiver.recv().await {
                Ok(event) => {
                    match should_send_account_event(&pool, account.id, &event).await {
                        Ok(true) => {
                            if let Some(event) = to_sse_event(&event) {
                                yield Ok(event);
                            }
                        }
                        Ok(false) => {}
                        Err(error) => tracing::debug!(?error, "message event visibility check failed"),
                    }
                }
                Err(broadcast::error::RecvError::Lagged(skipped)) => {
                    tracing::debug!(skipped, "account message SSE receiver lagged");
                }
                Err(broadcast::error::RecvError::Closed) => break,
            }
        }
    };

    Ok(Sse::new(stream).keep_alive(KeepAlive::new().interval(Duration::from_secs(15))))
}

async fn should_send_account_event(
    pool: &PgPool,
    principal_id: Uuid,
    event: &MessageEvent,
) -> AppResult<bool> {
    match event.audience.as_str() {
        "public" | "authenticated" => Ok(true),
        "accounts" => is_message_visible_to_account(pool, event.message_id, principal_id).await,
        _ => Ok(false),
    }
}

fn to_sse_event(event: &MessageEvent) -> Option<Event> {
    serde_json::to_string(event)
        .map(|data| {
            Event::default()
                .event(event.event_type.clone())
                .id(format!("{}:{}", event.message_id, event.version))
                .data(data)
        })
        .map_err(|error| tracing::debug!(?error, "message event serialization failed"))
        .ok()
}
