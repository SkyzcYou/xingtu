use crate::{
    error::AppResult,
    models::{PaymentOrder, PaymentStatus},
};
use axum::http::HeaderMap;
use rust_decimal::Decimal;
use serde_json::Value;
use std::{collections::BTreeMap, future::Future, pin::Pin, sync::Arc};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PaymentProviderKind {
    Qingke,
    Noipay,
}

impl PaymentProviderKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Qingke => "qingke",
            Self::Noipay => "noipay",
        }
    }

    pub fn from_str(value: &str) -> AppResult<Self> {
        match value {
            "qingke" => Ok(Self::Qingke),
            "noipay" => Ok(Self::Noipay),
            _ => Err(crate::error::AppError::config(
                "PAYMENT_PROVIDER must be qingke or noipay",
            )),
        }
    }
}

#[derive(Debug)]
pub struct CreatePaymentInput {
    pub pay_channel: String,
    pub out_trade_no: String,
    pub notify_url: String,
    pub return_url: String,
    pub name: String,
    pub amount: Decimal,
    pub client_ip: String,
    pub param: Option<String>,
    pub device: Option<String>,
}

#[derive(Debug)]
pub struct CreatePaymentOutput {
    pub provider_trade_no: Option<String>,
    pub api_trade_no: Option<String>,
    pub pay_type: Option<String>,
    pub pay_info: Option<String>,
}

#[derive(Debug)]
pub struct QueryPaymentOutput {
    pub provider_trade_no: Option<String>,
    pub api_trade_no: Option<String>,
    pub buyer: Option<String>,
    pub amount: Option<Decimal>,
    pub status: PaymentStatus,
}

#[derive(Debug)]
pub struct PaymentWebhookInput {
    pub headers: HeaderMap,
    pub query_params: BTreeMap<String, String>,
    pub raw_body: Vec<u8>,
}

#[derive(Debug)]
pub struct PaymentWebhookEvent {
    pub out_trade_no: Option<String>,
    pub provider_trade_no: Option<String>,
    pub api_trade_no: Option<String>,
    pub buyer: Option<String>,
    pub amount: Decimal,
    pub status: PaymentStatus,
    pub payload: Value,
}

pub trait PaymentProvider: Send + Sync {
    fn kind(&self) -> PaymentProviderKind;

    fn create_payment<'a>(
        &'a self,
        input: CreatePaymentInput,
    ) -> Pin<Box<dyn Future<Output = AppResult<CreatePaymentOutput>> + Send + 'a>>;

    fn query_payment<'a>(
        &'a self,
        order: &'a PaymentOrder,
    ) -> Pin<Box<dyn Future<Output = AppResult<QueryPaymentOutput>> + Send + 'a>>;

    fn parse_webhook<'a>(
        &'a self,
        input: PaymentWebhookInput,
    ) -> Pin<Box<dyn Future<Output = AppResult<PaymentWebhookEvent>> + Send + 'a>>;
}

#[derive(Clone)]
pub struct PaymentProviders {
    default: PaymentProviderKind,
    qingke: Option<Arc<dyn PaymentProvider>>,
    noipay: Option<Arc<dyn PaymentProvider>>,
}

impl PaymentProviders {
    pub fn new(
        default: PaymentProviderKind,
        qingke: Option<Arc<dyn PaymentProvider>>,
        noipay: Option<Arc<dyn PaymentProvider>>,
    ) -> Self {
        Self {
            default,
            qingke,
            noipay,
        }
    }

    pub fn default_provider(&self) -> AppResult<Arc<dyn PaymentProvider>> {
        self.provider(self.default)
    }

    pub fn provider_for_order(&self, order: &PaymentOrder) -> AppResult<Arc<dyn PaymentProvider>> {
        self.provider(PaymentProviderKind::from_str(&order.payment_provider)?)
    }

    pub fn provider(&self, kind: PaymentProviderKind) -> AppResult<Arc<dyn PaymentProvider>> {
        match kind {
            PaymentProviderKind::Qingke => self.qingke.clone(),
            PaymentProviderKind::Noipay => self.noipay.clone(),
        }
        .ok_or_else(|| {
            crate::error::AppError::config("selected payment provider is not configured")
        })
    }
}
