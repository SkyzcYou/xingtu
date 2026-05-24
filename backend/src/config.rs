use crate::error::{AppError, AppResult};
use std::env;

#[derive(Clone, Debug)]
pub struct DatabasePoolConfig {
    pub url: String,
    pub max_connections: u32,
    pub min_connections: u32,
    pub acquire_timeout_seconds: u64,
}

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub server_host: String,
    pub server_port: u16,
    pub database: DatabasePoolConfig,
    pub llm_config_cache_ttl_seconds: u64,
    pub qingke_api_base: String,
    pub qingke_pid: String,
    pub qingke_merchant_private_key_pem: String,
    pub qingke_platform_public_key_pem: String,
    pub public_base_url: String,
    pub cors_allowed_origin: String,
    pub trust_base_url: String,
    pub trust_realm: String,
    pub trust_client_ids: Vec<String>,
    pub admin_required_role: String,
    pub admin_role_client_id: String,
}

impl AppConfig {
    pub fn from_env() -> AppResult<Self> {
        let server_port = env_or("SERVER_PORT", "8080")
            .parse::<u16>()
            .map_err(|_| AppError::config("SERVER_PORT must be a valid port"))?;
        let database = DatabasePoolConfig {
            url: require_env("DATABASE_URL")?,
            max_connections: env_u32_or("DATABASE_MAX_CONNECTIONS", 20)?.max(1),
            min_connections: env_u32_or("DATABASE_MIN_CONNECTIONS", 0)?,
            acquire_timeout_seconds: env_u64_or("DATABASE_ACQUIRE_TIMEOUT_SECONDS", 5)?.max(1),
        };
        if database.min_connections > database.max_connections {
            return Err(AppError::config(
                "DATABASE_MIN_CONNECTIONS must be less than or equal to DATABASE_MAX_CONNECTIONS",
            ));
        }

        Ok(Self {
            server_host: env_or("SERVER_HOST", "0.0.0.0"),
            server_port,
            database,
            llm_config_cache_ttl_seconds: env_u64_or("LLM_CONFIG_CACHE_TTL_SECONDS", 30)?.max(1),
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
            trust_base_url: env_or("TRUST_BASE_URL", "https://trust-api.skyzcstack.space")
                .trim_end_matches('/')
                .to_string(),
            trust_realm: env_or("TRUST_REALM", "xing"),
            trust_client_ids: trust_client_ids()?,
            admin_required_role: env_or("ADMIN_REQUIRED_ROLE", "admin"),
            admin_role_client_id: env_or("ADMIN_ROLE_CLIENT_ID", "xingtu-console"),
        })
    }
}

fn require_env(name: &str) -> AppResult<String> {
    env::var(name).map_err(|_| AppError::config(format!("missing required env {name}")))
}

fn env_or(name: &str, default: &str) -> String {
    env::var(name).unwrap_or_else(|_| default.to_string())
}

fn env_u32_or(name: &str, default: u32) -> AppResult<u32> {
    env::var(name)
        .map(|value| {
            value
                .parse::<u32>()
                .map_err(|_| AppError::config(format!("{name} must be a valid unsigned integer")))
        })
        .unwrap_or(Ok(default))
}

fn env_u64_or(name: &str, default: u64) -> AppResult<u64> {
    env::var(name)
        .map(|value| {
            value
                .parse::<u64>()
                .map_err(|_| AppError::config(format!("{name} must be a valid unsigned integer")))
        })
        .unwrap_or(Ok(default))
}

fn trust_client_ids() -> AppResult<Vec<String>> {
    let value = require_env("TRUST_CLIENT_IDS")?;
    let mut client_ids = Vec::new();
    for client_id in value
        .split(',')
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        if !client_ids.iter().any(|value| value == client_id) {
            client_ids.push(client_id.to_string());
        }
    }
    if client_ids.is_empty() {
        return Err(AppError::config(
            "TRUST_CLIENT_IDS must include at least one client id",
        ));
    }
    Ok(client_ids)
}

fn normalize_pem(value: &str) -> String {
    value.replace("\\n", "\n")
}
