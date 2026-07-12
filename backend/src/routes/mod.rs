use crate::{
    config::AppConfig, llm_config::LlmProxyConfigCache, message_events::MessageEventHub,
    payment_provider::PaymentProviders, trust::TrustClient,
};
use axum::Router;
use reqwest::Client;
use sqlx::PgPool;
use std::sync::Arc;

mod admin_credits;
mod admin_llm_config;
mod admin_messages;
mod agent;
mod auth;
mod credit_recharge;
mod llm_proxy;
mod llm_proxy_credits;
mod messages;
#[cfg(test)]
mod payment_tests;
mod payments;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub config: AppConfig,
    pub payment_providers: PaymentProviders,
    pub trust: TrustClient,
    pub http_client: Client,
    pub llm_config_cache: Arc<LlmProxyConfigCache>,
    pub message_events: MessageEventHub,
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .merge(payments::router())
        .merge(admin_llm_config::router())
        .merge(admin_credits::router())
        .merge(admin_messages::router())
        .merge(credit_recharge::router())
        .merge(messages::router())
        .merge(llm_proxy::router())
        .merge(agent::router())
        .with_state(state)
}
