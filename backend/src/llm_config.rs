use crate::error::{AppError, AppResult};
use chrono::{DateTime, Utc};
use reqwest::Url;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use std::{
    sync::RwLock,
    time::{Duration, Instant},
};
use uuid::Uuid;

#[derive(FromRow)]
struct LlmGlobalConfigRow {
    name: String,
    provider_type: String,
    base_url: String,
    api_key: Option<String>,
    api_key_last4: Option<String>,
    enabled: bool,
    default_chat_model: String,
    default_agent_model: String,
    allowed_models: serde_json::Value,
    timeout_seconds: i32,
    updated_at: DateTime<Utc>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateLlmConfigRequest {
    pub name: Option<String>,
    pub base_url: String,
    pub api_key: Option<String>,
    pub enabled: bool,
    pub default_chat_model: String,
    pub default_agent_model: String,
    pub allowed_models: Vec<String>,
    pub timeout_seconds: i32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminLlmConfigResponse {
    pub configured: bool,
    pub name: String,
    pub provider_type: String,
    pub base_url: String,
    pub api_key_masked: String,
    pub api_key_last4: Option<String>,
    pub enabled: bool,
    pub default_chat_model: String,
    pub default_agent_model: String,
    pub allowed_models: Vec<String>,
    pub timeout_seconds: i32,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TestLlmConfigResponse {
    pub endpoint: String,
    pub model: String,
    pub status: u16,
    pub latency_ms: u128,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmModelsResponse {
    pub models: Vec<String>,
}

#[derive(Deserialize)]
struct UpstreamModelList {
    data: Vec<UpstreamModel>,
}

#[derive(Deserialize)]
struct UpstreamModel {
    id: String,
}

#[derive(Clone)]
pub struct LlmProxyConfig {
    pub base_url: String,
    pub api_key: String,
    pub default_agent_model: String,
    pub allowed_models: Vec<String>,
    pub timeout_seconds: u64,
}

struct CachedLlmProxyConfig {
    value: LlmProxyConfig,
    expires_at: Instant,
}

pub struct LlmProxyConfigCache {
    ttl: Duration,
    inner: RwLock<Option<CachedLlmProxyConfig>>,
}

impl LlmProxyConfigCache {
    pub fn new(ttl: Duration) -> Self {
        Self {
            ttl,
            inner: RwLock::new(None),
        }
    }

    pub async fn get_or_load(&self, pool: &PgPool) -> AppResult<LlmProxyConfig> {
        if let Some(config) = self.current() {
            return Ok(config);
        }

        let config = match get_llm_proxy_config(pool).await {
            Ok(config) => config,
            Err(error) => {
                tracing::warn!(
                    ?error,
                    pool_size = pool.size(),
                    pool_idle = pool.num_idle(),
                    "failed to refresh llm proxy config cache"
                );
                return Err(error);
            }
        };
        let expires_at = Instant::now() + self.ttl;
        let mut guard = self
            .inner
            .write()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        *guard = Some(CachedLlmProxyConfig {
            value: config.clone(),
            expires_at,
        });
        tracing::debug!(
            ttl_seconds = self.ttl.as_secs(),
            "llm proxy config cache refreshed"
        );
        Ok(config)
    }

    pub fn invalidate(&self) {
        let mut guard = self
            .inner
            .write()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        *guard = None;
        tracing::debug!("llm proxy config cache invalidated");
    }

    fn current(&self) -> Option<LlmProxyConfig> {
        let guard = self
            .inner
            .read()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        guard.as_ref().and_then(|cached| {
            if Instant::now() < cached.expires_at {
                Some(cached.value.clone())
            } else {
                None
            }
        })
    }
}

pub async fn get_admin_llm_config(pool: &PgPool) -> AppResult<AdminLlmConfigResponse> {
    let row = fetch_config_row(pool).await?;
    Ok(row
        .map(AdminLlmConfigResponse::from)
        .unwrap_or_else(default_admin_config))
}

pub async fn update_llm_config(
    pool: &PgPool,
    input: UpdateLlmConfigRequest,
) -> AppResult<AdminLlmConfigResponse> {
    let input = validate_config(input)?;
    let api_key_last4 = input.api_key.as_ref().map(|value| last4(value));
    let row = sqlx::query_as::<_, LlmGlobalConfigRow>(
        r#"
        INSERT INTO llm_global_configs (
            id,
            singleton_key,
            name,
            provider_type,
            base_url,
            api_key,
            api_key_last4,
            enabled,
            default_chat_model,
            default_agent_model,
            allowed_models,
            timeout_seconds
        )
        VALUES ($1, true, $2, 'openai-compatible', $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (singleton_key)
        DO UPDATE SET
            name = EXCLUDED.name,
            base_url = EXCLUDED.base_url,
            api_key = COALESCE(EXCLUDED.api_key, llm_global_configs.api_key),
            api_key_last4 = COALESCE(EXCLUDED.api_key_last4, llm_global_configs.api_key_last4),
            enabled = EXCLUDED.enabled,
            default_chat_model = EXCLUDED.default_chat_model,
            default_agent_model = EXCLUDED.default_agent_model,
            allowed_models = EXCLUDED.allowed_models,
            timeout_seconds = EXCLUDED.timeout_seconds,
            updated_at = now()
        RETURNING
            id,
            name,
            provider_type,
            base_url,
            api_key,
            api_key_last4,
            enabled,
            default_chat_model,
            default_agent_model,
            allowed_models,
            timeout_seconds,
            updated_at
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(input.name)
    .bind(input.base_url)
    .bind(input.api_key)
    .bind(api_key_last4)
    .bind(input.enabled)
    .bind(input.default_chat_model)
    .bind(input.default_agent_model)
    .bind(serde_json::json!(input.allowed_models))
    .bind(input.timeout_seconds)
    .fetch_one(pool)
    .await?;

    Ok(AdminLlmConfigResponse::from(row))
}

pub async fn get_llm_config_models(
    pool: &PgPool,
    http_client: &reqwest::Client,
    input: UpdateLlmConfigRequest,
) -> AppResult<LlmModelsResponse> {
    let input = validate_config(input)?;
    let api_key = resolve_input_api_key(pool, input.api_key).await?;
    Ok(LlmModelsResponse {
        models: fetch_upstream_model_ids(
            http_client,
            &input.base_url,
            &api_key,
            input.timeout_seconds.max(1) as u64,
        )
        .await?,
    })
}

pub async fn test_llm_config(
    pool: &PgPool,
    http_client: &reqwest::Client,
    input: UpdateLlmConfigRequest,
) -> AppResult<TestLlmConfigResponse> {
    let input = validate_config(input)?;
    let api_key = resolve_input_api_key(pool, input.api_key).await?;
    let endpoint = join_upstream_url(&input.base_url, "chat/completions");
    let started_at = Instant::now();
    let response = http_client
        .post(&endpoint)
        .bearer_auth(api_key)
        .timeout(std::time::Duration::from_secs(
            input.timeout_seconds.max(1) as u64
        ))
        .header(reqwest::header::CONTENT_TYPE, "application/json")
        .header(reqwest::header::ACCEPT, "application/json")
        .json(&serde_json::json!({
            "model": input.default_chat_model,
            "messages": [{ "role": "user", "content": "ping" }],
            "stream": false,
            "max_tokens": 1
        }))
        .send()
        .await
        .map_err(|error| {
            tracing::warn!(?error, "llm config test request failed");
            AppError::external("上游测试请求失败")
        })?;
    let status = response.status();
    if !status.is_success() {
        return Err(AppError::bad_request(format!(
            "上游测试失败：HTTP {}",
            status.as_u16()
        )));
    }
    Ok(TestLlmConfigResponse {
        endpoint,
        model: input.default_chat_model,
        status: status.as_u16(),
        latency_ms: started_at.elapsed().as_millis(),
    })
}

pub async fn fetch_upstream_model_ids(
    http_client: &reqwest::Client,
    base_url: &str,
    api_key: &str,
    timeout_seconds: u64,
) -> AppResult<Vec<String>> {
    let response = http_client
        .get(join_upstream_url(base_url, "models"))
        .bearer_auth(api_key)
        .timeout(std::time::Duration::from_secs(timeout_seconds.max(1)))
        .send()
        .await
        .map_err(|error| {
            tracing::warn!(?error, "upstream model list request failed");
            AppError::external("上游模型列表获取失败")
        })?;

    let status = response.status();
    if !status.is_success() {
        return Err(AppError::bad_request(format!(
            "上游模型列表获取失败：HTTP {}",
            status.as_u16()
        )));
    }

    let payload = response
        .json::<UpstreamModelList>()
        .await
        .map_err(|error| {
            tracing::warn!(?error, "upstream model list parse failed");
            AppError::external("上游模型列表格式无效")
        })?;
    let mut models = payload
        .data
        .into_iter()
        .map(|model| model.id.trim().to_string())
        .filter(|model| !model.is_empty())
        .collect::<Vec<_>>();
    models.sort();
    models.dedup();
    if models.is_empty() {
        return Err(AppError::bad_request("上游模型列表为空"));
    }
    Ok(models)
}

pub async fn get_llm_proxy_config(pool: &PgPool) -> AppResult<LlmProxyConfig> {
    let row = fetch_config_row(pool)
        .await?
        .ok_or_else(|| AppError::bad_request("LLM 全局配置尚未创建"))?;
    if !row.enabled {
        return Err(AppError::bad_request("LLM 中转未启用"));
    }
    let api_key = row
        .api_key
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| AppError::bad_request("LLM API Key 尚未配置"))?;
    Ok(LlmProxyConfig {
        base_url: row.base_url,
        api_key,
        default_agent_model: row.default_agent_model,
        allowed_models: parse_allowed_models(&row.allowed_models),
        timeout_seconds: row.timeout_seconds.max(1) as u64,
    })
}

fn join_upstream_url(base_url: &str, path: &str) -> String {
    format!(
        "{}/{}",
        base_url.trim_end_matches('/'),
        path.trim_start_matches('/')
    )
}

fn validate_config(input: UpdateLlmConfigRequest) -> AppResult<ValidatedLlmConfig> {
    let base_url = clean_required(input.base_url, "API Base", 2048)?;
    validate_base_url(&base_url)?;
    Ok(ValidatedLlmConfig {
        name: input
            .name
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "default".to_string()),
        base_url,
        api_key: normalize_optional_api_key(input.api_key)?,
        enabled: input.enabled,
        default_chat_model: clean_required(input.default_chat_model, "默认聊天模型", 128)?,
        default_agent_model: clean_required(input.default_agent_model, "默认 Agent 模型", 128)?,
        allowed_models: validate_models(input.allowed_models)?,
        timeout_seconds: input.timeout_seconds.clamp(10, 2000),
    })
}

struct ValidatedLlmConfig {
    name: String,
    base_url: String,
    api_key: Option<String>,
    enabled: bool,
    default_chat_model: String,
    default_agent_model: String,
    allowed_models: Vec<String>,
    timeout_seconds: i32,
}

async fn resolve_input_api_key(pool: &PgPool, input_api_key: Option<String>) -> AppResult<String> {
    let saved_key = if input_api_key.is_none() {
        fetch_config_row(pool).await?.and_then(|row| row.api_key)
    } else {
        None
    };
    input_api_key
        .or(saved_key)
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| AppError::bad_request("需要填写 API Key"))
}

async fn fetch_config_row(pool: &PgPool) -> AppResult<Option<LlmGlobalConfigRow>> {
    Ok(sqlx::query_as::<_, LlmGlobalConfigRow>(
        r#"
        SELECT
            id,
            name,
            provider_type,
            base_url,
            api_key,
            api_key_last4,
            enabled,
            default_chat_model,
            default_agent_model,
            allowed_models,
            timeout_seconds,
            updated_at
        FROM llm_global_configs
        WHERE singleton_key = true
        LIMIT 1
        "#,
    )
    .fetch_optional(pool)
    .await?)
}

fn clean_required(value: String, field: &str, max_len: usize) -> AppResult<String> {
    let value = value.trim().to_string();
    if value.is_empty() {
        return Err(AppError::bad_request(format!("{field}不能为空")));
    }
    if value.chars().count() > max_len {
        return Err(AppError::bad_request(format!("{field}过长")));
    }
    Ok(value)
}

fn validate_base_url(value: &str) -> AppResult<()> {
    let url = Url::parse(value).map_err(|_| AppError::bad_request("API Base 格式无效"))?;
    let scheme = url.scheme();
    let host = url.host_str().unwrap_or_default();
    if scheme == "https" || (scheme == "http" && matches!(host, "localhost" | "127.0.0.1")) {
        return Ok(());
    }
    Err(AppError::bad_request(
        "API Base 必须使用 HTTPS，localhost 调试地址除外",
    ))
}

fn normalize_optional_api_key(value: Option<String>) -> AppResult<Option<String>> {
    value
        .map(|key| {
            let key = key.trim().to_string();
            if key.is_empty() {
                return Ok(None);
            }
            if key.chars().count() > 4096 {
                return Err(AppError::bad_request("API Key 过长"));
            }
            Ok(Some(key))
        })
        .transpose()
        .map(Option::flatten)
}

fn validate_models(models: Vec<String>) -> AppResult<Vec<String>> {
    let mut models = models
        .into_iter()
        .map(|model| model.trim().to_string())
        .filter(|model| !model.is_empty())
        .collect::<Vec<_>>();
    models.sort();
    models.dedup();
    if models.iter().any(|model| model.chars().count() > 128) {
        return Err(AppError::bad_request("模型名称过长"));
    }
    Ok(models)
}

fn parse_allowed_models(value: &serde_json::Value) -> Vec<String> {
    value
        .as_array()
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.as_str().map(str::to_string))
                .collect()
        })
        .unwrap_or_default()
}

fn default_admin_config() -> AdminLlmConfigResponse {
    AdminLlmConfigResponse {
        configured: false,
        name: "default".to_string(),
        provider_type: "openai-compatible".to_string(),
        base_url: String::new(),
        api_key_masked: String::new(),
        api_key_last4: None,
        enabled: false,
        default_chat_model: "gpt-5.5".to_string(),
        default_agent_model: "gpt-5.5".to_string(),
        allowed_models: Vec::new(),
        timeout_seconds: 120,
        updated_at: None,
    }
}

fn last4(value: &str) -> String {
    value
        .chars()
        .rev()
        .take(4)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect()
}

impl From<LlmGlobalConfigRow> for AdminLlmConfigResponse {
    fn from(row: LlmGlobalConfigRow) -> Self {
        let api_key_last4 = row
            .api_key_last4
            .or_else(|| row.api_key.as_deref().map(last4));
        Self {
            configured: !row.base_url.is_empty() && api_key_last4.is_some(),
            name: row.name,
            provider_type: row.provider_type,
            base_url: row.base_url,
            api_key_masked: api_key_last4
                .as_ref()
                .map(|value| format!("••••••••{value}"))
                .unwrap_or_default(),
            api_key_last4,
            enabled: row.enabled,
            default_chat_model: row.default_chat_model,
            default_agent_model: row.default_agent_model,
            allowed_models: parse_allowed_models(&row.allowed_models),
            timeout_seconds: row.timeout_seconds,
            updated_at: Some(row.updated_at),
        }
    }
}
