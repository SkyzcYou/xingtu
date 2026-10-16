use crate::error::{AppError, AppResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

const DEFAULT_LIMIT: i64 = 20;
const MAX_LIMIT: i64 = 100;
const MAX_MODEL_LEN: usize = 200;
const MAX_PROMPT_LEN: usize = 20_000;
const MAX_ERROR_LEN: usize = 4_000;
const MAX_CONTENT_LEN: usize = 1_000_000;
const MAX_IMAGES: usize = 16;
const MAX_REFERENCE_FILES: usize = 20;

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq, utoipa::ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum PlaygroundTaskKind {
    Text,
    Image,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq, utoipa::ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum PlaygroundTaskStatus {
    Succeeded,
    Failed,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq, utoipa::ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum PlaygroundImageMode {
    Sync,
    Async,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq, utoipa::ToSchema)]
#[serde(tag = "kind", rename_all = "lowercase", deny_unknown_fields)]
pub enum PlaygroundParameters {
    Text {
        #[serde(rename = "useSystemPrompt")]
        use_system_prompt: bool,
        #[serde(rename = "systemPrompt")]
        system_prompt: String,
    },
    Image {
        #[serde(default, skip_serializing_if = "Option::is_none")]
        size: Option<String>,
        #[serde(
            default,
            rename = "aspectRatio",
            skip_serializing_if = "Option::is_none"
        )]
        aspect_ratio: Option<String>,
        #[serde(
            default,
            rename = "resolutionTier",
            skip_serializing_if = "Option::is_none"
        )]
        resolution_tier: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        quality: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        count: Option<u8>,
        mode: PlaygroundImageMode,
        #[serde(rename = "referenceFileNames")]
        reference_file_names: Vec<String>,
    },
}

impl PlaygroundParameters {
    fn task_kind(&self) -> PlaygroundTaskKind {
        match self {
            Self::Text { .. } => PlaygroundTaskKind::Text,
            Self::Image { .. } => PlaygroundTaskKind::Image,
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq, utoipa::ToSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PlaygroundImageResultItem {
    pub url: String,
    pub revised_prompt: Option<String>,
    pub job_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq, utoipa::ToSchema)]
#[serde(tag = "kind", rename_all = "lowercase", deny_unknown_fields)]
pub enum PlaygroundResult {
    Text {
        content: String,
    },
    Image {
        images: Vec<PlaygroundImageResultItem>,
    },
}

impl PlaygroundResult {
    fn task_kind(&self) -> PlaygroundTaskKind {
        match self {
            Self::Text { .. } => PlaygroundTaskKind::Text,
            Self::Image { .. } => PlaygroundTaskKind::Image,
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CreatePlaygroundHistoryRequest {
    pub task_kind: PlaygroundTaskKind,
    pub status: PlaygroundTaskStatus,
    pub model: String,
    pub prompt: String,
    pub duration_ms: u64,
    pub parameters: PlaygroundParameters,
    pub result: Option<PlaygroundResult>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PlaygroundHistoryRecord {
    pub id: Uuid,
    pub task_kind: PlaygroundTaskKind,
    pub status: PlaygroundTaskStatus,
    pub model: String,
    pub prompt: String,
    pub duration_ms: u64,
    pub parameters: PlaygroundParameters,
    pub result: Option<PlaygroundResult>,
    pub error: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Pagination {
    pub offset: i64,
    pub limit: i64,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PlaygroundHistoryPage {
    pub records: Vec<PlaygroundHistoryRecord>,
    pub next_offset: i64,
    pub has_more: bool,
}

#[derive(FromRow)]
struct PlaygroundHistoryRow {
    id: Uuid,
    task_kind: String,
    status: String,
    model: String,
    prompt: String,
    duration_ms: i64,
    parameters_json: Value,
    result_json: Option<Value>,
    error: Option<String>,
    created_at: DateTime<Utc>,
}

pub fn validate_create_input(
    mut input: CreatePlaygroundHistoryRequest,
) -> AppResult<CreatePlaygroundHistoryRequest> {
    input.model = required_text(input.model, "model", MAX_MODEL_LEN)?;
    input.prompt = required_text(input.prompt, "prompt", MAX_PROMPT_LEN)?;
    if input.duration_ms > i64::MAX as u64 {
        return Err(AppError::bad_request("durationMs is too large"));
    }
    if input.parameters.task_kind() != input.task_kind {
        return Err(AppError::bad_request(
            "parameters kind does not match taskKind",
        ));
    }
    validate_parameters(&mut input.parameters)?;

    if let Some(result) = input.result.as_mut() {
        if result.task_kind() != input.task_kind {
            return Err(AppError::bad_request("result kind does not match taskKind"));
        }
        validate_result(result)?;
    }

    match input.status {
        PlaygroundTaskStatus::Succeeded => {
            if input.error.is_some() {
                return Err(AppError::bad_request(
                    "succeeded history requires null error",
                ));
            }
            if input.task_kind == PlaygroundTaskKind::Text && input.result.is_none() {
                return Err(AppError::bad_request(
                    "succeeded text history requires result",
                ));
            }
        }
        PlaygroundTaskStatus::Failed => {
            if input.result.is_some() {
                return Err(AppError::bad_request("failed history requires null result"));
            }
            input.error = Some(required_text(
                input.error.unwrap_or_default(),
                "error",
                MAX_ERROR_LEN,
            )?);
        }
    }
    Ok(input)
}

pub fn validate_pagination(offset: Option<i64>, limit: Option<i64>) -> AppResult<Pagination> {
    let pagination = Pagination {
        offset: offset.unwrap_or(0),
        limit: limit.unwrap_or(DEFAULT_LIMIT),
    };
    if pagination.offset < 0 {
        return Err(AppError::bad_request("offset must be non-negative"));
    }
    if !(1..=MAX_LIMIT).contains(&pagination.limit) {
        return Err(AppError::bad_request("limit must be between 1 and 100"));
    }
    Ok(pagination)
}

pub async fn create_playground_history(
    pool: &PgPool,
    principal_id: Uuid,
    input: CreatePlaygroundHistoryRequest,
) -> AppResult<PlaygroundHistoryRecord> {
    let input = validate_create_input(input)?;
    let row = sqlx::query_as::<_, PlaygroundHistoryRow>(
        "INSERT INTO playground_task_history
         (id, principal_id, task_kind, status, model, prompt, duration_ms, parameters_json, result_json, error)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, task_kind, status, model, prompt, duration_ms, parameters_json, result_json, error, created_at",
    )
    .bind(Uuid::new_v4())
    .bind(principal_id)
    .bind(task_kind_str(input.task_kind))
    .bind(status_str(input.status))
    .bind(input.model)
    .bind(input.prompt)
    .bind(input.duration_ms as i64)
    .bind(serde_json::to_value(input.parameters)?)
    .bind(input.result.map(serde_json::to_value).transpose()?)
    .bind(input.error)
    .fetch_one(pool)
    .await?;
    row.try_into()
}

pub async fn list_playground_history(
    pool: &PgPool,
    principal_id: Uuid,
    pagination: Pagination,
) -> AppResult<PlaygroundHistoryPage> {
    let rows = sqlx::query_as::<_, PlaygroundHistoryRow>(
        "SELECT id, task_kind, status, model, prompt, duration_ms, parameters_json, result_json, error, created_at
         FROM playground_task_history
         WHERE principal_id = $1
         ORDER BY created_at DESC, id DESC
         OFFSET $2 LIMIT $3",
    )
    .bind(principal_id)
    .bind(pagination.offset)
    .bind(pagination.limit + 1)
    .fetch_all(pool)
    .await?;

    let (record_count, has_more, next_offset) =
        pagination_metadata(pagination.offset, pagination.limit, rows.len());
    let records = rows
        .into_iter()
        .take(record_count)
        .map(TryInto::try_into)
        .collect::<AppResult<Vec<_>>>()?;
    Ok(PlaygroundHistoryPage {
        records,
        next_offset,
        has_more,
    })
}

fn validate_parameters(parameters: &mut PlaygroundParameters) -> AppResult<()> {
    match parameters {
        PlaygroundParameters::Text { system_prompt, .. } => {
            if system_prompt.len() > MAX_PROMPT_LEN {
                return Err(AppError::bad_request("systemPrompt is too long"));
            }
        }
        PlaygroundParameters::Image {
            size,
            aspect_ratio,
            resolution_tier,
            quality,
            count,
            reference_file_names,
            ..
        } => {
            normalize_optional(size, "size", 100)?;
            validate_optional_choice(
                aspect_ratio,
                "aspectRatio",
                &["1:1", "3:2", "2:3", "16:9", "9:16"],
            )?;
            validate_optional_choice(resolution_tier, "resolutionTier", &["1K", "2K", "4K"])?;
            validate_optional_choice(quality, "quality", &["auto", "low", "medium", "high"])?;
            if let Some(current) = count {
                if !(1..=MAX_IMAGES as u8).contains(current) {
                    return Err(AppError::bad_request("count must be between 1 and 16"));
                }
            }
            if reference_file_names.len() > MAX_REFERENCE_FILES {
                return Err(AppError::bad_request("too many referenceFileNames"));
            }
            for file_name in reference_file_names {
                *file_name = required_text(std::mem::take(file_name), "reference file name", 255)?;
            }
        }
    }
    Ok(())
}

fn validate_result(result: &mut PlaygroundResult) -> AppResult<()> {
    match result {
        PlaygroundResult::Text { content } => {
            if content.len() > MAX_CONTENT_LEN {
                return Err(AppError::bad_request("text result is too long"));
            }
        }
        PlaygroundResult::Image { images } => {
            if images.len() > MAX_IMAGES {
                return Err(AppError::bad_request(
                    "images must contain at most 16 items",
                ));
            }
            for image in images {
                validate_image_result(image)?;
            }
        }
    }
    Ok(())
}

fn validate_image_result(image: &mut PlaygroundImageResultItem) -> AppResult<()> {
    image.url = required_text(std::mem::take(&mut image.url), "image URL", 8_192)?;
    let url = reqwest::Url::parse(&image.url)
        .map_err(|_| AppError::bad_request("image result must contain a valid URL"))?;
    if !matches!(url.scheme(), "http" | "https") {
        return Err(AppError::bad_request(
            "image result URL must use http or https",
        ));
    }
    normalize_optional(&mut image.revised_prompt, "revisedPrompt", MAX_PROMPT_LEN)?;
    normalize_optional(&mut image.job_id, "jobId", 200)?;
    Ok(())
}

fn required_text(value: String, field: &str, max_len: usize) -> AppResult<String> {
    let value = value.trim().to_string();
    if value.is_empty() {
        return Err(AppError::bad_request(format!("{field} must not be empty")));
    }
    if value.len() > max_len {
        return Err(AppError::bad_request(format!("{field} is too long")));
    }
    Ok(value)
}

fn normalize_optional(value: &mut Option<String>, field: &str, max_len: usize) -> AppResult<()> {
    if let Some(current) = value.take() {
        let current = current.trim().to_string();
        if current.len() > max_len {
            return Err(AppError::bad_request(format!("{field} is too long")));
        }
        if !current.is_empty() {
            *value = Some(current);
        }
    }
    Ok(())
}

fn validate_optional_choice(
    value: &mut Option<String>,
    field: &str,
    allowed: &[&str],
) -> AppResult<()> {
    normalize_optional(value, field, 100)?;
    if value
        .as_deref()
        .is_some_and(|current| !allowed.contains(&current))
    {
        return Err(AppError::bad_request(format!("{field} is invalid")));
    }
    Ok(())
}

fn pagination_metadata(offset: i64, limit: i64, fetched: usize) -> (usize, bool, i64) {
    let count = fetched.min(limit as usize);
    (count, fetched > limit as usize, offset + count as i64)
}

fn task_kind_str(kind: PlaygroundTaskKind) -> &'static str {
    match kind {
        PlaygroundTaskKind::Text => "text",
        PlaygroundTaskKind::Image => "image",
    }
}

fn status_str(status: PlaygroundTaskStatus) -> &'static str {
    match status {
        PlaygroundTaskStatus::Succeeded => "succeeded",
        PlaygroundTaskStatus::Failed => "failed",
    }
}

impl TryFrom<PlaygroundHistoryRow> for PlaygroundHistoryRecord {
    type Error = AppError;

    fn try_from(row: PlaygroundHistoryRow) -> Result<Self, Self::Error> {
        let task_kind = parse_task_kind(&row.task_kind)?;
        let status = parse_status(&row.status)?;
        let parameters = serde_json::from_value::<PlaygroundParameters>(row.parameters_json)
            .map_err(invalid_stored_record)?;
        let result = row
            .result_json
            .map(serde_json::from_value::<PlaygroundResult>)
            .transpose()
            .map_err(invalid_stored_record)?;
        let outcome_is_valid = match status {
            PlaygroundTaskStatus::Succeeded => {
                row.error.is_none() && (task_kind == PlaygroundTaskKind::Image || result.is_some())
            }
            PlaygroundTaskStatus::Failed => result.is_none() && row.error.is_some(),
        };
        if row.duration_ms < 0
            || parameters.task_kind() != task_kind
            || result
                .as_ref()
                .is_some_and(|value| value.task_kind() != task_kind)
            || !outcome_is_valid
        {
            tracing::error!(id = %row.id, "invalid playground history record");
            return Err(AppError::Internal);
        }
        Ok(Self {
            id: row.id,
            task_kind,
            status,
            model: row.model,
            prompt: row.prompt,
            duration_ms: row.duration_ms as u64,
            parameters,
            result,
            error: row.error,
            created_at: row.created_at,
        })
    }
}

fn parse_task_kind(value: &str) -> AppResult<PlaygroundTaskKind> {
    match value {
        "text" => Ok(PlaygroundTaskKind::Text),
        "image" => Ok(PlaygroundTaskKind::Image),
        _ => {
            tracing::error!(value, "invalid stored playground task kind");
            Err(AppError::Internal)
        }
    }
}

fn parse_status(value: &str) -> AppResult<PlaygroundTaskStatus> {
    match value {
        "succeeded" => Ok(PlaygroundTaskStatus::Succeeded),
        "failed" => Ok(PlaygroundTaskStatus::Failed),
        _ => {
            tracing::error!(value, "invalid stored playground task status");
            Err(AppError::Internal)
        }
    }
}

fn invalid_stored_record(error: serde_json::Error) -> AppError {
    tracing::error!(?error, "invalid stored playground history JSON");
    AppError::Internal
}

#[cfg(test)]
#[path = "playground_history_tests.rs"]
mod tests;
