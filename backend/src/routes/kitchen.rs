use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    routing::{delete, get},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::routes::{require_coordinator, require_tenant};
use crate::state::AppState;

#[derive(Serialize, Deserialize)]
pub struct DivisionConfig {
    pub id: Uuid,
    pub name: String,
    pub capacity_per_batch: i32,
    pub max_parallel_batches: i32,
}

#[derive(Serialize, Deserialize)]
pub struct KitchenConfig {
    pub divisions: Vec<DivisionConfig>,
}

#[derive(Serialize, Deserialize)]
pub struct KitchenResource {
    pub id: Uuid,
    pub name: String,
    #[serde(rename = "type")]
    pub resource_type: String,
    pub capacity: i32,
    pub status: String,
}

#[derive(Deserialize)]
pub struct CreateResourceRequest {
    pub name: String,
    #[serde(rename = "type")]
    pub resource_type: String,
    pub capacity: Option<i32>,
    pub status: Option<String>,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/kitchen/config", get(get_config).put(update_config))
        .route("/kitchen/config/prep", get(get_sub_config_prep).post(set_sub_config_prep))
        .route("/kitchen/config/packing", get(get_sub_config_packing).post(set_sub_config_packing))
        .route("/kitchen/config/scheduler", get(get_sub_config_scheduler).post(set_sub_config_scheduler))
        .route("/kitchen/config/cooking", get(get_sub_config_cooking).post(set_sub_config_cooking))
        .route("/kitchen/config/:key", get(get_sub_config_generic).post(set_sub_config_generic))
        .route(
            "/kitchen/equipment",
            get(get_resources).post(create_resource),
        )
        .route("/kitchen/equipment/:id", delete(delete_resource))
}

// ─── Sub-config helpers using tenant_settings ───────────────────────────────

async fn read_setting(pool: &PgPool, tenant_id: Uuid, key: &str) -> serde_json::Value {
    sqlx::query_scalar!(
        "SELECT value FROM tenant_settings WHERE tenant_id = $1 AND key = $2",
        tenant_id, key
    )
    .fetch_optional(pool)
    .await
    .ok()
    .flatten()
    .unwrap_or(serde_json::json!({}))
}

async fn write_setting(pool: &PgPool, tenant_id: Uuid, key: &str, value: serde_json::Value) -> Result<(), StatusCode> {
    sqlx::query!(
        r#"INSERT INTO tenant_settings (tenant_id, key, value, updated_at)
           VALUES ($1, $2, $3, now())
           ON CONFLICT (tenant_id, key) DO UPDATE SET value = $3, updated_at = now()"#,
        tenant_id, key, value
    )
    .execute(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(())
}

async fn get_sub_config_prep(headers: HeaderMap, State(pool): State<PgPool>) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    Ok(Json(read_setting(&pool, tenant.0, "kitchen.prep").await))
}

async fn set_sub_config_prep(headers: HeaderMap, State(pool): State<PgPool>, Json(body): Json<serde_json::Value>) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _email = require_coordinator(&headers, &pool, tenant).await?;
    write_setting(&pool, tenant.0, "kitchen.prep", body.clone()).await?;
    Ok(Json(body))
}

async fn get_sub_config_packing(headers: HeaderMap, State(pool): State<PgPool>) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    Ok(Json(read_setting(&pool, tenant.0, "kitchen.packing").await))
}

async fn set_sub_config_packing(headers: HeaderMap, State(pool): State<PgPool>, Json(body): Json<serde_json::Value>) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _email = require_coordinator(&headers, &pool, tenant).await?;
    write_setting(&pool, tenant.0, "kitchen.packing", body.clone()).await?;
    Ok(Json(body))
}

async fn get_sub_config_scheduler(headers: HeaderMap, State(pool): State<PgPool>) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    Ok(Json(read_setting(&pool, tenant.0, "kitchen.scheduler").await))
}

async fn set_sub_config_scheduler(headers: HeaderMap, State(pool): State<PgPool>, Json(body): Json<serde_json::Value>) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _email = require_coordinator(&headers, &pool, tenant).await?;
    write_setting(&pool, tenant.0, "kitchen.scheduler", body.clone()).await?;
    Ok(Json(body))
}

async fn get_sub_config_cooking(headers: HeaderMap, State(pool): State<PgPool>) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    Ok(Json(read_setting(&pool, tenant.0, "kitchen.cooking").await))
}

async fn set_sub_config_cooking(headers: HeaderMap, State(pool): State<PgPool>, Json(body): Json<serde_json::Value>) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _email = require_coordinator(&headers, &pool, tenant).await?;
    write_setting(&pool, tenant.0, "kitchen.cooking", body.clone()).await?;
    Ok(Json(body))
}

async fn get_sub_config_generic(headers: HeaderMap, Path(key): Path<String>, State(pool): State<PgPool>) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let setting_key = format!("kitchen.{}", key);
    Ok(Json(read_setting(&pool, tenant.0, &setting_key).await))
}

async fn set_sub_config_generic(headers: HeaderMap, Path(key): Path<String>, State(pool): State<PgPool>, Json(body): Json<serde_json::Value>) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _email = require_coordinator(&headers, &pool, tenant).await?;
    let setting_key = format!("kitchen.{}", key);
    write_setting(&pool, tenant.0, &setting_key, body.clone()).await?;
    Ok(Json(body))
}

async fn get_config(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<KitchenConfig>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let rows = sqlx::query!(
        "SELECT id, name, capacity_per_batch, max_parallel_batches FROM divisions WHERE tenant_id = $1",
        tenant.0
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();
    let divisions = rows
        .into_iter()
        .map(|r| DivisionConfig {
            id: r.id,
            name: r.name,
            capacity_per_batch: r.capacity_per_batch,
            max_parallel_batches: r.max_parallel_batches,
        })
        .collect();
    Ok(Json(KitchenConfig { divisions }))
}

#[derive(Deserialize)]
pub struct UpdateConfigRequest {
    pub divisions: Vec<DivisionConfig>,
}

async fn update_config(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<UpdateConfigRequest>,
) -> Result<Json<KitchenConfig>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _email = require_coordinator(&headers, &pool, tenant).await?;
    let _ = sqlx::query!("DELETE FROM divisions WHERE tenant_id = $1", tenant.0)
        .execute(&pool)
        .await;
    for d in req.divisions.iter() {
        let _ = sqlx::query!(
            "INSERT INTO divisions (id, tenant_id, name, capacity_per_batch, max_parallel_batches) VALUES ($1, $2, $3, $4, $5)",
            d.id,
            tenant.0,
            d.name,
            d.capacity_per_batch,
            d.max_parallel_batches
        )
        .execute(&pool)
        .await;
    }
    Ok(Json(KitchenConfig {
        divisions: req.divisions,
    }))
}

async fn get_resources(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<KitchenResource>>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let rows = sqlx::query!(
        "SELECT id, name, resource_type, capacity, status FROM kitchen_resources WHERE tenant_id = $1 ORDER BY name",
        tenant.0
    )
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let resources = rows
        .into_iter()
        .map(|r| KitchenResource {
            id: r.id,
            name: r.name,
            resource_type: r.resource_type,
            capacity: r.capacity.unwrap_or(1),
            status: r.status.unwrap_or_else(|| "READY".to_string()),
        })
        .collect();

    Ok(Json(resources))
}

async fn create_resource(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<CreateResourceRequest>,
) -> Result<Json<KitchenResource>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _email = require_coordinator(&headers, &pool, tenant).await?;

    let id = Uuid::new_v4();
    let capacity = req.capacity.unwrap_or(1);
    let status = req.status.unwrap_or_else(|| "READY".to_string());
    let _ = sqlx::query!(
        "INSERT INTO kitchen_resources (id, tenant_id, name, resource_type, capacity, status) VALUES ($1, $2, $3, $4, $5, $6)",
        id,
        tenant.0,
        req.name,
        req.resource_type,
        capacity,
        status
    )
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(KitchenResource {
        id,
        name: req.name,
        resource_type: req.resource_type,
        capacity,
        status,
    }))
}

async fn delete_resource(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<StatusCode, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _email = require_coordinator(&headers, &pool, tenant).await?;

    let result = sqlx::query!(
        "DELETE FROM kitchen_resources WHERE id = $1 AND tenant_id = $2",
        id,
        tenant.0
    )
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if result.rows_affected() == 0 {
        return Err(StatusCode::NOT_FOUND);
    }

    Ok(StatusCode::NO_CONTENT)
}
