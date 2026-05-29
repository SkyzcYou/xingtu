use crate::{error::AppResult, trust::TrustPrincipal};
use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::json;
use sqlx::{FromRow, PgPool, Postgres, Transaction};
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
    let mut tx = pool.begin().await?;
    let account = sqlx::query_as::<_, AccountPrincipal>(
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
    .fetch_one(&mut *tx)
    .await?;

    process_new_user_bonus(&mut tx, account.id).await?;
    tx.commit().await?;
    Ok(account)
}

async fn process_new_user_bonus(
    tx: &mut Transaction<'_, Postgres>,
    principal_id: Uuid,
) -> AppResult<()> {
    let bonus_credits = sqlx::query_scalar::<_, i64>(
        "SELECT new_user_bonus_credits FROM credit_global_configs WHERE singleton_key = true",
    )
    .fetch_optional(&mut **tx)
    .await?
    .unwrap_or(0);

    let processed = sqlx::query_scalar::<_, Uuid>(
        "UPDATE account_principals
         SET new_user_bonus_processed_at = now(), updated_at = now()
         WHERE id = $1 AND new_user_bonus_processed_at IS NULL
         RETURNING id",
    )
    .bind(principal_id)
    .fetch_optional(&mut **tx)
    .await?;
    if processed.is_none() || bonus_credits <= 0 {
        return Ok(());
    }

    sqlx::query(
        "INSERT INTO account_credit_balances (principal_id, balance)
         VALUES ($1, 0)
         ON CONFLICT (principal_id) DO NOTHING",
    )
    .bind(principal_id)
    .execute(&mut **tx)
    .await?;

    let balance_after = sqlx::query_scalar::<_, i64>(
        "UPDATE account_credit_balances
         SET balance = balance + $2, updated_at = now()
         WHERE principal_id = $1
         RETURNING balance",
    )
    .bind(principal_id)
    .bind(bonus_credits)
    .fetch_one(&mut **tx)
    .await?;

    sqlx::query(
        "INSERT INTO account_credit_ledger (id, principal_id, delta, balance_after, reason, request_id, metadata)
         VALUES ($1, $2, $3, $4, 'new_user_bonus', $5, $6)",
    )
    .bind(Uuid::new_v4())
    .bind(principal_id)
    .bind(bonus_credits)
    .bind(balance_after)
    .bind(format!("new_user_bonus:{principal_id}"))
    .bind(json!({
        "source": "new_user_bonus",
        "configuredAmount": bonus_credits,
    }))
    .execute(&mut **tx)
    .await?;

    Ok(())
}
