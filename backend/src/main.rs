mod config;
mod db;
mod error;
mod models;
mod qingke;
mod routes;

use axum::http::{HeaderValue, Method};
use config::AppConfig;
use qingke::QingkeClient;
use routes::AppState;
use std::{net::SocketAddr, time::Duration};
use tokio::net::TcpListener;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = AppConfig::from_env()?;
    let pool = db::create_pool(&config.database_url).await?;
    let qingke = QingkeClient::new(&config)?;
    let addr: SocketAddr = format!("{}:{}", config.server_host, config.server_port).parse()?;

    let cors = build_cors_layer(&config.cors_allowed_origin)?;
    let app = routes::router(AppState {
        pool,
        config,
        qingke,
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
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any)
        .max_age(Duration::from_secs(3600));

    if origin == "*" {
        Ok(layer.allow_origin(Any))
    } else {
        Ok(layer.allow_origin(origin.parse::<HeaderValue>()?))
    }
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
