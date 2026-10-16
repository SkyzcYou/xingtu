use crate::{
    credits::CreditRequestType,
    error::{AppError, AppResult},
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

#[derive(Debug, Clone, Copy)]
pub enum ImageJobRequestType {
    Generation,
    Edit,
}

impl ImageJobRequestType {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Generation => "image_generation",
            Self::Edit => "image_edit",
        }
    }

    pub fn upstream_path(self) -> &'static str {
        match self {
            Self::Generation => "images/generations",
            Self::Edit => "images/edits",
        }
    }

    pub fn credit_type(self) -> CreditRequestType {
        match self {
            Self::Generation => CreditRequestType::ImageGeneration,
            Self::Edit => CreditRequestType::ImageEdit,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, utoipa::ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum ImageJobStatus {
    Pending,
    Running,
    Succeeded,
    Failed,
    Cancelled,
}

impl ImageJobStatus {
    fn parse(value: &str) -> Self {
        match value {
            "running" => Self::Running,
            "succeeded" => Self::Succeeded,
            "failed" => Self::Failed,
            "cancelled" => Self::Cancelled,
            _ => Self::Pending,
        }
    }
}

#[allow(dead_code)]
#[derive(Debug, Clone, FromRow)]
pub struct ImageJobRow {
    pub id: Uuid,
    pub principal_id: Uuid,
    pub credit_request_id: String,
    pub model_id: String,
    pub request_type: String,
    pub upstream_path: String,
    pub content_type: Option<String>,
    pub request_body: Vec<u8>,
    pub status: String,
    pub attempt_count: i32,
    pub result_json: Option<Value>,
    pub error_json: Option<Value>,
    pub credit_refunded_at: Option<DateTime<Utc>>,
    pub locked_at: Option<DateTime<Utc>>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ImageJobResponse {
    pub id: Uuid,
    pub status: ImageJobStatus,
    pub model_id: String,
    pub request_type: String,
    pub result: Option<Value>,
    pub error: Option<Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
}

pub struct NewImageJob {
    pub id: Uuid,
    pub principal_id: Uuid,
    pub credit_request_id: String,
    pub model_id: String,
    pub request_type: ImageJobRequestType,
    pub content_type: Option<String>,
    pub request_body: Vec<u8>,
}

impl From<ImageJobRow> for ImageJobResponse {
    fn from(row: ImageJobRow) -> Self {
        Self {
            id: row.id,
            status: ImageJobStatus::parse(&row.status),
            model_id: row.model_id,
            request_type: row.request_type,
            result: row.result_json,
            error: row.error_json,
            created_at: row.created_at,
            updated_at: row.updated_at,
            started_at: row.started_at,
            completed_at: row.completed_at,
        }
    }
}

pub async fn insert_image_job(pool: &PgPool, job: NewImageJob) -> AppResult<ImageJobResponse> {
    let row = sqlx::query_as::<_, ImageJobRow>(IMAGE_JOB_RETURNING_SQL)
        .bind(job.id)
        .bind(job.principal_id)
        .bind(job.credit_request_id)
        .bind(job.model_id)
        .bind(job.request_type.as_str())
        .bind(job.request_type.upstream_path())
        .bind(job.content_type)
        .bind(job.request_body)
        .fetch_one(pool)
        .await?;
    Ok(row.into())
}

pub async fn get_image_job(
    pool: &PgPool,
    principal_id: Uuid,
    id: Uuid,
) -> AppResult<ImageJobResponse> {
    let row = sqlx::query_as::<_, ImageJobRow>(IMAGE_JOB_SELECT_SQL)
        .bind(id)
        .bind(principal_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::not_found("image job not found"))?;
    Ok(row.into())
}

pub async fn mark_refunded(pool: &PgPool, credit_request_id: &str) -> AppResult<()> {
    sqlx::query(
        "UPDATE image_jobs
         SET credit_refunded_at = COALESCE(credit_refunded_at, now()), updated_at = now()
         WHERE credit_request_id = $1",
    )
    .bind(credit_request_id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn claim_next_image_job(pool: &PgPool) -> AppResult<Option<ImageJobRow>> {
    let mut tx = pool.begin().await?;
    let row = sqlx::query_as::<_, ImageJobRow>(
        "WITH next_job AS (
             SELECT id
             FROM image_jobs
             WHERE status = 'pending'
             ORDER BY created_at
             FOR UPDATE SKIP LOCKED
             LIMIT 1
         )
         UPDATE image_jobs
         SET status = 'running',
             attempt_count = attempt_count + 1,
             locked_at = now(),
             started_at = COALESCE(started_at, now()),
             updated_at = now()
         WHERE id IN (SELECT id FROM next_job)
         RETURNING id, principal_id, credit_request_id, model_id, request_type, upstream_path, content_type, request_body, status, attempt_count, result_json, error_json, credit_refunded_at, locked_at, started_at, completed_at, created_at, updated_at",
    )
    .fetch_optional(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(row)
}

pub async fn fail_stale_running_jobs(pool: &PgPool, stale_minutes: i64) -> AppResult<Vec<String>> {
    let rows = sqlx::query_as::<_, ImageJobRow>(
        "UPDATE image_jobs
         SET status = 'failed',
             error_json = $2,
             completed_at = now(),
             updated_at = now()
         WHERE status = 'running'
           AND locked_at < now() - ($1::text || ' minutes')::interval
         RETURNING id, principal_id, credit_request_id, model_id, request_type, upstream_path, content_type, request_body, status, attempt_count, result_json, error_json, credit_refunded_at, locked_at, started_at, completed_at, created_at, updated_at",
    )
    .bind(stale_minutes)
    .bind(json!({
        "message": "image job timed out",
        "code": "image_job_timeout"
    }))
    .fetch_all(pool)
    .await?;
    Ok(rows.into_iter().map(|row| row.credit_request_id).collect())
}

pub async fn mark_image_job_succeeded(pool: &PgPool, id: Uuid, result: Value) -> AppResult<()> {
    sqlx::query(
        "UPDATE image_jobs
         SET status = 'succeeded', result_json = $2, completed_at = now(), updated_at = now()
         WHERE id = $1 AND status = 'running'",
    )
    .bind(id)
    .bind(result)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn mark_image_job_failed(
    pool: &PgPool,
    id: Uuid,
    error: Value,
) -> AppResult<Option<String>> {
    let row = sqlx::query_as::<_, ImageJobRow>(
        "UPDATE image_jobs
         SET status = 'failed', error_json = $2, completed_at = now(), updated_at = now()
         WHERE id = $1 AND status = 'running'
         RETURNING id, principal_id, credit_request_id, model_id, request_type, upstream_path, content_type, request_body, status, attempt_count, result_json, error_json, credit_refunded_at, locked_at, started_at, completed_at, created_at, updated_at",
    )
    .bind(id)
    .bind(error)
    .fetch_optional(pool)
    .await?;
    Ok(row.map(|job| job.credit_request_id))
}

pub fn image_job_credit_request_id(id: Uuid) -> String {
    format!("image_job:{id}")
}

const IMAGE_JOB_RETURNING_SQL: &str =
    "INSERT INTO image_jobs (id, principal_id, credit_request_id, model_id, request_type, upstream_path, content_type, request_body)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, principal_id, credit_request_id, model_id, request_type, upstream_path, content_type, request_body, status, attempt_count, result_json, error_json, credit_refunded_at, locked_at, started_at, completed_at, created_at, updated_at";

const IMAGE_JOB_SELECT_SQL: &str =
    "SELECT id, principal_id, credit_request_id, model_id, request_type, upstream_path, content_type, request_body, status, attempt_count, result_json, error_json, credit_refunded_at, locked_at, started_at, completed_at, created_at, updated_at
     FROM image_jobs
     WHERE id = $1 AND principal_id = $2";

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn request_type_maps_to_upstream_path() {
        assert_eq!(
            ImageJobRequestType::Generation.upstream_path(),
            "images/generations"
        );
        assert_eq!(ImageJobRequestType::Edit.upstream_path(), "images/edits");
    }

    #[test]
    fn status_parser_handles_known_terminal_values() {
        assert_eq!(
            ImageJobStatus::parse("succeeded"),
            ImageJobStatus::Succeeded
        );
        assert_eq!(ImageJobStatus::parse("failed"), ImageJobStatus::Failed);
        assert_eq!(
            ImageJobStatus::parse("cancelled"),
            ImageJobStatus::Cancelled
        );
        assert_eq!(ImageJobStatus::parse("unknown"), ImageJobStatus::Pending);
    }
}
