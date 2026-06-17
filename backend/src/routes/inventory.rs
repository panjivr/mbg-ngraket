use axum::{
    extract::{Path, State, Query},
    http::{HeaderMap, StatusCode},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use time::{OffsetDateTime, Duration};
use uuid::Uuid;
use std::collections::HashMap;

use crate::routes::{TenantId, require_tenant, require_auth, require_coordinator};
use crate::state::AppState;

// ─── Data types ─────────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct InventoryItem {
    pub id: Uuid,
    pub ingredient_id: Uuid,
    pub name: String,
    pub quantity: f64,
    pub unit: String,
    pub estimated_price: f64,
}

#[derive(Deserialize)]
pub struct StockOpnameRequest {
    pub ingredient_id: Uuid,
    pub quantity: f64,
}

#[derive(Deserialize)]
pub struct AdjustRequest {
    pub ingredient_id: Uuid,
    pub mode: String,
    pub value: f64,
    pub note: Option<String>,
}

#[derive(Serialize)]
pub struct MovementRow {
    pub at: String,
    pub name: String,
    pub movement_type: String,
    pub qty_before: f64,
    pub qty_after: f64,
    pub delta: f64,
    pub note: String,
}

#[derive(Serialize)]
pub struct ForecastItem {
    pub ingredient_id: Uuid,
    pub ingredient_name: String,
    pub current_stock: f64,
    pub required_quantity: f64,
    pub unit: String,
    pub to_buy: f64,
}

#[derive(Deserialize)]
pub struct ForecastQuery {
    pub days: Option<i64>,
}

#[derive(Deserialize)]
pub struct MovementQuery {
    pub limit: Option<i64>,
}

// ─── Router ─────────────────────────────────────────────────────────────────

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/inventory/items", get(list_items))
        .route("/inventory/adjust", post(adjust_stock))
        .route("/inventory/stock_opname", post(stock_opname))
        .route("/inventory/movements/recent", get(recent_movements))
        .route("/inventory/:ingredient_id/movements", get(ingredient_movements))
        .route("/inventory/forecast", get(get_forecast))
}

// ─── Internal helpers (reusable from other modules) ─────────────────────────

pub async fn get_current_qty(pool: &PgPool, tenant_id: Uuid, ingredient_id: Uuid) -> f64 {
    sqlx::query_scalar!(
        "SELECT quantity FROM inventory WHERE tenant_id = $1 AND ingredient_id = $2",
        tenant_id, ingredient_id
    )
    .fetch_optional(pool)
    .await
    .unwrap_or(None)
    .unwrap_or(0.0)
}

pub async fn adjust_stock_internal(
    pool: &PgPool,
    tenant_id: Uuid,
    ingredient_id: Uuid,
    mode: &str,
    value: f64,
    movement_type: &str,
    note: &str,
) -> Result<f64, StatusCode> {
    let qty_before = get_current_qty(pool, tenant_id, ingredient_id).await;

    let qty_after = match mode {
        "set" => value,
        "add" => qty_before + value,
        "sub" => (qty_before - value).max(0.0),
        _ => return Err(StatusCode::BAD_REQUEST),
    };

    let delta = qty_after - qty_before;
    let now = OffsetDateTime::now_utc();

    sqlx::query!(
        r#"INSERT INTO stock_movements (id, tenant_id, ingredient_id, movement_type, quantity, occurred_at, qty_before, qty_after, delta, note)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"#,
        Uuid::new_v4(), tenant_id, ingredient_id, movement_type, value, now,
        qty_before, qty_after, delta, note
    )
    .execute(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    sqlx::query!(
        r#"INSERT INTO inventory (id, tenant_id, ingredient_id, quantity, unit)
           VALUES ($1, $2, $3, $4, (SELECT unit FROM ingredients WHERE id = $3 AND tenant_id = $2))
           ON CONFLICT (tenant_id, ingredient_id) DO UPDATE SET quantity = $4"#,
        Uuid::new_v4(), tenant_id, ingredient_id, qty_after
    )
    .execute(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(qty_after)
}

pub async fn stock_opname_internal(
    pool: &PgPool,
    tenant_id: Uuid,
    ingredient_id: Uuid,
    quantity: f64,
) -> Result<InventoryItem, StatusCode> {
    adjust_stock_internal(pool, tenant_id, ingredient_id, "set", quantity, "OPNAME", "Stock opname").await?;

    let r = sqlx::query!(
        r#"SELECT inv.id, inv.ingredient_id, inv.quantity, inv.unit,
                  i.name, i.estimated_price
           FROM inventory inv
           JOIN ingredients i ON i.id = inv.ingredient_id AND i.tenant_id = inv.tenant_id
           WHERE inv.tenant_id = $1 AND inv.ingredient_id = $2"#,
        tenant_id, ingredient_id
    )
    .fetch_one(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(InventoryItem {
        id: r.id,
        ingredient_id: r.ingredient_id,
        name: r.name,
        quantity: r.quantity,
        unit: r.unit,
        estimated_price: r.estimated_price,
    })
}

// ─── Handlers ───────────────────────────────────────────────────────────────

async fn list_items(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<InventoryItem>>, StatusCode> {
    let tenant = require_tenant(&headers)?;

    let rows = sqlx::query!(
        r#"SELECT inv.id, inv.ingredient_id, inv.quantity, inv.unit,
                  i.name, i.estimated_price
           FROM inventory inv
           JOIN ingredients i ON i.id = inv.ingredient_id AND i.tenant_id = inv.tenant_id
           WHERE inv.tenant_id = $1
           ORDER BY i.name"#,
        tenant.0
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Ok(Json(rows.into_iter().map(|r| InventoryItem {
        id: r.id,
        ingredient_id: r.ingredient_id,
        name: r.name,
        quantity: r.quantity,
        unit: r.unit,
        estimated_price: r.estimated_price,
    }).collect()))
}

async fn adjust_stock(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<AdjustRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_auth(&headers)?;

    let valid_modes = ["set", "add", "sub"];
    if !valid_modes.contains(&req.mode.as_str()) {
        return Err(StatusCode::BAD_REQUEST);
    }

    let movement_type = match req.mode.as_str() {
        "set" => "OPNAME",
        "add" => "ADJUSTMENT_IN",
        "sub" => "ADJUSTMENT_OUT",
        _ => "ADJUSTMENT",
    };

    let note = req.note.as_deref().unwrap_or("");
    let qty_after = adjust_stock_internal(
        &pool, tenant.0, req.ingredient_id, &req.mode, req.value, movement_type, note,
    ).await?;

    Ok(Json(serde_json::json!({
        "ingredient_id": req.ingredient_id,
        "quantity": qty_after,
        "mode": req.mode
    })))
}

async fn stock_opname(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<StockOpnameRequest>,
) -> Result<Json<InventoryItem>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _email = require_coordinator(&headers, &pool, tenant).await?;
    let r = stock_opname_internal(&pool, tenant.0, req.ingredient_id, req.quantity).await?;
    Ok(Json(r))
}

async fn recent_movements(
    headers: HeaderMap,
    Query(q): Query<MovementQuery>,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<MovementRow>>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let limit = q.limit.unwrap_or(20).min(200);

    let rows = sqlx::query!(
        r#"SELECT sm.occurred_at, sm.movement_type, sm.qty_before, sm.qty_after, sm.delta, sm.note,
                  i.name
           FROM stock_movements sm
           JOIN ingredients i ON i.id = sm.ingredient_id AND i.tenant_id = sm.tenant_id
           WHERE sm.tenant_id = $1
           ORDER BY sm.occurred_at DESC
           LIMIT $2"#,
        tenant.0, limit
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Ok(Json(rows.into_iter().map(|r| MovementRow {
        at: r.occurred_at.to_string(),
        name: r.name,
        movement_type: r.movement_type,
        qty_before: r.qty_before.unwrap_or(0.0),
        qty_after: r.qty_after.unwrap_or(0.0),
        delta: r.delta.unwrap_or(0.0),
        note: r.note.unwrap_or_default(),
    }).collect()))
}

async fn ingredient_movements(
    headers: HeaderMap,
    Path(ingredient_id): Path<Uuid>,
    Query(q): Query<MovementQuery>,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<MovementRow>>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let limit = q.limit.unwrap_or(50).min(200);

    let ing = sqlx::query!(
        "SELECT name FROM ingredients WHERE id = $1 AND tenant_id = $2",
        ingredient_id, tenant.0
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    let rows = sqlx::query!(
        r#"SELECT occurred_at, movement_type, qty_before, qty_after, delta, note
           FROM stock_movements
           WHERE tenant_id = $1 AND ingredient_id = $2
           ORDER BY occurred_at DESC
           LIMIT $3"#,
        tenant.0, ingredient_id, limit
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Ok(Json(rows.into_iter().map(|r| MovementRow {
        at: r.occurred_at.to_string(),
        name: ing.name.clone(),
        movement_type: r.movement_type,
        qty_before: r.qty_before.unwrap_or(0.0),
        qty_after: r.qty_after.unwrap_or(0.0),
        delta: r.delta.unwrap_or(0.0),
        note: r.note.unwrap_or_default(),
    }).collect()))
}

// ─── Forecast ───────────────────────────────────────────────────────────────

pub async fn forecast_internal(
    pool: &PgPool,
    tenant_id: Uuid,
    days: i64,
) -> Result<Vec<ForecastItem>, StatusCode> {
    let tenant = TenantId(tenant_id);
    let now = OffsetDateTime::now_utc();
    let future = now + Duration::days(days);

    let batches = sqlx::query!(
        r#"SELECT b.menu_item_id, b.batch_size
           FROM production_batches b
           JOIN production_plans p ON b.plan_id = p.id
           WHERE b.tenant_id = $1
             AND b.start_time >= $2
             AND b.start_time <= $3
             AND p.status != 'completed'"#,
        tenant.0, now, future
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    let mut menu_demand: HashMap<Uuid, f64> = HashMap::new();
    for b in batches {
        *menu_demand.entry(b.menu_item_id).or_insert(0.0) += b.batch_size as f64;
    }

    let mut ingredient_demand: HashMap<Uuid, f64> = HashMap::new();

    for (menu_id, portions) in menu_demand {
        let recipe = sqlx::query!(
            "SELECT recipe_id FROM menu_items WHERE id = $1 AND tenant_id = $2",
            menu_id, tenant.0
        )
        .fetch_optional(pool)
        .await
        .unwrap_or(None);

        if let Some(r) = recipe {
            let ingredients = sqlx::query!(
                "SELECT ingredient_id, quantity_per_portion FROM recipe_ingredients WHERE recipe_id = $1",
                r.recipe_id
            )
            .fetch_all(pool)
            .await
            .unwrap_or_default();

            for ing in ingredients {
                *ingredient_demand.entry(ing.ingredient_id).or_insert(0.0) +=
                    ing.quantity_per_portion * portions;
            }
        }
    }

    let mut forecast = Vec::new();

    for (ing_id, required) in ingredient_demand {
        let current_stock = get_current_qty(pool, tenant.0, ing_id).await;

        let info = sqlx::query!(
            "SELECT name, unit FROM ingredients WHERE id = $1 AND tenant_id = $2",
            ing_id, tenant.0
        )
        .fetch_optional(pool)
        .await
        .unwrap_or(None);

        if let Some(i) = info {
            let to_buy = (required - current_stock).max(0.0);
            forecast.push(ForecastItem {
                ingredient_id: ing_id,
                ingredient_name: i.name,
                current_stock,
                required_quantity: required,
                unit: i.unit,
                to_buy,
            });
        }
    }

    Ok(forecast)
}

async fn get_forecast(
    headers: HeaderMap,
    Query(q): Query<ForecastQuery>,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<ForecastItem>>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let days = q.days.unwrap_or(7);
    let forecast = forecast_internal(&pool, tenant.0, days).await?;
    Ok(Json(forecast))
}
