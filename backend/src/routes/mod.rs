use crate::{config::AppConfig, qingke::QingkeClient, trust::TrustClient};
use axum::Router;
use sqlx::PgPool;

mod account;
mod payments;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub config: AppConfig,
    pub qingke: QingkeClient,
    pub trust: TrustClient,
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .merge(payments::router())
        .merge(account::router())
        .with_state(state)
}
