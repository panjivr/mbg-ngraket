use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    routing::{get, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::routes::{require_tenant, require_auth};
use crate::state::AppState;

#[derive(Serialize)]
pub struct TaskRow {
    pub id: Uuid,
    pub title: String,
    pub division: String,
    pub due_date: Option<String>,
    pub status: String,
    pub created_at: String,
}

#[derive(Deserialize)]
pub struct CreateTaskRequest {
    pub title: String,
    pub division: Option<String>,
    pub due_date: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateStatusRequest {
    pub status: String,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_tasks).post(create_task))
        .route("/my", get(my_tasks))
        .route("/:id/status", put(update_task_status))
}

async fn list_tasks(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<TaskRow>>, StatusCode> {
    let tenant = require_tenant(&headers)?;

    let rows = sqlx::query!(
        "SELECT id, title, division, due_date, status, created_at FROM tasks WHERE tenant_id = $1 ORDER BY created_at DESC",
        tenant.0
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Ok(Json(rows.iter().map(|r| TaskRow {
        id: r.id,
        title: r.title.clone(),
        division: r.division.clone(),
        due_date: r.due_date.map(|d| d.to_string()),
        status: r.status.clone(),
        created_at: r.created_at.to_string(),
    }).collect()))
}

async fn my_tasks(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<TaskRow>>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_auth(&headers)?;

    let rows = sqlx::query!(
        "SELECT id, title, division, due_date, status, created_at FROM tasks WHERE tenant_id = $1 AND status != 'done' ORDER BY created_at DESC",
        tenant.0
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Ok(Json(rows.iter().map(|r| TaskRow {
        id: r.id,
        title: r.title.clone(),
        division: r.division.clone(),
        due_date: r.due_date.map(|d| d.to_string()),
        status: r.status.clone(),
        created_at: r.created_at.to_string(),
    }).collect()))
}

async fn create_task(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<CreateTaskRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let tenant = require_tenant(&headers).map_err(|s| (s, "Tenant required".into()))?;
    let _claims = require_auth(&headers).map_err(|s| (s, "Auth required".into()))?;

    let id = Uuid::new_v4();
    let division = req.division.unwrap_or_else(|| "general".into());
    let due_date: Option<time::Date> = req.due_date.as_ref().and_then(|d| {
        let fmt = time::format_description::parse("[year]-[month]-[day]").ok()?;
        time::Date::parse(d, &fmt).ok()
    });

    sqlx::query!(
        "INSERT INTO tasks (id, tenant_id, title, division, due_date, status) VALUES ($1, $2, $3, $4, $5, 'open')",
        id, tenant.0, req.title, division, due_date
    )
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(serde_json::json!({ "id": id, "status": "open" })))
}

async fn update_task_status(
    headers: HeaderMap,
    Path(task_id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(req): Json<UpdateStatusRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_auth(&headers)?;

    let status = req.status.to_uppercase();
    let final_status = match status.as_str() {
        "DONE" | "COMPLETED" => "done",
        "IN_PROGRESS" => "in_progress",
        "PENDING" | "OPEN" => "open",
        _ => "open",
    };

    sqlx::query!(
        "UPDATE tasks SET status = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3",
        final_status, task_id, tenant.0
    )
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Also handle batch_checklist tasks (from production monitoring)
    sqlx::query!(
        "UPDATE batch_checklist SET done = $1, checked_at = now() WHERE id = $2 AND tenant_id = $3",
        final_status == "done", task_id, tenant.0
    )
    .execute(&pool)
    .await
    .ok();

    Ok(Json(serde_json::json!({ "id": task_id, "status": final_status })))
}
