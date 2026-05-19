use crate::{config::AppConfig, qingke::QingkeClient};
use axum::Router;
use sqlx::PgPool;

mod payments;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub config: AppConfig,
    pub qingke: QingkeClient,
}

pub fn router(state: AppState) -> Router {
    Router::new().merge(payments::router()).with_state(state)
}
