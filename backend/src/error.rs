use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use thiserror::Error;

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("{0}")]
    BadRequest(String),
    #[error("{0}")]
    Unauthorized(String),
    #[error("{0}")]
    Forbidden(String),
    #[error("{0}")]
    NotFound(String),
    #[error("{0}")]
    External(String),
    #[error("{0}")]
    Config(String),
    #[error("internal server error")]
    Internal,
}

impl AppError {
    pub fn bad_request(message: impl Into<String>) -> Self {
        Self::BadRequest(message.into())
    }

    pub fn unauthorized(message: impl Into<String>) -> Self {
        Self::Unauthorized(message.into())
    }

    pub fn forbidden(message: impl Into<String>) -> Self {
        Self::Forbidden(message.into())
    }

    pub fn not_found(message: impl Into<String>) -> Self {
        Self::NotFound(message.into())
    }

    pub fn external(message: impl Into<String>) -> Self {
        Self::External(message.into())
    }

    pub fn config(message: impl Into<String>) -> Self {
        Self::Config(message.into())
    }
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = match &self {
            AppError::BadRequest(_) => StatusCode::BAD_REQUEST,
            AppError::Unauthorized(_) => StatusCode::UNAUTHORIZED,
            AppError::Forbidden(_) => StatusCode::FORBIDDEN,
            AppError::NotFound(_) => StatusCode::NOT_FOUND,
            AppError::External(_) => StatusCode::BAD_GATEWAY,
            AppError::Config(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::Internal => StatusCode::INTERNAL_SERVER_ERROR,
        };
        let error = self.to_string();
        (status, Json(ErrorResponse { error })).into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(error: sqlx::Error) -> Self {
        match &error {
            sqlx::Error::PoolTimedOut => {
                tracing::error!(?error, "database pool acquire timed out");
            }
            _ => {
                tracing::error!(?error, "database error");
            }
        }
        Self::Internal
    }
}

impl From<reqwest::Error> for AppError {
    fn from(error: reqwest::Error) -> Self {
        tracing::warn!(?error, "external request failed");
        Self::external("external request failed")
    }
}

impl From<serde_json::Error> for AppError {
    fn from(error: serde_json::Error) -> Self {
        tracing::warn!(?error, "json parse failed");
        Self::bad_request("invalid json")
    }
}
