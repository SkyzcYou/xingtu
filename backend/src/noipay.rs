use crate::{
    config::AppConfig,
    error::{AppError, AppResult},
    models::{PaymentOrder, PaymentStatus},
    payment_provider::{
        CreatePaymentInput, CreatePaymentOutput, PaymentProvider, PaymentProviderKind,
        PaymentWebhookEvent, PaymentWebhookInput, QueryPaymentOutput,
    },
};
use axum::http::{HeaderMap, Method};
use chrono::Utc;
use hmac::{Hmac, Mac};
use reqwest::Client;
use rust_decimal::{prelude::ToPrimitive, Decimal};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::Sha256;
use std::{future::Future, pin::Pin, time::Duration};

type HmacSha256 = Hmac<Sha256>;

const NOIPAY_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const NOIPAY_REQUEST_TIMEOUT: Duration = Duration::from_secs(20);
const NOIPAY_WEBHOOK_TOLERANCE_SECONDS: i64 = 300;

#[derive(Clone)]
pub struct NoipayClient {
    api_base: String,
    app_id: String,
    app_secret: String,
    webhook_secret: String,
    client: Client,
}

#[derive(Serialize)]
struct NoipayCreatePaymentRequest {
    amount: i64,
    currency: &'static str,
    channel: String,
    subject: String,
    description: Option<String>,
    return_url: String,
}

#[derive(Deserialize)]
struct NoipayCreatePaymentResponse {
    id: String,
    #[serde(rename = "status")]
    _status: String,
    cashier_url: String,
}

#[derive(Deserialize)]
struct NoipayQueryPaymentResponse {
    id: String,
    status: String,
    amount: Option<i64>,
    paid_order_no: Option<String>,
    buyer: Option<String>,
}

impl NoipayClient {
    pub fn new(config: &AppConfig) -> AppResult<Self> {
        Ok(Self {
            api_base: config.noipay_api_base.trim_end_matches('/').to_string(),
            app_id: config
                .noipay_app_id
                .clone()
                .ok_or_else(|| AppError::config("missing required env NOIPAY_APP_ID"))?,
            app_secret: config
                .noipay_app_secret
                .clone()
                .ok_or_else(|| AppError::config("missing required env NOIPAY_APP_SECRET"))?,
            webhook_secret: config
                .noipay_webhook_secret
                .clone()
                .ok_or_else(|| AppError::config("missing required env NOIPAY_WEBHOOK_SECRET"))?,
            client: Client::builder()
                .connect_timeout(NOIPAY_CONNECT_TIMEOUT)
                .timeout(NOIPAY_REQUEST_TIMEOUT)
                .build()?,
        })
    }

    async fn create_payment_inner(
        &self,
        input: CreatePaymentInput,
    ) -> AppResult<CreatePaymentOutput> {
        let body = NoipayCreatePaymentRequest {
            amount: yuan_to_cents(input.amount)?,
            currency: "CNY",
            channel: map_channel(&input.pay_channel)?,
            subject: input.name,
            description: input.param,
            return_url: input.return_url,
        };
        let response = self
            .send_json_body::<NoipayCreatePaymentResponse, _>(Method::POST, "/v1/payments", &body)
            .await?;

        Ok(CreatePaymentOutput {
            provider_trade_no: Some(response.id),
            api_trade_no: None,
            pay_type: Some("cashier_url".to_string()),
            pay_info: Some(response.cashier_url),
        })
    }

    async fn query_payment_inner(&self, order: &PaymentOrder) -> AppResult<QueryPaymentOutput> {
        let provider_trade_no = order
            .provider_trade_no
            .as_deref()
            .or(order.qingke_trade_no.as_deref())
            .ok_or_else(|| AppError::bad_request("missing noipay payment id"))?;
        let path = format!("/v1/payments/{provider_trade_no}");
        let response = self
            .send_empty::<NoipayQueryPaymentResponse>(Method::GET, &path)
            .await?;

        Ok(QueryPaymentOutput {
            provider_trade_no: Some(response.id),
            api_trade_no: response.paid_order_no,
            buyer: response.buyer,
            amount: response.amount.map(cents_to_yuan).transpose()?,
            status: map_status(&response.status),
        })
    }

    async fn parse_webhook_inner(
        &self,
        input: PaymentWebhookInput,
    ) -> AppResult<PaymentWebhookEvent> {
        let body = std::str::from_utf8(&input.raw_body)
            .map_err(|_| AppError::bad_request("invalid noipay webhook body"))?;
        self.verify_webhook_signature(&input.headers, body)?;
        let payload: Value = serde_json::from_str(body)?;

        let payment = payload.get("data").unwrap_or(&payload);
        let status = string_field(payment, "status")
            .or_else(|| string_field(&payload, "status"))
            .ok_or_else(|| AppError::bad_request("missing noipay status"))?;
        let provider_trade_no = string_field(payment, "id")
            .or_else(|| string_field(payment, "payment_id"))
            .or_else(|| string_field(&payload, "payment_id"));
        let out_trade_no = string_field(payment, "out_trade_no")
            .or_else(|| string_field(payment, "merchant_order_no"))
            .or_else(|| string_field(payment, "order_no"));
        let amount = integer_field(payment, "amount")
            .or_else(|| integer_field(&payload, "amount"))
            .map(cents_to_yuan)
            .transpose()?
            .ok_or_else(|| AppError::bad_request("missing noipay amount"))?;

        Ok(PaymentWebhookEvent {
            out_trade_no,
            provider_trade_no,
            api_trade_no: string_field(payment, "paid_order_no"),
            buyer: string_field(payment, "buyer"),
            amount,
            status: map_status(&status),
            payload,
        })
    }

    async fn send_json_body<T, B>(&self, method: Method, path: &str, body: &B) -> AppResult<T>
    where
        T: for<'de> Deserialize<'de>,
        B: Serialize + ?Sized,
    {
        self.send_signed(method, path, serde_json::to_string(body)?)
            .await
    }

    async fn send_empty<T>(&self, method: Method, path: &str) -> AppResult<T>
    where
        T: for<'de> Deserialize<'de>,
    {
        self.send_signed(method, path, String::new()).await
    }

    async fn send_signed<T>(&self, method: Method, path: &str, body: String) -> AppResult<T>
    where
        T: for<'de> Deserialize<'de>,
    {
        let timestamp = Utc::now().timestamp().to_string();
        let signature = sign_hmac(&self.app_secret, &timestamp, &body)?;
        let request = self
            .client
            .request(method, noipay_url(&self.api_base, path))
            .header("X-NoiPay-AppId", &self.app_id)
            .header("X-NoiPay-Timestamp", &timestamp)
            .header("X-NoiPay-Signature", signature)
            .header("Content-Type", "application/json")
            .body(body);

        let response = request
            .send()
            .await
            .map_err(|error| {
                tracing::warn!(?error, path, "noipay request failed");
                AppError::external("NoiPay 请求超时或失败")
            })?
            .error_for_status()
            .map_err(|error| {
                tracing::warn!(?error, path, "noipay returned error status");
                AppError::external("NoiPay 返回错误状态")
            })?;

        response.json::<T>().await.map_err(Into::into)
    }

    fn verify_webhook_signature(&self, headers: &HeaderMap, body: &str) -> AppResult<()> {
        let timestamp = header_value(
            headers,
            &[
                "x-noipay-timestamp",
                "x-noipay-webhook-timestamp",
                "noipay-timestamp",
            ],
        )
        .ok_or_else(|| AppError::bad_request("missing noipay webhook timestamp"))?;
        let signature = header_value(
            headers,
            &[
                "x-noipay-signature",
                "x-noipay-webhook-signature",
                "noipay-signature",
            ],
        )
        .ok_or_else(|| AppError::bad_request("missing noipay webhook signature"))?;
        validate_webhook_timestamp(&timestamp)?;
        let expected = sign_hmac(&self.webhook_secret, &timestamp, body)?;
        if !constant_time_eq(expected.as_bytes(), signature.as_bytes()) {
            return Err(AppError::bad_request("invalid noipay webhook signature"));
        }
        Ok(())
    }
}

impl PaymentProvider for NoipayClient {
    fn kind(&self) -> PaymentProviderKind {
        PaymentProviderKind::Noipay
    }

    fn create_payment<'a>(
        &'a self,
        input: CreatePaymentInput,
    ) -> Pin<Box<dyn Future<Output = AppResult<CreatePaymentOutput>> + Send + 'a>> {
        Box::pin(async move { self.create_payment_inner(input).await })
    }

    fn query_payment<'a>(
        &'a self,
        order: &'a PaymentOrder,
    ) -> Pin<Box<dyn Future<Output = AppResult<QueryPaymentOutput>> + Send + 'a>> {
        Box::pin(async move { self.query_payment_inner(order).await })
    }

    fn parse_webhook<'a>(
        &'a self,
        input: PaymentWebhookInput,
    ) -> Pin<Box<dyn Future<Output = AppResult<PaymentWebhookEvent>> + Send + 'a>> {
        Box::pin(async move { self.parse_webhook_inner(input).await })
    }
}

fn noipay_url(api_base: &str, path: &str) -> String {
    format!("{}{}", api_base.trim_end_matches('/'), path)
}

fn sign_hmac(secret: &str, timestamp: &str, body: &str) -> AppResult<String> {
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|_| AppError::config("invalid noipay secret"))?;
    mac.update(format!("{timestamp}.{body}").as_bytes());
    Ok(format!("v1={}", hex::encode(mac.finalize().into_bytes())))
}

fn map_channel(pay_channel: &str) -> AppResult<String> {
    match pay_channel {
        "alipay" => Ok("alipay".to_string()),
        "wxpay" => Ok("wechat".to_string()),
        _ => Err(AppError::bad_request("pay_channel must be alipay or wxpay")),
    }
}

fn map_status(status: &str) -> PaymentStatus {
    match status {
        "paid" => PaymentStatus::Paid,
        "refunded" => PaymentStatus::Refunded,
        "canceled" | "expired" => PaymentStatus::Failed,
        _ => PaymentStatus::Pending,
    }
}

fn yuan_to_cents(amount: Decimal) -> AppResult<i64> {
    let cents = amount * Decimal::from(100);
    if !cents.fract().is_zero() {
        return Err(AppError::bad_request(
            "amount must be representable in cents",
        ));
    }
    cents
        .to_i64()
        .ok_or_else(|| AppError::bad_request("amount is out of range"))
}

fn cents_to_yuan(amount: i64) -> AppResult<Decimal> {
    Ok(Decimal::from(amount) / Decimal::from(100))
}

fn validate_webhook_timestamp(timestamp: &str) -> AppResult<()> {
    let timestamp = timestamp
        .parse::<i64>()
        .map_err(|_| AppError::bad_request("invalid noipay webhook timestamp"))?;
    let now = Utc::now().timestamp();
    if (now - timestamp).abs() > NOIPAY_WEBHOOK_TOLERANCE_SECONDS {
        return Err(AppError::bad_request("expired noipay webhook timestamp"));
    }
    Ok(())
}

fn header_value(headers: &HeaderMap, names: &[&str]) -> Option<String> {
    names.iter().find_map(|name| {
        headers
            .get(*name)
            .and_then(|value| value.to_str().ok())
            .map(str::to_string)
    })
}

fn string_field(value: &Value, key: &str) -> Option<String> {
    value.get(key).and_then(|value| match value {
        Value::String(value) if !value.is_empty() => Some(value.clone()),
        Value::Number(value) => Some(value.to_string()),
        _ => None,
    })
}

fn integer_field(value: &Value, key: &str) -> Option<i64> {
    value.get(key).and_then(|value| match value {
        Value::Number(value) => value.as_i64(),
        Value::String(value) => value.parse::<i64>().ok(),
        _ => None,
    })
}

fn constant_time_eq(left: &[u8], right: &[u8]) -> bool {
    if left.len() != right.len() {
        return false;
    }
    left.iter()
        .zip(right.iter())
        .fold(0u8, |acc, (left, right)| acc | (left ^ right))
        == 0
}

#[cfg(test)]
mod tests {
    use super::{map_channel, map_status, noipay_url, validate_webhook_timestamp, yuan_to_cents};
    use crate::models::PaymentStatus;
    use chrono::Utc;
    use rust_decimal::Decimal;

    #[test]
    fn builds_urls_without_duplicate_api_segment() {
        assert_eq!(
            noipay_url("https://api.noipay.net/api", "/v1/payments"),
            "https://api.noipay.net/api/v1/payments"
        );
    }

    #[test]
    fn maps_channels() {
        assert_eq!(map_channel("alipay").unwrap(), "alipay");
        assert_eq!(map_channel("wxpay").unwrap(), "wechat");
        assert!(map_channel("qqpay").is_err());
    }

    #[test]
    fn maps_statuses() {
        assert_eq!(map_status("pending"), PaymentStatus::Pending);
        assert_eq!(map_status("paid"), PaymentStatus::Paid);
        assert_eq!(map_status("refunded"), PaymentStatus::Refunded);
        assert_eq!(map_status("expired"), PaymentStatus::Failed);
    }

    #[test]
    fn converts_yuan_to_cents() {
        assert_eq!(yuan_to_cents(Decimal::new(990, 2)).unwrap(), 990);
        assert!(yuan_to_cents(Decimal::new(1, 3)).is_err());
    }

    #[test]
    fn validates_webhook_timestamp_window() {
        let now = Utc::now().timestamp().to_string();
        let expired = (Utc::now().timestamp() - 301).to_string();

        assert!(validate_webhook_timestamp(&now).is_ok());
        assert!(validate_webhook_timestamp(&expired).is_err());
        assert!(validate_webhook_timestamp("not-a-timestamp").is_err());
    }
}
