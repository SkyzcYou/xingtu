use super::payments::{append_out_trade_no, parse_amount, validate_pay_channel};

#[test]
fn amount_allows_two_decimals() {
    assert!(parse_amount("1.00").is_ok());
    assert!(parse_amount("0.001").is_err());
    assert!(parse_amount("0").is_err());
}

#[test]
fn only_known_channels_are_allowed() {
    assert!(validate_pay_channel(Some("alipay")).is_ok());
    assert!(validate_pay_channel(Some("wxpay")).is_ok());
    assert!(validate_pay_channel(Some("bank")).is_err());
}

#[test]
fn appends_order_to_return_url() {
    assert_eq!(
        append_out_trade_no("http://localhost:5174".to_string(), "XT1"),
        "http://localhost:5174?out_trade_no=XT1"
    );
    assert_eq!(
        append_out_trade_no("http://localhost:5174?return=1".to_string(), "XT1"),
        "http://localhost:5174?return=1&out_trade_no=XT1"
    );
}
