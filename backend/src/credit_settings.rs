use crate::error::{AppError, AppResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

#[derive(Deserialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCreditSettingsRequest {
    pub new_user_bonus_credits: i64,
}

#[derive(Serialize, FromRow, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreditSettingsResponse {
    pub new_user_bonus_credits: i64,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(FromRow)]
struct CreditSettingsRow {
    new_user_bonus_credits: i64,
    updated_at: DateTime<Utc>,
}

pub async fn get_credit_settings(pool: &PgPool) -> AppResult<CreditSettingsResponse> {
    let row = fetch_credit_settings_row(pool).await?;
    Ok(row.map(CreditSettingsResponse::from).unwrap_or_default())
}

pub async fn update_credit_settings(
    pool: &PgPool,
    input: UpdateCreditSettingsRequest,
) -> AppResult<CreditSettingsResponse> {
    if input.new_user_bonus_credits < 0 {
        return Err(AppError::bad_request("新用户赠送积分不能为负数"));
    }

    let row = sqlx::query_as::<_, CreditSettingsRow>(
        r#"
        INSERT INTO credit_global_configs (id, singleton_key, new_user_bonus_credits)
        VALUES ($1, true, $2)
        ON CONFLICT (singleton_key)
        DO UPDATE SET
            new_user_bonus_credits = EXCLUDED.new_user_bonus_credits,
            updated_at = now()
        RETURNING new_user_bonus_credits, updated_at
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(input.new_user_bonus_credits)
    .fetch_one(pool)
    .await?;

    Ok(row.into())
}

async fn fetch_credit_settings_row(pool: &PgPool) -> AppResult<Option<CreditSettingsRow>> {
    sqlx::query_as::<_, CreditSettingsRow>(
        "SELECT new_user_bonus_credits, updated_at FROM credit_global_configs WHERE singleton_key = true",
    )
    .fetch_optional(pool)
    .await
    .map_err(Into::into)
}

impl Default for CreditSettingsResponse {
    fn default() -> Self {
        Self {
            new_user_bonus_credits: 0,
            updated_at: None,
        }
    }
}

impl From<CreditSettingsRow> for CreditSettingsResponse {
    fn from(row: CreditSettingsRow) -> Self {
        Self {
            new_user_bonus_credits: row.new_user_bonus_credits,
            updated_at: Some(row.updated_at),
        }
    }
}
