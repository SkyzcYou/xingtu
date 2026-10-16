use crate::{
    error::{AppError, AppResult},
    message_events::{notify_message_event, MessageEvent},
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

#[derive(Debug, Deserialize, utoipa::IntoParams)]
#[serde(rename_all = "camelCase")]
pub struct MessageListQuery {
    pub status: Option<String>,
    pub query: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpsertMessageRequest {
    pub title: String,
    pub content: String,
    pub kind: String,
    pub priority: Option<i16>,
    pub audience: String,
    pub link_url: Option<String>,
    pub link_label: Option<String>,
    pub publish_at: Option<DateTime<Utc>>,
    pub expire_at: Option<DateTime<Utc>>,
    pub target_principal_ids: Option<Vec<Uuid>>,
}

#[derive(Debug, Serialize, FromRow, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AdminMessageResponse {
    pub id: Uuid,
    pub title: String,
    pub content: String,
    pub kind: String,
    pub priority: i16,
    pub audience: String,
    pub status: String,
    pub link_url: Option<String>,
    pub link_label: Option<String>,
    pub publish_at: Option<DateTime<Utc>>,
    pub expire_at: Option<DateTime<Utc>>,
    pub version: i64,
    pub created_by_subject: String,
    pub target_principal_ids: Vec<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AdminMessagesResponse {
    pub messages: Vec<AdminMessageResponse>,
}

#[derive(Debug, Serialize, FromRow, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MessageCenterItem {
    pub id: Uuid,
    pub title: String,
    pub content: String,
    pub kind: String,
    pub priority: i16,
    pub audience: String,
    pub link_url: Option<String>,
    pub link_label: Option<String>,
    pub publish_at: Option<DateTime<Utc>>,
    pub expire_at: Option<DateTime<Utc>>,
    pub read_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MessagesResponse {
    pub messages: Vec<MessageCenterItem>,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UnreadCountResponse {
    pub unread_count: i64,
}

struct ValidatedMessageInput {
    title: String,
    content: String,
    kind: String,
    priority: i16,
    audience: String,
    link_url: Option<String>,
    link_label: Option<String>,
    publish_at: Option<DateTime<Utc>>,
    expire_at: Option<DateTime<Utc>>,
    target_principal_ids: Vec<Uuid>,
}

pub async fn list_admin_messages(
    pool: &PgPool,
    query: MessageListQuery,
) -> AppResult<AdminMessagesResponse> {
    let status = normalize_status_filter(query.status.as_deref())?;
    let search = query
        .query
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    let limit = query.limit.unwrap_or(50).clamp(1, 100);

    let messages = match (status, search) {
        (Some(status), Some(search)) => {
            sqlx::query_as::<_, AdminMessageResponse>(&format!(
                "{ADMIN_MESSAGE_SELECT}
                 WHERE m.status = $1 AND (m.title ILIKE $2 OR m.content ILIKE $2)
                 GROUP BY m.id
                 ORDER BY m.updated_at DESC
                 LIMIT $3"
            ))
            .bind(status)
            .bind(format!("%{search}%"))
            .bind(limit)
            .fetch_all(pool)
            .await?
        }
        (Some(status), None) => {
            sqlx::query_as::<_, AdminMessageResponse>(&format!(
                "{ADMIN_MESSAGE_SELECT}
                 WHERE m.status = $1
                 GROUP BY m.id
                 ORDER BY m.updated_at DESC
                 LIMIT $2"
            ))
            .bind(status)
            .bind(limit)
            .fetch_all(pool)
            .await?
        }
        (None, Some(search)) => {
            sqlx::query_as::<_, AdminMessageResponse>(&format!(
                "{ADMIN_MESSAGE_SELECT}
                 WHERE m.title ILIKE $1 OR m.content ILIKE $1
                 GROUP BY m.id
                 ORDER BY m.updated_at DESC
                 LIMIT $2"
            ))
            .bind(format!("%{search}%"))
            .bind(limit)
            .fetch_all(pool)
            .await?
        }
        (None, None) => {
            sqlx::query_as::<_, AdminMessageResponse>(&format!(
                "{ADMIN_MESSAGE_SELECT}
                 GROUP BY m.id
                 ORDER BY m.updated_at DESC
                 LIMIT $1"
            ))
            .bind(limit)
            .fetch_all(pool)
            .await?
        }
    };

    Ok(AdminMessagesResponse { messages })
}

pub async fn create_admin_message(
    pool: &PgPool,
    creator_subject: &str,
    input: UpsertMessageRequest,
) -> AppResult<AdminMessageResponse> {
    let input = validate_message_input(input)?;
    let id = Uuid::new_v4();
    let mut tx = pool.begin().await?;

    sqlx::query(
        "INSERT INTO messages (
             id, title, content, kind, priority, audience, status, link_url, link_label,
             publish_at, expire_at, created_by_subject
         ) VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8, $9, $10, $11)",
    )
    .bind(id)
    .bind(&input.title)
    .bind(&input.content)
    .bind(&input.kind)
    .bind(input.priority)
    .bind(&input.audience)
    .bind(&input.link_url)
    .bind(&input.link_label)
    .bind(input.publish_at)
    .bind(input.expire_at)
    .bind(creator_subject)
    .execute(&mut *tx)
    .await?;

    replace_targets(&mut tx, id, &input).await?;
    tx.commit().await?;
    get_admin_message(pool, id).await
}

pub async fn update_admin_message(
    pool: &PgPool,
    id: Uuid,
    input: UpsertMessageRequest,
) -> AppResult<AdminMessageResponse> {
    let input = validate_message_input(input)?;
    let mut tx = pool.begin().await?;
    let updated = sqlx::query_scalar::<_, Uuid>(
        "UPDATE messages
         SET title = $2,
             content = $3,
             kind = $4,
             priority = $5,
             audience = $6,
             link_url = $7,
             link_label = $8,
             publish_at = $9,
             expire_at = $10,
             version = CASE WHEN status = 'published' THEN version + 1 ELSE version END,
             updated_at = now()
         WHERE id = $1 AND status <> 'archived'
         RETURNING id",
    )
    .bind(id)
    .bind(&input.title)
    .bind(&input.content)
    .bind(&input.kind)
    .bind(input.priority)
    .bind(&input.audience)
    .bind(&input.link_url)
    .bind(&input.link_label)
    .bind(input.publish_at)
    .bind(input.expire_at)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| AppError::not_found("消息不存在或已归档"))?;

    replace_targets(&mut tx, updated, &input).await?;
    tx.commit().await?;

    let message = get_admin_message(pool, id).await?;
    if message.status == "published" {
        notify_admin_message_event(pool, "message.updated", &message).await?;
    }
    Ok(message)
}

pub async fn publish_admin_message(pool: &PgPool, id: Uuid) -> AppResult<AdminMessageResponse> {
    sqlx::query_scalar::<_, Uuid>(
        "UPDATE messages
         SET status = 'published',
             publish_at = COALESCE(publish_at, now()),
             version = version + 1,
             updated_at = now()
         WHERE id = $1 AND status <> 'archived'
         RETURNING id",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::not_found("消息不存在或已归档"))?;

    let message = get_admin_message(pool, id).await?;
    notify_admin_message_event(pool, "message.published", &message).await?;
    Ok(message)
}

pub async fn archive_admin_message(pool: &PgPool, id: Uuid) -> AppResult<AdminMessageResponse> {
    sqlx::query_scalar::<_, Uuid>(
        "UPDATE messages
         SET status = 'archived', version = version + 1, updated_at = now()
         WHERE id = $1
         RETURNING id",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::not_found("消息不存在"))?;

    let message = get_admin_message(pool, id).await?;
    notify_admin_message_event(pool, "message.archived", &message).await?;
    Ok(message)
}

pub async fn list_public_messages(pool: &PgPool, limit: i64) -> AppResult<MessagesResponse> {
    let messages = sqlx::query_as::<_, MessageCenterItem>(PUBLIC_MESSAGES_SQL)
        .bind(limit.clamp(1, 100))
        .fetch_all(pool)
        .await?;
    Ok(MessagesResponse { messages })
}

pub async fn list_account_messages(
    pool: &PgPool,
    principal_id: Uuid,
    limit: i64,
) -> AppResult<MessagesResponse> {
    let messages = sqlx::query_as::<_, MessageCenterItem>(ACCOUNT_MESSAGES_SQL)
        .bind(principal_id)
        .bind(limit.clamp(1, 100))
        .fetch_all(pool)
        .await?;
    Ok(MessagesResponse { messages })
}

pub async fn get_account_unread_count(
    pool: &PgPool,
    principal_id: Uuid,
) -> AppResult<UnreadCountResponse> {
    let unread_count = sqlx::query_scalar::<_, i64>(ACCOUNT_UNREAD_COUNT_SQL)
        .bind(principal_id)
        .fetch_one(pool)
        .await?;
    Ok(UnreadCountResponse { unread_count })
}

pub async fn mark_account_message_read(
    pool: &PgPool,
    principal_id: Uuid,
    message_id: Uuid,
) -> AppResult<UnreadCountResponse> {
    if !is_message_visible_to_account(pool, message_id, principal_id).await? {
        return Err(AppError::not_found("消息不存在"));
    }

    sqlx::query(
        "INSERT INTO account_message_states (principal_id, message_id, read_at)
         VALUES ($1, $2, now())
         ON CONFLICT (principal_id, message_id)
         DO UPDATE SET read_at = COALESCE(account_message_states.read_at, EXCLUDED.read_at)",
    )
    .bind(principal_id)
    .bind(message_id)
    .execute(pool)
    .await?;

    get_account_unread_count(pool, principal_id).await
}

pub async fn mark_all_account_messages_read(
    pool: &PgPool,
    principal_id: Uuid,
) -> AppResult<UnreadCountResponse> {
    sqlx::query(ACCOUNT_MARK_ALL_READ_SQL)
        .bind(principal_id)
        .execute(pool)
        .await?;
    get_account_unread_count(pool, principal_id).await
}

pub async fn is_message_visible_to_account(
    pool: &PgPool,
    message_id: Uuid,
    principal_id: Uuid,
) -> AppResult<bool> {
    let count = sqlx::query_scalar::<_, i64>(ACCOUNT_VISIBLE_MESSAGE_COUNT_SQL)
        .bind(message_id)
        .bind(principal_id)
        .fetch_one(pool)
        .await?;
    Ok(count > 0)
}

async fn get_admin_message(pool: &PgPool, id: Uuid) -> AppResult<AdminMessageResponse> {
    sqlx::query_as::<_, AdminMessageResponse>(&format!(
        "{ADMIN_MESSAGE_SELECT}
         WHERE m.id = $1
         GROUP BY m.id"
    ))
    .bind(id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::not_found("消息不存在"))
}

async fn replace_targets(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    message_id: Uuid,
    input: &ValidatedMessageInput,
) -> AppResult<()> {
    sqlx::query("DELETE FROM message_targets WHERE message_id = $1")
        .bind(message_id)
        .execute(&mut **tx)
        .await?;

    if input.audience != "accounts" {
        return Ok(());
    }

    for principal_id in &input.target_principal_ids {
        sqlx::query(
            "INSERT INTO message_targets (message_id, principal_id)
             VALUES ($1, $2)
             ON CONFLICT (message_id, principal_id) DO NOTHING",
        )
        .bind(message_id)
        .bind(principal_id)
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}

async fn notify_admin_message_event(
    pool: &PgPool,
    event_type: &str,
    message: &AdminMessageResponse,
) -> AppResult<()> {
    notify_message_event(
        pool,
        &MessageEvent {
            event_type: event_type.to_string(),
            message_id: message.id,
            version: message.version,
            audience: message.audience.clone(),
        },
    )
    .await
}

fn validate_message_input(input: UpsertMessageRequest) -> AppResult<ValidatedMessageInput> {
    let title = input.title.trim().to_string();
    if title.is_empty() {
        return Err(AppError::bad_request("标题不能为空"));
    }
    if title.len() > 200 {
        return Err(AppError::bad_request("标题过长"));
    }

    let content = input.content.trim().to_string();
    if content.is_empty() {
        return Err(AppError::bad_request("内容不能为空"));
    }
    if content.len() > 10_000 {
        return Err(AppError::bad_request("内容过长"));
    }

    let kind = validate_choice(
        input.kind.as_str(),
        &["update", "notice", "activity", "maintenance"],
        "消息类型无效",
    )?;
    let audience = validate_choice(
        input.audience.as_str(),
        &["public", "authenticated", "accounts"],
        "消息受众无效",
    )?;
    let link_url = normalize_optional(input.link_url);
    if let Some(url) = link_url.as_deref() {
        validate_link_url(url)?;
    }
    let link_label = normalize_optional(input.link_label);
    let target_principal_ids = if audience == "accounts" {
        let ids = input.target_principal_ids.unwrap_or_default();
        if ids.is_empty() {
            return Err(AppError::bad_request("定向消息必须选择账号"));
        }
        ids
    } else {
        Vec::new()
    };

    if let (Some(publish_at), Some(expire_at)) = (input.publish_at, input.expire_at) {
        if expire_at <= publish_at {
            return Err(AppError::bad_request("过期时间必须晚于发布时间"));
        }
    }

    Ok(ValidatedMessageInput {
        title,
        content,
        kind,
        priority: input.priority.unwrap_or(0),
        audience,
        link_url,
        link_label,
        publish_at: input.publish_at,
        expire_at: input.expire_at,
        target_principal_ids,
    })
}

fn validate_choice(value: &str, allowed: &[&str], error: &str) -> AppResult<String> {
    let value = value.trim();
    if allowed.iter().any(|allowed| *allowed == value) {
        Ok(value.to_string())
    } else {
        Err(AppError::bad_request(error))
    }
}

fn validate_link_url(value: &str) -> AppResult<()> {
    if value.chars().any(char::is_control) {
        return Err(AppError::bad_request("链接格式无效"));
    }
    if value.starts_with("http://") || value.starts_with("https://") {
        return Ok(());
    }
    if value.starts_with('/') && !value.starts_with("//") {
        return Ok(());
    }
    Err(AppError::bad_request("链接只支持 http/https 或站内路径"))
}

fn normalize_optional(value: Option<String>) -> Option<String> {
    value
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn normalize_status_filter(value: Option<&str>) -> AppResult<Option<String>> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| validate_choice(value, &["draft", "published", "archived"], "消息状态无效"))
        .transpose()
}

const ADMIN_MESSAGE_SELECT: &str =
    "SELECT m.id, m.title, m.content, m.kind, m.priority, m.audience, m.status,
            m.link_url, m.link_label, m.publish_at, m.expire_at, m.version,
            m.created_by_subject,
            COALESCE(array_agg(t.principal_id ORDER BY t.created_at) FILTER (WHERE t.principal_id IS NOT NULL), ARRAY[]::uuid[]) AS target_principal_ids,
            m.created_at, m.updated_at
     FROM messages m
     LEFT JOIN message_targets t ON t.message_id = m.id";

const PUBLIC_MESSAGES_SQL: &str = "SELECT m.id, m.title, m.content, m.kind, m.priority, m.audience,
            m.link_url, m.link_label, m.publish_at, m.expire_at,
            NULL::timestamptz AS read_at,
            m.created_at, m.updated_at
     FROM messages m
     WHERE m.audience = 'public'
       AND m.status = 'published'
       AND (m.publish_at IS NULL OR m.publish_at <= now())
       AND (m.expire_at IS NULL OR m.expire_at > now())
     ORDER BY m.priority DESC, COALESCE(m.publish_at, m.created_at) DESC
     LIMIT $1";

const ACCOUNT_MESSAGES_SQL: &str =
    "SELECT m.id, m.title, m.content, m.kind, m.priority, m.audience,
            m.link_url, m.link_label, m.publish_at, m.expire_at,
            s.read_at,
            m.created_at, m.updated_at
     FROM messages m
     LEFT JOIN account_message_states s ON s.message_id = m.id AND s.principal_id = $1
     WHERE m.status = 'published'
       AND (m.publish_at IS NULL OR m.publish_at <= now())
       AND (m.expire_at IS NULL OR m.expire_at > now())
       AND s.dismissed_at IS NULL
       AND (
         m.audience IN ('public', 'authenticated')
         OR EXISTS (
           SELECT 1 FROM message_targets t
           WHERE t.message_id = m.id AND t.principal_id = $1
         )
       )
     ORDER BY m.priority DESC, COALESCE(m.publish_at, m.created_at) DESC
     LIMIT $2";

const ACCOUNT_UNREAD_COUNT_SQL: &str = "SELECT COUNT(*)
     FROM messages m
     LEFT JOIN account_message_states s ON s.message_id = m.id AND s.principal_id = $1
     WHERE m.status = 'published'
       AND (m.publish_at IS NULL OR m.publish_at <= now())
       AND (m.expire_at IS NULL OR m.expire_at > now())
       AND s.dismissed_at IS NULL
       AND s.read_at IS NULL
       AND (
         m.audience IN ('public', 'authenticated')
         OR EXISTS (
           SELECT 1 FROM message_targets t
           WHERE t.message_id = m.id AND t.principal_id = $1
         )
       )";

const ACCOUNT_VISIBLE_MESSAGE_COUNT_SQL: &str = "SELECT COUNT(*)
     FROM messages m
     WHERE m.id = $1
       AND m.status = 'published'
       AND (m.publish_at IS NULL OR m.publish_at <= now())
       AND (m.expire_at IS NULL OR m.expire_at > now())
       AND (
         m.audience IN ('public', 'authenticated')
         OR EXISTS (
           SELECT 1 FROM message_targets t
           WHERE t.message_id = m.id AND t.principal_id = $2
         )
       )";

const ACCOUNT_MARK_ALL_READ_SQL: &str =
    "INSERT INTO account_message_states (principal_id, message_id, read_at)
     SELECT $1, m.id, now()
     FROM messages m
     WHERE m.status = 'published'
       AND (m.publish_at IS NULL OR m.publish_at <= now())
       AND (m.expire_at IS NULL OR m.expire_at > now())
       AND (
         m.audience IN ('public', 'authenticated')
         OR EXISTS (
           SELECT 1 FROM message_targets t
           WHERE t.message_id = m.id AND t.principal_id = $1
         )
       )
     ON CONFLICT (principal_id, message_id)
     DO UPDATE SET read_at = COALESCE(account_message_states.read_at, EXCLUDED.read_at)";
