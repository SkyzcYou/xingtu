use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::Serialize;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PaymentStatus {
    Pending,
    Paid,
    Refunded,
    Frozen,
    Failed,
}

impl PaymentStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            PaymentStatus::Pending => "pending",
            PaymentStatus::Paid => "paid",
            PaymentStatus::Refunded => "refunded",
            PaymentStatus::Frozen => "frozen",
            PaymentStatus::Failed => "failed",
        }
    }

    pub fn from_qingke_status(status: i32) -> Self {
        match status {
            1 => PaymentStatus::Paid,
            2 => PaymentStatus::Refunded,
            3 => PaymentStatus::Frozen,
            _ => PaymentStatus::Pending,
        }
    }
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct PaymentOrder {
    pub id: Uuid,
    pub out_trade_no: String,
    pub qingke_trade_no: Option<String>,
    pub api_trade_no: Option<String>,
    pub payment_provider: String,
    pub provider_trade_no: Option<String>,
    pub name: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub amount: Decimal,
    pub pay_channel: String,
    pub status: String,
    pub param: Option<String>,
    pub buyer: Option<String>,
    pub notify_payload: Option<serde_json::Value>,
    pub principal_id: Option<Uuid>,
    pub credit_package_id: Option<String>,
    pub credit_amount: Option<i64>,
    pub credit_ledger_id: Option<Uuid>,
    pub credited_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub paid_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentOrderResponse {
    pub out_trade_no: String,
    pub qingke_trade_no: Option<String>,
    pub api_trade_no: Option<String>,
    pub name: String,
    pub amount: String,
    pub pay_channel: String,
    pub status: String,
    pub credit_package_id: Option<String>,
    pub credit_amount: Option<i64>,
    pub credited_at: Option<DateTime<Utc>>,
    pub paid_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<PaymentOrder> for PaymentOrderResponse {
    fn from(order: PaymentOrder) -> Self {
        Self {
            out_trade_no: order.out_trade_no,
            qingke_trade_no: order.qingke_trade_no,
            api_trade_no: order.api_trade_no,
            name: order.name,
            amount: order.amount.to_string(),
            pay_channel: order.pay_channel,
            status: order.status,
            credit_package_id: order.credit_package_id,
            credit_amount: order.credit_amount,
            credited_at: order.credited_at,
            paid_at: order.paid_at,
            created_at: order.created_at,
            updated_at: order.updated_at,
        }
    }
}
