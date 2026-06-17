use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::state::AppState;
use super::require_tenant;

#[derive(Serialize, Deserialize)]
pub struct DeliveryWave {
    pub id: Uuid,
    pub plan_id: Uuid,
    pub wave_number: i32,
    #[serde(with = "time::serde::iso8601")]
    pub target_time: OffsetDateTime,
    pub portion_count: i32,
    pub driver_id: Option<Uuid>,
    pub driver_name: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateWaveRequest {
    pub plan_id: Uuid,
    pub wave_number: i32,
    #[serde(with = "time::serde::iso8601")]
    pub target_time: OffsetDateTime,
    pub portion_count: i32,
    pub driver_id: Option<Uuid>,
}

#[derive(Deserialize)]
pub struct UpdateWaveRequest {
    pub wave_number: Option<i32>,
    #[serde(with = "time::serde::iso8601::option")]
    pub target_time: Option<OffsetDateTime>,
    pub portion_count: Option<i32>,
    pub driver_id: Option<Uuid>,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", post(create_wave))
        .route("/plan/:plan_id", get(list_waves_by_plan))
        .route("/:id", get(get_wave).put(update_wave).delete(delete_wave))
}

async fn list_waves_by_plan(
    headers: HeaderMap,
    Path(plan_id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<DeliveryWave>>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;

    let waves = sqlx::query_as!(
        DeliveryWave,
        r#"
        SELECT 
            w.id, w.plan_id, w.wave_number, w.target_time, w.portion_count, w.driver_id,
            s.name as "driver_name?"
        FROM delivery_waves w
        LEFT JOIN staff s ON w.driver_id = s.id
        WHERE w.plan_id = $1 AND w.tenant_id = $2
        ORDER BY w.wave_number
        "#,
        plan_id,
        tenant_id.0
    )
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(waves))
}

async fn get_wave(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<DeliveryWave>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;

    let wave = sqlx::query_as!(
        DeliveryWave,
        r#"
        SELECT 
            w.id, w.plan_id, w.wave_number, w.target_time, w.portion_count, w.driver_id,
            s.name as "driver_name?"
        FROM delivery_waves w
        LEFT JOIN staff s ON w.driver_id = s.id
        WHERE w.id = $1 AND w.tenant_id = $2
        "#,
        id,
        tenant_id.0
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(wave))
}

async fn create_wave(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(payload): Json<CreateWaveRequest>,
) -> Result<Json<DeliveryWave>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    
    // Verify plan ownership
    let _ = sqlx::query("SELECT id FROM production_plans WHERE id = $1 AND tenant_id = $2")
        .bind(payload.plan_id)
        .bind(tenant_id.0)
        .fetch_optional(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::BAD_REQUEST)?;

    let id = Uuid::new_v4();

    let wave = sqlx::query_as!(
        DeliveryWave,
        r#"
        WITH inserted AS (
            INSERT INTO delivery_waves (id, tenant_id, plan_id, wave_number, target_time, portion_count, driver_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, plan_id, wave_number, target_time, portion_count, driver_id
        )
        SELECT 
            i.id, i.plan_id, i.wave_number, i.target_time, i.portion_count, i.driver_id,
            s.name as "driver_name?"
        FROM inserted i
        LEFT JOIN staff s ON i.driver_id = s.id
        "#,
        id,
        tenant_id.0,
        payload.plan_id,
        payload.wave_number,
        payload.target_time,
        payload.portion_count,
        payload.driver_id
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        println!("Error creating wave: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(wave))
}

async fn update_wave(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(payload): Json<UpdateWaveRequest>,
) -> Result<Json<DeliveryWave>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;

    // Check existence
    let _ = sqlx::query("SELECT id FROM delivery_waves WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id.0)
        .fetch_optional(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    let wave = sqlx::query_as!(
        DeliveryWave,
        r#"
        WITH updated AS (
            UPDATE delivery_waves 
            SET 
                wave_number = COALESCE($1, wave_number),
                target_time = COALESCE($2, target_time),
                portion_count = COALESCE($3, portion_count),
                driver_id = COALESCE($4, driver_id)
            WHERE id = $5 AND tenant_id = $6
            RETURNING id, plan_id, wave_number, target_time, portion_count, driver_id
        )
        SELECT 
            u.id, u.plan_id, u.wave_number, u.target_time, u.portion_count, u.driver_id,
            s.name as "driver_name?"
        FROM updated u
        LEFT JOIN staff s ON u.driver_id = s.id
        "#,
        payload.wave_number,
        payload.target_time,
        payload.portion_count,
        payload.driver_id,
        id,
        tenant_id.0
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        println!("Error updating wave: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(wave))
}

async fn delete_wave(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<StatusCode, StatusCode> {
    let tenant_id = require_tenant(&headers)?;

    let result = sqlx::query("DELETE FROM delivery_waves WHERE id = $1 AND tenant_id = $2")
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
