use super::AppState;
use crate::{
    error::{AppError, AppResult},
    trust::TrustPrincipal,
};
use axum::http::HeaderMap;

pub async fn authenticate_admin(
    state: &AppState,
    headers: &HeaderMap,
) -> AppResult<TrustPrincipal> {
    let principal = state.trust.authenticate(headers).await?;
    let required_role = state.config.admin_required_role.trim();
    if required_role.is_empty()
        || principal.has_role(required_role, &state.config.admin_role_client_id)
    {
        return Ok(principal);
    }
    Err(AppError::forbidden("当前账号没有管理员权限"))
}
