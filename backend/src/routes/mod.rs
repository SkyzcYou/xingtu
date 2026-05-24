use crate::{config::AppConfig, qingke::QingkeClient, trust::TrustClient};
use axum::Router;
use reqwest::Client;
use sqlx::PgPool;

mod account;
mod admin_llm_config;
mod agent;
mod llm_proxy;
mod payments;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub config: AppConfig,
    pub qingke: QingkeClient,
    pub trust: TrustClient,
    pub http_client: Client,
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .merge(payments::router())
        .merge(account::router())
        .merge(admin_llm_config::router())
        .merge(llm_proxy::router())
        .merge(agent::router())
        .with_state(state)
}
