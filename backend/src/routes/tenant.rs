use axum::{extract::{Path, State}, http::StatusCode, routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::state::AppState;

#[derive(Serialize, Deserialize)]
pub struct CreateTenantRequest {
    pub name: String,
    pub address: Option<String>,
    pub contact_email: Option<String>,
    pub contact_phone: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct UpdateTenantRequest {
    pub name: Option<String>,
    pub status: Option<String>,
    pub subscription_plan: Option<String>,
    pub address: Option<String>,
    pub contact_email: Option<String>,
    pub contact_phone: Option<String>,
}

#[derive(Serialize)]
pub struct Tenant {
    pub id: Uuid,
    pub name: String,
    pub status: String,
    pub subscription_plan: String,
    pub address: String,
    pub contact_email: String,
    pub contact_phone: String,
    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/tenants", get(list_tenants).post(create_tenant))
        .route("/tenants/:id", get(get_tenant).put(update_tenant).delete(delete_tenant))
}

async fn list_tenants(State(pool): State<PgPool>) -> Json<Vec<Tenant>> {
    let rows = sqlx::query!(
        "SELECT id, name, status, subscription_plan, address, contact_email, contact_phone, created_at, updated_at FROM tenants ORDER BY name"
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let data = rows
        .into_iter()
        .map(|r| Tenant {
            id: r.id,
            name: r.name,
            status: r.status,
            subscription_plan: r.subscription_plan,
            address: r.address,
            contact_email: r.contact_email,
            contact_phone: r.contact_phone,
            created_at: r.created_at,
            updated_at: r.updated_at,
        })
        .collect();
    Json(data)
}

async fn create_tenant(
    State(pool): State<PgPool>,
    Json(req): Json<CreateTenantRequest>,
) -> Json<Tenant> {
    let id = Uuid::new_v4();
    let now = OffsetDateTime::now_utc();
    let status = "ACTIVE";
    let plan = "FREE";
    let address = req.address.unwrap_or_default();
    let email = req.contact_email.unwrap_or_default();
    let phone = req.contact_phone.unwrap_or_default();

    let _ = sqlx::query!(
        "INSERT INTO tenants (id, name, status, subscription_plan, address, contact_email, contact_phone, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        id, req.name, status, plan, address, email, phone, now, now
    )
    .execute(&pool)
    .await;

    Json(Tenant {
        id,
        name: req.name,
        status: status.to_string(),
        subscription_plan: plan.to_string(),
        address,
        contact_email: email,
        contact_phone: phone,
        created_at: now,
        updated_at: now,
    })
}

async fn get_tenant(
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<Tenant>, StatusCode> {
    let r = sqlx::query!(
        "SELECT id, name, status, subscription_plan, address, contact_email, contact_phone, created_at, updated_at FROM tenants WHERE id = $1",
        id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(Tenant {
        id: r.id,
        name: r.name,
        status: r.status,
        subscription_plan: r.subscription_plan,
        address: r.address,
        contact_email: r.contact_email,
        contact_phone: r.contact_phone,
        created_at: r.created_at,
        updated_at: r.updated_at,
    }))
}

async fn update_tenant(
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(req): Json<UpdateTenantRequest>,
) -> Result<Json<Tenant>, StatusCode> {
    let now = OffsetDateTime::now_utc();
    
    // Fetch existing
    let existing = sqlx::query!(
        "SELECT id, name, status, subscription_plan, address, contact_email, contact_phone, created_at, updated_at FROM tenants WHERE id = $1",
        id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    let name = req.name.unwrap_or(existing.name);
    let status = req.status.unwrap_or(existing.status);
    let plan = req.subscription_plan.unwrap_or(existing.subscription_plan);
    let address = req.address.unwrap_or(existing.address);
    let email = req.contact_email.unwrap_or(existing.contact_email);
    let phone = req.contact_phone.unwrap_or(existing.contact_phone);

    let _ = sqlx::query!(
        "UPDATE tenants SET name=$1, status=$2, subscription_plan=$3, address=$4, contact_email=$5, contact_phone=$6, updated_at=$7 WHERE id=$8",
        name, status, plan, address, email, phone, now, id
    )
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(Tenant {
        id,
        name,
        status,
        subscription_plan: plan,
        address,
        contact_email: email,
        contact_phone: phone,
        created_at: existing.created_at,
        updated_at: now,
    }))
}

async fn delete_tenant(
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<StatusCode, StatusCode> {
    // Hard delete or soft delete? Let's do hard delete for now as per usual REST, 
    // but in real app we might just set status=ARCHIVED.
    // However, given the foreign keys with CASCADE, hard delete will wipe all tenant data.
    // For safety, let's implement soft delete by setting status = ARCHIVED.
    
    let _ = sqlx::query!(
        "UPDATE tenants SET status='ARCHIVED', updated_at=NOW() WHERE id=$1",
        id
    )
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(StatusCode::NO_CONTENT)
}
