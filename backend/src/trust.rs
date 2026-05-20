use crate::{
    config::AppConfig,
    error::{AppError, AppResult},
};
use axum::http::{header::AUTHORIZATION, HeaderMap, StatusCode};
use reqwest::Client;
use serde::Deserialize;

#[derive(Clone)]
pub struct TrustClient {
    client: Client,
    issuer: String,
    userinfo_url: String,
    client_id: String,
}

#[derive(Debug)]
pub struct TrustPrincipal {
    pub issuer: String,
    pub subject: String,
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Deserialize)]
struct TrustUserInfo {
    sub: String,
    preferred_username: Option<String>,
    name: Option<String>,
    email: Option<String>,
    picture: Option<String>,
    azp: Option<String>,
}

impl TrustClient {
    pub fn new(config: &AppConfig) -> Self {
        let issuer = format!("{}/realms/{}", config.trust_base_url, config.trust_realm);
        Self {
            client: Client::new(),
            userinfo_url: format!("{issuer}/protocol/openid-connect/userinfo"),
            issuer,
            client_id: config.trust_client_id.clone(),
        }
    }

    pub async fn authenticate(&self, headers: &HeaderMap) -> AppResult<TrustPrincipal> {
        let token = extract_bearer_token(headers)?;
        let response = self
            .client
            .get(&self.userinfo_url)
            .bearer_auth(token)
            .send()
            .await
            .map_err(|error| {
                tracing::warn!(?error, "trust userinfo request failed");
                AppError::external("Trust IAM 请求失败")
            })?;

        let status = response.status();
        if status == StatusCode::UNAUTHORIZED || status == StatusCode::FORBIDDEN {
            return Err(AppError::unauthorized("登录已过期，请重新登录"));
        }
        if !status.is_success() {
            tracing::warn!(%status, "trust userinfo returned non-success status");
            return Err(AppError::external("Trust IAM 用户信息获取失败"));
        }

        let userinfo = response.json::<TrustUserInfo>().await.map_err(|error| {
            tracing::warn!(?error, "trust userinfo response parse failed");
            AppError::external("Trust IAM 用户信息格式无效")
        })?;

        if userinfo.sub.trim().is_empty() {
            return Err(AppError::unauthorized("Trust IAM 用户标识无效"));
        }

        if let Some(azp) = userinfo.azp.as_deref() {
            if !azp.is_empty() && azp != self.client_id {
                return Err(AppError::unauthorized("Trust IAM 客户端不匹配"));
            }
        }

        Ok(TrustPrincipal {
            issuer: self.issuer.clone(),
            subject: userinfo.sub,
            display_name: userinfo.name.or(userinfo.preferred_username),
            email: userinfo.email,
            avatar_url: userinfo.picture,
        })
    }
}

fn extract_bearer_token(headers: &HeaderMap) -> AppResult<&str> {
    let header = headers
        .get(AUTHORIZATION)
        .ok_or_else(|| AppError::unauthorized("缺少登录凭证"))?
        .to_str()
        .map_err(|_| AppError::unauthorized("登录凭证格式无效"))?;
    let (scheme, token) = header
        .split_once(' ')
        .ok_or_else(|| AppError::unauthorized("登录凭证格式无效"))?;

    if !scheme.eq_ignore_ascii_case("Bearer") || token.trim().is_empty() {
        return Err(AppError::unauthorized("登录凭证格式无效"));
    }

    Ok(token.trim())
}
