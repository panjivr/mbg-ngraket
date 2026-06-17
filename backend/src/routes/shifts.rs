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
use super::{require_tenant, require_coordinator};

#[derive(Serialize, Deserialize)]
pub struct Shift {
    pub id: Uuid,
    pub name: String,
    pub start_time: String,
    pub end_time: String,
    pub division_id: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateShiftRequest {
    pub name: String,
    pub start_time: String,
    pub end_time: String,
    pub division_id: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateShiftRequest {
    pub name: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub division_id: Option<String>,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_shifts).post(create_shift))
        .route("/:id", get(get_shift).put(update_shift).delete(delete_shift))
}

async fn list_shifts(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<Shift>>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;

    let shifts = sqlx::query_as!(
        Shift,
        "SELECT id, name, start_time, end_time, division_id FROM shifts WHERE tenant_id = $1 ORDER BY start_time",
        tenant_id.0
    )
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(shifts))
}

async fn get_shift(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<Shift>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;

    let shift = sqlx::query_as!(
        Shift,
        "SELECT id, name, start_time, end_time, division_id FROM shifts WHERE id = $1 AND tenant_id = $2",
        id,
        tenant_id.0
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(shift))
}

async fn create_shift(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(payload): Json<CreateShiftRequest>,
) -> Result<Json<Shift>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    require_coordinator(&headers, &pool, tenant_id).await?;

    let id = Uuid::new_v4();

    let shift = sqlx::query_as!(
        Shift,
        "INSERT INTO shifts (id, tenant_id, name, start_time, end_time, division_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, start_time, end_time, division_id",
        id,
        tenant_id.0,
        payload.name,
        payload.start_time,
        payload.end_time,
        payload.division_id
    )
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(shift))
}

async fn update_shift(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(payload): Json<UpdateShiftRequest>,
) -> Result<Json<Shift>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    require_coordinator(&headers, &pool, tenant_id).await?;

    // Check existence
    let _ = sqlx::query("SELECT id FROM shifts WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id.0)
        .fetch_optional(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    // Update with COALESCE
    let shift = sqlx::query_as!(
        Shift,
        r#"
        UPDATE shifts 
        SET 
            name = COALESCE($1, name),
            start_time = COALESCE($2, start_time),
            end_time = COALESCE($3, end_time),
            division_id = COALESCE($4, division_id),
            updated_at = NOW()
        WHERE id = $5 AND tenant_id = $6
        RETURNING id, name, start_time, end_time, division_id
        "#,
        payload.name,
        payload.start_time,
        payload.end_time,
        payload.division_id,
        id,
        tenant_id.0
    )
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(shift))
}

async fn delete_shift(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<StatusCode, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    require_coordinator(&headers, &pool, tenant_id).await?;

    let result = sqlx::query("DELETE FROM shifts WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id.0)
        .execute(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if result.rows_affected() == 0 {
        return Err(StatusCode::NOT_FOUND);
    }

    Ok(StatusCode::NO_CONTENT)
}
