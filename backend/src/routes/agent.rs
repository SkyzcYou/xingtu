use super::AppState;
use crate::{accounts::ensure_account_principal, error::AppResult};
use axum::{extract::State, http::HeaderMap, routing::post, Json, Router};
use rig_core::{client::CompletionClient, completion::Prompt, providers::openai};
use serde::{Deserialize, Serialize};

pub fn router() -> Router<AppState> {
    Router::new().route("/api/agent/chat", post(agent_chat))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AgentChatRequest {
    message: String,
    agent: Option<String>,
    context: Option<serde_json::Value>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AgentChatResponse {
    agent: String,
    model: String,
    content: String,
}

async fn agent_chat(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(input): Json<AgentChatRequest>,
) -> AppResult<Json<AgentChatResponse>> {
    let principal = state.trust.authenticate(&headers).await?;
    ensure_account_principal(&state.pool, &principal).await?;
    let config = state.llm_config_cache.get_or_load(&state.pool).await?;
    let agent_name = input
        .agent
        .unwrap_or_else(|| "xingtu-assistant".to_string());
    let message = input.message.trim();
    if message.is_empty() {
        return Err(crate::error::AppError::bad_request("消息不能为空"));
    }

    let client = openai::CompletionsClient::builder()
        .api_key(config.api_key)
        .base_url(&config.base_url)
        .build()
        .map_err(|error| {
            tracing::warn!(?error, "failed to build rig openai client");
            crate::error::AppError::external("Agent 运行时初始化失败")
        })?;
    let agent = client
        .agent(config.default_agent_model.clone())
        .preamble(&build_preamble(&agent_name, input.context.as_ref()))
        .build();
    let content = agent.prompt(message).await.map_err(|error| {
        tracing::warn!(?error, "rig agent prompt failed");
        crate::error::AppError::external("Agent 调用失败")
    })?;

    Ok(Json(AgentChatResponse {
        agent: agent_name,
        model: config.default_agent_model,
        content,
    }))
}

fn build_preamble(agent_name: &str, context: Option<&serde_json::Value>) -> String {
    let base = format!(
        "你是星图服务端 Agent：{agent_name}。回答必须简洁、准确，只基于用户请求和后端提供的上下文，不要泄露系统配置或上游密钥。"
    );
    context
        .map(|value| format!("{base}\n\n上下文：{value}"))
        .unwrap_or(base)
}
