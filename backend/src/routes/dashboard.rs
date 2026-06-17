use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    routing::get,
    Json, Router,
};
use serde::Serialize;
use sqlx::PgPool;

use crate::routes::require_tenant;
use crate::state::AppState;

#[derive(Serialize)]
pub struct DashboardStats {
    pub total_plans: i64,
    pub active_plans: i64,
    pub completed_plans: i64,
    pub total_staff: i64,
    pub total_ingredients: i64,
    pub total_menu_items: i64,
    pub total_equipment: i64,
    pub inventory_items: i64,
    pub open_tasks: i64,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/dashboard/stats", get(stats))
}

async fn stats(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<DashboardStats>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let t = tenant.0;

    let total_plans = sqlx::query_scalar!("SELECT COUNT(*) FROM production_plans WHERE tenant_id = $1", t)
        .fetch_one(&pool).await.unwrap_or(Some(0)).unwrap_or(0);

    let active_plans = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM production_plans WHERE tenant_id = $1 AND status IN ('PUBLISHED', 'IN_PROGRESS', 'APPROVED', 'PO_SENT')",
        t
    ).fetch_one(&pool).await.unwrap_or(Some(0)).unwrap_or(0);

    let completed_plans = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM production_plans WHERE tenant_id = $1 AND status = 'COMPLETED'", t
    ).fetch_one(&pool).await.unwrap_or(Some(0)).unwrap_or(0);

    let total_staff = sqlx::query_scalar!("SELECT COUNT(*) FROM staff WHERE tenant_id = $1", t)
        .fetch_one(&pool).await.unwrap_or(Some(0)).unwrap_or(0);

    let total_ingredients = sqlx::query_scalar!("SELECT COUNT(*) FROM ingredients WHERE tenant_id = $1", t)
        .fetch_one(&pool).await.unwrap_or(Some(0)).unwrap_or(0);

    let total_menu_items = sqlx::query_scalar!("SELECT COUNT(*) FROM menu_items WHERE tenant_id = $1", t)
        .fetch_one(&pool).await.unwrap_or(Some(0)).unwrap_or(0);

    let total_equipment = sqlx::query_scalar!("SELECT COUNT(*) FROM kitchen_resources WHERE tenant_id = $1", t)
        .fetch_one(&pool).await.unwrap_or(Some(0)).unwrap_or(0);

    let inventory_items = sqlx::query_scalar!("SELECT COUNT(*) FROM inventory WHERE tenant_id = $1", t)
        .fetch_one(&pool).await.unwrap_or(Some(0)).unwrap_or(0);

    let open_tasks = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM tasks WHERE tenant_id = $1 AND status NOT IN ('done', 'COMPLETED')", t
    ).fetch_one(&pool).await.unwrap_or(Some(0)).unwrap_or(0);

    Ok(Json(DashboardStats {
        total_plans,
        active_plans,
        completed_plans,
        total_staff,
        total_ingredients,
        total_menu_items,
        total_equipment,
        inventory_items,
        open_tasks,
    }))
}
