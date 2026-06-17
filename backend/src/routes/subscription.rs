use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    routing::{get, post},
    Json, Router,
};
use serde::Serialize;
use sqlx::PgPool;
use time::OffsetDateTime;

use crate::routes::{require_tenant, require_auth};
use crate::state::AppState;

#[derive(Serialize)]
pub struct SubscriptionMe {
    pub plan_code: String,
    pub plan_name: String,
    pub status: String,
    pub modules: Vec<String>,
    pub current_period_end: Option<String>,
    pub is_active: bool,
}

#[derive(Serialize)]
pub struct SubscriptionPlanRow {
    pub code: String,
    pub name: String,
    pub price_monthly: i64,
    pub currency: String,
    pub features: serde_json::Value,
    pub limits: serde_json::Value,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/subscription/me", get(my_subscription))
        .route("/subscription/plans", get(list_plans))
        .route("/subscription/request", post(request_subscription))
}

async fn my_subscription(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<SubscriptionMe>, StatusCode> {
    let tenant = require_tenant(&headers)?;

    let sub = sqlx::query!(
        r#"SELECT ts.plan_code, ts.status, ts.current_period_end,
                  sp.name as plan_name, sp.features, sp.limits
           FROM tenant_subscriptions ts
           JOIN subscription_plans sp ON sp.code = ts.plan_code
           WHERE ts.tenant_id = $1
           ORDER BY ts.current_period_end DESC LIMIT 1"#,
        tenant.0
    )
    .fetch_optional(&pool)
    .await
    .ok()
    .flatten();

    if let Some(s) = sub {
        let is_active = (s.status == "ACTIVE" || s.status == "TRIALING")
            && s.current_period_end > OffsetDateTime::now_utc();

        let features = s.features;
        let modules: Vec<String> = if let Some(arr) = features.get("modules").and_then(|v| v.as_array()) {
            arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect()
        } else {
            vec!["basic".into(), "production".into(), "inventory".into(), "purchases".into(),
                 "finance".into(), "staff".into(), "tasks".into(), "reports".into(),
                 "pricing".into(), "integrations".into(), "routes".into()]
        };

        Ok(Json(SubscriptionMe {
            plan_code: s.plan_code,
            plan_name: s.plan_name,
            status: s.status,
            modules,
            current_period_end: Some(s.current_period_end.to_string()),
            is_active,
        }))
    } else {
        Ok(Json(SubscriptionMe {
            plan_code: "TRIAL".into(),
            plan_name: "Trial".into(),
            status: "TRIALING".into(),
            modules: vec!["basic".into(), "production".into(), "inventory".into(), "purchases".into(),
                         "finance".into(), "staff".into(), "tasks".into(), "reports".into(),
                         "pricing".into(), "integrations".into(), "routes".into()],
            current_period_end: None,
            is_active: true,
        }))
    }
}

async fn list_plans(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<SubscriptionPlanRow>>, StatusCode> {
    let _claims = require_auth(&headers)?;

    let rows = sqlx::query!(
        "SELECT code, name, price_monthly, currency, features, limits FROM subscription_plans WHERE is_active = true ORDER BY price_monthly"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Ok(Json(rows.iter().map(|r| SubscriptionPlanRow {
        code: r.code.clone(),
        name: r.name.clone(),
        price_monthly: r.price_monthly,
        currency: r.currency.clone(),
        features: r.features.clone(),
        limits: r.limits.clone(),
    }).collect()))
}

#[derive(serde::Deserialize)]
pub struct RequestSubscriptionBody {
    pub plan_code: String,
}

async fn request_subscription(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<RequestSubscriptionBody>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_auth(&headers)?;

    let plan = sqlx::query!(
        "SELECT code, name FROM subscription_plans WHERE code = $1 AND is_active = true",
        req.plan_code
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    let now = OffsetDateTime::now_utc();
    let period_end = now + time::Duration::days(30);

    let sub_id = uuid::Uuid::new_v4();
    sqlx::query!(
        r#"INSERT INTO tenant_subscriptions (id, tenant_id, plan_code, status, current_period_end)
           VALUES ($1, $2, $3, 'PENDING', $4)"#,
        sub_id, tenant.0, req.plan_code, period_end
    )
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({
        "message": "Permintaan langganan diterima, menunggu aktivasi admin.",
        "plan_code": plan.code,
        "plan_name": plan.name,
        "status": "PENDING"
    })))
}
