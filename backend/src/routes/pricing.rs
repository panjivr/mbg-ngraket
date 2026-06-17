use axum::{extract::{Path, Query, State}, http::{HeaderMap, StatusCode}, routing::{get, post}, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::routes::{require_tenant, require_coordinator, require_auth};
use crate::state::AppState;

#[derive(Serialize)]
pub struct IngredientPrice {
    pub ingredient_id: Uuid,
    pub price_per_unit: f64,
    pub currency: String,
    pub fetched_at: OffsetDateTime,
    pub source: String,
}

#[derive(Serialize)]
pub struct MarketPriceRow {
    pub id: Uuid,
    pub ingredient_name: String,
    pub price_per_unit: f64,
    pub currency: String,
    pub source: String,
    pub fetched_at: String,
}

#[derive(Deserialize)]
pub struct MarketPriceQuery {
    pub source: Option<String>,
    pub search: Option<String>,
}

#[derive(Deserialize)]
pub struct SyncSiskaperbapoRequest {
    pub date: Option<String>,
    pub region: Option<String>,
}

#[derive(Deserialize)]
pub struct ImportToDbRequest {
    pub items: Option<Vec<ImportItem>>,
}

#[derive(Deserialize)]
pub struct ImportItem {
    pub ingredient_name: String,
    pub price: f64,
    pub source: Option<String>,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/pricing/ingredient/:id", get(get_latest_price))
        .route("/pricing/ingredient/:id/refresh", post(refresh_price))
        .route("/pricing/market-prices", get(list_market_prices))
        .route("/pricing/sync-siskaperbapo", post(sync_siskaperbapo))
        .route("/pricing/import-to-db", post(import_to_db))
        .route("/purchases", get(list_purchases).post(create_purchase))
}

async fn get_latest_price(
    headers: HeaderMap,
    Path(ingredient_id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<Option<IngredientPrice>>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let row = sqlx::query!(
        "SELECT ingredient_id, price_per_unit, currency, fetched_at, source FROM ingredient_prices WHERE tenant_id = $1 AND ingredient_id = $2 ORDER BY fetched_at DESC LIMIT 1",
        tenant.0,
        ingredient_id
    )
    .fetch_optional(&pool)
    .await
    .ok()
    .flatten();
    Ok(Json(row.map(|r| IngredientPrice {
        ingredient_id: r.ingredient_id,
        price_per_unit: r.price_per_unit,
        currency: r.currency,
        fetched_at: r.fetched_at,
        source: r.source,
    })))
}

async fn refresh_price(
    headers: HeaderMap,
    Path(ingredient_id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<IngredientPrice>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _email = require_coordinator(&headers, &pool, tenant).await?;
    let now = OffsetDateTime::now_utc();
    let price = 100.0;
    let currency = "IDR".to_string();
    let source = "placeholder-api".to_string();
    let _ = sqlx::query!(
        "INSERT INTO ingredient_prices (tenant_id, ingredient_id, price_per_unit, currency, fetched_at, source) VALUES ($1, $2, $3, $4, $5, $6)",
        tenant.0,
        ingredient_id,
        price,
        currency,
        now,
        source
    )
    .execute(&pool)
    .await;
    Ok(Json(IngredientPrice {
        ingredient_id,
        price_per_unit: price,
        currency,
        fetched_at: now,
        source: "placeholder-api".into(),
    }))
}

// ─── Market Prices ──────────────────────────────────────────────────────────

async fn list_market_prices(
    headers: HeaderMap,
    Query(q): Query<MarketPriceQuery>,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<MarketPriceRow>>, StatusCode> {
    let tenant = require_tenant(&headers)?;

    let rows = sqlx::query!(
        r#"SELECT ip.ingredient_id, i.name as ingredient_name, ip.price_per_unit, ip.currency, ip.source, ip.fetched_at
           FROM ingredient_prices ip
           JOIN ingredients i ON i.id = ip.ingredient_id AND i.tenant_id = ip.tenant_id
           WHERE ip.tenant_id = $1
           ORDER BY ip.fetched_at DESC LIMIT 500"#,
        tenant.0
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let source_filter = q.source.unwrap_or_default().to_lowercase();
    let search_filter = q.search.unwrap_or_default().to_lowercase();

    let filtered: Vec<MarketPriceRow> = rows.iter()
        .filter(|r| source_filter.is_empty() || r.source.to_lowercase().contains(&source_filter))
        .filter(|r| search_filter.is_empty() || r.ingredient_name.to_lowercase().contains(&search_filter))
        .map(|r| MarketPriceRow {
            id: r.ingredient_id,
            ingredient_name: r.ingredient_name.clone(),
            price_per_unit: r.price_per_unit,
            currency: r.currency.clone(),
            source: r.source.clone(),
            fetched_at: r.fetched_at.to_string(),
        })
        .collect();

    Ok(Json(filtered))
}

async fn sync_siskaperbapo(
    headers: HeaderMap,
    State(_pool): State<PgPool>,
    Json(req): Json<SyncSiskaperbapoRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let _tenant = require_tenant(&headers)?;
    let _claims = require_auth(&headers)?;

    // Siskaperbapo sync is a placeholder — actual integration requires external API
    let region = req.region.unwrap_or_else(|| "jawa_timur".into());
    let date = req.date.unwrap_or_else(|| OffsetDateTime::now_utc().date().to_string());

    Ok(Json(serde_json::json!({
        "synced": 0,
        "region": region,
        "date": date,
        "message": "Siskaperbapo sync placeholder — actual API integration pending"
    })))
}

async fn import_to_db(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<ImportToDbRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_auth(&headers)?;

    let items = req.items.unwrap_or_default();
    let mut imported = 0u32;

    for item in &items {
        let ingredient = sqlx::query_scalar!(
            "SELECT id FROM ingredients WHERE tenant_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1",
            tenant.0, item.ingredient_name
        )
        .fetch_optional(&pool)
        .await
        .ok()
        .flatten();

        if let Some(ing_id) = ingredient {
            let source = item.source.clone().unwrap_or_else(|| "import".into());
            sqlx::query!(
                "INSERT INTO ingredient_prices (tenant_id, ingredient_id, price_per_unit, currency, fetched_at, source) VALUES ($1, $2, $3, 'IDR', now(), $4)",
                tenant.0, ing_id, item.price, source
            )
            .execute(&pool)
            .await
            .ok();

            sqlx::query!(
                "UPDATE ingredients SET estimated_price = $1 WHERE id = $2 AND tenant_id = $3",
                item.price, ing_id, tenant.0
            )
            .execute(&pool)
            .await
            .ok();

            imported += 1;
        }
    }

    Ok(Json(serde_json::json!({ "imported": imported, "total": items.len() })))
}

// ─── Purchases ──────────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct PurchaseRow {
    pub id: Uuid,
    pub ingredient_id: Uuid,
    pub ingredient_name: Option<String>,
    pub quantity: f64,
    pub total_price: f64,
    pub notes: Option<String>,
    pub purchase_date: String,
}

#[derive(Deserialize)]
pub struct CreatePurchaseRequest {
    pub ingredient_id: Uuid,
    pub quantity: f64,
    pub total_price: f64,
    pub notes: Option<String>,
    pub purchase_date: Option<String>,
}

async fn list_purchases(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<PurchaseRow>>, StatusCode> {
    let tenant = require_tenant(&headers)?;

    let rows = sqlx::query!(
        r#"SELECT ft.id, ft.description, ft.amount, ft.occurred_at, ft.category
           FROM finance_transactions ft
           WHERE ft.tenant_id = $1 AND ft.category = 'purchase'
           ORDER BY ft.occurred_at DESC LIMIT 200"#,
        tenant.0
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Ok(Json(rows.iter().map(|r| {
        let desc_json: serde_json::Value = serde_json::from_str(r.description.as_deref().unwrap_or("{}")).unwrap_or(serde_json::json!({}));
        PurchaseRow {
            id: r.id,
            ingredient_id: desc_json.get("ingredient_id").and_then(|v| v.as_str()).and_then(|s| Uuid::parse_str(s).ok()).unwrap_or_else(Uuid::nil),
            ingredient_name: desc_json.get("ingredient_name").and_then(|v| v.as_str()).map(String::from),
            quantity: desc_json.get("quantity").and_then(|v| v.as_f64()).unwrap_or(0.0),
            total_price: r.amount,
            notes: desc_json.get("notes").and_then(|v| v.as_str()).map(String::from),
            purchase_date: r.occurred_at.to_string(),
        }
    }).collect()))
}

async fn create_purchase(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<CreatePurchaseRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _claims = require_auth(&headers)?;

    let ingredient_name = sqlx::query_scalar!(
        "SELECT name FROM ingredients WHERE id = $1 AND tenant_id = $2",
        req.ingredient_id, tenant.0
    )
    .fetch_optional(&pool)
    .await
    .ok()
    .flatten()
    .unwrap_or_else(|| "Unknown".into());

    let occurred_at = if let Some(ref d) = req.purchase_date {
        OffsetDateTime::parse(d, &time::format_description::well_known::Rfc3339)
            .unwrap_or_else(|_| OffsetDateTime::now_utc())
    } else {
        OffsetDateTime::now_utc()
    };

    let desc_json = serde_json::json!({
        "ingredient_id": req.ingredient_id.to_string(),
        "ingredient_name": ingredient_name,
        "quantity": req.quantity,
        "notes": req.notes
    });

    let id = Uuid::new_v4();
    sqlx::query!(
        "INSERT INTO finance_transactions (id, tenant_id, category, amount, currency, occurred_at, description) VALUES ($1, $2, 'purchase', $3, 'IDR', $4, $5)",
        id, tenant.0, req.total_price, occurred_at, desc_json.to_string()
    )
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Auto-adjust inventory
    let inv = sqlx::query_scalar!(
        "SELECT id FROM inventory WHERE tenant_id = $1 AND ingredient_id = $2",
        tenant.0, req.ingredient_id
    )
    .fetch_optional(&pool)
    .await
    .ok()
    .flatten();

    if let Some(_inv_id) = inv {
        sqlx::query!(
            "UPDATE inventory SET quantity = quantity + $1, updated_at = now() WHERE tenant_id = $2 AND ingredient_id = $3",
            req.quantity, tenant.0, req.ingredient_id
        )
        .execute(&pool)
        .await
        .ok();
    } else {
        sqlx::query!(
            "INSERT INTO inventory (id, tenant_id, ingredient_id, quantity) VALUES ($1, $2, $3, $4)",
            Uuid::new_v4(), tenant.0, req.ingredient_id, req.quantity
        )
        .execute(&pool)
        .await
        .ok();
    }

    let sm_id = Uuid::new_v4();
    sqlx::query!(
        "INSERT INTO stock_movements (id, tenant_id, ingredient_id, movement_type, quantity, occurred_at, note) VALUES ($1, $2, $3, 'purchase', $4, now(), $5)",
        sm_id, tenant.0, req.ingredient_id, req.quantity, format!("Pembelian: {}", ingredient_name)
    )
    .execute(&pool)
    .await
    .ok();

    Ok(Json(serde_json::json!({ "id": id, "status": "created" })))
}
