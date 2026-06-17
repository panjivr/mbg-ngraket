use super::{format_float, parse_delivery_time, parse_ymd_date};

#[test]
fn parse_delivery_time_accepts_rfc3339() {
    let dt = parse_delivery_time("2026-03-01T10:00:00Z").unwrap();
    assert_eq!(dt.unix_timestamp(), 1772368800);
}

#[test]
fn parse_delivery_time_accepts_ymd_hm() {
    let dt = parse_delivery_time("2026-03-01 10:00").unwrap();
    assert_eq!(dt.unix_timestamp(), 1772368800);
}

#[test]
fn parse_ymd_date_accepts_iso() {
    let d = parse_ymd_date("2026-03-01").unwrap();
    assert_eq!(d.to_string(), "2026-03-01");
}

#[test]
fn format_float_respects_decimals() {
    assert_eq!(format_float(1.23456, 2), "1.23");
    assert_eq!(format_float(1.23456, 0), "1");
}

