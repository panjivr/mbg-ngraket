use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    routing::{get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::state::AppState;
use super::{require_tenant, require_auth};
use super::inventory::adjust_stock_internal;

// ─── Data types ─────────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct PlanRow {
    pub id: Uuid,
    pub status: String,
    pub target_portions: i32,
    pub target_delivery_time: Option<String>,
    pub feasible: Option<bool>,
    pub material_total: Option<f64>,
    pub generated_at: Option<String>,
}

#[derive(Serialize)]
pub struct PlanDetail {
    pub plan: PlanRow,
    pub materials: Vec<MaterialRow>,
    pub po: Option<PurchaseOrderRow>,
    pub bids: Vec<BidRow>,
}

#[derive(Serialize, Clone)]
pub struct MaterialRow {
    pub id: Uuid,
    pub ingredient_id: Option<Uuid>,
    pub material_name: String,
    pub material_type: String,
    pub quantity_needed: f64,
    pub unit: String,
    /// Satuan untuk `estimated_price_per_unit` (boleh beda dari `unit` qty, mis. qty gram / harga per kg).
    pub price_unit: String,
    pub estimated_price_per_unit: f64,
    pub estimated_total: f64,
    pub price_source: String,
}

#[derive(Serialize)]
pub struct PurchaseOrderRow {
    pub id: Uuid,
    pub po_number: Option<String>,
    pub visibility: String,
    pub status: String,
    pub fixed_total_price: Option<f64>,
    pub delivery_deadline: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Serialize)]
pub struct BidRow {
    pub id: Uuid,
    pub supplier_id: Uuid,
    pub supplier_name: Option<String>,
    pub supplier_company: Option<String>,
    pub status: String,
    pub total_amount: f64,
    pub notes: Option<String>,
    pub submitted_at: Option<String>,
    pub items: Vec<BidItemRow>,
}

#[derive(Serialize)]
pub struct BidItemRow {
    pub id: Uuid,
    pub material_id: Uuid,
    pub material_name: String,
    pub offered_qty: f64,
    pub offered_price_per_unit: f64,
    pub notes: Option<String>,
}

// ─── Request types ──────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct SaveDraftRequest {
    pub food_id: Option<String>,
    pub plan_date: Option<String>,
    pub target_portions: Option<i32>,
    pub target_delivery_time: Option<String>,
    pub plan_data: Option<Value>,
}

#[derive(Deserialize)]
pub struct CalculateMaterialsRequest {
    pub food_id: String,
    pub total_portions: f64,
    pub price_source: String,
    pub siskaperbapo_region: Option<String>,
    pub siskaperbapo_date: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateMaterialPriceRequest {
    pub estimated_price_per_unit: f64,
    #[serde(default)]
    pub price_unit: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdatePlanStatusRequest {
    pub status: String,
}

#[derive(Deserialize)]
pub struct CreatePORequest {
    pub visibility: String,
    pub target_supplier_ids: Option<Vec<Uuid>>,
    pub fixed_total_price: Option<f64>,
    pub delivery_deadline: Option<String>,
    pub notes: Option<String>,
}

#[derive(Deserialize)]
pub struct ReviewBidRequest {
    pub action: String,
}

// ─── Receiving types ────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct ReceivingMaterialRow {
    pub id: Uuid,
    pub ingredient_id: Option<Uuid>,
    pub material_name: String,
    pub material_type: String,
    pub quantity_needed: f64,
    pub unit: String,
    pub received_qty: f64,
    pub received_at: Option<String>,
    pub received_by: Option<String>,
    pub remaining: f64,
    pub is_complete: bool,
}

#[derive(Deserialize)]
pub struct ReceiveItemsRequest {
    pub items: Vec<ReceiveItemEntry>,
}

#[derive(Deserialize)]
pub struct ReceiveItemEntry {
    pub material_id: Uuid,
    pub received_qty: f64,
    pub notes: Option<String>,
}

// ─── Operational Materials ──────────────────────────────────────────────────

#[derive(Serialize)]
pub struct OpMaterialRow {
    pub id: Uuid,
    pub name: String,
    pub unit: String,
    pub qty_per_portion: f64,
    pub estimated_price: f64,
}

#[derive(Deserialize)]
pub struct OpMaterialRequest {
    pub name: String,
    pub unit: Option<String>,
    pub qty_per_portion: Option<f64>,
    pub estimated_price: Option<f64>,
}

// ─── Router ─────────────────────────────────────────────────────────────────

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/plans", get(list_plans))
        .route("/plans/draft", post(save_draft))
        .route("/plans/:id", get(get_plan_detail))
        .route("/plans/:id/status", put(update_plan_status))
        .route("/plans/:id/materials/calculate", post(calculate_materials))
        .route("/plans/:id/materials", get(get_materials))
        .route("/plans/:id/materials/:mid", put(update_material_price))
        .route("/plans/:id/po", post(create_po).get(get_po))
        .route("/plans/:id/po/bids/:bid_id/review", put(review_bid))
        .route("/plans/:id/publish", post(publish_plan))
        .route("/plans/:id/receiving", get(get_receiving).post(receive_items))
        .route("/operational-materials", get(list_op_materials).post(create_op_material))
        .route("/operational-materials/:id", put(update_op_material).delete(delete_op_material))
}

// ─── Plans CRUD ─────────────────────────────────────────────────────────────

async fn list_plans(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<PlanRow>>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let rows = sqlx::query!(
        r#"SELECT id, status, target_portions, target_delivery_time, feasible, material_total, generated_at
           FROM production_plans WHERE tenant_id = $1 ORDER BY generated_at DESC NULLS LAST, id DESC"#,
        tenant.0
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Ok(Json(rows.iter().map(|r| PlanRow {
        id: r.id,
        status: r.status.clone(),
        target_portions: r.target_portions,
        target_delivery_time: Some(r.target_delivery_time.to_string()),
        feasible: Some(r.feasible),
        material_total: r.material_total,
        generated_at: Some(r.generated_at.to_string()),
    }).collect()))
}

async fn save_draft(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<SaveDraftRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let id = Uuid::new_v4();
    let portions = req.target_portions.unwrap_or(0);

    sqlx::query!(
        r#"INSERT INTO production_plans (id, tenant_id, status, target_portions, plan_data)
           VALUES ($1, $2, 'DRAFT', $3, $4)"#,
        id,
        tenant.0,
        portions,
        req.plan_data.unwrap_or(Value::Null)
    )
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({ "id": id, "status": "DRAFT" })))
}

async fn get_plan_detail(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<PlanDetail>, StatusCode> {
    let tenant = require_tenant(&headers)?;

    let plan = sqlx::query!(
        r#"SELECT id, status, target_portions, target_delivery_time, feasible, material_total, generated_at
           FROM production_plans WHERE id = $1 AND tenant_id = $2"#,
        id, tenant.0
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    let materials = fetch_materials(&pool, id).await;

    let po_row = sqlx::query!(
        r#"SELECT id, po_number, visibility, status, fixed_total_price, delivery_deadline, notes, created_at
           FROM purchase_orders WHERE plan_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 1"#,
        id, tenant.0
    )
    .fetch_optional(&pool)
    .await
    .unwrap_or(None);

    let po = po_row.map(|r| PurchaseOrderRow {
        id: r.id,
        po_number: r.po_number,
        visibility: r.visibility,
        status: r.status,
        fixed_total_price: r.fixed_total_price,
        delivery_deadline: r.delivery_deadline.map(|t| t.to_string()),
        notes: r.notes,
        created_at: r.created_at.to_string(),
    });

    let bids = if let Some(ref p) = po {
        fetch_bids(&pool, p.id).await
    } else {
        vec![]
    };

    Ok(Json(PlanDetail {
        plan: PlanRow {
            id: plan.id,
            status: plan.status,
            target_portions: plan.target_portions,
            target_delivery_time: Some(plan.target_delivery_time.to_string()),
            feasible: Some(plan.feasible),
            material_total: plan.material_total,
            generated_at: Some(plan.generated_at.to_string()),
        },
        materials,
        po,
        bids,
    }))
}

async fn update_plan_status(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(req): Json<UpdatePlanStatusRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_auth(&headers)?;

    let valid = ["DRAFT", "SIMULATED", "PO_SENT", "APPROVED", "PUBLISHED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
    if !valid.contains(&req.status.as_str()) {
        return Err(StatusCode::BAD_REQUEST);
    }

    sqlx::query!(
        "UPDATE production_plans SET status = $1 WHERE id = $2 AND tenant_id = $3",
        req.status, id, tenant.0
    )
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({ "id": id, "status": req.status })))
}

// ─── Material Calculation ───────────────────────────────────────────────────

async fn calculate_materials(
    headers: HeaderMap,
    Path(plan_id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(req): Json<CalculateMaterialsRequest>,
) -> Result<Json<Vec<MaterialRow>>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_auth(&headers)?;

    // Verify plan exists
    let _plan = sqlx::query!(
        "SELECT id FROM production_plans WHERE id = $1 AND tenant_id = $2",
        plan_id, tenant.0
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    let food_id = Uuid::parse_str(&req.food_id).map_err(|_| StatusCode::BAD_REQUEST)?;

    // Get menus for food
    let menus = sqlx::query!(
        r#"SELECT mi.id as menu_id, mi.recipe_id, mi.name as menu_name
           FROM food_menu_items fmi
           JOIN menu_items mi ON mi.id = fmi.menu_item_id
           WHERE fmi.food_id = $1 AND mi.tenant_id = $2"#,
        food_id, tenant.0
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    // Aggregate ingredient requirements
    let mut ingredient_demand: std::collections::HashMap<Uuid, (String, String, f64)> = std::collections::HashMap::new();

    for menu in &menus {
        if let Some(recipe_id) = Some(menu.recipe_id) {
            let ings = sqlx::query!(
                r#"SELECT ri.ingredient_id, ri.quantity_per_portion, i.name, i.unit
                   FROM recipe_ingredients ri
                   JOIN ingredients i ON i.id = ri.ingredient_id AND i.tenant_id = $2
                   WHERE ri.recipe_id = $1"#,
                recipe_id, tenant.0
            )
            .fetch_all(&pool)
            .await
            .unwrap_or_default();

            for ing in ings {
                let entry = ingredient_demand
                    .entry(ing.ingredient_id)
                    .or_insert((ing.name.clone(), ing.unit.clone(), 0.0));
                entry.2 += ing.quantity_per_portion * req.total_portions;
            }
        }
    }

    // Get operational materials
    let ops = sqlx::query!(
        "SELECT id, name, unit, qty_per_portion, estimated_price FROM operational_materials WHERE tenant_id = $1",
        tenant.0
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    // Clear old materials for this plan
    sqlx::query!("DELETE FROM plan_materials WHERE plan_id = $1", plan_id)
        .execute(&pool)
        .await
        .ok();

    let mut results: Vec<MaterialRow> = Vec::new();

    // Insert ingredient materials
    for (ing_id, (name, unit, qty)) in &ingredient_demand {
        let price = match req.price_source.as_str() {
            "database" => {
                let row = sqlx::query!(
                    "SELECT estimated_price FROM ingredients WHERE id = $1 AND tenant_id = $2",
                    ing_id, tenant.0
                )
                .fetch_optional(&pool)
                .await
                .unwrap_or(None);
                row.map(|r| r.estimated_price).unwrap_or(0.0)
            }
            "siskaperbapo" => {
                // Try to match ingredient name against pricing data
                let price_row = sqlx::query_scalar!(
                    r#"SELECT price_per_unit FROM ingredient_prices
                       WHERE tenant_id = $1 AND ingredient_id = $2
                       ORDER BY fetched_at DESC LIMIT 1"#,
                    tenant.0, ing_id
                )
                .fetch_optional(&pool)
                .await
                .unwrap_or(None);
                price_row.unwrap_or(0.0)
            }
            _ => 0.0, // manual
        };

        let row_price_unit = unit.clone();
        let ins_price_unit = unit.clone();
        let total = material_estimated_total(*qty, unit.as_str(), price, row_price_unit.as_str());
        let mid = Uuid::new_v4();

        sqlx::query(
            r#"INSERT INTO plan_materials (id, tenant_id, plan_id, ingredient_id, material_name, material_type, quantity_needed, unit, estimated_price_per_unit, estimated_total, price_source, price_unit)
               VALUES ($1, $2, $3, $4, $5, 'ingredient', $6, $7, $8, $9, $10, $11)"#,
        )
        .bind(mid)
        .bind(tenant.0)
        .bind(plan_id)
        .bind(Some(*ing_id))
        .bind(name)
        .bind(*qty)
        .bind(unit)
        .bind(price)
        .bind(total)
        .bind(&req.price_source)
        .bind(ins_price_unit)
        .execute(&pool)
        .await
        .ok();

        results.push(MaterialRow {
            id: mid,
            ingredient_id: Some(*ing_id),
            material_name: name.clone(),
            material_type: "ingredient".into(),
            quantity_needed: *qty,
            unit: unit.clone(),
            price_unit: row_price_unit,
            estimated_price_per_unit: price,
            estimated_total: total,
            price_source: req.price_source.clone(),
        });
    }

    // Insert operational materials
    for op in &ops {
        let qty = op.qty_per_portion * req.total_portions;
        let price = match req.price_source.as_str() {
            "manual" => 0.0,
            _ => op.estimated_price,
        };
        let ou = op.unit.clone();
        let total = material_estimated_total(qty, ou.as_str(), price, ou.as_str());
        let mid = Uuid::new_v4();

        sqlx::query(
            r#"INSERT INTO plan_materials (id, tenant_id, plan_id, ingredient_id, material_name, material_type, quantity_needed, unit, estimated_price_per_unit, estimated_total, price_source, price_unit)
               VALUES ($1, $2, $3, NULL, $4, 'operational', $5, $6, $7, $8, $9, $10)"#,
        )
        .bind(mid)
        .bind(tenant.0)
        .bind(plan_id)
        .bind(&op.name)
        .bind(qty)
        .bind(&op.unit)
        .bind(price)
        .bind(total)
        .bind(&req.price_source)
        .bind(ou)
        .execute(&pool)
        .await
        .ok();

        results.push(MaterialRow {
            id: mid,
            ingredient_id: None,
            material_name: op.name.clone(),
            material_type: "operational".into(),
            quantity_needed: qty,
            unit: op.unit.clone(),
            price_unit: op.unit.clone(),
            estimated_price_per_unit: price,
            estimated_total: total,
            price_source: req.price_source.clone(),
        });
    }

    // Update plan material_total and status
    let grand_total: f64 = results.iter().map(|r| r.estimated_total).sum();
    sqlx::query!(
        "UPDATE production_plans SET material_total = $1, status = 'SIMULATED' WHERE id = $2",
        grand_total, plan_id
    )
    .execute(&pool)
    .await
    .ok();

    Ok(Json(results))
}

async fn get_materials(
    headers: HeaderMap,
    Path(plan_id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<MaterialRow>>, StatusCode> {
    let tenant = require_tenant(&headers)?;

    // Verify ownership
    sqlx::query!("SELECT id FROM production_plans WHERE id = $1 AND tenant_id = $2", plan_id, tenant.0)
        .fetch_optional(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(fetch_materials(&pool, plan_id).await))
}

async fn update_material_price(
    headers: HeaderMap,
    Path((plan_id, material_id)): Path<(Uuid, Uuid)>,
    State(pool): State<PgPool>,
    Json(req): Json<UpdateMaterialPriceRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_auth(&headers)?;

    // Get current qty + satuan untuk konversi harga
    let mat = sqlx::query(
        "SELECT quantity_needed, unit, price_unit FROM plan_materials WHERE id = $1 AND plan_id = $2 AND tenant_id = $3",
    )
    .bind(material_id)
    .bind(plan_id)
    .bind(tenant.0)
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    let (qty_need, unit_s, price_unit_s): (f64, String, String) = {
        let r = &mat;
        (
            r.try_get("quantity_needed").map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?,
            r.try_get("unit").map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?,
            r.try_get::<Option<String>, _>("price_unit")
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
                .unwrap_or_default(),
        )
    };

    let new_price_unit = match &req.price_unit {
        None => {
            let t = price_unit_s.trim();
            if t.is_empty() {
                unit_s.clone()
            } else {
                price_unit_s.clone()
            }
        }
        Some(s) => {
            let t = s.trim();
            if t.is_empty() {
                unit_s.clone()
            } else {
                t.to_string()
            }
        }
    };

    let new_total = material_estimated_total(
        qty_need,
        &unit_s,
        req.estimated_price_per_unit,
        &new_price_unit,
    );

    let price_unit_for_response = new_price_unit.clone();
    sqlx::query(
        "UPDATE plan_materials SET estimated_price_per_unit = $1, estimated_total = $2, price_source = 'manual', price_unit = $3 WHERE id = $4",
    )
    .bind(req.estimated_price_per_unit)
    .bind(new_total)
    .bind(new_price_unit)
    .bind(material_id)
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Recalculate plan grand total
    let grand = sqlx::query_scalar!(
        "SELECT COALESCE(SUM(estimated_total), 0) FROM plan_materials WHERE plan_id = $1",
        plan_id
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(Some(0.0));

    sqlx::query!("UPDATE production_plans SET material_total = $1 WHERE id = $2", grand, plan_id)
        .execute(&pool).await.ok();

    Ok(Json(serde_json::json!({
        "material_id": material_id,
        "estimated_price_per_unit": req.estimated_price_per_unit,
        "price_unit": price_unit_for_response,
        "estimated_total": new_total,
        "plan_material_total": grand
    })))
}

// ─── Purchase Order ─────────────────────────────────────────────────────────

async fn create_po(
    headers: HeaderMap,
    Path(plan_id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(req): Json<CreatePORequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_auth(&headers)?;

    let valid_vis = ["public", "private", "fixed_price"];
    if !valid_vis.contains(&req.visibility.as_str()) {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Verify plan exists and is in correct state
    let _plan = sqlx::query!(
        "SELECT id, status FROM production_plans WHERE id = $1 AND tenant_id = $2",
        plan_id, tenant.0
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    let po_id = Uuid::new_v4();
    let po_number = format!("PO-{}", &po_id.to_string()[..8].to_uppercase());
    let target_ids: Vec<Uuid> = req.target_supplier_ids.unwrap_or_default();

    let deadline = req.delivery_deadline
        .and_then(|s| time::OffsetDateTime::parse(&s, &time::format_description::well_known::Rfc3339).ok());

    sqlx::query!(
        r#"INSERT INTO purchase_orders (id, tenant_id, plan_id, po_number, visibility, target_supplier_ids, fixed_total_price, status, delivery_deadline, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8, $9)"#,
        po_id, tenant.0, plan_id, po_number, req.visibility,
        &target_ids, req.fixed_total_price, deadline, req.notes
    )
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Update plan status
    sqlx::query!("UPDATE production_plans SET status = 'PO_SENT' WHERE id = $1", plan_id)
        .execute(&pool).await.ok();

    Ok(Json(serde_json::json!({
        "po_id": po_id,
        "po_number": po_number,
        "status": "open",
        "visibility": req.visibility
    })))
}

async fn get_po(
    headers: HeaderMap,
    Path(plan_id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;

    let po = sqlx::query!(
        r#"SELECT id, po_number, visibility, status, fixed_total_price, delivery_deadline, notes, created_at
           FROM purchase_orders WHERE plan_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 1"#,
        plan_id, tenant.0
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    let bids = fetch_bids(&pool, po.id).await;

    Ok(Json(serde_json::json!({
        "id": po.id,
        "po_number": po.po_number,
        "visibility": po.visibility,
        "status": po.status,
        "fixed_total_price": po.fixed_total_price,
        "delivery_deadline": po.delivery_deadline.map(|t| t.to_string()),
        "notes": po.notes,
        "bids": bids
    })))
}

async fn review_bid(
    headers: HeaderMap,
    Path((plan_id, bid_id)): Path<(Uuid, Uuid)>,
    State(pool): State<PgPool>,
    Json(req): Json<ReviewBidRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let claims = require_auth(&headers)?;

    let action = req.action.to_lowercase();
    if action != "approve" && action != "reject" {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Verify plan+po ownership
    let po = sqlx::query!(
        r#"SELECT po.id FROM purchase_orders po
           JOIN production_plans p ON p.id = po.plan_id
           WHERE po.plan_id = $1 AND p.tenant_id = $2"#,
        plan_id, tenant.0
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    let new_status = if action == "approve" { "approved" } else { "rejected" };

    sqlx::query!(
        "UPDATE supplier_bids SET status = $1, reviewed_at = now(), reviewed_by = $2 WHERE id = $3 AND po_id = $4",
        new_status, claims.email, bid_id, po.id
    )
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if action == "approve" {
        // Reject all other pending bids
        sqlx::query!(
            "UPDATE supplier_bids SET status = 'rejected', reviewed_at = now(), reviewed_by = $1 WHERE po_id = $2 AND id != $3 AND status = 'pending'",
            claims.email, po.id, bid_id
        )
        .execute(&pool).await.ok();

        // Update PO status
        sqlx::query!("UPDATE purchase_orders SET status = 'awarded' WHERE id = $1", po.id)
            .execute(&pool).await.ok();

        // Update plan status
        sqlx::query!("UPDATE production_plans SET status = 'APPROVED' WHERE id = $1", plan_id)
            .execute(&pool).await.ok();
    }

    Ok(Json(serde_json::json!({
        "bid_id": bid_id,
        "action": action,
        "new_status": new_status
    })))
}

// ─── Publish Plan ───────────────────────────────────────────────────────────

async fn publish_plan(
    headers: HeaderMap,
    Path(plan_id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_auth(&headers)?;

    let plan = sqlx::query!(
        "SELECT id, status, plan_data, target_portions FROM production_plans WHERE id = $1 AND tenant_id = $2",
        plan_id, tenant.0
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    // Only allow publishing from APPROVED or SIMULATED (if no PO needed)
    if plan.status != "APPROVED" && plan.status != "SIMULATED" {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Generate batches + tasks from plan_data timeline if available
    if let Some(plan_data) = &plan.plan_data {
        if let Some(timeline) = plan_data.get("timeline").and_then(|t| t.as_array()) {
            for task_val in timeline {
                let task_type = task_val.get("type").and_then(|v| v.as_str()).unwrap_or("general");
                let title = task_val.get("title").and_then(|v| v.as_str()).unwrap_or("");
                let _start = task_val.get("startTime").and_then(|v| v.as_str()).unwrap_or("");
                let _end = task_val.get("endTime").and_then(|v| v.as_str()).unwrap_or("");

                let task_id = Uuid::new_v4();
                sqlx::query!(
                    r#"INSERT INTO tasks (id, tenant_id, title, division, status, created_at)
                       VALUES ($1, $2, $3, $4, 'PENDING', now())"#,
                    task_id, tenant.0, title, task_type
                )
                .execute(&pool)
                .await
                .ok();
            }
        }
    }

    sqlx::query!(
        "UPDATE production_plans SET status = 'PUBLISHED', generated_at = now() WHERE id = $1",
        plan_id
    )
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({
        "id": plan_id,
        "status": "PUBLISHED",
        "message": "Plan published successfully. Tasks and batches generated."
    })))
}

// ─── Receiving ──────────────────────────────────────────────────────────────

async fn get_receiving(
    headers: HeaderMap,
    Path(plan_id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<ReceivingMaterialRow>>, StatusCode> {
    let tenant = require_tenant(&headers)?;

    sqlx::query!(
        "SELECT id FROM production_plans WHERE id = $1 AND tenant_id = $2",
        plan_id, tenant.0
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    let rows = sqlx::query!(
        r#"SELECT id, ingredient_id, material_name, material_type, quantity_needed, unit,
                  received_qty, received_at, received_by
           FROM plan_materials
           WHERE plan_id = $1 AND tenant_id = $2
           ORDER BY material_type, material_name"#,
        plan_id, tenant.0
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Ok(Json(rows.iter().map(|r| {
        let received = r.received_qty.unwrap_or(0.0);
        let remaining = (r.quantity_needed - received).max(0.0);
        ReceivingMaterialRow {
            id: r.id,
            ingredient_id: r.ingredient_id,
            material_name: r.material_name.clone(),
            material_type: r.material_type.clone(),
            quantity_needed: r.quantity_needed,
            unit: r.unit.clone(),
            received_qty: received,
            received_at: r.received_at.map(|t| t.to_string()),
            received_by: r.received_by.clone(),
            remaining,
            is_complete: remaining <= 0.0,
        }
    }).collect()))
}

async fn receive_items(
    headers: HeaderMap,
    Path(plan_id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(req): Json<ReceiveItemsRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let claims = require_auth(&headers)?;

    let _plan = sqlx::query!(
        "SELECT id, status FROM production_plans WHERE id = $1 AND tenant_id = $2",
        plan_id, tenant.0
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    let mut items_received = 0u32;
    let mut stock_updated = 0u32;

    for item in &req.items {
        if item.received_qty <= 0.0 {
            continue;
        }

        let mat = sqlx::query!(
            r#"SELECT id, ingredient_id, material_type, material_name, quantity_needed, unit, received_qty
               FROM plan_materials
               WHERE id = $1 AND plan_id = $2 AND tenant_id = $3"#,
            item.material_id, plan_id, tenant.0
        )
        .fetch_optional(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        let mat = match mat {
            Some(m) => m,
            None => continue,
        };

        let prev_received = mat.received_qty.unwrap_or(0.0);
        let new_received = prev_received + item.received_qty;

        sqlx::query!(
            r#"UPDATE plan_materials
               SET received_qty = $1, received_at = now(), received_by = $2
               WHERE id = $3"#,
            new_received, claims.email, item.material_id
        )
        .execute(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        items_received += 1;

        if mat.material_type == "ingredient" {
            if let Some(ingredient_id) = mat.ingredient_id {
                let note = format!(
                    "Receiving PO plan {} — {}{}",
                    &plan_id.to_string()[..8],
                    mat.material_name,
                    item.notes.as_deref().map(|n| format!(" ({})", n)).unwrap_or_default()
                );

                adjust_stock_internal(
                    &pool,
                    tenant.0,
                    ingredient_id,
                    "add",
                    item.received_qty,
                    "RECEIVING",
                    &note,
                ).await?;

                stock_updated += 1;
            }
        }
    }

    let all_materials = sqlx::query!(
        r#"SELECT quantity_needed, received_qty FROM plan_materials WHERE plan_id = $1 AND tenant_id = $2"#,
        plan_id, tenant.0
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let all_complete = all_materials.iter().all(|m| {
        let received = m.received_qty.unwrap_or(0.0);
        received >= m.quantity_needed
    });

    if all_complete {
        sqlx::query!(
            "UPDATE purchase_orders SET status = 'delivered' WHERE plan_id = $1 AND tenant_id = $2 AND status = 'awarded'",
            plan_id, tenant.0
        )
        .execute(&pool)
        .await
        .ok();
    }

    Ok(Json(serde_json::json!({
        "plan_id": plan_id,
        "items_received": items_received,
        "stock_updated": stock_updated,
        "all_complete": all_complete
    })))
}

// ─── Operational Materials CRUD ─────────────────────────────────────────────

async fn list_op_materials(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<OpMaterialRow>>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let rows = sqlx::query!(
        "SELECT id, name, unit, qty_per_portion, estimated_price FROM operational_materials WHERE tenant_id = $1 ORDER BY name",
        tenant.0
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Ok(Json(rows.iter().map(|r| OpMaterialRow {
        id: r.id,
        name: r.name.clone(),
        unit: r.unit.clone(),
        qty_per_portion: r.qty_per_portion,
        estimated_price: r.estimated_price,
    }).collect()))
}

async fn create_op_material(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<OpMaterialRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_auth(&headers)?;
    let id = Uuid::new_v4();

    sqlx::query!(
        r#"INSERT INTO operational_materials (id, tenant_id, name, unit, qty_per_portion, estimated_price)
           VALUES ($1, $2, $3, $4, $5, $6)"#,
        id, tenant.0, req.name,
        req.unit.as_deref().unwrap_or("pcs"),
        req.qty_per_portion.unwrap_or(0.0),
        req.estimated_price.unwrap_or(0.0)
    )
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({ "id": id })))
}

async fn update_op_material(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(req): Json<OpMaterialRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_auth(&headers)?;

    sqlx::query!(
        r#"UPDATE operational_materials SET name = $1, unit = $2, qty_per_portion = $3, estimated_price = $4
           WHERE id = $5 AND tenant_id = $6"#,
        req.name, req.unit.as_deref().unwrap_or("pcs"),
        req.qty_per_portion.unwrap_or(0.0), req.estimated_price.unwrap_or(0.0),
        id, tenant.0
    )
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({ "id": id, "updated": true })))
}

async fn delete_op_material(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<StatusCode, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_auth(&headers)?;

    sqlx::query!("DELETE FROM operational_materials WHERE id = $1 AND tenant_id = $2", id, tenant.0)
        .execute(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}

// ─── Helpers ────────────────────────────────────────────────────────────────

fn norm_unit_str(s: &str) -> String {
    s.trim().to_lowercase()
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum MaterialUnitCategory {
    Mass,
    Volume,
    Count,
    Unknown,
}

fn material_unit_category(u: &str) -> MaterialUnitCategory {
    match norm_unit_str(u).as_str() {
        "g" | "gr" | "gram" | "grams" | "kg" | "kilo" | "kilogram" | "kilograms" | "mg" => {
            MaterialUnitCategory::Mass
        }
        "ml" | "cc" | "l" | "lt" | "ltr" | "liter" | "litre" => MaterialUnitCategory::Volume,
        "pcs" | "pc" | "piece" | "pieces" | "buah" | "unit" | "units" => MaterialUnitCategory::Count,
        _ => MaterialUnitCategory::Unknown,
    }
}

fn grams_per_qty_unit(u: &str) -> Option<f64> {
    match norm_unit_str(u).as_str() {
        "mg" => Some(0.001),
        "g" | "gr" | "gram" | "grams" => Some(1.0),
        "kg" | "kilo" | "kilogram" | "kilograms" => Some(1000.0),
        _ => None,
    }
}

fn ml_per_qty_unit(u: &str) -> Option<f64> {
    match norm_unit_str(u).as_str() {
        "ml" | "cc" => Some(1.0),
        "l" | "lt" | "ltr" | "liter" | "litre" => Some(1000.0),
        _ => None,
    }
}

fn count_units_compatible(qty_u: &str, price_u: &str) -> bool {
    let q = norm_unit_str(qty_u);
    let p = norm_unit_str(price_u);
    if q == p {
        return true;
    }
    const PIECE: &[&str] = &["pcs", "pc", "piece", "pieces", "buah", "unit", "units"];
    PIECE.contains(&q.as_str()) && PIECE.contains(&p.as_str())
}

/// Qty dalam `qty_unit`, harga per `price_unit` (beda satuan massa/volume dikonversi; selain itu fallback qty×harga).
fn material_estimated_total(qty: f64, qty_unit: &str, price_per_unit: f64, price_unit: &str) -> f64 {
    let qu = norm_unit_str(qty_unit);
    let pu = norm_unit_str(price_unit);
    let pu_eff = if pu.is_empty() { qu.clone() } else { pu };
    let q_cat = material_unit_category(&qu);
    let p_cat = material_unit_category(&pu_eff);
    if q_cat == MaterialUnitCategory::Mass && p_cat == MaterialUnitCategory::Mass {
        if let (Some(gq), Some(gp)) = (grams_per_qty_unit(&qu), grams_per_qty_unit(&pu_eff)) {
            return qty * (gq / gp) * price_per_unit;
        }
    }
    if q_cat == MaterialUnitCategory::Volume && p_cat == MaterialUnitCategory::Volume {
        if let (Some(mq), Some(mp)) = (ml_per_qty_unit(&qu), ml_per_qty_unit(&pu_eff)) {
            return qty * (mq / mp) * price_per_unit;
        }
    }
    if q_cat == MaterialUnitCategory::Count && p_cat == MaterialUnitCategory::Count {
        if count_units_compatible(&qu, &pu_eff) {
            return qty * price_per_unit;
        }
    }
    qty * price_per_unit
}

async fn fetch_materials(pool: &PgPool, plan_id: Uuid) -> Vec<MaterialRow> {
    let rows = sqlx::query(
        r#"SELECT id, ingredient_id, material_name, material_type, quantity_needed, unit, price_unit,
                  estimated_price_per_unit, estimated_total, price_source
           FROM plan_materials WHERE plan_id = $1 ORDER BY material_type, material_name"#,
    )
    .bind(plan_id)
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    rows.iter()
        .filter_map(|r| {
            let id: Uuid = r.try_get("id").ok()?;
            let ingredient_id: Option<Uuid> = r.try_get("ingredient_id").ok()?;
            let material_name: String = r.try_get("material_name").ok()?;
            let material_type: String = r.try_get("material_type").ok()?;
            let quantity_needed: f64 = r.try_get("quantity_needed").ok()?;
            let unit: String = r.try_get("unit").ok()?;
            let price_unit_db: String = r.try_get::<Option<String>, _>("price_unit").ok().flatten().unwrap_or_default();
            let price_unit = {
                let t = price_unit_db.trim();
                if t.is_empty() {
                    unit.clone()
                } else {
                    t.to_string()
                }
            };
            Some(MaterialRow {
                id,
                ingredient_id,
                material_name,
                material_type,
                quantity_needed,
                unit,
                price_unit,
                estimated_price_per_unit: r.try_get("estimated_price_per_unit").ok()?,
                estimated_total: r.try_get("estimated_total").ok()?,
                price_source: r.try_get("price_source").ok()?,
            })
        })
        .collect()
}

async fn fetch_bids(pool: &PgPool, po_id: Uuid) -> Vec<BidRow> {
    let rows = sqlx::query!(
        r#"SELECT sb.id, sb.supplier_id, sb.status, sb.total_amount, sb.notes, sb.submitted_at,
                  s.name as supplier_name, s.company_name
           FROM supplier_bids sb
           JOIN suppliers s ON s.id = sb.supplier_id
           WHERE sb.po_id = $1
           ORDER BY sb.submitted_at DESC NULLS LAST"#,
        po_id
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    let mut bids = Vec::new();
    for r in &rows {
        let items = sqlx::query!(
            r#"SELECT bi.id, bi.material_id, bi.offered_qty, bi.offered_price_per_unit, bi.notes,
                      pm.material_name
               FROM supplier_bid_items bi
               JOIN plan_materials pm ON pm.id = bi.material_id
               WHERE bi.bid_id = $1"#,
            r.id
        )
        .fetch_all(pool)
        .await
        .unwrap_or_default();

        bids.push(BidRow {
            id: r.id,
            supplier_id: r.supplier_id,
            supplier_name: r.supplier_name.clone().into(),
            supplier_company: r.company_name.clone(),
            status: r.status.clone(),
            total_amount: r.total_amount,
            notes: r.notes.clone(),
            submitted_at: r.submitted_at.map(|t| t.to_string()),
            items: items.iter().map(|i| BidItemRow {
                id: i.id,
                material_id: i.material_id,
                material_name: i.material_name.clone(),
                offered_qty: i.offered_qty,
                offered_price_per_unit: i.offered_price_per_unit,
                notes: i.notes.clone(),
            }).collect(),
        });
    }

    bids
}
