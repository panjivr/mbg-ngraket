pub mod tenant;
pub mod user;
pub mod auth;
pub mod admin;
pub mod kitchen;
pub mod menu;
pub mod pricing;
pub mod plan;
pub mod batch;
pub mod inventory;
pub mod finance;
pub mod report;
pub mod nutri;
pub mod tools;
pub mod staff;
pub mod shifts;
pub mod attendance;
pub mod payroll;
pub mod waves;
pub mod drafts;
pub mod procurement;
pub mod supplier;
pub mod supplier_portal;
pub mod tasks;
pub mod dashboard;
pub mod subscription;




use axum::http::{HeaderMap, StatusCode};
use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Clone, Copy)]
pub struct TenantId(pub Uuid);

impl TenantId {
    pub fn parse_from_headers(headers: &HeaderMap) -> Option<Self> {
        headers
            .get("x-tenant-id")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| Uuid::parse_str(s).ok())
            .map(TenantId)
    }
}

pub fn require_tenant(headers: &HeaderMap) -> Result<TenantId, StatusCode> {
    TenantId::parse_from_headers(headers).ok_or(StatusCode::BAD_REQUEST)
}

pub fn require_auth(headers: &HeaderMap) -> Result<auth::Claims, StatusCode> {
    // Shared secret bypass for Dev Portal (managed by Node.js server)
    if let Some(h) = headers.get("X-MBG-Internal-Skip-Auth") {
        if let Ok(val) = h.to_str() {
            if let Ok(secret) = std::env::var("JWT_SECRET") {
                if val == secret {
                    return Ok(auth::Claims {
                        sub: Uuid::nil(),
                        email: "platform-admin@internal.local".to_string(),
                        role: "developer".to_string(),
                        tenant_id: None,
                        exp: (OffsetDateTime::now_utc() + time::Duration::hours(1)).unix_timestamp() as usize,
                    });
                }
            }
        }
    }

    let auth_header = headers
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    if !auth_header.starts_with("Bearer ") {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let token = &auth_header[7..];
    auth::verify_token(token).map_err(|_| StatusCode::UNAUTHORIZED)
}

pub async fn require_subscription(
    headers: &HeaderMap,
    pool: &PgPool,
    tenant: TenantId,
) -> Result<(), StatusCode> {
    let claims = require_auth(headers)?;
    
    // Developer has full access
    if claims.role.to_lowercase() == "developer" {
        return Ok(());
    }

    // Check tenant subscription status
    let sub = sqlx::query!(
        "SELECT status, current_period_end FROM tenant_subscriptions WHERE tenant_id = $1 AND status IN ('ACTIVE', 'TRIALING') ORDER BY current_period_end DESC LIMIT 1",
        tenant.0
    )
    .fetch_optional(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if let Some(s) = sub {
        if s.current_period_end > OffsetDateTime::now_utc() {
            return Ok(());
        }
    }

    Err(StatusCode::PAYMENT_REQUIRED)
}

pub async fn require_coordinator(
    headers: &HeaderMap,
    _pool: &PgPool,
    tenant: TenantId,
) -> Result<String, StatusCode> {
    let claims = require_auth(headers)?;

    // Developer role has access to everything
    if claims.role.to_lowercase() == "developer" {
        return Ok(claims.email);
    }

    if claims.tenant_id != Some(tenant.0) {
        return Err(StatusCode::FORBIDDEN);
    }

    let role = claims.role.to_lowercase();

    if role != "admin"
        && role != "owner"
        && role != "koordinator"
        && role != "kepala_sppg"
        && role != "asisten_lapangan"
        && role != "akuntan"
        && role != "ahli_gizi"
        && !role.contains("coordinator")
    {
        return Err(StatusCode::FORBIDDEN);
    }

    Ok(claims.email)
}
