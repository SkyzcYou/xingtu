#![allow(dead_code)]

use crate::{
    credit_recharge::{
        CreditBalanceResponse, CreditUsageResponse, RechargeOrdersResponse,
        RechargePackagesResponse,
    },
    credit_settings::{CreditSettingsResponse, UpdateCreditSettingsRequest},
    credits::{
        AdjustCreditsRequest, CreditAccountDetailResponse, CreditAccountsResponse,
        CreditPricesResponse, UpdateCreditPricesRequest,
    },
    error::ErrorResponse,
    image_jobs::ImageJobResponse,
    llm_config::{
        AdminLlmConfigResponse, LlmModelsResponse, TestLlmConfigResponse, UpdateLlmConfigRequest,
    },
    messages::{
        AdminMessageResponse, AdminMessagesResponse, MessagesResponse, UnreadCountResponse,
        UpsertMessageRequest,
    },
    models::PaymentOrderResponse,
    playground_history::{
        CreatePlaygroundHistoryRequest, PlaygroundHistoryPage, PlaygroundHistoryRecord,
    },
};
use serde::{Deserialize, Serialize};
use utoipa::{OpenApi, ToSchema};

#[derive(OpenApi)]
#[openapi(
    info(title = "Xingtu API", version = env!("CARGO_PKG_VERSION")),
    paths(
        health,
        create_order,
        get_order,
        query_order,
        handle_qingke_notify,
        handle_noipay_notify,
        pay_return,
        get_packages,
        get_balance,
        get_usage,
        get_recharge_orders,
        create_recharge_order,
        get_public_messages,
        public_events,
        get_messages,
        account_events,
        get_unread_count,
        read_all_messages,
        read_message,
        list_admin_messages,
        create_admin_message,
        update_admin_message,
        publish_message,
        archive_message,
        get_credit_settings,
        update_credit_settings,
        list_credit_prices,
        update_credit_prices,
        list_credit_accounts,
        get_credit_account,
        adjust_credit_account,
        get_llm_config,
        update_llm_config,
        test_llm_config,
        get_llm_models,
        list_history,
        create_history,
        agent_chat,
        proxy_chat_completions,
        proxy_image_generations,
        proxy_image_edits,
        list_models,
        retrieve_model,
        get_generation_job
    ),
    components(schemas(
        ErrorResponse,
        OpenAiErrorResponse,
        HealthResponse,
        CreateOrderRequest,
        CreateOrderResponse,
        PaymentOrderResponse,
        CreateRechargeOrderRequest,
        CreateRechargeOrderResponse,
        RechargePackagesResponse,
        CreditBalanceResponse,
        CreditUsageResponse,
        RechargeOrdersResponse,
        MessagesResponse,
        UnreadCountResponse,
        AdminMessagesResponse,
        AdminMessageResponse,
        UpsertMessageRequest,
        CreditSettingsResponse,
        UpdateCreditSettingsRequest,
        CreditPricesResponse,
        UpdateCreditPricesRequest,
        CreditAccountsResponse,
        CreditAccountDetailResponse,
        AdjustCreditsRequest,
        AdminLlmConfigResponse,
        UpdateLlmConfigRequest,
        TestLlmConfigResponse,
        LlmModelsResponse,
        CreatePlaygroundHistoryRequest,
        PlaygroundHistoryRecord,
        PlaygroundHistoryPage,
        AgentChatRequest,
        AgentChatResponse,
        OpenAiModelResponse,
        OpenAiModelListResponse,
        ImageJobResponse,
        ImageJobPublicResponse,
        ImageJobSubmitResponse
    )),
    tags(
        (name = "system", description = "System health and HTML return pages"),
        (name = "payments", description = "Payment order and webhook APIs"),
        (name = "credits", description = "Credit balance, recharge, and admin credit APIs"),
        (name = "messages", description = "Message center and admin message APIs"),
        (name = "llm", description = "LLM proxy and admin configuration APIs"),
        (name = "playground", description = "Playground history APIs"),
        (name = "agent", description = "Server-side agent APIs")
    )
)]
pub struct ApiDoc;

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
struct HealthResponse {
    status: String,
}

#[derive(Serialize, ToSchema)]
struct OpenAiErrorResponse {
    error: OpenAiErrorBody,
}

#[derive(Serialize, ToSchema)]
struct OpenAiErrorBody {
    message: String,
    #[serde(rename = "type")]
    error_type: String,
    param: Option<String>,
    code: Option<String>,
}

#[derive(Deserialize, ToSchema)]
struct CreateOrderRequest {
    name: String,
    amount: String,
    pay_channel: Option<String>,
    device: Option<String>,
    return_url: Option<String>,
    param: Option<String>,
}

#[derive(Serialize, ToSchema)]
struct CreateOrderResponse {
    order: PaymentOrderResponse,
    pay_type: Option<String>,
    pay_info: Option<String>,
}

#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
struct CreateRechargeOrderRequest {
    package_id: String,
    pay_channel: Option<String>,
    device: Option<String>,
    return_url: Option<String>,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
struct CreateRechargeOrderResponse {
    order: PaymentOrderResponse,
    pay_type: Option<String>,
    pay_info: Option<String>,
}

#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
struct AgentChatRequest {
    message: String,
    agent: Option<String>,
    context: Option<serde_json::Value>,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
struct AgentChatResponse {
    agent: String,
    model: String,
    content: String,
}

#[derive(Serialize, ToSchema)]
struct OpenAiModelListResponse {
    object: String,
    data: Vec<OpenAiModelResponse>,
}

#[derive(Serialize, ToSchema)]
struct OpenAiModelResponse {
    id: String,
    object: String,
    created: i64,
    owned_by: String,
}

#[derive(Serialize, ToSchema)]
struct ImageJobSubmitResponse {
    job_id: uuid::Uuid,
    status: String,
    job: ImageJobPublicResponse,
}

#[derive(Serialize, ToSchema)]
struct ImageJobPublicResponse {
    job_id: uuid::Uuid,
    #[serde(flatten)]
    job: ImageJobResponse,
}

#[utoipa::path(
    get,
    path = "/health",
    tag = "system",
    responses((status = 200, description = "Backend is healthy", body = HealthResponse))
)]
fn health() {}

#[utoipa::path(
    post,
    path = "/api/orders",
    tag = "payments",
    request_body = CreateOrderRequest,
    responses(
        (status = 200, description = "Payment order created", body = CreateOrderResponse),
        (status = 400, description = "Invalid payment input", body = ErrorResponse)
    )
)]
fn create_order() {}

#[utoipa::path(
    get,
    path = "/api/orders/{out_trade_no}",
    tag = "payments",
    params(("out_trade_no" = String, Path, description = "Merchant order number")),
    responses(
        (status = 200, description = "Payment order", body = PaymentOrderResponse),
        (status = 404, description = "Order not found", body = ErrorResponse)
    )
)]
fn get_order() {}

#[utoipa::path(
    post,
    path = "/api/orders/{out_trade_no}/query",
    tag = "payments",
    params(("out_trade_no" = String, Path, description = "Merchant order number")),
    responses(
        (status = 200, description = "Updated payment order", body = PaymentOrderResponse),
        (status = 404, description = "Order not found", body = ErrorResponse)
    )
)]
fn query_order() {}

#[utoipa::path(
    get,
    path = "/api/pay/notify",
    tag = "payments",
    responses((status = 200, description = "Qingke webhook acknowledged", body = String))
)]
fn handle_qingke_notify() {}

#[utoipa::path(
    post,
    path = "/api/pay/notify",
    tag = "payments",
    responses((status = 200, description = "Noipay webhook acknowledged", body = String))
)]
fn handle_noipay_notify() {}

#[utoipa::path(
    get,
    path = "/api/pay/return",
    tag = "system",
    params(("out_trade_no" = Option<String>, Query, description = "Merchant order number")),
    responses((status = 200, description = "Payment return HTML page", content_type = "text/html", body = String))
)]
fn pay_return() {}

#[utoipa::path(get, path = "/api/credit-recharge-packages", tag = "credits", responses((status = 200, body = RechargePackagesResponse)))]
fn get_packages() {}

#[utoipa::path(get, path = "/api/credit-balance", tag = "credits", responses((status = 200, body = CreditBalanceResponse), (status = 401, body = ErrorResponse)))]
fn get_balance() {}

#[utoipa::path(get, path = "/api/credit-usage", tag = "credits", responses((status = 200, body = CreditUsageResponse), (status = 401, body = ErrorResponse)))]
fn get_usage() {}

#[utoipa::path(get, path = "/api/credit-recharge-orders", tag = "credits", responses((status = 200, body = RechargeOrdersResponse), (status = 401, body = ErrorResponse)))]
fn get_recharge_orders() {}

#[utoipa::path(post, path = "/api/credit-recharge-orders", tag = "credits", request_body = CreateRechargeOrderRequest, responses((status = 200, body = CreateRechargeOrderResponse), (status = 400, body = ErrorResponse)))]
fn create_recharge_order() {}

#[utoipa::path(get, path = "/api/public/messages", tag = "messages", params(("limit" = Option<i64>, Query, description = "Maximum messages to return")), responses((status = 200, body = MessagesResponse)))]
fn get_public_messages() {}

#[utoipa::path(get, path = "/api/public/messages/events", tag = "messages", responses((status = 200, description = "Public message events", content_type = "text/event-stream", body = String)))]
fn public_events() {}

#[utoipa::path(get, path = "/api/messages", tag = "messages", params(("limit" = Option<i64>, Query, description = "Maximum messages to return")), responses((status = 200, body = MessagesResponse), (status = 401, body = ErrorResponse)))]
fn get_messages() {}

#[utoipa::path(get, path = "/api/messages/events", tag = "messages", responses((status = 200, description = "Account message events", content_type = "text/event-stream", body = String), (status = 401, body = ErrorResponse)))]
fn account_events() {}

#[utoipa::path(get, path = "/api/messages/unread-count", tag = "messages", responses((status = 200, body = UnreadCountResponse), (status = 401, body = ErrorResponse)))]
fn get_unread_count() {}

#[utoipa::path(post, path = "/api/messages/read-all", tag = "messages", responses((status = 200, body = UnreadCountResponse), (status = 401, body = ErrorResponse)))]
fn read_all_messages() {}

#[utoipa::path(post, path = "/api/messages/{id}/read", tag = "messages", params(("id" = uuid::Uuid, Path, description = "Message id")), responses((status = 200, body = UnreadCountResponse), (status = 404, body = ErrorResponse)))]
fn read_message() {}

#[utoipa::path(get, path = "/api/admin/messages", tag = "messages", params(("status" = Option<String>, Query), ("query" = Option<String>, Query), ("limit" = Option<i64>, Query)), responses((status = 200, body = AdminMessagesResponse), (status = 403, body = ErrorResponse)))]
fn list_admin_messages() {}

#[utoipa::path(post, path = "/api/admin/messages", tag = "messages", request_body = UpsertMessageRequest, responses((status = 200, body = AdminMessageResponse), (status = 400, body = ErrorResponse)))]
fn create_admin_message() {}

#[utoipa::path(put, path = "/api/admin/messages/{id}", tag = "messages", params(("id" = uuid::Uuid, Path, description = "Message id")), request_body = UpsertMessageRequest, responses((status = 200, body = AdminMessageResponse), (status = 404, body = ErrorResponse)))]
fn update_admin_message() {}

#[utoipa::path(post, path = "/api/admin/messages/{id}/publish", tag = "messages", params(("id" = uuid::Uuid, Path, description = "Message id")), responses((status = 200, body = AdminMessageResponse), (status = 404, body = ErrorResponse)))]
fn publish_message() {}

#[utoipa::path(post, path = "/api/admin/messages/{id}/archive", tag = "messages", params(("id" = uuid::Uuid, Path, description = "Message id")), responses((status = 200, body = AdminMessageResponse), (status = 404, body = ErrorResponse)))]
fn archive_message() {}

#[utoipa::path(get, path = "/api/admin/credit-settings", tag = "credits", responses((status = 200, body = CreditSettingsResponse), (status = 403, body = ErrorResponse)))]
fn get_credit_settings() {}

#[utoipa::path(put, path = "/api/admin/credit-settings", tag = "credits", request_body = UpdateCreditSettingsRequest, responses((status = 200, body = CreditSettingsResponse), (status = 400, body = ErrorResponse)))]
fn update_credit_settings() {}

#[utoipa::path(get, path = "/api/admin/credit-prices", tag = "credits", responses((status = 200, body = CreditPricesResponse), (status = 403, body = ErrorResponse)))]
fn list_credit_prices() {}

#[utoipa::path(put, path = "/api/admin/credit-prices", tag = "credits", request_body = UpdateCreditPricesRequest, responses((status = 200, body = CreditPricesResponse), (status = 400, body = ErrorResponse)))]
fn update_credit_prices() {}

#[utoipa::path(get, path = "/api/admin/credit-accounts", tag = "credits", params(("query" = Option<String>, Query)), responses((status = 200, body = CreditAccountsResponse), (status = 403, body = ErrorResponse)))]
fn list_credit_accounts() {}

#[utoipa::path(get, path = "/api/admin/credit-accounts/{principal_id}", tag = "credits", params(("principal_id" = uuid::Uuid, Path, description = "Principal id")), responses((status = 200, body = CreditAccountDetailResponse), (status = 404, body = ErrorResponse)))]
fn get_credit_account() {}

#[utoipa::path(post, path = "/api/admin/credit-accounts/{principal_id}/adjustments", tag = "credits", params(("principal_id" = uuid::Uuid, Path, description = "Principal id")), request_body = AdjustCreditsRequest, responses((status = 200, body = CreditAccountDetailResponse), (status = 400, body = ErrorResponse)))]
fn adjust_credit_account() {}

#[utoipa::path(get, path = "/api/admin/llm-config", tag = "llm", responses((status = 200, body = AdminLlmConfigResponse), (status = 403, body = ErrorResponse)))]
fn get_llm_config() {}

#[utoipa::path(put, path = "/api/admin/llm-config", tag = "llm", request_body = UpdateLlmConfigRequest, responses((status = 200, body = AdminLlmConfigResponse), (status = 400, body = ErrorResponse)))]
fn update_llm_config() {}

#[utoipa::path(post, path = "/api/admin/llm-config/test", tag = "llm", request_body = UpdateLlmConfigRequest, responses((status = 200, body = TestLlmConfigResponse), (status = 400, body = ErrorResponse)))]
fn test_llm_config() {}

#[utoipa::path(post, path = "/api/admin/llm-config/models", tag = "llm", request_body = UpdateLlmConfigRequest, responses((status = 200, body = LlmModelsResponse), (status = 400, body = ErrorResponse)))]
fn get_llm_models() {}

#[utoipa::path(get, path = "/api/playground/history", tag = "playground", params(("offset" = Option<i64>, Query), ("limit" = Option<i64>, Query)), responses((status = 200, body = PlaygroundHistoryPage), (status = 401, body = ErrorResponse)))]
fn list_history() {}

#[utoipa::path(post, path = "/api/playground/history", tag = "playground", request_body = CreatePlaygroundHistoryRequest, responses((status = 200, body = PlaygroundHistoryRecord), (status = 400, body = ErrorResponse)))]
fn create_history() {}

#[utoipa::path(post, path = "/api/agent/chat", tag = "agent", request_body = AgentChatRequest, responses((status = 200, body = AgentChatResponse), (status = 400, body = ErrorResponse)))]
fn agent_chat() {}

#[utoipa::path(post, path = "/v1/chat/completions", tag = "llm", request_body(content = serde_json::Value, content_type = "application/json"), responses((status = 200, description = "OpenAI-compatible chat completion response", body = serde_json::Value), (status = 502, body = OpenAiErrorResponse)))]
fn proxy_chat_completions() {}

#[utoipa::path(post, path = "/v1/images/generations", tag = "llm", request_body(content = serde_json::Value, content_type = "application/json"), responses((status = 200, description = "OpenAI-compatible image generation response", body = serde_json::Value), (status = 202, description = "Async image job created", body = ImageJobSubmitResponse), (status = 502, body = OpenAiErrorResponse)))]
fn proxy_image_generations() {}

#[utoipa::path(post, path = "/v1/images/edits", tag = "llm", request_body(content = String, content_type = "multipart/form-data"), responses((status = 200, description = "OpenAI-compatible image edit response", body = serde_json::Value), (status = 202, description = "Async image job created", body = ImageJobSubmitResponse), (status = 502, body = OpenAiErrorResponse)))]
fn proxy_image_edits() {}

#[utoipa::path(get, path = "/v1/models", tag = "llm", responses((status = 200, body = OpenAiModelListResponse), (status = 401, body = OpenAiErrorResponse)))]
fn list_models() {}

#[utoipa::path(get, path = "/v1/models/{model}", tag = "llm", params(("model" = String, Path, description = "Model id")), responses((status = 200, body = OpenAiModelResponse), (status = 404, body = OpenAiErrorResponse)))]
fn retrieve_model() {}

#[utoipa::path(get, path = "/v1/images/generations/{id}", tag = "llm", params(("id" = uuid::Uuid, Path, description = "Image job id")), responses((status = 200, body = ImageJobPublicResponse), (status = 404, body = OpenAiErrorResponse)))]
fn get_generation_job() {}

#[cfg(test)]
mod tests {
    use super::*;
    use utoipa::OpenApi;

    #[test]
    fn openapi_contains_representative_routes_and_schemas() {
        let value = serde_json::to_value(ApiDoc::openapi()).expect("openapi serializes");
        let paths = value["paths"].as_object().expect("paths object");
        assert!(paths.contains_key("/api/orders/{out_trade_no}"));
        assert!(paths.contains_key("/api/messages/events"));
        assert!(paths.contains_key("/v1/images/generations/{id}"));

        let schemas = value["components"]["schemas"]
            .as_object()
            .expect("schemas object");
        assert!(schemas.contains_key("PaymentOrderResponse"));
        assert!(schemas.contains_key("CreatePlaygroundHistoryRequest"));
        assert!(schemas.contains_key("ImageJobResponse"));
    }
}
