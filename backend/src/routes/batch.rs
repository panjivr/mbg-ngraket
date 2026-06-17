use axum::{extract::{Path, State}, http::{HeaderMap, StatusCode}, routing::{get, post, put}, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use time::OffsetDateTime;

use crate::routes::{require_tenant, require_auth};
use crate::state::AppState;

#[derive(Serialize)]
pub struct ChecklistItem {
    pub id: Uuid,
    pub batch_id: Uuid,
    pub description: String,
    pub done: bool,
    pub scheduled_start: Option<OffsetDateTime>,
    pub scheduled_end: Option<OffsetDateTime>,
    pub target_role: Option<String>,
    pub photo_url: Option<String>,
    pub checked_at: Option<OffsetDateTime>,
    pub checked_by: Option<Uuid>,
}

#[derive(Deserialize)]
pub struct CompleteChecklistRequest {
    pub item_id: Uuid,
    pub photo_url: Option<String>,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/batches", get(list_all_batches))
        .route("/batches/:id/checklist", get(get_checklist))
        .route("/batches/:id/checklist/complete", post(complete_item))
        .route("/batches/:id/status", put(update_batch_status))
        .route("/batches/plan/:plan_id", get(list_batches_by_plan))
}

async fn get_checklist(
    headers: HeaderMap,
    Path(batch_id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<ChecklistItem>>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let rows = sqlx::query!(
        "SELECT id, description, done, scheduled_start, scheduled_end, target_role, photo_url, checked_at, checked_by FROM batch_checklist WHERE tenant_id = $1 AND batch_id = $2 ORDER BY scheduled_start, id",
        tenant.0,
        batch_id
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();
    
    Ok(Json(rows
        .into_iter()
        .map(|r| ChecklistItem {
            id: r.id,
            batch_id,
            description: r.description,
            done: r.done,
            scheduled_start: r.scheduled_start,
            scheduled_end: r.scheduled_end,
            target_role: r.target_role,
            photo_url: r.photo_url,
            checked_at: r.checked_at,
            checked_by: r.checked_by,
        })
        .collect()))
}

async fn complete_item(
    headers: HeaderMap,
    Path(batch_id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(req): Json<CompleteChecklistRequest>,
) -> Result<Json<ChecklistItem>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let claims = require_auth(&headers)?;
    let now = OffsetDateTime::now_utc();
    
    let _ = sqlx::query!(
        "UPDATE batch_checklist SET done = TRUE, photo_url = $4, checked_at = $5, checked_by = $6 WHERE tenant_id = $1 AND batch_id = $2 AND id = $3",
        tenant.0,
        batch_id,
        req.item_id,
        req.photo_url,
        now,
        claims.sub
    )
    .execute(&pool)
    .await;
    
    let r = sqlx::query!(
        "SELECT id, description, done, scheduled_start, scheduled_end, target_role, photo_url, checked_at, checked_by FROM batch_checklist WHERE tenant_id = $1 AND batch_id = $2 AND id = $3",
        tenant.0,
        batch_id,
        req.item_id
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    
    // Check if all items in this batch are done
    let pending_count = sqlx::query!(
        "SELECT COUNT(*) as count FROM batch_checklist WHERE tenant_id = $1 AND batch_id = $2 AND done = FALSE",
        tenant.0,
        batch_id
    )
    .fetch_one(&pool)
    .await
    .map(|row| row.count)
    .unwrap_or(Some(1)); // Default to 1 to avoid premature completion if error

    if pending_count.unwrap_or(1) == 0 {
        // Mark batch as completed
        let _ = sqlx::query!(
            "UPDATE production_batches SET current_status = 'completed' WHERE id = $1 AND tenant_id = $2",
            batch_id,
            tenant.0
        )
        .execute(&pool)
        .await;
        
        // TODO: Trigger Inventory Deduction here if needed
        // For now, we assume inventory is deducted manually or by another process.
    }
    
    Ok(Json(ChecklistItem {
        id: r.id,
        batch_id,
        description: r.description,
        done: r.done,
        scheduled_start: r.scheduled_start,
        scheduled_end: r.scheduled_end,
        target_role: r.target_role,
        photo_url: r.photo_url,
        checked_at: r.checked_at,
        checked_by: r.checked_by,
    }))
}

#[derive(Serialize)]
pub struct BatchRow {
    pub id: Uuid,
    pub plan_id: Uuid,
    pub division_id: Uuid,
    pub menu_item_id: Uuid,
    pub batch_size: i32,
    pub start_time: OffsetDateTime,
    pub end_time: OffsetDateTime,
    pub current_status: Option<String>,
}

async fn list_all_batches(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<BatchRow>>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let rows = sqlx::query!(
        "SELECT id, plan_id, division_id, menu_item_id, batch_size, start_time, end_time, current_status FROM production_batches WHERE tenant_id = $1 ORDER BY start_time DESC LIMIT 200",
        tenant.0
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();
    Ok(Json(rows.into_iter().map(|r| BatchRow {
        id: r.id, plan_id: r.plan_id, division_id: r.division_id,
        menu_item_id: r.menu_item_id, batch_size: r.batch_size,
        start_time: r.start_time, end_time: r.end_time, current_status: r.current_status,
    }).collect()))
}

#[derive(Deserialize)]
pub struct UpdateBatchStatusRequest {
    pub status: String,
}

async fn update_batch_status(
    headers: HeaderMap,
    Path(batch_id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(req): Json<UpdateBatchStatusRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_auth(&headers)?;

    let status = req.status.to_lowercase();
    let final_status = match status.as_str() {
        "completed" | "done" => "completed",
        "in_progress" | "started" => "in_progress",
        _ => "pending",
    };

    sqlx::query!(
        "UPDATE production_batches SET current_status = $1 WHERE id = $2 AND tenant_id = $3",
        final_status, batch_id, tenant.0
    )
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({ "id": batch_id, "status": final_status })))
}

async fn list_batches_by_plan(
    headers: HeaderMap,
    Path(plan_id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<BatchRow>>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let rows = sqlx::query!(
        "SELECT id, plan_id, division_id, menu_item_id, batch_size, start_time, end_time, current_status FROM production_batches WHERE tenant_id = $1 AND plan_id = $2 ORDER BY start_time",
        tenant.0,
        plan_id
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();
    Ok(Json(rows
        .into_iter()
        .map(|r| BatchRow {
            id: r.id,
            plan_id: r.plan_id,
            division_id: r.division_id,
            menu_item_id: r.menu_item_id,
            batch_size: r.batch_size,
            start_time: r.start_time,
            end_time: r.end_time,
            current_status: r.current_status,
        })
        .collect()))
}
