use crate::{
    config::AppConfig, llm_config::LlmProxyConfigCache, qingke::QingkeClient, trust::TrustClient,
};
use axum::Router;
use reqwest::Client;
use sqlx::PgPool;
use std::sync::Arc;

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
    pub llm_config_cache: Arc<LlmProxyConfigCache>,
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .merge(payments::router())
        .merge(admin_llm_config::router())
        .merge(llm_proxy::router())
        .merge(agent::router())
        .with_state(state)
}
