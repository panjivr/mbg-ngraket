use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    routing::{get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use time::OffsetDateTime;

use crate::state::AppState;
use super::{require_auth};
use crate::routes::auth;

#[derive(Serialize, Deserialize)]
pub struct PlatformUser {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub role: String,
    pub created_at: OffsetDateTime,
    pub last_login_at: Option<OffsetDateTime>,
    pub disabled_at: Option<OffsetDateTime>,
}

#[derive(Serialize, Deserialize)]
pub struct SubscriptionPlan {
    pub code: String,
    pub name: String,
    pub price_monthly: i64,
    pub currency: String,
    pub features: serde_json::Value,
    pub limits: serde_json::Value,
    pub is_active: bool,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/platform-users", get(list_platform_users).post(create_platform_user))
        .route("/platform-users/:id/disable", post(disable_platform_user))
        .route("/subscription-plans", get(list_plans).post(create_plan))
        .route("/subscription-plans/:code", put(update_plan))
}

async fn list_platform_users(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<PlatformUser>>, StatusCode> {
    let claims = require_auth(&headers)?;
    if claims.role != "developer" && claims.role != "admin" {
        return Err(StatusCode::FORBIDDEN);
    }

    let rows = sqlx::query_as!(
        PlatformUser,
        "SELECT id, email, name, role, created_at, last_login_at, disabled_at FROM platform_users ORDER BY created_at DESC"
    )
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(rows))
}

async fn create_platform_user(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let claims = require_auth(&headers)?;
    if claims.role != "developer" {
        return Err(StatusCode::FORBIDDEN);
    }

    let email = req.get("email").and_then(|v| v.as_str()).unwrap_or("").trim().to_lowercase();
    let name = req.get("name").and_then(|v| v.as_str()).unwrap_or("Admin").trim().to_string();
    let role = req.get("role").and_then(|v| v.as_str()).unwrap_or("admin").trim().to_lowercase();
    let password_opt = req.get("password").and_then(|v| v.as_str()).map(|s| s.to_string());

    if email.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    let exists = sqlx::query_scalar!("SELECT id FROM platform_users WHERE email = $1", email)
        .fetch_optional(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if exists.is_some() {
        return Err(StatusCode::CONFLICT);
    }

    let temp_password = password_opt.unwrap_or_else(|| {
        const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        (0..12)
            .map(|_| CHARSET[rand::random_range(0..CHARSET.len())] as char)
            .collect::<String>()
    });

    let ph = auth::hash_password(&temp_password);
    let id = Uuid::new_v4();

    let role = if role == "developer" { "developer" } else { "admin" };

    sqlx::query!(
        "INSERT INTO platform_users (id, email, name, role, password_hash) VALUES ($1, $2, $3, $4, $5)",
        id,
        email,
        name,
        role,
        ph
    )
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({
        "id": id,
        "email": email,
        "name": name,
        "role": role,
        "temp_password": temp_password
    })))
}

async fn disable_platform_user(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let claims = require_auth(&headers)?;
    if claims.role != "developer" {
        return Err(StatusCode::FORBIDDEN);
    }

    sqlx::query!("UPDATE platform_users SET disabled_at = NOW() WHERE id = $1", id)
        .execute(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({ "success": true })))
}

async fn list_plans(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<SubscriptionPlan>>, StatusCode> {
    let _ = require_auth(&headers)?;

    let rows = sqlx::query!(
        "SELECT code, name, price_monthly, currency, features, limits, is_active FROM subscription_plans ORDER BY price_monthly ASC"
    )
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let plans = rows.into_iter().map(|r| SubscriptionPlan {
        code: r.code,
        name: r.name,
        price_monthly: r.price_monthly,
        currency: r.currency,
        features: r.features,
        limits: r.limits,
        is_active: r.is_active,
    }).collect();

    Ok(Json(plans))
}

async fn create_plan(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<SubscriptionPlan>,
) -> Result<Json<SubscriptionPlan>, StatusCode> {
    let claims = require_auth(&headers)?;
    if claims.role != "developer" && claims.role != "admin" {
        return Err(StatusCode::FORBIDDEN);
    }

    sqlx::query!(
        "INSERT INTO subscription_plans (code, name, price_monthly, currency, features, limits, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        req.code, req.name, req.price_monthly, req.currency, req.features, req.limits, req.is_active
    )
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(req))
}

async fn update_plan(
    headers: HeaderMap,
    Path(code): Path<String>,
    State(pool): State<PgPool>,
    Json(req): Json<SubscriptionPlan>,
) -> Result<Json<SubscriptionPlan>, StatusCode> {
    let claims = require_auth(&headers)?;
    if claims.role != "developer" && claims.role != "admin" {
        return Err(StatusCode::FORBIDDEN);
    }

    sqlx::query!(
        "UPDATE subscription_plans SET name = $1, price_monthly = $2, currency = $3, features = $4, limits = $5, is_active = $6 WHERE code = $7",
        req.name, req.price_monthly, req.currency, req.features, req.limits, req.is_active, code
    )
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(req))
}
