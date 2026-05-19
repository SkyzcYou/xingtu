use crate::error::{AppError, AppResult};
use std::env;

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub server_host: String,
    pub server_port: u16,
    pub database_url: String,
    pub qingke_api_base: String,
    pub qingke_pid: String,
    pub qingke_merchant_private_key_pem: String,
    pub qingke_platform_public_key_pem: String,
    pub public_base_url: String,
    pub cors_allowed_origin: String,
}

impl AppConfig {
    pub fn from_env() -> AppResult<Self> {
        let server_port = env_or("SERVER_PORT", "8080")
            .parse::<u16>()
            .map_err(|_| AppError::config("SERVER_PORT must be a valid port"))?;

        Ok(Self {
            server_host: env_or("SERVER_HOST", "0.0.0.0"),
            server_port,
            database_url: require_env("DATABASE_URL")?,
            qingke_api_base: env_or("QINGKE_API_BASE", "https://pay.xianlai.work"),
            qingke_pid: require_env("QINGKE_PID")?,
            qingke_merchant_private_key_pem: normalize_pem(&require_env(
                "QINGKE_MERCHANT_PRIVATE_KEY_PEM",
            )?),
            qingke_platform_public_key_pem: normalize_pem(&require_env(
                "QINGKE_PLATFORM_PUBLIC_KEY_PEM",
            )?),
            public_base_url: require_env("PUBLIC_BASE_URL")?
                .trim_end_matches('/')
                .to_string(),
            cors_allowed_origin: env_or("CORS_ALLOWED_ORIGIN", "http://localhost:5174"),
        })
    }
}

fn require_env(name: &str) -> AppResult<String> {
    env::var(name).map_err(|_| AppError::config(format!("missing required env {name}")))
}

fn env_or(name: &str, default: &str) -> String {
    env::var(name).unwrap_or_else(|_| default.to_string())
}

fn normalize_pem(value: &str) -> String {
    value.replace("\\n", "\n")
}
