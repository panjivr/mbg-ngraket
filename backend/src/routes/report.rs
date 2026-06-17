use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    routing::get,
    Json, Router,
};
use serde::Serialize;
use serde_json::{json, Value};
use sqlx::{PgPool, Row};
use std::collections::HashMap;
use time::{format_description::well_known::Rfc3339, OffsetDateTime};
use uuid::Uuid;

use crate::routes::{TenantId, require_coordinator, require_tenant};
use crate::state::AppState;

#[derive(Serialize)]
pub struct DivisionPerformance {
    pub division_id: Uuid,
    pub division_name: String,
    pub total_batches: i64,
    pub on_time_batches: i64,
    pub on_time_rate: f64,
}

#[derive(Serialize)]
pub struct StaffPerformance {
    pub staff_id: Uuid,
    pub staff_name: String,
    pub division_id: String,
    pub tasks_completed: i64,
    pub avg_completion_time_minutes: f64,
    pub ontime_rate: f64,
    pub attendance_ontime_rate: f64,
    pub kpi_sppg_sop_compliance_rate: f64,
    pub kpi_on_time_distribution_rate: f64,
    pub kpi_beneficiary_coverage_rate: f64,
    pub kpi_food_safety_compliance_rate: f64,
    pub kpi_score: f64,
    pub kpi_formula_version: String,
    pub kpi_window_from: String,
    pub kpi_window_to: String,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/reports/divisions/performance", get(performance))
        .route("/reports/preview/:report_type", get(report_preview))
        .route("/performance", get(staff_performance))
}

async fn performance(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<DivisionPerformance>>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let rows = sqlx::query!(
        r#"
        SELECT d.id, d.name, 
               COUNT(b.id) AS total_batches,
               COALESCE(SUM(CASE WHEN b.end_time <= (SELECT target_delivery_time FROM production_plans WHERE id = b.plan_id) THEN 1 ELSE 0 END), 0) AS on_time_batches
        FROM divisions d
        LEFT JOIN production_batches b ON b.division_id = d.id AND b.tenant_id = d.tenant_id
        WHERE d.tenant_id = $1
        GROUP BY d.id, d.name
        ORDER BY d.name
        "#,
        tenant.0
    )
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let data = rows
        .into_iter()
        .map(|r| {
            let total = r.total_batches.unwrap_or(0);
            let ontime = r.on_time_batches.unwrap_or(0);
            let rate = if total > 0 {
                ontime as f64 / total as f64
            } else {
                0.0
            };
            DivisionPerformance {
                division_id: r.id,
                division_name: r.name,
                total_batches: total,
                on_time_batches: ontime,
                on_time_rate: rate,
            }
        })
        .collect();
    Ok(Json(data))
}

async fn staff_performance(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<StaffPerformance>>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    require_coordinator(&headers, &pool, tenant_id).await?;
    let staff_rows = sqlx::query(
        r#"
        SELECT s.id AS staff_id,
               COALESCE(s.name, '-') AS staff_name,
               COALESCE(NULLIF(TRIM(s.division_id::text), ''), 'UNASSIGNED') AS division_id,
               COALESCE(SUM(CASE WHEN d.work_date IS NOT NULL AND UPPER(COALESCE(d.status, 'PRESENT')) != 'ABSENT' THEN 1 ELSE 0 END), 0) AS present_days,
               COALESCE(SUM(CASE WHEN d.work_date IS NOT NULL AND COALESCE(d.late_minutes, 0) = 0 AND UPPER(COALESCE(d.status, 'PRESENT')) != 'ABSENT' THEN 1 ELSE 0 END), 0) AS ontime_present_days
        FROM staff s
        LEFT JOIN attendance_daily d
               ON d.tenant_id = s.tenant_id
              AND d.staff_id = s.id
              AND d.work_date >= (CURRENT_DATE - INTERVAL '30 days')
        WHERE s.tenant_id = $1
        GROUP BY s.id, s.name, COALESCE(NULLIF(TRIM(s.division_id::text), ''), 'UNASSIGNED')
        ORDER BY s.name
        "#,
    )
    .bind(tenant_id.0)
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let task_rows = sqlx::query(
        r#"
        SELECT COALESCE(NULLIF(TRIM(division_id::text), ''), 'UNASSIGNED') AS division_id,
               COUNT(*) AS total_tasks,
               SUM(CASE WHEN UPPER(COALESCE(status, '')) IN ('DONE', 'COMPLETED') THEN 1 ELSE 0 END) AS done_tasks,
               AVG(CASE WHEN UPPER(COALESCE(status, '')) IN ('DONE', 'COMPLETED') THEN COALESCE(duration_minutes, 0) END) AS avg_minutes
        FROM tasks
        WHERE tenant_id = $1
          AND (
            COALESCE(end_time, start_time, due_date, created_at) IS NULL
            OR COALESCE(end_time, start_time, due_date, created_at) >= (CURRENT_DATE - INTERVAL '30 days')
          )
        GROUP BY COALESCE(NULLIF(TRIM(division_id::text), ''), 'UNASSIGNED')
        "#,
    )
    .bind(tenant_id.0)
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let batch_rows = sqlx::query(
        r#"
        SELECT COALESCE(NULLIF(TRIM(division_id::text), ''), 'UNASSIGNED') AS division_id,
               COUNT(*) AS total_batches,
               SUM(CASE WHEN UPPER(COALESCE(current_status, '')) IN ('DONE', 'COMPLETED', 'ON_TIME') THEN 1 ELSE 0 END) AS on_time_batches
        FROM production_batches
        WHERE tenant_id = $1
          AND (
            COALESCE(end_time, start_time) IS NULL
            OR COALESCE(end_time, start_time) >= (CURRENT_DATE - INTERVAL '30 days')
          )
        GROUP BY COALESCE(NULLIF(TRIM(division_id::text), ''), 'UNASSIGNED')
        "#,
    )
    .bind(tenant_id.0)
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let food_rows = sqlx::query(
        r#"
        SELECT COALESCE(NULLIF(TRIM(division_id::text), ''), 'UNASSIGNED') AS division_id,
               COUNT(*) AS checked_reports,
               SUM(CASE
                     WHEN quality_warnings IS NULL
                          OR quality_warnings = '[]'::jsonb
                     THEN 1 ELSE 0
                   END) AS safe_reports
        FROM daily_reports
        WHERE tenant_id = $1
          AND period_type = 'daily'
          AND period_start >= (CURRENT_DATE - INTERVAL '30 days')
        GROUP BY COALESCE(NULLIF(TRIM(division_id::text), ''), 'UNASSIGNED')
        "#,
    )
    .bind(tenant_id.0)
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let dist_row = sqlx::query(
        r#"
        SELECT COALESCE(SUM(target_portions), 0) AS target_portions,
               COALESCE(SUM(served_portions), 0) AS served_portions
        FROM pm_distribution_events
        WHERE tenant_id = $1
          AND service_date >= (CURRENT_DATE - INTERVAL '30 days')::date
          AND service_date <= CURRENT_DATE
        "#,
    )
    .bind(tenant_id.0)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut task_map: HashMap<String, (f64, f64, f64)> = HashMap::new();
    for row in task_rows {
        let division_id: String = row.try_get("division_id").unwrap_or_else(|_| "UNASSIGNED".to_string());
        let total_tasks = row.try_get::<i64, _>("total_tasks").unwrap_or(0) as f64;
        let done_tasks = row.try_get::<i64, _>("done_tasks").unwrap_or(0) as f64;
        let avg_minutes = row.try_get::<f64, _>("avg_minutes").unwrap_or(0.0);
        task_map.insert(division_id, (total_tasks, done_tasks, avg_minutes));
    }

    let mut batch_map: HashMap<String, (f64, f64)> = HashMap::new();
    for row in batch_rows {
        let division_id: String = row.try_get("division_id").unwrap_or_else(|_| "UNASSIGNED".to_string());
        let total_batches = row.try_get::<i64, _>("total_batches").unwrap_or(0) as f64;
        let on_time_batches = row.try_get::<i64, _>("on_time_batches").unwrap_or(0) as f64;
        batch_map.insert(division_id, (total_batches, on_time_batches));
    }

    let mut food_map: HashMap<String, (f64, f64)> = HashMap::new();
    for row in food_rows {
        let division_id: String = row.try_get("division_id").unwrap_or_else(|_| "UNASSIGNED".to_string());
        let checked_reports = row.try_get::<i64, _>("checked_reports").unwrap_or(0) as f64;
        let safe_reports = row.try_get::<i64, _>("safe_reports").unwrap_or(0) as f64;
        food_map.insert(division_id, (checked_reports, safe_reports));
    }

    let target_portions = dist_row.try_get::<f64, _>("target_portions").unwrap_or(0.0);
    let served_portions = dist_row.try_get::<f64, _>("served_portions").unwrap_or(0.0);
    let beneficiary_coverage_rate = if target_portions > 0.0 { served_portions / target_portions } else { 0.0 };

    let mut staff_per_division: HashMap<String, i64> = HashMap::new();
    for row in &staff_rows {
        let division_id: String = row.try_get("division_id").unwrap_or_else(|_| "UNASSIGNED".to_string());
        let count = staff_per_division.entry(division_id).or_insert(0);
        *count += 1;
    }

    let now = OffsetDateTime::now_utc().date();
    let kpi_window_to = now.to_string();
    let kpi_window_from = (now - time::Duration::days(30)).to_string();

    let data = staff_rows
        .into_iter()
        .map(|row| {
            let staff_id: Uuid = row.try_get("staff_id").unwrap_or_else(|_| Uuid::nil());
            let staff_name: String = row.try_get("staff_name").unwrap_or_else(|_| "-".to_string());
            let division_id: String = row.try_get("division_id").unwrap_or_else(|_| "UNASSIGNED".to_string());
            let present_days = row.try_get::<i64, _>("present_days").unwrap_or(0) as f64;
            let ontime_present_days = row.try_get::<i64, _>("ontime_present_days").unwrap_or(0) as f64;
            let attendance_rate = if present_days > 0.0 { ontime_present_days / present_days } else { 0.0 };

            let (total_tasks, done_tasks, avg_minutes) = task_map
                .get(&division_id)
                .copied()
                .unwrap_or((0.0, 0.0, 0.0));
            let (total_batches, on_time_batches) = batch_map
                .get(&division_id)
                .copied()
                .unwrap_or((0.0, 0.0));
            let (checked_reports, safe_reports) = food_map
                .get(&division_id)
                .copied()
                .unwrap_or((0.0, 0.0));

            let staff_count = (*staff_per_division.get(&division_id).unwrap_or(&1)).max(1) as f64;
            let tasks_completed = (done_tasks / staff_count).round() as i64;
            let sop_rate = if total_tasks > 0.0 { done_tasks / total_tasks } else { 0.0 };
            let on_time_distribution_rate = if total_batches > 0.0 { on_time_batches / total_batches } else { 0.0 };
            let food_safety_rate = if checked_reports > 0.0 { safe_reports / checked_reports } else { 0.0 };
            let kpi_score = ((sop_rate * 0.35)
                + (on_time_distribution_rate * 0.30)
                + (beneficiary_coverage_rate * 0.20)
                + (food_safety_rate * 0.15)) * 100.0;

            StaffPerformance {
                staff_id,
                staff_name,
                division_id,
                tasks_completed,
                avg_completion_time_minutes: avg_minutes,
                ontime_rate: attendance_rate * 100.0,
                attendance_ontime_rate: attendance_rate,
                kpi_sppg_sop_compliance_rate: sop_rate,
                kpi_on_time_distribution_rate: on_time_distribution_rate,
                kpi_beneficiary_coverage_rate: beneficiary_coverage_rate,
                kpi_food_safety_compliance_rate: food_safety_rate,
                kpi_score: (kpi_score * 10.0).round() / 10.0,
                kpi_formula_version: "2025.401.1".to_string(),
                kpi_window_from: kpi_window_from.clone(),
                kpi_window_to: kpi_window_to.clone(),
            }
        })
        .collect();

    Ok(Json(data))
}

async fn report_preview(
    headers: HeaderMap,
    Path(report_type): Path<String>,
    State(pool): State<PgPool>,
) -> Result<Json<Value>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    let rt = report_type.trim().to_lowercase();
    let body = match rt.as_str() {
        "production" => preview_production(&pool, tenant_id).await?,
        "finance" => preview_finance(&pool, tenant_id).await?,
        "inventory" => preview_inventory(&pool, tenant_id).await?,
        "staff" => preview_staff(&pool, tenant_id).await?,
        _ => return Err(StatusCode::NOT_FOUND),
    };
    Ok(Json(body))
}

async fn preview_production(pool: &PgPool, tenant_id: TenantId) -> Result<Value, StatusCode> {
    let plan_rows = sqlx::query(
        r#"
        SELECT id,
               target_portions,
               status,
               to_char(target_delivery_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS target_delivery_time,
               to_char(generated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
        FROM production_plans
        WHERE tenant_id = $1
        ORDER BY generated_at DESC
        LIMIT 10
        "#,
    )
    .bind(tenant_id.0)
    .fetch_all(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let plans = plan_rows
        .into_iter()
        .map(|r| {
            let id: Uuid = r.try_get("id").unwrap_or_else(|_| Uuid::nil());
            let target_portions: i32 = r.try_get("target_portions").unwrap_or(0);
            let status: String = r.try_get("status").unwrap_or_else(|_| "-".to_string());
            let target_delivery_time: String = r
                .try_get("target_delivery_time")
                .unwrap_or_else(|_| "-".to_string());
            let created_at: String = r.try_get("created_at").unwrap_or_else(|_| "-".to_string());
            json!({
                "id": id,
                "code": short_code("PLN", id),
                "target_portions": target_portions,
                "target_delivery_time": target_delivery_time,
                "status": status,
                "created_at": created_at
            })
        })
        .collect::<Vec<_>>();

    let batch_rows = sqlx::query(
        r#"
        SELECT id,
               plan_id,
               menu_item_id,
               division_id,
               batch_size,
               COALESCE(current_status, 'scheduled') AS status,
               to_char(start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS start_time,
               to_char(end_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS end_time
        FROM production_batches
        WHERE tenant_id = $1
        ORDER BY start_time DESC
        LIMIT 25
        "#,
    )
    .bind(tenant_id.0)
    .fetch_all(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let batches = batch_rows
        .into_iter()
        .map(|r| {
            let id: Uuid = r.try_get("id").unwrap_or_else(|_| Uuid::nil());
            let plan_id: Uuid = r.try_get("plan_id").unwrap_or_else(|_| Uuid::nil());
            let menu_item_id: Uuid = r.try_get("menu_item_id").unwrap_or_else(|_| Uuid::nil());
            let division_id: Uuid = r.try_get("division_id").unwrap_or_else(|_| Uuid::nil());
            let batch_size: i32 = r.try_get("batch_size").unwrap_or(0);
            let status: String = r.try_get("status").unwrap_or_else(|_| "-".to_string());
            let start_time: String = r.try_get("start_time").unwrap_or_else(|_| "-".to_string());
            let end_time: String = r.try_get("end_time").unwrap_or_else(|_| "-".to_string());
            json!({
                "id": id,
                "code": short_code("BCH", id),
                "plan_id": plan_id,
                "menu_item_id": menu_item_id,
                "batch_number": Value::Null,
                "batch_size": batch_size,
                "division_id": division_id,
                "start_time": start_time,
                "end_time": end_time,
                "status": status
            })
        })
        .collect::<Vec<_>>();

    let mut warnings = Vec::new();
    if plans.is_empty() {
        warnings.push("Belum ada data plan produksi".to_string());
    }
    if batches.is_empty() {
        warnings.push("Belum ada data batch produksi".to_string());
    }

    Ok(json!({
        "meta": report_meta(
            "production",
            json!({
                "plans": plans.len(),
                "batches": batches.len()
            }),
            warnings,
        ),
        "plans": plans,
        "batches": batches
    }))
}

async fn preview_finance(pool: &PgPool, tenant_id: TenantId) -> Result<Value, StatusCode> {
    let transaction_rows = sqlx::query(
        r#"
        SELECT id,
               category,
               amount,
               currency,
               COALESCE(description, '') AS description,
               to_char(occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS date
        FROM finance_transactions
        WHERE tenant_id = $1
        ORDER BY occurred_at DESC
        LIMIT 25
        "#,
    )
    .bind(tenant_id.0)
    .fetch_all(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let transactions = transaction_rows
        .into_iter()
        .map(|r| {
            let id: Uuid = r.try_get("id").unwrap_or_else(|_| Uuid::nil());
            let category: String = r.try_get("category").unwrap_or_else(|_| "-".to_string());
            let amount: f64 = r.try_get("amount").unwrap_or(0.0);
            let currency: String = r.try_get("currency").unwrap_or_else(|_| "IDR".to_string());
            let description: String = r.try_get("description").unwrap_or_else(|_| "".to_string());
            let date: String = r.try_get("date").unwrap_or_else(|_| "-".to_string());
            json!({
                "id": id,
                "category": category,
                "amount": amount,
                "currency": currency,
                "description": description,
                "date": date
            })
        })
        .collect::<Vec<_>>();

    let purchase_rows = sqlx::query(
        r#"
        SELECT id,
               COALESCE(po_number, '') AS po_number,
               COALESCE(status, '') AS status,
               COALESCE(fixed_total_price, 0) AS total_amount,
               to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS purchase_date
        FROM purchase_orders
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT 25
        "#,
    )
    .bind(tenant_id.0)
    .fetch_all(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let purchases = purchase_rows
        .into_iter()
        .map(|r| {
            let id: Uuid = r.try_get("id").unwrap_or_else(|_| Uuid::nil());
            let po_number: String = r
                .try_get("po_number")
                .unwrap_or_else(|_| format!("PO-{}", short_code("", id)));
            let status: String = r.try_get("status").unwrap_or_else(|_| "-".to_string());
            let total_amount: f64 = r.try_get("total_amount").unwrap_or(0.0);
            let purchase_date: String = r
                .try_get("purchase_date")
                .unwrap_or_else(|_| "-".to_string());
            json!({
                "id": id,
                "po_number": po_number,
                "status": status,
                "total_amount": total_amount,
                "purchase_date": purchase_date
            })
        })
        .collect::<Vec<_>>();

    let mut warnings = Vec::new();
    if transactions.is_empty() {
        warnings.push("Belum ada transaksi keuangan".to_string());
    }
    if purchases.is_empty() {
        warnings.push("Belum ada data purchase order".to_string());
    }

    Ok(json!({
        "meta": report_meta(
            "finance",
            json!({
                "transactions": transactions.len(),
                "purchases": purchases.len()
            }),
            warnings,
        ),
        "transactions": transactions,
        "purchases": purchases
    }))
}

async fn preview_inventory(pool: &PgPool, tenant_id: TenantId) -> Result<Value, StatusCode> {
    let movement_rows = sqlx::query(
        r#"
        SELECT sm.id,
               to_char(sm.occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS at,
               COALESCE(ing.name, '') AS ingredient_name,
               COALESCE(sm.movement_type, '') AS movement_type,
               COALESCE(sm.qty_before, 0) AS qty_before,
               COALESCE(sm.qty_after, 0) AS qty_after,
               COALESCE(sm.delta, 0) AS delta,
               COALESCE(sm.note, '') AS note
        FROM stock_movements sm
        LEFT JOIN ingredients ing
          ON ing.id = sm.ingredient_id
         AND ing.tenant_id = sm.tenant_id
        WHERE sm.tenant_id = $1
        ORDER BY sm.occurred_at DESC
        LIMIT 50
        "#,
    )
    .bind(tenant_id.0)
    .fetch_all(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let movements = movement_rows
        .into_iter()
        .map(|r| {
            let id: Uuid = r.try_get("id").unwrap_or_else(|_| Uuid::nil());
            let at: String = r.try_get("at").unwrap_or_else(|_| "-".to_string());
            let ingredient_name: String = r
                .try_get("ingredient_name")
                .unwrap_or_else(|_| "-".to_string());
            let movement_type: String = r
                .try_get("movement_type")
                .unwrap_or_else(|_| "-".to_string());
            let qty_before: f64 = r.try_get("qty_before").unwrap_or(0.0);
            let qty_after: f64 = r.try_get("qty_after").unwrap_or(0.0);
            let delta: f64 = r.try_get("delta").unwrap_or(0.0);
            let note: String = r.try_get("note").unwrap_or_else(|_| "".to_string());
            json!({
                "id": id,
                "at": at,
                "ingredient_name": ingredient_name,
                "movement_type": movement_type,
                "qty_before": qty_before,
                "qty_after": qty_after,
                "delta": delta,
                "note": note,
                "actor_email": "-"
            })
        })
        .collect::<Vec<_>>();

    let low_rows = sqlx::query(
        r#"
        SELECT ing.name, ing.unit, i.quantity
        FROM inventory i
        JOIN ingredients ing
          ON ing.id = i.ingredient_id
         AND ing.tenant_id = i.tenant_id
        WHERE i.tenant_id = $1
        ORDER BY i.quantity ASC
        LIMIT 10
        "#,
    )
    .bind(tenant_id.0)
    .fetch_all(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let low_stock = low_rows
        .into_iter()
        .map(|r| {
            let name: String = r.try_get("name").unwrap_or_else(|_| "-".to_string());
            let unit: String = r.try_get("unit").unwrap_or_else(|_| "-".to_string());
            let quantity: f64 = r.try_get("quantity").unwrap_or(0.0);
            json!({
                "name": name,
                "unit": unit,
                "quantity": quantity
            })
        })
        .collect::<Vec<_>>();

    let mut warnings = Vec::new();
    if movements.is_empty() {
        warnings.push("Belum ada pergerakan stok".to_string());
    }
    if low_stock.is_empty() {
        warnings.push("Belum ada data stok untuk evaluasi item terendah".to_string());
    }

    Ok(json!({
        "meta": report_meta(
            "inventory",
            json!({
                "movements": movements.len(),
                "low_stock": low_stock.len()
            }),
            warnings,
        ),
        "movements": movements,
        "low_stock": low_stock
    }))
}

async fn preview_staff(pool: &PgPool, tenant_id: TenantId) -> Result<Value, StatusCode> {
    let rows = sqlx::query(
        r#"
        SELECT d.id,
               d.name,
               COUNT(t.id) AS total_tasks,
               COALESCE(SUM(CASE WHEN lower(t.status) IN ('done', 'completed') THEN 1 ELSE 0 END), 0) AS done_tasks
        FROM divisions d
        LEFT JOIN tasks t
               ON t.tenant_id = d.tenant_id
              AND lower(trim(t.division)) = lower(trim(d.name))
        WHERE d.tenant_id = $1
        GROUP BY d.id, d.name
        ORDER BY d.name
        "#,
    )
    .bind(tenant_id.0)
    .fetch_all(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let performance = rows
        .into_iter()
        .map(|r| {
            let division_id: Uuid = r.try_get("id").unwrap_or_else(|_| Uuid::nil());
            let division_name: String = r.try_get("name").unwrap_or_else(|_| "-".to_string());
            let total_tasks: i64 = r.try_get("total_tasks").unwrap_or(0);
            let done_tasks: i64 = r.try_get("done_tasks").unwrap_or(0);
            let completion_rate = if total_tasks > 0 {
                done_tasks as f64 / total_tasks as f64
            } else {
                0.0
            };
            json!({
                "division_id": division_id,
                "division_name": division_name,
                "total_tasks": total_tasks,
                "done_tasks": done_tasks,
                "completion_rate": completion_rate
            })
        })
        .collect::<Vec<_>>();

    let mut warnings = Vec::new();
    if performance.is_empty() {
        warnings.push("Belum ada pembagian divisi untuk menilai performa staff".to_string());
    }

    Ok(json!({
        "meta": report_meta(
            "staff",
            json!({
                "performance": performance.len()
            }),
            warnings,
        ),
        "performance": performance
    }))
}

fn short_code(prefix: &str, id: Uuid) -> String {
    let raw = id.simple().to_string();
    let chunk = &raw[..8];
    if prefix.is_empty() {
        chunk.to_uppercase()
    } else {
        format!("{prefix}-{}", chunk.to_uppercase())
    }
}

fn report_meta(report_type: &str, row_counts: Value, warnings: Vec<String>) -> Value {
    let generated_at = OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .unwrap_or_else(|_| "".to_string());
    json!({
        "report_type": report_type,
        "generated_at": generated_at,
        "row_counts": row_counts,
        "warnings": warnings
    })
}
