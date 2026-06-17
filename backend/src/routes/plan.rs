use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    routing::{get, post, delete as axum_delete},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::routes::{require_tenant, require_coordinator};
use crate::state::AppState;
use scheduler::{PlanRequest, PlanResult, Scheduler, MenuItemInfo, ResourceInfo, RecipeStepReq};

#[derive(Deserialize)]
pub struct GeneratePlanRequest {
    pub target_portions: i32,
    pub menu_item_ids: Vec<Uuid>,
    pub target_delivery_time: OffsetDateTime,
}

#[derive(Serialize)]
pub struct PlanSummary {
    pub plan_id: Uuid,
    pub status: String,
    pub batch_count: i32,
    pub feasibility_score: f64,
    pub lateness_minutes: i64,
    pub bottleneck_rate: f64,
}

#[derive(Serialize)]
pub struct PlanRow {
    pub id: Uuid,
    pub code: Option<String>,
    pub status: String,
    pub target_portions: i32,
    pub target_delivery_time: Option<String>,
    pub feasible: bool,
    pub generated_at: Option<String>,
    pub material_total: Option<f64>,
}

#[derive(Serialize)]
pub struct BatchRow {
    pub id: Uuid,
    pub code: Option<String>,
    pub menu_item_id: Uuid,
    pub menu_name: Option<String>,
    pub division_id: Uuid,
    pub division_name: Option<String>,
    pub batch_size: i32,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub status: String,
    pub batch_number: Option<i32>,
}

#[derive(Serialize)]
pub struct TaskRow {
    pub id: Uuid,
    pub title: String,
    pub division_id: Option<String>,
    pub division_name: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub duration_minutes: Option<i64>,
    pub status: String,
}

#[derive(Serialize)]
pub struct PlanDetail {
    pub plan: PlanRow,
    pub batches: Vec<BatchRow>,
    pub tasks: Vec<TaskRow>,
    pub stats: PlanStats,
}

#[derive(Serialize)]
pub struct PlanStats {
    pub slack_minutes: i64,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/plans", get(list_plans))
        .route("/plans/generate", post(generate))
        .route("/plans/draft", post(save_draft))
        .route("/plans/:id", axum_delete(delete_plan))
        .route("/plans/:id/details", get(get_plan_details))
        .route("/plans/:id/docs/validate", post(validate_docs))
        .route("/plans/:id/docs/generate", post(generate_docs))
        .route("/plans/:id/docs/:doc_type/:format", get(download_doc))
}

// ─── Save Draft ─────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct SaveDraftRequest {
    pub plan_date: Option<String>,
    pub data: Option<serde_json::Value>,
}

async fn save_draft(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<SaveDraftRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _email = require_coordinator(&headers, &pool, tenant).await?;

    let plan_id = Uuid::new_v4();
    let plan_data = req.data.unwrap_or(serde_json::json!({}));
    let target_portions = plan_data.get("target_portions").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
    let now = OffsetDateTime::now_utc();

    sqlx::query!(
        r#"INSERT INTO production_plans (id, tenant_id, status, target_portions, target_delivery_time, feasible, generated_at, plan_data)
           VALUES ($1, $2, 'DRAFT', $3, $4, false, $4, $5)"#,
        plan_id, tenant.0, target_portions, now, plan_data
    )
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({ "id": plan_id, "status": "DRAFT" })))
}

// ─── List Plans ─────────────────────────────────────────────────────────────

async fn list_plans(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<PlanRow>>, StatusCode> {
    let tenant = require_tenant(&headers)?;

    let rows = sqlx::query!(
        r#"SELECT id, status, target_portions, target_delivery_time, feasible, generated_at, material_total
           FROM production_plans WHERE tenant_id = $1 ORDER BY generated_at DESC"#,
        tenant.0
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Ok(Json(rows.iter().map(|r| PlanRow {
        id: r.id,
        code: Some(r.id.to_string()[..8].to_string()),
        status: r.status.clone(),
        target_portions: r.target_portions,
        target_delivery_time: Some(r.target_delivery_time.to_string()),
        feasible: r.feasible,
        generated_at: Some(r.generated_at.to_string()),
        material_total: r.material_total,
    }).collect()))
}

// ─── Plan Details ───────────────────────────────────────────────────────────

async fn get_plan_details(
    headers: HeaderMap,
    Path(plan_id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<PlanDetail>, StatusCode> {
    let tenant = require_tenant(&headers)?;

    let plan = sqlx::query!(
        r#"SELECT id, status, target_portions, target_delivery_time, feasible, generated_at, lateness_minutes, material_total
           FROM production_plans WHERE id = $1 AND tenant_id = $2"#,
        plan_id, tenant.0
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    let batches = sqlx::query!(
        r#"SELECT b.id, b.menu_item_id, b.division_id, b.batch_size, b.start_time, b.end_time, b.current_status,
                  m.name as menu_name, d.name as division_name
           FROM production_batches b
           LEFT JOIN menu_items m ON m.id = b.menu_item_id
           LEFT JOIN divisions d ON d.id = b.division_id
           WHERE b.plan_id = $1 AND b.tenant_id = $2
           ORDER BY b.start_time"#,
        plan_id, tenant.0
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let batch_rows: Vec<BatchRow> = batches.iter().enumerate().map(|(i, b)| BatchRow {
        id: b.id,
        code: Some(b.id.to_string()[..8].to_string()),
        menu_item_id: b.menu_item_id,
        menu_name: Some(b.menu_name.clone()),
        division_id: b.division_id,
        division_name: Some(b.division_name.clone()),
        batch_size: b.batch_size,
        start_time: Some(b.start_time.to_string()),
        end_time: Some(b.end_time.to_string()),
        status: b.current_status.clone().unwrap_or_else(|| "pending".into()),
        batch_number: Some((i + 1) as i32),
    }).collect();

    let tasks = sqlx::query!(
        r#"SELECT bc.id, bc.description, bc.scheduled_start, bc.scheduled_end,
                  CASE WHEN bc.done THEN 'COMPLETED' ELSE 'PENDING' END as status,
                  d.name as division_name, b.division_id
           FROM batch_checklist bc
           JOIN production_batches b ON b.id = bc.batch_id
           LEFT JOIN divisions d ON d.id = b.division_id
           WHERE b.plan_id = $1 AND bc.tenant_id = $2
           ORDER BY bc.scheduled_start NULLS LAST"#,
        plan_id, tenant.0
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let task_rows: Vec<TaskRow> = tasks.iter().map(|t| {
        let dur = match (&t.scheduled_start, &t.scheduled_end) {
            (Some(s), Some(e)) => Some((*e - *s).whole_minutes()),
            _ => None,
        };
        TaskRow {
            id: t.id,
            title: t.description.clone(),
            division_id: Some(t.division_id.to_string()),
            division_name: Some(t.division_name.clone()),
            start_time: t.scheduled_start.map(|s| s.to_string()),
            end_time: t.scheduled_end.map(|s| s.to_string()),
            duration_minutes: dur,
            status: t.status.clone().unwrap_or_else(|| "PENDING".into()),
        }
    }).collect();

    Ok(Json(PlanDetail {
        plan: PlanRow {
            id: plan.id,
            code: Some(plan.id.to_string()[..8].to_string()),
            status: plan.status,
            target_portions: plan.target_portions,
            target_delivery_time: Some(plan.target_delivery_time.to_string()),
            feasible: plan.feasible,
            generated_at: Some(plan.generated_at.to_string()),
            material_total: plan.material_total,
        },
        stats: PlanStats { slack_minutes: -plan.lateness_minutes },
        batches: batch_rows,
        tasks: task_rows,
    }))
}

// ─── Delete Plan ────────────────────────────────────────────────────────────

async fn delete_plan(
    headers: HeaderMap,
    Path(plan_id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<StatusCode, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _email = require_coordinator(&headers, &pool, tenant).await?;

    sqlx::query!("DELETE FROM production_plans WHERE id = $1 AND tenant_id = $2", plan_id, tenant.0)
        .execute(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}

// ─── Document stubs ─────────────────────────────────────────────────────────

async fn validate_docs(
    headers: HeaderMap,
    Path(plan_id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;

    let _plan = sqlx::query!(
        "SELECT id FROM production_plans WHERE id = $1 AND tenant_id = $2",
        plan_id, tenant.0
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    let config_exists = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM tenant_settings WHERE tenant_id = $1 AND key = 'kitchen_config'",
        tenant.0
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(Some(0));

    let mut errors = Vec::new();
    if config_exists == Some(0) {
        errors.push(serde_json::json!({"code": "KITCHEN_CONFIG_MISSING", "message": "Konfigurasi Kop SPPG belum diisi."}));
    }

    Ok(Json(serde_json::json!({ "errors": errors })))
}

async fn generate_docs(
    headers: HeaderMap,
    Path(plan_id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;

    sqlx::query!(
        "SELECT id FROM production_plans WHERE id = $1 AND tenant_id = $2",
        plan_id, tenant.0
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(serde_json::json!({ "success": true, "message": "Documents generated (stub)" })))
}

#[derive(Deserialize)]
pub struct DocDownloadParams {
    pub _division_id: Option<String>,
}

async fn download_doc(
    headers: HeaderMap,
    Path((plan_id, doc_type, format)): Path<(Uuid, String, String)>,
    Query(_params): Query<DocDownloadParams>,
    State(pool): State<PgPool>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;

    sqlx::query!(
        "SELECT id FROM production_plans WHERE id = $1 AND tenant_id = $2",
        plan_id, tenant.0
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(serde_json::json!({
        "message": format!("Document {}.{} generation not yet implemented", doc_type, format),
        "plan_id": plan_id
    })))
}

// ─── Generate Plan (existing) ───────────────────────────────────────────────

pub async fn generate_internal(
    pool: &PgPool,
    tenant_id: Uuid,
    role: &str,
    req: GeneratePlanRequest,
) -> Result<PlanSummary, StatusCode> {
    let role_lc = role.to_lowercase();
    if !role_lc.contains("coordinator") && role_lc != "admin" && role_lc != "owner" && role_lc != "developer" && role_lc != "kepala_sppg" && role_lc != "asisten_lapangan" {
        return Err(StatusCode::FORBIDDEN);
    }

    let tenant = crate::routes::TenantId(tenant_id);

    let resource_rows = sqlx::query!(
        "SELECT resource_type, COUNT(*) as count FROM kitchen_resources WHERE tenant_id = $1 AND status = 'READY' GROUP BY resource_type",
        tenant.0
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    let resources: Vec<ResourceInfo> = resource_rows
        .into_iter()
        .map(|r| ResourceInfo {
            id: None,
            resource_type: r.resource_type.clone(),
            count: r.count.unwrap_or(0) as i32,
        })
        .collect();

    let div_rows = sqlx::query!(
        "SELECT id, name, max_parallel_batches FROM divisions WHERE tenant_id = $1",
        tenant.0
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    let mut menu_items_info = Vec::new();

    for menu_id in &req.menu_item_ids {
        let menu_item = sqlx::query!(
            "SELECT recipe_id FROM menu_items WHERE id = $1 AND tenant_id = $2",
            menu_id, tenant.0
        )
        .fetch_optional(pool)
        .await
        .unwrap_or(None);

        if let Some(mi) = menu_item {
            let steps = sqlx::query!(
                "SELECT id, step_order, description, division_type, estimated_duration_minutes FROM recipe_steps WHERE recipe_id = $1 ORDER BY step_order",
                mi.recipe_id
            )
            .fetch_all(pool)
            .await
            .unwrap_or_default();

            let mut mapped_steps = Vec::new();

            for s in steps {
                let reqs = sqlx::query!(
                    "SELECT resource_type, quantity_needed FROM recipe_step_requirements WHERE step_id = $1",
                    s.id
                )
                .fetch_all(pool)
                .await
                .unwrap_or_default();

                let required_resources = reqs
                    .into_iter()
                    .map(|r| (r.resource_type, r.quantity_needed.unwrap_or(1)))
                    .collect();

                mapped_steps.push(RecipeStepReq {
                    step_order: s.step_order,
                    description: s.description,
                    duration_minutes: s.estimated_duration_minutes.unwrap_or(15) as i64,
                    required_resources,
                    division_id: None,
                });
            }

            if mapped_steps.is_empty() {
                mapped_steps.push(RecipeStepReq {
                    step_order: 1,
                    description: "General Production".to_string(),
                    duration_minutes: 45,
                    required_resources: vec![],
                    division_id: None,
                });
            }

            menu_items_info.push(MenuItemInfo {
                id: *menu_id,
                steps: mapped_steps,
            });
        }
    }

    let scheduler = Scheduler::default();

    let plan_input = PlanRequest {
        target_portions: req.target_portions,
        menu_items: menu_items_info,
        resources,
        start_time: OffsetDateTime::now_utc(),
        target_delivery_time: req.target_delivery_time,
    };

    let PlanResult {
        feasible,
        batches,
        timeline: _,
        lateness_minutes,
        bottleneck_rate,
    } = scheduler.make_plan(&plan_input);

    let plan_id = Uuid::new_v4();
    let _ = sqlx::query!(
        "INSERT INTO production_plans (id, tenant_id, status, target_portions, target_delivery_time, feasible, generated_at, lateness_minutes, bottleneck_rate) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        plan_id, tenant.0, "draft", req.target_portions, req.target_delivery_time,
        feasible, OffsetDateTime::now_utc(), lateness_minutes, bottleneck_rate
    )
    .execute(pool)
    .await;

    for b in batches.iter() {
        let batch_id = Uuid::new_v4();
        let default_div = div_rows.first().map(|d| d.id).unwrap_or_else(Uuid::new_v4);

        let _ = sqlx::query!(
            "INSERT INTO production_batches (id, tenant_id, plan_id, division_id, menu_item_id, batch_size, start_time, end_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
            batch_id, tenant.0, plan_id, default_div, b.menu_item_id, b.batch_size, b.start_time, b.end_time
        )
        .execute(pool)
        .await;

        let _ = sqlx::query!(
            "INSERT INTO batch_checklist (id, tenant_id, batch_id, description, done, scheduled_start, scheduled_end, target_role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
            Uuid::new_v4(), tenant.0, batch_id, "Execute Production Batch", false,
            b.start_time, b.end_time, "koordinator_pengolahan"
        )
        .execute(pool)
        .await;
    }

    Ok(PlanSummary {
        plan_id,
        status: "draft".into(),
        batch_count: batches.len() as i32,
        feasibility_score: if feasible { 1.0 } else { 0.0 },
        lateness_minutes,
        bottleneck_rate,
    })
}

async fn generate(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<GeneratePlanRequest>,
) -> Result<Json<PlanSummary>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _email = require_coordinator(&headers, &pool, tenant).await?;
    let summary = generate_internal(&pool, tenant.0, "coordinator", req).await?;
    Ok(Json(summary))
}
