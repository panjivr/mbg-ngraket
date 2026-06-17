use std::env;
use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    routing::{get, post},
    Json, Router,
};
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use jsonwebtoken::{encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use time::{Duration, OffsetDateTime};
use uuid::Uuid;

use crate::state::AppState;

// ─── Types ──────────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone)]
pub struct SupplierClaims {
    pub sub: Uuid,
    pub email: String,
    pub role: String,
    pub exp: usize,
}

#[derive(Deserialize)]
pub struct SignupRequest {
    pub email: String,
    pub password: String,
    pub name: String,
    pub company_name: Option<String>,
    pub contact_phone: Option<String>,
    pub address: Option<String>,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub supplier: SupplierInfo,
}

#[derive(Serialize)]
pub struct SupplierInfo {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub company_name: Option<String>,
    pub subscription_tier: String,
    pub is_active: bool,
}

#[derive(Serialize)]
pub struct AvailableOrder {
    pub po_id: Uuid,
    pub po_number: Option<String>,
    pub tenant_name: Option<String>,
    pub visibility: String,
    pub status: String,
    pub delivery_deadline: Option<String>,
    pub notes: Option<String>,
    pub material_count: i64,
    pub created_at: String,
}

#[derive(Serialize)]
pub struct OrderDetail {
    pub po_id: Uuid,
    pub po_number: Option<String>,
    pub tenant_name: Option<String>,
    pub visibility: String,
    pub status: String,
    pub delivery_deadline: Option<String>,
    pub notes: Option<String>,
    pub materials: Vec<OrderMaterial>,
    pub my_bid: Option<MyBid>,
}

#[derive(Serialize)]
pub struct OrderMaterial {
    pub id: Uuid,
    pub material_name: String,
    pub material_type: String,
    pub quantity_needed: f64,
    pub unit: String,
}

#[derive(Serialize)]
pub struct MyBid {
    pub id: Uuid,
    pub status: String,
    pub total_amount: f64,
    pub notes: Option<String>,
    pub submitted_at: Option<String>,
    pub items: Vec<MyBidItem>,
}

#[derive(Serialize)]
pub struct MyBidItem {
    pub id: Uuid,
    pub material_id: Uuid,
    pub material_name: String,
    pub offered_qty: f64,
    pub offered_price_per_unit: f64,
    pub notes: Option<String>,
}

#[derive(Deserialize)]
pub struct SubmitBidRequest {
    pub items: Vec<BidItemEntry>,
    pub notes: Option<String>,
}

#[derive(Deserialize)]
pub struct BidItemEntry {
    pub material_id: Uuid,
    pub offered_qty: f64,
    pub offered_price_per_unit: f64,
    pub notes: Option<String>,
}

#[derive(Serialize)]
pub struct SubscriptionInfo {
    pub tier: String,
    pub orders_taken_this_period: i32,
    pub period_reset_at: Option<String>,
    pub limit_per_period: Option<i32>,
    pub can_bid: bool,
}

// ─── Router ─────────────────────────────────────────────────────────────────

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/auth/signup", post(signup))
        .route("/signup", post(signup))
        .route("/auth/login", post(login))
        .route("/me", get(get_me))
        .route("/me/subscription", get(get_subscription))
        .route("/orders", get(list_available_orders))
        .route("/orders/:po_id", get(get_order_detail))
        .route("/orders/:po_id/bid", post(submit_bid))
        .route("/orders/:po_id/claim", post(claim_order))
        .route("/my-bids", get(list_my_bids))
}

// ─── Auth helpers ───────────────────────────────────────────────────────────

fn require_supplier(headers: &HeaderMap) -> Result<SupplierClaims, StatusCode> {
    let auth_header = headers
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    if !auth_header.starts_with("Bearer ") {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let token = &auth_header[7..];
    let secret = env::var("JWT_SECRET").unwrap_or_default();

    let data = jsonwebtoken::decode::<SupplierClaims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| StatusCode::UNAUTHORIZED)?;

    if data.claims.role != "supplier" {
        return Err(StatusCode::FORBIDDEN);
    }

    Ok(data.claims)
}

fn generate_supplier_token(id: Uuid, email: &str) -> Result<String, StatusCode> {
    let secret = env::var("JWT_SECRET").unwrap_or_default();
    let now = OffsetDateTime::now_utc();
    let expire = now + Duration::hours(48);

    let claims = SupplierClaims {
        sub: id,
        email: email.to_string(),
        role: "supplier".to_string(),
        exp: expire.unix_timestamp() as usize,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

// ─── Subscription enforcement ───────────────────────────────────────────────

struct SubLimits {
    can_bid: bool,
    orders_taken: i32,
    limit: Option<i32>,
}

async fn check_subscription(pool: &PgPool, supplier_id: Uuid) -> SubLimits {
    let row = sqlx::query!(
        r#"SELECT subscription_tier, orders_taken_this_period, period_reset_at, subscription_expires_at
           FROM suppliers WHERE id = $1"#,
        supplier_id
    )
    .fetch_optional(pool)
    .await
    .ok()
    .flatten();

    let Some(r) = row else {
        return SubLimits { can_bid: false, orders_taken: 0, limit: None };
    };

    let now = OffsetDateTime::now_utc();
    let tier = r.subscription_tier.to_lowercase();
    let mut taken = r.orders_taken_this_period;

    if let Some(reset_at) = r.period_reset_at {
        let should_reset = match tier.as_str() {
            "free" => now.date().month() != reset_at.date().month() || now.date().year() != reset_at.date().year(),
            "pro" => {
                let diff: time::Duration = now - reset_at;
                let days_since = diff.whole_days();
                days_since >= 7
            }
            _ => false,
        };
        if should_reset {
            sqlx::query!(
                "UPDATE suppliers SET orders_taken_this_period = 0, period_reset_at = $1 WHERE id = $2",
                now, supplier_id
            )
            .execute(pool)
            .await
            .ok();
            taken = 0;
        }
    }

    let (limit, can_bid) = match tier.as_str() {
        "free" => (Some(2), taken < 2),
        "pro" => (Some(4), taken < 4),
        "ultra" => (None, true),
        _ => (Some(0), false),
    };

    SubLimits { can_bid, orders_taken: taken, limit }
}

async fn increment_order_count(pool: &PgPool, supplier_id: Uuid) {
    sqlx::query!(
        "UPDATE suppliers SET orders_taken_this_period = orders_taken_this_period + 1 WHERE id = $1",
        supplier_id
    )
    .execute(pool)
    .await
    .ok();
}

// ─── Auth handlers ──────────────────────────────────────────────────────────

async fn signup(
    State(pool): State<PgPool>,
    Json(req): Json<SignupRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if req.email.trim().is_empty() || req.password.trim().is_empty() || req.name.trim().is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Email, password, and name are required".into()));
    }

    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(req.password.as_bytes(), &salt)
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Hash error".into()))?
        .to_string();

    let id = Uuid::new_v4();

    let email_str = req.email.to_lowercase();
    let email_trimmed = email_str.trim();

    sqlx::query!(
        r#"INSERT INTO suppliers (id, email, name, company_name, contact_phone, address, password_hash, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, false)"#,
        id, email_trimmed, req.name.trim(),
        req.company_name, req.contact_phone, req.address, hash
    )
    .execute(&pool)
    .await
    .map_err(|e| {
        if e.to_string().contains("duplicate") || e.to_string().contains("unique") {
            (StatusCode::CONFLICT, "Email already registered".into())
        } else {
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        }
    })?;

    Ok(Json(serde_json::json!({
        "id": id,
        "message": "Signup successful. Your account is pending admin approval."
    })))
}

async fn login(
    State(pool): State<PgPool>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {
    if req.email.trim().is_empty() || req.password.trim().is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Email and password required".into()));
    }

    let login_email = req.email.to_lowercase();
    let login_email_trimmed = login_email.trim();

    let supplier = sqlx::query!(
        r#"SELECT id, email, name, company_name, password_hash, subscription_tier, is_active
           FROM suppliers WHERE email = $1"#,
        login_email_trimmed
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::UNAUTHORIZED, "Invalid credentials".into()))?;

    if !supplier.is_active {
        return Err((StatusCode::FORBIDDEN, "Account is pending approval or deactivated".into()));
    }

    if supplier.password_hash.is_empty() {
        return Err((StatusCode::UNAUTHORIZED, "Account not initialized".into()));
    }

    let parsed = PasswordHash::new(&supplier.password_hash)
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Hash error".into()))?;
    Argon2::default()
        .verify_password(req.password.as_bytes(), &parsed)
        .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid credentials".into()))?;

    let token = generate_supplier_token(supplier.id, &supplier.email)
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Token error".into()))?;

    Ok(Json(AuthResponse {
        token,
        supplier: SupplierInfo {
            id: supplier.id,
            email: supplier.email,
            name: supplier.name,
            company_name: supplier.company_name,
            subscription_tier: supplier.subscription_tier,
            is_active: supplier.is_active,
        },
    }))
}

async fn get_me(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<SupplierInfo>, StatusCode> {
    let claims = require_supplier(&headers)?;

    let r = sqlx::query!(
        "SELECT id, email, name, company_name, subscription_tier, is_active FROM suppliers WHERE id = $1",
        claims.sub
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(SupplierInfo {
        id: r.id,
        email: r.email,
        name: r.name,
        company_name: r.company_name,
        subscription_tier: r.subscription_tier,
        is_active: r.is_active,
    }))
}

async fn get_subscription(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<SubscriptionInfo>, StatusCode> {
    let claims = require_supplier(&headers)?;
    let sub = check_subscription(&pool, claims.sub).await;

    let r = sqlx::query!(
        "SELECT subscription_tier, orders_taken_this_period, period_reset_at FROM suppliers WHERE id = $1",
        claims.sub
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(SubscriptionInfo {
        tier: r.subscription_tier,
        orders_taken_this_period: r.orders_taken_this_period,
        period_reset_at: r.period_reset_at.map(|t| t.to_string()),
        limit_per_period: sub.limit,
        can_bid: sub.can_bid,
    }))
}

// ─── Orders ─────────────────────────────────────────────────────────────────

async fn list_available_orders(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<AvailableOrder>>, StatusCode> {
    let claims = require_supplier(&headers)?;

    let rows = sqlx::query!(
        r#"SELECT po.id as po_id, po.po_number, po.visibility, po.status,
                  po.delivery_deadline, po.notes, po.created_at, po.target_supplier_ids,
                  t.name as tenant_name,
                  (SELECT COUNT(*) FROM plan_materials pm WHERE pm.plan_id = po.plan_id) as material_count
           FROM purchase_orders po
           JOIN tenants t ON t.id = po.tenant_id
           WHERE po.status = 'open'
             AND (
                 po.visibility = 'public'
                 OR po.visibility = 'fixed_price'
                 OR (po.visibility = 'private' AND $1 = ANY(po.target_supplier_ids))
             )
           ORDER BY po.created_at DESC"#,
        claims.sub
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Ok(Json(rows.iter().map(|r| AvailableOrder {
        po_id: r.po_id,
        po_number: r.po_number.clone(),
        tenant_name: Some(r.tenant_name.clone()),
        visibility: r.visibility.clone(),
        status: r.status.clone(),
        delivery_deadline: r.delivery_deadline.map(|t| t.to_string()),
        notes: r.notes.clone(),
        material_count: r.material_count.unwrap_or(0),
        created_at: r.created_at.to_string(),
    }).collect()))
}

async fn get_order_detail(
    headers: HeaderMap,
    Path(po_id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<OrderDetail>, StatusCode> {
    let claims = require_supplier(&headers)?;

    let po = sqlx::query!(
        r#"SELECT po.id, po.po_number, po.visibility, po.status, po.plan_id,
                  po.delivery_deadline, po.notes, po.target_supplier_ids,
                  t.name as tenant_name
           FROM purchase_orders po
           JOIN tenants t ON t.id = po.tenant_id
           WHERE po.id = $1
             AND (
                 po.visibility = 'public'
                 OR po.visibility = 'fixed_price'
                 OR (po.visibility = 'private' AND $2 = ANY(po.target_supplier_ids))
             )"#,
        po_id, claims.sub
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    let materials = sqlx::query!(
        r#"SELECT id, material_name, material_type, quantity_needed, unit
           FROM plan_materials WHERE plan_id = $1 ORDER BY material_type, material_name"#,
        po.plan_id
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let bid = sqlx::query!(
        r#"SELECT id, status, total_amount, notes, submitted_at
           FROM supplier_bids WHERE po_id = $1 AND supplier_id = $2 ORDER BY created_at DESC LIMIT 1"#,
        po_id, claims.sub
    )
    .fetch_optional(&pool)
    .await
    .unwrap_or(None);

    let my_bid = if let Some(b) = bid {
        let items = sqlx::query!(
            r#"SELECT bi.id, bi.material_id, bi.offered_qty, bi.offered_price_per_unit, bi.notes,
                      pm.material_name
               FROM supplier_bid_items bi
               JOIN plan_materials pm ON pm.id = bi.material_id
               WHERE bi.bid_id = $1"#,
            b.id
        )
        .fetch_all(&pool)
        .await
        .unwrap_or_default();

        Some(MyBid {
            id: b.id,
            status: b.status,
            total_amount: b.total_amount,
            notes: b.notes,
            submitted_at: b.submitted_at.map(|t| t.to_string()),
            items: items.iter().map(|i| MyBidItem {
                id: i.id,
                material_id: i.material_id,
                material_name: i.material_name.clone(),
                offered_qty: i.offered_qty,
                offered_price_per_unit: i.offered_price_per_unit,
                notes: i.notes.clone(),
            }).collect(),
        })
    } else {
        None
    };

    Ok(Json(OrderDetail {
        po_id: po.id,
        po_number: po.po_number,
        tenant_name: Some(po.tenant_name),
        visibility: po.visibility,
        status: po.status,
        delivery_deadline: po.delivery_deadline.map(|t| t.to_string()),
        notes: po.notes,
        materials: materials.iter().map(|m| OrderMaterial {
            id: m.id,
            material_name: m.material_name.clone(),
            material_type: m.material_type.clone(),
            quantity_needed: m.quantity_needed,
            unit: m.unit.clone(),
        }).collect(),
        my_bid,
    }))
}

// ─── Bidding ────────────────────────────────────────────────────────────────

async fn submit_bid(
    headers: HeaderMap,
    Path(po_id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(req): Json<SubmitBidRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let claims = require_supplier(&headers).map_err(|s| (s, "Unauthorized".to_string()))?;

    let sub = check_subscription(&pool, claims.sub).await;
    if !sub.can_bid {
        return Err((StatusCode::PAYMENT_REQUIRED, "Subscription limit reached. Upgrade your plan.".into()));
    }

    let po = sqlx::query!(
        r#"SELECT id, status, visibility, target_supplier_ids FROM purchase_orders WHERE id = $1 AND status = 'open'"#,
        po_id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "PO not found or not open".into()))?;

    if po.visibility == "private" {
        let targets = po.target_supplier_ids.unwrap_or_default();
        if !targets.contains(&claims.sub) {
            return Err((StatusCode::FORBIDDEN, "This PO is not available to you".into()));
        }
    }

    if po.visibility == "fixed_price" {
        return Err((StatusCode::BAD_REQUEST, "Use /claim for fixed-price orders".into()));
    }

    let existing = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM supplier_bids WHERE po_id = $1 AND supplier_id = $2 AND status != 'rejected'",
        po_id, claims.sub
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(Some(0));

    if existing.unwrap_or(0) > 0 {
        return Err((StatusCode::CONFLICT, "You already have an active bid on this PO".into()));
    }

    if req.items.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "At least one bid item required".into()));
    }

    let bid_id = Uuid::new_v4();
    let total: f64 = req.items.iter().map(|i| i.offered_qty * i.offered_price_per_unit).sum();

    sqlx::query!(
        r#"INSERT INTO supplier_bids (id, po_id, supplier_id, status, total_amount, notes, submitted_at)
           VALUES ($1, $2, $3, 'pending', $4, $5, now())"#,
        bid_id, po_id, claims.sub, total, req.notes
    )
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    for item in &req.items {
        sqlx::query!(
            r#"INSERT INTO supplier_bid_items (id, bid_id, material_id, offered_qty, offered_price_per_unit, notes)
               VALUES ($1, $2, $3, $4, $5, $6)"#,
            Uuid::new_v4(), bid_id, item.material_id, item.offered_qty, item.offered_price_per_unit, item.notes
        )
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    increment_order_count(&pool, claims.sub).await;

    Ok(Json(serde_json::json!({
        "bid_id": bid_id,
        "total_amount": total,
        "status": "pending"
    })))
}

async fn claim_order(
    headers: HeaderMap,
    Path(po_id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let claims = require_supplier(&headers).map_err(|s| (s, "Unauthorized".to_string()))?;

    let sub = check_subscription(&pool, claims.sub).await;
    if !sub.can_bid {
        return Err((StatusCode::PAYMENT_REQUIRED, "Subscription limit reached".into()));
    }

    let po = sqlx::query!(
        r#"SELECT id, status, visibility, fixed_total_price, plan_id FROM purchase_orders WHERE id = $1 AND status = 'open'"#,
        po_id
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "PO not found or not open".into()))?;

    if po.visibility != "fixed_price" {
        return Err((StatusCode::BAD_REQUEST, "Only fixed-price orders can be claimed".into()));
    }

    let existing = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM supplier_bids WHERE po_id = $1 AND status = 'approved'",
        po_id
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(Some(0));

    if existing.unwrap_or(0) > 0 {
        return Err((StatusCode::CONFLICT, "This order has already been claimed".into()));
    }

    let bid_id = Uuid::new_v4();
    let total = po.fixed_total_price.unwrap_or(0.0);

    sqlx::query!(
        r#"INSERT INTO supplier_bids (id, po_id, supplier_id, status, total_amount, notes, submitted_at, reviewed_at, reviewed_by)
           VALUES ($1, $2, $3, 'approved', $4, 'Auto-claimed (fixed price)', now(), now(), 'system')"#,
        bid_id, po_id, claims.sub, total
    )
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let materials = sqlx::query!(
        "SELECT id, quantity_needed FROM plan_materials WHERE plan_id = $1",
        po.plan_id
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    for mat in &materials {
        sqlx::query!(
            r#"INSERT INTO supplier_bid_items (id, bid_id, material_id, offered_qty, offered_price_per_unit, notes)
               VALUES ($1, $2, $3, $4, 0, 'Fixed price claim')"#,
            Uuid::new_v4(), bid_id, mat.id, mat.quantity_needed
        )
        .execute(&pool)
        .await
        .ok();
    }

    sqlx::query!("UPDATE purchase_orders SET status = 'awarded' WHERE id = $1", po_id)
        .execute(&pool).await.ok();
    sqlx::query!(
        "UPDATE production_plans SET status = 'APPROVED' WHERE id = $1",
        po.plan_id
    )
    .execute(&pool).await.ok();

    increment_order_count(&pool, claims.sub).await;

    Ok(Json(serde_json::json!({
        "bid_id": bid_id,
        "status": "approved",
        "message": "Order claimed successfully"
    })))
}

// ─── My Bids ────────────────────────────────────────────────────────────────

async fn list_my_bids(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<serde_json::Value>>, StatusCode> {
    let claims = require_supplier(&headers)?;

    let rows = sqlx::query!(
        r#"SELECT sb.id, sb.po_id, sb.status, sb.total_amount, sb.submitted_at,
                  po.po_number, t.name as tenant_name
           FROM supplier_bids sb
           JOIN purchase_orders po ON po.id = sb.po_id
           JOIN tenants t ON t.id = po.tenant_id
           WHERE sb.supplier_id = $1
           ORDER BY sb.submitted_at DESC NULLS LAST"#,
        claims.sub
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    Ok(Json(rows.iter().map(|r| serde_json::json!({
        "id": r.id,
        "po_id": r.po_id,
        "po_number": r.po_number,
        "tenant_name": r.tenant_name,
        "status": r.status,
        "total_amount": r.total_amount,
        "submitted_at": r.submitted_at.map(|t| t.to_string())
    })).collect()))
}
