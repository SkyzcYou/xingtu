use crate::{
    config::AppConfig,
    error::{AppError, AppResult},
    models::PaymentStatus,
    payment_provider::{
        CreatePaymentInput, CreatePaymentOutput, PaymentProvider, PaymentProviderKind,
        PaymentWebhookEvent, PaymentWebhookInput, QueryPaymentOutput,
    },
};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use chrono::Utc;
use reqwest::Client;
use rsa::{
    pkcs1::{DecodeRsaPrivateKey, DecodeRsaPublicKey},
    pkcs8::{DecodePrivateKey, DecodePublicKey},
    Pkcs1v15Sign, RsaPrivateKey, RsaPublicKey,
};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::{collections::BTreeMap, sync::Arc, time::Duration};

const SIGN_TYPE: &str = "RSA";
const QINGKE_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const QINGKE_REQUEST_TIMEOUT: Duration = Duration::from_secs(20);

#[derive(Clone)]
pub struct QingkeClient {
    api_base: String,
    pid: String,
    client: Client,
    merchant_private_key: Arc<RsaPrivateKey>,
    platform_public_key: Arc<RsaPublicKey>,
}

#[derive(Debug)]
pub struct QingkeCreatePaymentInput {
    pub method: String,
    pub device: String,
    pub pay_channel: String,
    pub out_trade_no: String,
    pub notify_url: String,
    pub return_url: String,
    pub name: String,
    pub money: String,
    pub clientip: String,
    pub param: Option<String>,
}

#[derive(Debug)]
pub struct QingkeCreatePaymentResponse {
    pub code: i64,
    pub msg: Option<String>,
    pub trade_no: Option<String>,
    pub pay_type: Option<String>,
    pub pay_info: Option<String>,
}

#[derive(Debug)]
pub struct QingkeQueryResponse {
    pub code: i64,
    pub msg: Option<String>,
    pub trade_no: Option<String>,
    pub api_trade_no: Option<String>,
    pub status: Option<i32>,
    pub money: Option<String>,
    pub buyer: Option<String>,
}

impl QingkeClient {
    pub fn new(config: &AppConfig) -> AppResult<Self> {
        Ok(Self {
            api_base: config.qingke_api_base.trim_end_matches('/').to_string(),
            pid: config
                .qingke_pid
                .clone()
                .ok_or_else(|| AppError::config("missing required env QINGKE_PID"))?,
            client: Client::builder()
                .connect_timeout(QINGKE_CONNECT_TIMEOUT)
                .timeout(QINGKE_REQUEST_TIMEOUT)
                .build()?,
            merchant_private_key: Arc::new(parse_private_key(
                config
                    .qingke_merchant_private_key_pem
                    .as_deref()
                    .ok_or_else(|| {
                        AppError::config("missing required env QINGKE_MERCHANT_PRIVATE_KEY_PEM")
                    })?,
            )?),
            platform_public_key: Arc::new(parse_public_key(
                config
                    .qingke_platform_public_key_pem
                    .as_deref()
                    .ok_or_else(|| {
                        AppError::config("missing required env QINGKE_PLATFORM_PUBLIC_KEY_PEM")
                    })?,
            )?),
        })
    }

    pub fn pid(&self) -> &str {
        &self.pid
    }

    pub async fn create_payment(
        &self,
        input: QingkeCreatePaymentInput,
    ) -> AppResult<QingkeCreatePaymentResponse> {
        let mut params = BTreeMap::new();
        params.insert("pid".to_string(), self.pid.clone());
        params.insert("method".to_string(), input.method);
        params.insert("device".to_string(), input.device);
        params.insert("type".to_string(), input.pay_channel);
        params.insert("out_trade_no".to_string(), input.out_trade_no);
        params.insert("notify_url".to_string(), input.notify_url);
        params.insert("return_url".to_string(), input.return_url);
        params.insert("name".to_string(), input.name);
        params.insert("money".to_string(), input.money);
        params.insert("clientip".to_string(), input.clientip);
        params.insert("timestamp".to_string(), Utc::now().timestamp().to_string());
        params.insert("sign_type".to_string(), SIGN_TYPE.to_string());
        if let Some(param) = input.param {
            params.insert("param".to_string(), param);
        }
        self.sign_params(&mut params)?;

        let raw = self.post_form("/api/pay/create", &params).await?;
        let code = parse_i64(raw.get("code")).unwrap_or(-1);
        if code == 0 {
            self.verify_signed_response(&raw)?;
        }

        Ok(QingkeCreatePaymentResponse {
            code,
            msg: raw.get("msg").cloned(),
            trade_no: raw.get("trade_no").cloned(),
            pay_type: raw.get("pay_type").cloned(),
            pay_info: raw.get("pay_info").cloned(),
        })
    }

    pub async fn query_payment(&self, out_trade_no: &str) -> AppResult<QingkeQueryResponse> {
        let mut params = BTreeMap::new();
        params.insert("pid".to_string(), self.pid.clone());
        params.insert("out_trade_no".to_string(), out_trade_no.to_string());
        params.insert("timestamp".to_string(), Utc::now().timestamp().to_string());
        params.insert("sign_type".to_string(), SIGN_TYPE.to_string());
        self.sign_params(&mut params)?;

        let raw = self.post_form("/api/pay/query", &params).await?;
        let code = parse_i64(raw.get("code")).unwrap_or(-1);
        if code == 0 {
            self.verify_signed_response(&raw)?;
        }

        Ok(QingkeQueryResponse {
            code,
            msg: raw.get("msg").cloned(),
            trade_no: raw.get("trade_no").cloned(),
            api_trade_no: raw.get("api_trade_no").cloned(),
            status: raw
                .get("status")
                .and_then(|value| value.parse::<i32>().ok()),
            money: raw.get("money").cloned(),
            buyer: raw.get("buyer").cloned(),
        })
    }

    pub fn verify_notify(&self, params: &BTreeMap<String, String>) -> AppResult<()> {
        self.verify_signed_response(params)
    }

    fn sign_params(&self, params: &mut BTreeMap<String, String>) -> AppResult<()> {
        let canonical = canonicalize_params(params);
        let signature = sign_canonical(&self.merchant_private_key, &canonical)?;
        params.insert("sign".to_string(), signature);
        Ok(())
    }

    fn verify_signed_response(&self, params: &BTreeMap<String, String>) -> AppResult<()> {
        let signature = params
            .get("sign")
            .ok_or_else(|| AppError::external("qingke response missing signature"))?;
        let canonical = canonicalize_params(params);
        verify_canonical(&self.platform_public_key, &canonical, signature)
    }

    async fn post_form(
        &self,
        path: &str,
        params: &BTreeMap<String, String>,
    ) -> AppResult<BTreeMap<String, String>> {
        let response = self
            .client
            .post(format!("{}{}", self.api_base, path))
            .form(params)
            .send()
            .await
            .map_err(|error| {
                tracing::warn!(?error, path, "qingke request failed");
                AppError::external("青科支付请求超时或失败")
            })?
            .error_for_status()
            .map_err(|error| {
                tracing::warn!(?error, path, "qingke returned error status");
                AppError::external("青科支付返回错误状态")
            })?;
        let value = response.json::<Value>().await?;
        value_to_string_map(value)
    }
}

pub fn canonicalize_params(params: &BTreeMap<String, String>) -> String {
    params
        .iter()
        .filter(|(key, value)| {
            key.as_str() != "sign" && key.as_str() != "sign_type" && !value.is_empty()
        })
        .map(|(key, value)| format!("{key}={value}"))
        .collect::<Vec<_>>()
        .join("&")
}

fn sign_canonical(private_key: &RsaPrivateKey, canonical: &str) -> AppResult<String> {
    let digest = Sha256::digest(canonical.as_bytes());
    let signature = private_key
        .sign(Pkcs1v15Sign::new::<Sha256>(), &digest)
        .map_err(|_| AppError::external("failed to sign qingke request"))?;
    Ok(STANDARD.encode(signature))
}

fn verify_canonical(public_key: &RsaPublicKey, canonical: &str, signature: &str) -> AppResult<()> {
    let signature = STANDARD
        .decode(signature)
        .map_err(|_| AppError::bad_request("invalid qingke signature encoding"))?;
    let digest = Sha256::digest(canonical.as_bytes());
    public_key
        .verify(Pkcs1v15Sign::new::<Sha256>(), &digest, &signature)
        .map_err(|_| AppError::bad_request("invalid qingke signature"))
}

fn parse_private_key(pem: &str) -> AppResult<RsaPrivateKey> {
    match RsaPrivateKey::from_pkcs8_pem(pem) {
        Ok(key) => Ok(key),
        Err(_) => RsaPrivateKey::from_pkcs1_pem(pem)
            .map_err(|_| AppError::config("invalid QINGKE_MERCHANT_PRIVATE_KEY_PEM")),
    }
}

fn parse_public_key(pem: &str) -> AppResult<RsaPublicKey> {
    match RsaPublicKey::from_public_key_pem(pem) {
        Ok(key) => Ok(key),
        Err(_) => RsaPublicKey::from_pkcs1_pem(pem)
            .map_err(|_| AppError::config("invalid QINGKE_PLATFORM_PUBLIC_KEY_PEM")),
    }
}

fn value_to_string_map(value: Value) -> AppResult<BTreeMap<String, String>> {
    let object = value
        .as_object()
        .ok_or_else(|| AppError::external("qingke response must be a json object"))?;
    Ok(object
        .iter()
        .map(|(key, value)| (key.clone(), json_value_to_string(value)))
        .collect())
}

fn json_value_to_string(value: &Value) -> String {
    match value {
        Value::Null => String::new(),
        Value::String(value) => value.clone(),
        Value::Number(value) => value.to_string(),
        Value::Bool(value) => value.to_string(),
        Value::Array(_) | Value::Object(_) => value.to_string(),
    }
}

fn parse_i64(value: Option<&String>) -> Option<i64> {
    value.and_then(|value| value.parse::<i64>().ok())
}

impl PaymentProvider for QingkeClient {
    fn kind(&self) -> PaymentProviderKind {
        PaymentProviderKind::Qingke
    }

    fn create_payment<'a>(
        &'a self,
        input: CreatePaymentInput,
    ) -> std::pin::Pin<
        Box<dyn std::future::Future<Output = AppResult<CreatePaymentOutput>> + Send + 'a>,
    > {
        Box::pin(async move {
            let response = QingkeClient::create_payment(
                self,
                QingkeCreatePaymentInput {
                    method: "jump".to_string(),
                    device: input.device.unwrap_or_else(|| "pc".to_string()),
                    pay_channel: input.pay_channel,
                    out_trade_no: input.out_trade_no,
                    notify_url: input.notify_url,
                    return_url: input.return_url,
                    name: input.name,
                    money: input.amount.to_string(),
                    clientip: input.client_ip,
                    param: input.param,
                },
            )
            .await?;

            if response.code != 0 {
                return Err(AppError::external(
                    response
                        .msg
                        .unwrap_or_else(|| "qingke create payment failed".to_string()),
                ));
            }

            Ok(CreatePaymentOutput {
                provider_trade_no: response.trade_no,
                api_trade_no: None,
                pay_type: response.pay_type,
                pay_info: response.pay_info,
            })
        })
    }

    fn query_payment<'a>(
        &'a self,
        order: &'a crate::models::PaymentOrder,
    ) -> std::pin::Pin<
        Box<dyn std::future::Future<Output = AppResult<QueryPaymentOutput>> + Send + 'a>,
    > {
        Box::pin(async move {
            let response = QingkeClient::query_payment(self, &order.out_trade_no).await?;
            if response.code != 0 {
                return Err(AppError::external(
                    response
                        .msg
                        .unwrap_or_else(|| "qingke query payment failed".to_string()),
                ));
            }

            Ok(QueryPaymentOutput {
                provider_trade_no: response.trade_no,
                api_trade_no: response.api_trade_no,
                buyer: response.buyer,
                amount: response
                    .money
                    .as_deref()
                    .map(|money| {
                        rust_decimal::Decimal::from_str_exact(money)
                            .map_err(|_| AppError::external("qingke order amount is invalid"))
                    })
                    .transpose()?,
                status: response
                    .status
                    .map(PaymentStatus::from_qingke_status)
                    .unwrap_or(PaymentStatus::Pending),
            })
        })
    }

    fn parse_webhook<'a>(
        &'a self,
        input: PaymentWebhookInput,
    ) -> std::pin::Pin<
        Box<dyn std::future::Future<Output = AppResult<PaymentWebhookEvent>> + Send + 'a>,
    > {
        Box::pin(async move {
            let params = input.query_params;
            self.verify_notify(&params)?;

            if params.get("pid").map(String::as_str) != Some(self.pid()) {
                return Err(AppError::bad_request("pid mismatch"));
            }
            if params.get("trade_status").map(String::as_str) != Some("TRADE_SUCCESS") {
                return Err(AppError::bad_request("trade_status is not TRADE_SUCCESS"));
            }

            let out_trade_no = params
                .get("out_trade_no")
                .cloned()
                .ok_or_else(|| AppError::bad_request("missing out_trade_no"))?;
            let amount = params
                .get("money")
                .ok_or_else(|| AppError::bad_request("missing money"))
                .and_then(|money| {
                    rust_decimal::Decimal::from_str_exact(money)
                        .map_err(|_| AppError::bad_request("invalid money"))
                })?;

            Ok(PaymentWebhookEvent {
                out_trade_no: Some(out_trade_no),
                provider_trade_no: params.get("trade_no").cloned(),
                api_trade_no: params.get("api_trade_no").cloned(),
                buyer: params.get("buyer").cloned(),
                amount,
                status: PaymentStatus::Paid,
                payload: serde_json::json!(params),
            })
        })
    }
}

#[cfg(test)]
mod tests {
    use super::canonicalize_params;
    use std::collections::BTreeMap;

    #[test]
    fn canonicalize_sorts_and_filters_signature_fields() {
        let mut params = BTreeMap::new();
        params.insert("sign".to_string(), "ignored".to_string());
        params.insert("sign_type".to_string(), "RSA".to_string());
        params.insert("money".to_string(), "1.00".to_string());
        params.insert("empty".to_string(), String::new());
        params.insert("out_trade_no".to_string(), "XT001".to_string());
        params.insert("pid".to_string(), "1001".to_string());

        assert_eq!(
            canonicalize_params(&params),
            "money=1.00&out_trade_no=XT001&pid=1001"
        );
    }
}
