use super::{
    llm_proxy::app_error_response,
    llm_proxy_credits::{authenticate_account, charge_request, parse_model_request},
    AppState,
};
use crate::{
    credits::refund_model_request,
    image_jobs::{
        get_image_job, image_job_credit_request_id, insert_image_job, mark_refunded,
        ImageJobRequestType, ImageJobResponse, NewImageJob,
    },
};
use axum::{
    body::Bytes,
    extract::{Path, State},
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use serde::Serialize;
use uuid::Uuid;

pub fn router() -> Router<AppState> {
    Router::new().route("/v1/images/generations/:id", get(get_generation_job))
}

#[derive(Serialize)]
pub(super) struct ImageJobSubmitResponse {
    job_id: Uuid,
    status: &'static str,
    job: ImageJobPublicResponse,
}

#[derive(Serialize)]
pub(super) struct ImageJobPublicResponse {
    job_id: Uuid,
    #[serde(flatten)]
    job: ImageJobResponse,
}

pub(super) async fn submit_job(
    state: &AppState,
    headers: &HeaderMap,
    body: Bytes,
    request_type: ImageJobRequestType,
    invalid_request_message: &str,
) -> Response {
    let account = match authenticate_account(state, headers).await {
        Ok(account) => account,
        Err(response) => return response,
    };
    let config = match state.llm_config_cache.get_or_load(&state.pool).await {
        Ok(config) => config,
        Err(error) => return app_error_response(error),
    };
    let model = match parse_model_request(
        headers,
        &body,
        &config.allowed_models,
        invalid_request_message,
    ) {
        Ok(model) => model,
        Err(response) => return response,
    };
    let job_id = Uuid::new_v4();
    let credit_request_id = image_job_credit_request_id(job_id);
    if let Err(response) = charge_request(
        state,
        &account,
        &model,
        request_type.credit_type(),
        &credit_request_id,
    )
    .await
    {
        return response;
    }

    let content_type = headers
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(str::to_string);
    let job = NewImageJob {
        id: job_id,
        principal_id: account.id,
        credit_request_id: credit_request_id.clone(),
        model_id: model,
        request_type,
        content_type,
        request_body: body.to_vec(),
    };
    let job = match insert_image_job(&state.pool, job).await {
        Ok(job) => job,
        Err(error) => {
            refund_after_insert_failure(state, &credit_request_id).await;
            return app_error_response(error);
        }
    };

    (
        StatusCode::ACCEPTED,
        Json(ImageJobSubmitResponse {
            job_id,
            status: "pending",
            job: ImageJobPublicResponse { job_id, job },
        }),
    )
        .into_response()
}

async fn get_generation_job(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Response {
    let account = match authenticate_account(&state, &headers).await {
        Ok(account) => account,
        Err(response) => return response,
    };
    match get_image_job(&state.pool, account.id, id).await {
        Ok(job) => Json(ImageJobPublicResponse {
            job_id: job.id,
            job,
        })
        .into_response(),
        Err(error) => app_error_response(error),
    }
}

async fn refund_after_insert_failure(state: &AppState, credit_request_id: &str) {
    match refund_model_request(&state.pool, credit_request_id).await {
        Ok(true) => {
            if let Err(error) = mark_refunded(&state.pool, credit_request_id).await {
                tracing::warn!(
                    ?error,
                    credit_request_id,
                    "failed to mark image job refunded"
                );
            }
        }
        Ok(false) => tracing::debug!(credit_request_id, "image job refund skipped"),
        Err(error) => tracing::warn!(?error, credit_request_id, "failed to refund image job"),
    }
}
