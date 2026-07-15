use crate::{
    credits::refund_model_request,
    error::AppResult,
    image_jobs::{
        claim_next_image_job, fail_stale_running_jobs, mark_image_job_failed,
        mark_image_job_succeeded, mark_refunded, ImageJobRow,
    },
    routes::AppState,
};
use reqwest::header;
use serde_json::{json, Value};
use std::time::Duration;

const POLL_INTERVAL: Duration = Duration::from_secs(2);
const STALE_RUNNING_MINUTES: i64 = 30;

pub fn spawn_image_job_worker(state: AppState) {
    tokio::spawn(async move {
        loop {
            if let Err(error) = refund_stale_jobs(&state).await {
                tracing::warn!(?error, "failed to settle stale image jobs");
            }
            match claim_next_image_job(&state.pool).await {
                Ok(Some(job)) => execute_job(&state, job).await,
                Ok(None) => tokio::time::sleep(POLL_INTERVAL).await,
                Err(error) => {
                    tracing::warn!(?error, "failed to claim image job");
                    tokio::time::sleep(POLL_INTERVAL).await;
                }
            }
        }
    });
}

async fn refund_stale_jobs(state: &AppState) -> AppResult<()> {
    let credit_request_ids = fail_stale_running_jobs(&state.pool, STALE_RUNNING_MINUTES).await?;
    for credit_request_id in credit_request_ids {
        refund_job(state, &credit_request_id).await;
    }
    Ok(())
}

async fn execute_job(state: &AppState, job: ImageJobRow) {
    let result = send_upstream_request(state, &job).await;
    match result {
        Ok(result) => {
            if let Err(error) = mark_image_job_succeeded(&state.pool, job.id, result).await {
                tracing::warn!(?error, job_id = %job.id, "failed to mark image job succeeded");
            }
        }
        Err(error) => match mark_image_job_failed(&state.pool, job.id, error.to_json()).await {
            Ok(Some(credit_request_id)) => refund_job(state, &credit_request_id).await,
            Ok(None) => tracing::debug!(job_id = %job.id, "image job was already terminal"),
            Err(mark_error) => tracing::warn!(
                ?mark_error,
                job_id = %job.id,
                "failed to mark image job failed"
            ),
        },
    }
}

#[derive(Debug)]
struct ImageJobUpstreamError {
    message: String,
    status_code: Option<u16>,
    body: Option<Value>,
}

impl ImageJobUpstreamError {
    fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            status_code: None,
            body: None,
        }
    }

    fn with_response(status_code: u16, body: Value) -> Self {
        Self {
            message: format!("上游 LLM 请求失败：HTTP {status_code}"),
            status_code: Some(status_code),
            body: Some(body),
        }
    }

    fn to_json(self) -> Value {
        json!({
            "message": self.message,
            "code": "image_job_upstream_failed",
            "statusCode": self.status_code,
            "body": self.body,
        })
    }
}

async fn send_upstream_request(
    state: &AppState,
    job: &ImageJobRow,
) -> Result<Value, ImageJobUpstreamError> {
    let config = state
        .llm_config_cache
        .get_or_load(&state.pool)
        .await
        .map_err(|error| ImageJobUpstreamError::new(error.to_string()))?;
    let upstream_url = join_upstream_url(&config.base_url, &job.upstream_path);
    let mut request = state
        .http_client
        .post(upstream_url)
        .bearer_auth(&config.api_key)
        .timeout(Duration::from_secs(config.timeout_seconds))
        .header(header::ACCEPT, "application/json")
        .body(job.request_body.clone());

    if let Some(content_type) = &job.content_type {
        request = request.header(header::CONTENT_TYPE, content_type);
    }

    let response = request.send().await.map_err(|error| {
        tracing::warn!(?error, job_id = %job.id, "image job upstream send failed");
        ImageJobUpstreamError::new("上游 LLM 请求失败")
    })?;
    let status = response.status();
    let headers = response.headers().clone();
    let body = response.bytes().await.map_err(|error| {
        tracing::warn!(?error, job_id = %job.id, "image job upstream body read failed");
        ImageJobUpstreamError::new("上游响应读取失败")
    })?;
    let parsed_body = serde_json::from_slice::<Value>(&body).unwrap_or_else(|_| {
        json!({
            "raw": String::from_utf8_lossy(&body).to_string()
        })
    });
    let result = json!({
        "statusCode": status.as_u16(),
        "headers": safe_headers(&headers),
        "body": parsed_body,
    });
    if status.is_success() {
        Ok(result)
    } else {
        Err(ImageJobUpstreamError::with_response(
            status.as_u16(),
            parsed_body,
        ))
    }
}

async fn refund_job(state: &AppState, credit_request_id: &str) {
    match refund_model_request(&state.pool, credit_request_id).await {
        Ok(true) => {
            if let Err(error) = mark_refunded(&state.pool, credit_request_id).await {
                tracing::warn!(
                    ?error,
                    credit_request_id,
                    "failed to mark image job refunded"
                );
            }
        }
        Ok(false) => tracing::debug!(credit_request_id, "image job refund skipped"),
        Err(error) => tracing::warn!(?error, credit_request_id, "failed to refund image job"),
    }
}

fn join_upstream_url(base_url: &str, path: &str) -> String {
    format!(
        "{}/{}",
        base_url.trim_end_matches('/'),
        path.trim_start_matches('/')
    )
}

fn safe_headers(headers: &header::HeaderMap) -> Value {
    let mut result = serde_json::Map::new();
    for (name, value) in headers.iter() {
        let key = name.as_str().to_ascii_lowercase();
        if key == "content-type" || key == "openai-request-id" || key == "x-request-id" {
            if let Ok(value) = value.to_str() {
                result.insert(key, Value::String(value.to_string()));
            }
        }
    }
    Value::Object(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn joins_upstream_url_without_double_slashes() {
        assert_eq!(
            join_upstream_url("https://api.example.com/v1/", "/images/generations"),
            "https://api.example.com/v1/images/generations"
        );
    }

    #[test]
    fn upstream_error_preserves_status_and_body() {
        let error = ImageJobUpstreamError::with_response(
            400,
            json!({ "error": { "message": "bad image request" } }),
        )
        .to_json();

        assert_eq!(error["code"], "image_job_upstream_failed");
        assert_eq!(error["statusCode"], 400);
        assert_eq!(error["body"]["error"]["message"], "bad image request");
    }
}
