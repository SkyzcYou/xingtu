use crate::{error::AppResult, trust::TrustPrincipal};
use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct AccountPrincipal {
    pub id: Uuid,
    pub trust_issuer: String,
    pub trust_subject: String,
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub avatar_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_login_at: Option<DateTime<Utc>>,
}

pub async fn ensure_account_principal(
    pool: &PgPool,
    principal: &TrustPrincipal,
) -> AppResult<AccountPrincipal> {
    sqlx::query_as::<_, AccountPrincipal>(
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
            display_name = COALESCE(EXCLUDED.display_name, account_principals.display_name),
            email = COALESCE(EXCLUDED.email, account_principals.email),
            avatar_url = COALESCE(EXCLUDED.avatar_url, account_principals.avatar_url),
            updated_at = now(),
            last_login_at = now()
        RETURNING
            id,
            trust_issuer,
            trust_subject,
            display_name,
            email,
            avatar_url,
            created_at,
            updated_at,
            last_login_at
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(&principal.issuer)
    .bind(&principal.subject)
    .bind(&principal.display_name)
    .bind(&principal.email)
    .bind(&principal.avatar_url)
    .fetch_one(pool)
    .await
    .map_err(Into::into)
}
