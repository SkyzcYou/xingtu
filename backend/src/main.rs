mod accounts;
mod config;
mod credit_recharge;
mod credit_settings;
mod credits;
mod db;
mod error;
mod image_job_worker;
mod image_jobs;
mod llm_config;
mod message_events;
mod messages;
mod models;
mod noipay;
mod openapi;
mod payment_provider;
mod playground_history;
mod qingke;
mod routes;
mod trust;

use axum::http::{HeaderValue, Method};
use config::AppConfig;
use image_job_worker::spawn_image_job_worker;
use llm_config::LlmProxyConfigCache;
use message_events::{spawn_message_event_listener, MessageEventHub};
use noipay::NoipayClient;
use payment_provider::{PaymentProvider, PaymentProviderKind, PaymentProviders};
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
    let payment_providers = build_payment_providers(&config)?;
    let trust = TrustClient::new(&config);
    let http_client = reqwest::Client::new();
    let llm_config_cache = Arc::new(LlmProxyConfigCache::new(Duration::from_secs(
        config.llm_config_cache_ttl_seconds,
    )));
    let message_events = MessageEventHub::new();
    spawn_message_event_listener(config.database.url.clone(), message_events.clone());
    let addr: SocketAddr = format!("{}:{}", config.server_host, config.server_port).parse()?;

    let cors = build_cors_layer(&config.cors_allowed_origin)?;
    let state = AppState {
        pool,
        config,
        payment_providers,
        trust,
        http_client,
        llm_config_cache,
        message_events,
    };
    spawn_image_job_worker(state.clone());
    let app = routes::router(state)
        .layer(TraceLayer::new_for_http())
        .layer(cors);

    let listener = TcpListener::bind(addr).await?;
    tracing::info!(%addr, "payment backend listening");
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

fn build_payment_providers(
    config: &AppConfig,
) -> Result<PaymentProviders, Box<dyn std::error::Error>> {
    let default = PaymentProviderKind::from_str(&config.payment_provider)?;
    let qingke = if config.qingke_pid.is_some()
        && config.qingke_merchant_private_key_pem.is_some()
        && config.qingke_platform_public_key_pem.is_some()
    {
        Some(Arc::new(QingkeClient::new(config)?) as Arc<dyn PaymentProvider>)
    } else {
        None
    };
    let noipay = if config.noipay_app_id.is_some()
        && config.noipay_app_secret.is_some()
        && config.noipay_webhook_secret.is_some()
    {
        Some(Arc::new(NoipayClient::new(config)?) as Arc<dyn PaymentProvider>)
    } else {
        None
    };
    Ok(PaymentProviders::new(default, qingke, noipay))
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
