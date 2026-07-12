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
    pub payment_provider: String,
    pub qingke_api_base: String,
    pub qingke_pid: Option<String>,
    pub qingke_merchant_private_key_pem: Option<String>,
    pub qingke_platform_public_key_pem: Option<String>,
    pub noipay_api_base: String,
    pub noipay_app_id: Option<String>,
    pub noipay_app_secret: Option<String>,
    pub noipay_webhook_secret: Option<String>,
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

        let payment_provider = env_or("PAYMENT_PROVIDER", "qingke");
        if !matches!(payment_provider.as_str(), "qingke" | "noipay") {
            return Err(AppError::config(
                "PAYMENT_PROVIDER must be qingke or noipay",
            ));
        }

        let qingke_pid = optional_env("QINGKE_PID");
        let qingke_merchant_private_key_pem =
            optional_env("QINGKE_MERCHANT_PRIVATE_KEY_PEM").map(|value| normalize_pem(&value));
        let qingke_platform_public_key_pem =
            optional_env("QINGKE_PLATFORM_PUBLIC_KEY_PEM").map(|value| normalize_pem(&value));
        let noipay_app_id = optional_env("NOIPAY_APP_ID");
        let noipay_app_secret = optional_env("NOIPAY_APP_SECRET");
        let noipay_webhook_secret = optional_env("NOIPAY_WEBHOOK_SECRET");

        if payment_provider == "qingke" {
            require_present("QINGKE_PID", qingke_pid.as_deref())?;
            require_present(
                "QINGKE_MERCHANT_PRIVATE_KEY_PEM",
                qingke_merchant_private_key_pem.as_deref(),
            )?;
            require_present(
                "QINGKE_PLATFORM_PUBLIC_KEY_PEM",
                qingke_platform_public_key_pem.as_deref(),
            )?;
        } else {
            require_present("NOIPAY_APP_ID", noipay_app_id.as_deref())?;
            require_present("NOIPAY_APP_SECRET", noipay_app_secret.as_deref())?;
            require_present("NOIPAY_WEBHOOK_SECRET", noipay_webhook_secret.as_deref())?;
        }

        Ok(Self {
            server_host: env_or("SERVER_HOST", "0.0.0.0"),
            server_port,
            database,
            llm_config_cache_ttl_seconds: env_u64_or("LLM_CONFIG_CACHE_TTL_SECONDS", 30)?.max(1),
            payment_provider,
            qingke_api_base: env_or("QINGKE_API_BASE", "https://pay.xianlai.work"),
            qingke_pid,
            qingke_merchant_private_key_pem,
            qingke_platform_public_key_pem,
            noipay_api_base: env_or("NOIPAY_API_BASE", "https://api.noipay.net/api"),
            noipay_app_id,
            noipay_app_secret,
            noipay_webhook_secret,
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

fn optional_env(name: &str) -> Option<String> {
    env::var(name).ok().filter(|value| !value.trim().is_empty())
}

fn require_present(name: &str, value: Option<&str>) -> AppResult<()> {
    value
        .filter(|value| !value.trim().is_empty())
        .map(|_| ())
        .ok_or_else(|| AppError::config(format!("missing required env {name}")))
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
