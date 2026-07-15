use super::*;

fn text_request() -> CreatePlaygroundHistoryRequest {
    CreatePlaygroundHistoryRequest {
        task_kind: PlaygroundTaskKind::Text,
        status: PlaygroundTaskStatus::Succeeded,
        model: "test-model".into(),
        prompt: "hello".into(),
        duration_ms: 25,
        parameters: PlaygroundParameters::Text {
            use_system_prompt: true,
            system_prompt: "be concise".into(),
        },
        result: Some(PlaygroundResult::Text {
            content: "world".into(),
        }),
        error: None,
    }
}

#[test]
fn accepts_text_success_and_failed_attempt() {
    assert!(validate_create_input(text_request()).is_ok());
    let mut failed = text_request();
    failed.status = PlaygroundTaskStatus::Failed;
    failed.result = None;
    failed.error = Some(" upstream failed ".into());
    let validated = validate_create_input(failed).unwrap();
    assert_eq!(validated.error.as_deref(), Some("upstream failed"));
}

#[test]
fn accepts_url_only_image_success() {
    let mut request = text_request();
    request.task_kind = PlaygroundTaskKind::Image;
    request.parameters = PlaygroundParameters::Image {
        size: "1024x1024".into(),
        mode: PlaygroundImageMode::Async,
        reference_file_names: vec!["reference.png".into()],
    };
    request.result = Some(PlaygroundResult::Image {
        images: vec![PlaygroundImageResultItem {
            url: "https://example.com/generated.png?signature=abc".into(),
            revised_prompt: Some("revised".into()),
            job_id: Some("job-1".into()),
        }],
    });
    assert!(validate_create_input(request).is_ok());
}

#[test]
fn rejects_cross_kind_and_binary_image_results() {
    let mut mismatch = text_request();
    mismatch.parameters = PlaygroundParameters::Image {
        size: "1024x1024".into(),
        mode: PlaygroundImageMode::Sync,
        reference_file_names: vec![],
    };
    assert!(validate_create_input(mismatch).is_err());

    let mut image = text_request();
    image.task_kind = PlaygroundTaskKind::Image;
    image.parameters = PlaygroundParameters::Image {
        size: "1024x1024".into(),
        mode: PlaygroundImageMode::Sync,
        reference_file_names: vec![],
    };
    image.result = Some(PlaygroundResult::Image {
        images: vec![PlaygroundImageResultItem {
            url: "data:image/png;base64,AAAA".into(),
            revised_prompt: None,
            job_id: None,
        }],
    });
    assert!(validate_create_input(image).is_err());
}

#[test]
fn normalizes_empty_optional_image_metadata() {
    let mut request = text_request();
    request.task_kind = PlaygroundTaskKind::Image;
    request.parameters = PlaygroundParameters::Image {
        size: "1024x1024".into(),
        mode: PlaygroundImageMode::Sync,
        reference_file_names: vec![],
    };
    request.result = Some(PlaygroundResult::Image {
        images: vec![PlaygroundImageResultItem {
            url: "https://example.com/generated.png".into(),
            revised_prompt: Some("   ".into()),
            job_id: Some(" job-1 ".into()),
        }],
    });
    let validated = validate_create_input(request).unwrap();
    let Some(PlaygroundResult::Image { images }) = validated.result else {
        panic!("expected image result");
    };
    assert_eq!(images[0].revised_prompt, None);
    assert_eq!(images[0].job_id.as_deref(), Some("job-1"));
}

#[test]
fn rejects_invalid_stored_outcome_shape() {
    let row = PlaygroundHistoryRow {
        id: Uuid::new_v4(),
        task_kind: "text".into(),
        status: "succeeded".into(),
        model: "test-model".into(),
        prompt: "hello".into(),
        duration_ms: 25,
        parameters_json: serde_json::json!({
            "kind": "text",
            "useSystemPrompt": false,
            "systemPrompt": ""
        }),
        result_json: None,
        error: None,
        created_at: Utc::now(),
    };
    assert!(PlaygroundHistoryRecord::try_from(row).is_err());
}

#[test]
fn validates_pagination_bounds_and_metadata() {
    assert_eq!(
        validate_pagination(None, None).unwrap(),
        Pagination {
            offset: 0,
            limit: 20
        }
    );
    assert!(validate_pagination(Some(-1), None).is_err());
    assert!(validate_pagination(None, Some(0)).is_err());
    assert!(validate_pagination(None, Some(101)).is_err());
    assert_eq!(pagination_metadata(20, 20, 21), (20, true, 40));
    assert_eq!(pagination_metadata(40, 20, 7), (7, false, 47));
}
