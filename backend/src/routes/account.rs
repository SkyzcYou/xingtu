use super::AppState;
use crate::{
    error::{AppError, AppResult},
    trust::TrustPrincipal,
};
use axum::{extract::State, http::HeaderMap, routing::get, Json, Router};
use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

pub fn router() -> Router<AppState> {
    Router::new().route("/api/account/api-profile", get(get_api_profile))
}

#[derive(FromRow)]
struct AccountApiProfileRow {
    id: Uuid,
    profile_id: String,
    profile_name: String,
    provider_type: String,
    base_url: String,
    auth_type: String,
    api_key: String,
    enabled: bool,
    is_default: bool,
    updated_at: DateTime<Utc>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AccountApiProfileResponse {
    profile_id: String,
    profile_name: String,
    provider_type: String,
    base_url: String,
    auth_type: String,
    api_key: String,
    enabled: bool,
    is_default: bool,
    updated_at: DateTime<Utc>,
}

async fn get_api_profile(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> AppResult<Json<AccountApiProfileResponse>> {
    let principal = state.trust.authenticate(&headers).await?;
    let principal_id = upsert_principal(&state.pool, principal).await?;
    let profile = find_default_api_profile(&state.pool, principal_id).await?;
    mark_profile_synced(&state.pool, profile.id).await?;

    Ok(Json(AccountApiProfileResponse {
        profile_id: profile.profile_id,
        profile_name: profile.profile_name,
        provider_type: profile.provider_type,
        base_url: profile.base_url,
        auth_type: profile.auth_type,
        api_key: profile.api_key,
        enabled: profile.enabled,
        is_default: profile.is_default,
        updated_at: profile.updated_at,
    }))
}

async fn upsert_principal(pool: &PgPool, principal: TrustPrincipal) -> AppResult<Uuid> {
    let principal_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO account_principals (
            id,
            trust_issuer,
            trust_subject,
            display_name,
            email,
            avatar_url,
            last_login_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, now())
        ON CONFLICT (trust_issuer, trust_subject)
        DO UPDATE SET
            display_name = EXCLUDED.display_name,
            email = EXCLUDED.email,
            avatar_url = EXCLUDED.avatar_url,
            updated_at = now(),
            last_login_at = now()
        RETURNING id
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(principal.issuer)
    .bind(principal.subject)
    .bind(principal.display_name)
    .bind(principal.email)
    .bind(principal.avatar_url)
    .fetch_one(pool)
    .await?;

    Ok(principal_id)
}

async fn find_default_api_profile(
    pool: &PgPool,
    principal_id: Uuid,
) -> AppResult<AccountApiProfileRow> {
    sqlx::query_as::<_, AccountApiProfileRow>(
        r#"
        SELECT
            id,
            profile_id,
            profile_name,
            provider_type,
            base_url,
            auth_type,
            api_key,
            enabled,
            is_default,
            updated_at
        FROM account_api_profiles
        WHERE principal_id = $1 AND enabled = true
        ORDER BY is_default DESC, (profile_id = 'legacy-default') DESC, updated_at DESC
        LIMIT 1
        "#,
    )
    .bind(principal_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::not_found("账户尚未绑定 API 配置"))
}

async fn mark_profile_synced(pool: &PgPool, profile_id: Uuid) -> AppResult<()> {
    sqlx::query(
        r#"
        UPDATE account_api_profiles
        SET last_synced_at = now()
        WHERE id = $1
        "#,
    )
    .bind(profile_id)
    .execute(pool)
    .await?;
    Ok(())
}
