use axum::{
    body::Bytes,
    http::{header, HeaderMap, StatusCode},
    response::Response,
};
use serde_json::Value;

use super::llm_proxy::openai_error_response;

pub(super) enum ImageGenerationMode {
    Sync(Bytes),
    Async(Bytes),
}

pub(super) fn parse_image_generation_mode(
    headers: &HeaderMap,
    body: Bytes,
) -> Result<ImageGenerationMode, Response> {
    if is_multipart(headers) {
        return Ok(ImageGenerationMode::Sync(body));
    }

    let mut payload = serde_json::from_slice::<Value>(&body).map_err(|_| {
        openai_error_response(
            StatusCode::BAD_REQUEST,
            "请求体必须是有效的 OpenAI Images JSON",
            "invalid_request_error",
            Some("invalid_json"),
        )
    })?;
    let Some(object) = payload.as_object_mut() else {
        return Ok(ImageGenerationMode::Sync(body));
    };

    let async_value = object.remove("async");
    let requested_async = matches!(async_value, Some(Value::Bool(true)));
    let sanitized = if async_value.is_some() {
        Bytes::from(serde_json::to_vec(&payload).map_err(|error| {
            tracing::warn!(?error, "failed to serialize sanitized image request");
            openai_error_response(
                StatusCode::BAD_REQUEST,
                "请求体必须是有效的 OpenAI Images JSON",
                "invalid_request_error",
                Some("invalid_json"),
            )
        })?)
    } else {
        body
    };

    if requested_async {
        Ok(ImageGenerationMode::Async(sanitized))
    } else {
        Ok(ImageGenerationMode::Sync(sanitized))
    }
}

pub(super) fn parse_image_edit_mode(
    headers: &HeaderMap,
    body: Bytes,
) -> Result<ImageGenerationMode, Response> {
    if !is_multipart(headers) {
        return parse_image_generation_mode(headers, body);
    }
    match strip_multipart_async_flag(headers, &body) {
        Some(body) => Ok(ImageGenerationMode::Async(Bytes::from(body))),
        None => Ok(ImageGenerationMode::Sync(body)),
    }
}

fn is_multipart(headers: &HeaderMap) -> bool {
    headers
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| {
            value
                .to_ascii_lowercase()
                .starts_with("multipart/form-data")
        })
}

fn strip_multipart_async_flag(headers: &HeaderMap, body: &[u8]) -> Option<Vec<u8>> {
    let content_type = headers
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())?;
    let boundary = parse_multipart_boundary(content_type)?;
    let delimiter = [b"--".as_slice(), boundary.as_bytes()].concat();
    let positions = find_all(body, &delimiter);
    if positions.len() < 2 {
        return None;
    }

    let mut result = Vec::with_capacity(body.len());
    let mut removed_async = false;
    for (index, position) in positions.iter().enumerate() {
        let end = positions.get(index + 1).copied().unwrap_or(body.len());
        let segment = &body[*position..end];
        if is_true_async_multipart_segment(segment, &delimiter) {
            removed_async = true;
            continue;
        }
        result.extend_from_slice(segment);
    }

    removed_async.then_some(result)
}

fn parse_multipart_boundary(content_type: &str) -> Option<String> {
    content_type.split(';').find_map(|part| {
        let (name, value) = part.trim().split_once('=')?;
        if !name.trim().eq_ignore_ascii_case("boundary") {
            return None;
        }
        Some(value.trim().trim_matches('"').to_string())
    })
}

fn is_true_async_multipart_segment(segment: &[u8], delimiter: &[u8]) -> bool {
    if !segment.starts_with(delimiter) || segment.get(delimiter.len()) == Some(&b'-') {
        return false;
    }
    let header_start = delimiter.len() + 2;
    if segment.len() <= header_start {
        return false;
    }
    let Some(header_end) = find_bytes(segment, b"\r\n\r\n") else {
        return false;
    };
    let headers = &segment[header_start..header_end];
    if !contains_ascii_case_insensitive(headers, b"name=\"async\"") {
        return false;
    }
    let value_start = header_end + 4;
    let value_end = segment.len().saturating_sub(2).max(value_start);
    let value = trim_ascii_whitespace(&segment[value_start..value_end]);
    value.eq_ignore_ascii_case(b"true")
}

fn find_all(haystack: &[u8], needle: &[u8]) -> Vec<usize> {
    let mut positions = Vec::new();
    let mut offset = 0;
    while let Some(position) = find_bytes(&haystack[offset..], needle) {
        positions.push(offset + position);
        offset += position + needle.len();
    }
    positions
}

fn find_bytes(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    if needle.is_empty() || haystack.len() < needle.len() {
        return None;
    }
    haystack
        .windows(needle.len())
        .position(|window| window == needle)
}

fn contains_ascii_case_insensitive(haystack: &[u8], needle: &[u8]) -> bool {
    if needle.is_empty() || haystack.len() < needle.len() {
        return false;
    }
    haystack
        .windows(needle.len())
        .any(|window| window.eq_ignore_ascii_case(needle))
}

fn trim_ascii_whitespace(value: &[u8]) -> &[u8] {
    let start = value
        .iter()
        .position(|byte| !byte.is_ascii_whitespace())
        .unwrap_or(value.len());
    let end = value
        .iter()
        .rposition(|byte| !byte.is_ascii_whitespace())
        .map(|index| index + 1)
        .unwrap_or(start);
    &value[start..end]
}

#[cfg(test)]
mod tests {
    use super::*;

    fn multipart_headers(boundary: &str) -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert(
            header::CONTENT_TYPE,
            format!("multipart/form-data; boundary=\"{boundary}\"")
                .parse()
                .unwrap(),
        );
        headers
    }

    #[test]
    fn generation_async_strips_local_flag() {
        let headers = HeaderMap::new();
        let body = Bytes::from_static(br#"{"model":"gpt-image-2","async":true,"prompt":"hi"}"#);
        let result = match parse_image_generation_mode(&headers, body) {
            Ok(result) => result,
            Err(_) => panic!("unexpected parse error"),
        };
        let ImageGenerationMode::Async(sanitized) = result else {
            panic!("expected async mode");
        };
        let value: Value = serde_json::from_slice(&sanitized).unwrap();
        assert_eq!(value["model"], "gpt-image-2");
        assert_eq!(value["prompt"], "hi");
        assert!(value.get("async").is_none());
    }

    #[test]
    fn generation_sync_preserves_body_without_async_flag() {
        let headers = HeaderMap::new();
        let body = Bytes::from_static(br#"{"model":"gpt-image-2","prompt":"hi"}"#);
        let result = match parse_image_generation_mode(&headers, body.clone()) {
            Ok(result) => result,
            Err(_) => panic!("unexpected parse error"),
        };
        let ImageGenerationMode::Sync(sanitized) = result else {
            panic!("expected sync mode");
        };
        assert_eq!(sanitized, body);
    }

    #[test]
    fn multipart_async_stripping_preserves_file_and_final_boundary() {
        let headers = multipart_headers("x-boundary");
        let body = b"--x-boundary\r\nContent-Disposition: form-data; name=\"model\"\r\n\r\ngpt-image-2\r\n--x-boundary\r\nContent-Disposition: form-data; name=\"async\"\r\n\r\nTrue\r\n--x-boundary\r\nContent-Disposition: form-data; name=\"image\"; filename=\"a.png\"\r\nContent-Type: image/png\r\n\r\n\x89PNG\r\n--x-boundary--\r\n";
        let stripped = strip_multipart_async_flag(&headers, body).unwrap();
        let text = String::from_utf8_lossy(&stripped);
        assert!(text.contains("name=\"model\""));
        assert!(text.contains("name=\"image\""));
        assert!(text.contains("--x-boundary--"));
        assert!(!text.contains("name=\"async\""));
        assert!(stripped
            .windows(b"\x89PNG".len())
            .any(|window| window == b"\x89PNG"));
    }

    #[test]
    fn multipart_stripping_ignores_similar_field_names() {
        let headers = multipart_headers("x-boundary");
        let body = b"--x-boundary\r\nContent-Disposition: form-data; name=\"async_mode\"\r\n\r\ntrue\r\n--x-boundary--\r\n";
        assert!(strip_multipart_async_flag(&headers, body).is_none());
    }
}
