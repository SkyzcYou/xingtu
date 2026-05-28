use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgListener, PgPool};
use std::time::Duration;
use tokio::sync::broadcast;
use uuid::Uuid;

pub const MESSAGE_EVENTS_CHANNEL: &str = "message_events";

#[derive(Clone)]
pub struct MessageEventHub {
    sender: broadcast::Sender<MessageEvent>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageEvent {
    pub event_type: String,
    pub message_id: Uuid,
    pub version: i64,
    pub audience: String,
}

impl MessageEventHub {
    pub fn new() -> Self {
        let (sender, _) = broadcast::channel(256);
        Self { sender }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<MessageEvent> {
        self.sender.subscribe()
    }

    fn emit(&self, event: MessageEvent) {
        if self.sender.send(event).is_err() {
            tracing::debug!("message event emitted without active subscribers");
        }
    }
}

pub async fn notify_message_event(pool: &PgPool, event: &MessageEvent) -> AppResult<()> {
    let payload = serde_json::to_string(event).map_err(|error| {
        tracing::warn!(?error, "message event serialization failed");
        AppError::Internal
    })?;
    sqlx::query("SELECT pg_notify($1, $2)")
        .bind(MESSAGE_EVENTS_CHANNEL)
        .bind(payload)
        .execute(pool)
        .await?;
    Ok(())
}

pub fn spawn_message_event_listener(database_url: String, hub: MessageEventHub) {
    tokio::spawn(async move {
        loop {
            if let Err(error) = run_listener(&database_url, &hub).await {
                tracing::warn!(?error, "message event listener stopped");
                tokio::time::sleep(Duration::from_secs(3)).await;
            }
        }
    });
}

async fn run_listener(database_url: &str, hub: &MessageEventHub) -> AppResult<()> {
    let mut listener = PgListener::connect(database_url).await?;
    listener.listen(MESSAGE_EVENTS_CHANNEL).await?;
    tracing::info!(
        channel = MESSAGE_EVENTS_CHANNEL,
        "message event listener started"
    );

    loop {
        let notification = listener.recv().await?;
        match serde_json::from_str::<MessageEvent>(notification.payload()) {
            Ok(event) => hub.emit(event),
            Err(error) => tracing::warn!(?error, "message event payload parse failed"),
        }
    }
}
