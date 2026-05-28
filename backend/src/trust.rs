use crate::{
    config::AppConfig,
    error::{AppError, AppResult},
};
use axum::http::{header::AUTHORIZATION, HeaderMap, StatusCode};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use reqwest::Client;
use serde::Deserialize;
use std::collections::{HashMap, HashSet};

#[derive(Clone)]
pub struct TrustClient {
    client: Client,
    issuer: String,
    userinfo_url: String,
    client_ids: HashSet<String>,
}

#[derive(Debug)]
pub struct TrustPrincipal {
    pub issuer: String,
    pub subject: String,
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub avatar_url: Option<String>,
    pub realm_roles: Vec<String>,
    pub resource_roles: HashMap<String, Vec<String>>,
}

#[derive(Deserialize)]
struct RoleAccess {
    roles: Option<Vec<String>>,
}

#[derive(Deserialize)]
struct TrustUserInfo {
    sub: String,
    azp: Option<String>,
    name: Option<String>,
    preferred_username: Option<String>,
    email: Option<String>,
    picture: Option<String>,
    realm_access: Option<RoleAccess>,
    resource_access: Option<HashMap<String, RoleAccess>>,
}

#[derive(Deserialize)]
struct TokenRoleClaims {
    realm_access: Option<RoleAccess>,
    resource_access: Option<HashMap<String, RoleAccess>>,
}

impl TrustClient {
    pub fn new(config: &AppConfig) -> Self {
        let issuer = format!("{}/realms/{}", config.trust_base_url, config.trust_realm);
        Self {
            client: Client::new(),
            issuer: issuer.clone(),
            userinfo_url: format!("{issuer}/protocol/openid-connect/userinfo"),
            client_ids: config.trust_client_ids.iter().cloned().collect(),
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
            let azp = azp.trim();
            if !azp.is_empty() && !self.client_ids.contains(azp) {
                return Err(AppError::unauthorized("Trust IAM 客户端不匹配"));
            }
        }

        let mut realm_roles = collect_realm_roles(&userinfo);
        let mut resource_roles = collect_resource_roles(&userinfo);
        merge_token_roles(token, &mut realm_roles, &mut resource_roles);

        Ok(TrustPrincipal {
            issuer: self.issuer.clone(),
            subject: userinfo.sub,
            display_name: first_non_empty([userinfo.name, userinfo.preferred_username]),
            email: non_empty(userinfo.email),
            avatar_url: non_empty(userinfo.picture),
            realm_roles,
            resource_roles,
        })
    }
}

impl TrustPrincipal {
    pub fn has_role(&self, role: &str, client_id: &str) -> bool {
        self.realm_roles.iter().any(|value| value == role)
            || self
                .resource_roles
                .get(client_id)
                .is_some_and(|roles| roles.iter().any(|value| value == role))
    }
}

fn first_non_empty(values: [Option<String>; 2]) -> Option<String> {
    values.into_iter().find_map(non_empty)
}

fn non_empty(value: Option<String>) -> Option<String> {
    value.and_then(|value| {
        let value = value.trim();
        if value.is_empty() {
            None
        } else {
            Some(value.to_string())
        }
    })
}

fn collect_realm_roles(userinfo: &TrustUserInfo) -> Vec<String> {
    let mut roles = HashSet::new();
    if let Some(realm_access) = &userinfo.realm_access {
        collect_role_values(realm_access.roles.as_deref(), &mut roles);
    }
    sorted_roles(roles)
}

fn collect_resource_roles(userinfo: &TrustUserInfo) -> HashMap<String, Vec<String>> {
    userinfo
        .resource_access
        .as_ref()
        .map(|resource_access| {
            resource_access
                .iter()
                .map(|(client_id, access)| {
                    let mut roles = HashSet::new();
                    collect_role_values(access.roles.as_deref(), &mut roles);
                    (client_id.clone(), sorted_roles(roles))
                })
                .collect()
        })
        .unwrap_or_default()
}

fn merge_token_roles(
    token: &str,
    realm_roles: &mut Vec<String>,
    resource_roles: &mut HashMap<String, Vec<String>>,
) {
    let Some(claims) = decode_token_role_claims(token) else {
        return;
    };

    let mut merged_realm_roles = realm_roles.iter().cloned().collect::<HashSet<_>>();
    if let Some(realm_access) = claims.realm_access {
        collect_role_values(realm_access.roles.as_deref(), &mut merged_realm_roles);
    }
    *realm_roles = sorted_roles(merged_realm_roles);

    if let Some(claim_resources) = claims.resource_access {
        claim_resources.into_iter().for_each(|(client_id, access)| {
            let mut roles = resource_roles
                .remove(&client_id)
                .unwrap_or_default()
                .into_iter()
                .collect::<HashSet<_>>();
            collect_role_values(access.roles.as_deref(), &mut roles);
            resource_roles.insert(client_id, sorted_roles(roles));
        });
    }
}

fn decode_token_role_claims(token: &str) -> Option<TokenRoleClaims> {
    let payload = token.split('.').nth(1)?;
    let bytes = URL_SAFE_NO_PAD.decode(payload).ok()?;
    serde_json::from_slice::<TokenRoleClaims>(&bytes).ok()
}

fn collect_role_values(values: Option<&[String]>, roles: &mut HashSet<String>) {
    if let Some(values) = values {
        values.iter().for_each(|role| {
            let role = role.trim();
            if !role.is_empty() {
                roles.insert(role.to_string());
            }
        });
    }
}

fn sorted_roles(roles: HashSet<String>) -> Vec<String> {
    let mut roles = roles.into_iter().collect::<Vec<_>>();
    roles.sort();
    roles
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
