use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::state::AppState;
use super::require_auth;

#[derive(Serialize)]
pub struct SupplierRow {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub company_name: Option<String>,
    pub contact_phone: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub subscription_tier: String,
    pub is_active: bool,
    pub created_at: String,
}

#[derive(Deserialize)]
pub struct CreateSupplierRequest {
    pub email: Option<String>,
    pub name: Option<String>,
    pub company_name: Option<String>,
    pub contact_phone: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub password: Option<String>,
    pub subscription_tier: Option<String>,
    pub is_active: Option<bool>,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_suppliers).post(create_supplier))
        .route("/:id", get(get_supplier).put(update_supplier).delete(delete_supplier))
}

async fn list_suppliers(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<SupplierRow>>, StatusCode> {
    let _claims = require_auth(&headers)?;

    let rows = sqlx::query!(
        "SELECT id, email, name, company_name, contact_phone, address, subscription_tier, is_active, created_at FROM suppliers ORDER BY name"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Ok(Json(rows.iter().map(|r| SupplierRow {
        id: r.id,
        email: r.email.clone(),
        name: r.name.clone(),
        company_name: r.company_name.clone(),
        phone: r.contact_phone.clone(),
        contact_phone: r.contact_phone.clone(),
        address: r.address.clone(),
        subscription_tier: r.subscription_tier.clone(),
        is_active: r.is_active,
        created_at: r.created_at.to_string(),
    }).collect()))
}

async fn get_supplier(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<SupplierRow>, StatusCode> {
    let _claims = require_auth(&headers)?;

    let r = sqlx::query!(
        "SELECT id, email, name, company_name, contact_phone, address, subscription_tier, is_active, created_at FROM suppliers WHERE id = $1",
        id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(SupplierRow {
        id: r.id,
        email: r.email,
        name: r.name,
        company_name: r.company_name,
        phone: r.contact_phone.clone(),
        contact_phone: r.contact_phone,
        address: r.address,
        subscription_tier: r.subscription_tier,
        is_active: r.is_active,
        created_at: r.created_at.to_string(),
    }))
}

async fn create_supplier(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<CreateSupplierRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let _claims = require_auth(&headers)?;

    let id = Uuid::new_v4();
    let email = req.email.unwrap_or_default().to_lowercase();
    let name = req.name.unwrap_or_default();
    let phone = req.phone.or(req.contact_phone);
    let tier = req.subscription_tier.unwrap_or_else(|| "free".into());
    let pw = req.password.unwrap_or_default();
    let hash = if pw.is_empty() { String::new() } else { super::auth::hash_password(&pw) };

    sqlx::query!(
        r#"INSERT INTO suppliers (id, email, name, company_name, contact_phone, address, password_hash, subscription_tier)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"#,
        id, email, name, req.company_name, phone, req.address, hash, tier
    )
    .execute(&pool)
    .await
    .map_err(|e| {
        if e.to_string().contains("duplicate") || e.to_string().contains("unique") {
            StatusCode::CONFLICT
        } else {
            StatusCode::INTERNAL_SERVER_ERROR
        }
    })?;

    Ok(Json(serde_json::json!({ "id": id })))
}

async fn update_supplier(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(req): Json<CreateSupplierRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let _claims = require_auth(&headers)?;

    let phone = req.phone.or(req.contact_phone);

    sqlx::query!(
        r#"UPDATE suppliers SET
               name = COALESCE($1, name),
               company_name = COALESCE($2, company_name),
               contact_phone = COALESCE($3, contact_phone),
               address = COALESCE($4, address),
               subscription_tier = COALESCE($5, subscription_tier),
               is_active = COALESCE($6, is_active)
           WHERE id = $7"#,
        req.name, req.company_name, phone, req.address, req.subscription_tier, req.is_active, id
    )
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({ "id": id, "updated": true })))
}

async fn delete_supplier(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<StatusCode, StatusCode> {
    let _claims = require_auth(&headers)?;

    sqlx::query!("UPDATE suppliers SET is_active = false WHERE id = $1", id)
        .execute(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}
