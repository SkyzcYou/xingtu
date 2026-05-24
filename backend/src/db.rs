use crate::{config::DatabasePoolConfig, error::AppResult};
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::time::Duration;

pub async fn create_pool(config: &DatabasePoolConfig) -> AppResult<PgPool> {
    let pool = PgPoolOptions::new()
        .max_connections(config.max_connections)
        .min_connections(config.min_connections)
        .acquire_timeout(Duration::from_secs(config.acquire_timeout_seconds))
        .connect(&config.url)
        .await?;
    tracing::info!(
        max_connections = config.max_connections,
        min_connections = config.min_connections,
        acquire_timeout_seconds = config.acquire_timeout_seconds,
        "database pool configured"
    );
    Ok(pool)
}
