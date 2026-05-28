mod accounts;
mod config;
mod credit_recharge;
mod credits;
mod db;
mod error;
mod llm_config;
mod message_events;
mod messages;
mod models;
mod qingke;
mod routes;
mod trust;

use axum::http::{HeaderValue, Method};
use config::AppConfig;
use llm_config::LlmProxyConfigCache;
use message_events::{spawn_message_event_listener, MessageEventHub};
use qingke::QingkeClient;
use routes::AppState;
use std::{net::SocketAddr, sync::Arc, time::Duration};
use tokio::net::TcpListener;
use tower_http::{
    cors::{AllowOrigin, Any, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
use trust::TrustClient;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = AppConfig::from_env()?;
    let pool = db::create_pool(&config.database).await?;
    let qingke = QingkeClient::new(&config)?;
    let trust = TrustClient::new(&config);
    let http_client = reqwest::Client::new();
    let llm_config_cache = Arc::new(LlmProxyConfigCache::new(Duration::from_secs(
        config.llm_config_cache_ttl_seconds,
    )));
    let message_events = MessageEventHub::new();
    spawn_message_event_listener(config.database.url.clone(), message_events.clone());
    let addr: SocketAddr = format!("{}:{}", config.server_host, config.server_port).parse()?;

    let cors = build_cors_layer(&config.cors_allowed_origin)?;
    let app = routes::router(AppState {
        pool,
        config,
        qingke,
        trust,
        http_client,
        llm_config_cache,
        message_events,
    })
    .layer(TraceLayer::new_for_http())
    .layer(cors);

    let listener = TcpListener::bind(addr).await?;
    tracing::info!(%addr, "payment backend listening");
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

fn build_cors_layer(origin: &str) -> Result<CorsLayer, Box<dyn std::error::Error>> {
    let layer = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::OPTIONS])
        .allow_headers(Any)
        .max_age(Duration::from_secs(3600));

    if origin.trim() == "*" {
        return Ok(layer.allow_origin(Any));
    }

    let origins = origin
        .split(',')
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::parse::<HeaderValue>)
        .collect::<Result<Vec<_>, _>>()?;

    Ok(layer.allow_origin(AllowOrigin::list(origins)))
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}
