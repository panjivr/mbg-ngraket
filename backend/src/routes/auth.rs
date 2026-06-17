use std::env;
use axum::{
    extract::State,
    http::StatusCode,
    routing::post,
    Json, Router,
};
use argon2::{
    password_hash::{
        rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString,
    },
    Argon2,
};
use jsonwebtoken::{encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use time::{Duration, OffsetDateTime};
use uuid::Uuid;

use crate::state::AppState;

#[derive(Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: Uuid, // user_id or platform_user_id
    pub email: String,
    pub role: String,
    pub tenant_id: Option<Uuid>,
    pub exp: usize,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
    pub role: String, // Requested role for normal users
    pub tenant_id: Option<Uuid>,
}

#[derive(Deserialize)]
pub struct PlatformLoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct PlatformSetupRequest {
    pub email: String,
    pub password: String,
    pub name: String,
}

#[derive(Deserialize)]
pub struct StaffCodeLoginRequest {
    pub tenant_id: Uuid,
    pub staff_code: String,
    pub pin: String,
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub role: String,
    pub user: Option<AuthUserInfo>,
}

#[derive(Serialize)]
pub struct AuthUserInfo {
    pub email: String,
    pub role: String,
    pub name: Option<String>,
}

#[derive(Serialize)]
pub struct StaffCodeLoginResponse {
    pub token: String,
    pub tenant_id: Uuid,
    pub staff: StaffCodeLoginStaff,
}

#[derive(Serialize)]
pub struct StaffCodeLoginStaff {
    pub id: Uuid,
    pub name: String,
    pub role: String,
    pub division_id: String,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/auth/login", post(login))
        .route("/auth/dev/status", axum::routing::get(dev_status))
        .route("/auth/dev/setup", post(dev_setup))
        .route("/auth/dev/login", post(dev_login))
        .route("/auth/staff/login", post(staff_login))
        .route("/auth/staff/code-login", post(staff_code_login))
}

pub async fn login_internal(
    pool: &PgPool,
    req: LoginRequest,
) -> Result<LoginResponse, (StatusCode, String)> {
    if req.email.trim().is_empty() || req.password.trim().is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Email and password required".to_string()));
    }

    struct AuthUser {
        id: Uuid,
        email: String,
        role: String,
        password_hash: String,
        tenant_id: Uuid,
    }

    let user_opt = if let Some(tid) = req.tenant_id {
        sqlx::query_as!(
            AuthUser,
            "SELECT id, email, role, password_hash, tenant_id FROM users WHERE email = $1 AND tenant_id = $2",
            req.email,
            tid
        )
        .fetch_optional(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    } else {
        let users = sqlx::query_as!(
            AuthUser,
            "SELECT id, email, role, password_hash, tenant_id FROM users WHERE email = $1",
            req.email
        )
        .fetch_all(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        if users.len() > 1 {
            return Err((
                StatusCode::BAD_REQUEST,
                "Multiple accounts found. Please provide Tenant ID.".to_string(),
            ));
        }
        users.into_iter().next()
    };

    let user = user_opt.ok_or((StatusCode::UNAUTHORIZED, "Invalid credentials".to_string()))?;

    if user.role.to_lowercase() != req.role.to_lowercase() {
        return Err((
            StatusCode::FORBIDDEN,
            format!("User is not authorized as {}", req.role),
        ));
    }

    if user.password_hash.is_empty() {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Account not initialized properly".to_string(),
        ));
    }

    verify_argon2(&req.password, &user.password_hash)?;

    let token = generate_token(user.id, &user.email, &user.role, Some(user.tenant_id))?;

    Ok(LoginResponse {
        token,
        role: user.role.clone(),
        user: Some(AuthUserInfo {
            email: user.email,
            role: user.role,
            name: None,
        }),
    })
}

async fn dev_status(State(pool): State<PgPool>) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let row = sqlx::query_scalar!("SELECT COUNT(*) FROM platform_users")
        .fetch_one(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(serde_json::json!({ "setup_required": row == Some(0) })))
}

async fn dev_setup(
    State(pool): State<PgPool>,
    Json(req): Json<PlatformSetupRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let row = sqlx::query_scalar!("SELECT COUNT(*) FROM platform_users")
        .fetch_one(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    if row != Some(0) {
        return Err((StatusCode::CONFLICT, "Setup already completed".to_string()));
    }

    if req.email.trim().is_empty() || req.password.trim().is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Email and password required".to_string()));
    }

    let ph = hash_password(&req.password);
    let id = Uuid::new_v4();

    sqlx::query!(
        "INSERT INTO platform_users (id, email, name, role, password_hash) VALUES ($1, $2, $3, $4, $5)",
        id, req.email.to_lowercase(), req.name, "developer", ph
    )
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(serde_json::json!({ "success": true })))
}

async fn dev_login(
    State(pool): State<PgPool>,
    Json(req): Json<PlatformLoginRequest>,
) -> Result<Json<LoginResponse>, (StatusCode, String)> {
    struct PlatformUser {
        id: Uuid,
        email: String,
        role: String,
        password_hash: String,
        name: String,
    }

    let user = sqlx::query_as!(
        PlatformUser,
        "SELECT id, email, role, password_hash, name FROM platform_users WHERE email = $1 AND disabled_at IS NULL",
        req.email.to_lowercase()
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::UNAUTHORIZED, "Invalid credentials".to_string()))?;

    verify_argon2(&req.password, &user.password_hash)?;

    let token = generate_token(user.id, &user.email, &user.role, None)?;

    sqlx::query!("UPDATE platform_users SET last_login_at = NOW() WHERE id = $1", user.id)
        .execute(&pool)
        .await
        .ok();

    Ok(Json(LoginResponse {
        token,
        role: user.role.clone(),
        user: Some(AuthUserInfo {
            email: user.email,
            role: user.role,
            name: Some(user.name),
        }),
    }))
}

async fn staff_login(
    State(pool): State<PgPool>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, (StatusCode, String)> {
    // Similar to login_internal but specific to staff (users table)
    login_internal(&pool, req).await.map(Json)
}

async fn staff_code_login(
    State(pool): State<PgPool>,
    Json(req): Json<StaffCodeLoginRequest>,
) -> Result<Json<StaffCodeLoginResponse>, (StatusCode, String)> {
    let code = req.staff_code.trim();
    if code.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Kode staff wajib diisi".to_string()));
    }
    let pin = req.pin.trim();
    if pin.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "PIN wajib diisi".to_string()));
    }

    let row = sqlx::query!(
        r#"SELECT id, name, role, division, pin_hash FROM staff
           WHERE tenant_id = $1 AND staff_code = $2"#,
        req.tenant_id,
        code
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Kode staff tidak ditemukan".to_string()))?;

    let ph = row
        .pin_hash
        .as_deref()
        .filter(|s| !s.is_empty())
        .ok_or((
            StatusCode::FORBIDDEN,
            "PIN belum diset. Hubungi admin.".to_string(),
        ))?;

    verify_argon2(pin, ph).map_err(|(c, m)| {
        if c == StatusCode::UNAUTHORIZED {
            (c, "PIN salah".to_string())
        } else {
            (c, m)
        }
    })?;

    let email = format!("staff+{}@portal.local", row.id);
    let role = row.role.clone();
    let token = generate_token(row.id, &email, &role, Some(req.tenant_id))?;

    Ok(Json(StaffCodeLoginResponse {
        token,
        tenant_id: req.tenant_id,
        staff: StaffCodeLoginStaff {
            id: row.id,
            name: row.name,
            role: row.role,
            division_id: row.division.unwrap_or_default(),
        },
    }))
}

fn verify_argon2(password: &str, hash: &str) -> Result<(), (StatusCode, String)> {
    let parsed_hash = PasswordHash::new(hash)
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Hash error".to_string()))?;

    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid credentials".to_string()))
}

fn generate_token(id: Uuid, email: &str, role: &str, tenant_id: Option<Uuid>) -> Result<String, (StatusCode, String)> {
    let secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    let now = OffsetDateTime::now_utc();
    let expire = now + Duration::hours(24);
    
    let claims = Claims {
        sub: id,
        email: email.to_string(),
        role: role.to_string(),
        tenant_id,
        exp: expire.unix_timestamp() as usize,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Token generation failed".to_string()))
}

async fn login(
    State(pool): State<PgPool>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, (StatusCode, String)> {
    let r = login_internal(&pool, req).await?;
    Ok(Json(r))
}

pub fn hash_password(password: &str) -> String {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .expect("Hash failed")
        .to_string()
}

pub fn verify_token(token: &str) -> Result<Claims, StatusCode> {
    let secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    let token_data = jsonwebtoken::decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| StatusCode::UNAUTHORIZED)?;
    Ok(token_data.claims)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hash_password_verifies() {
        let h = hash_password("p@ssw0rd");
        let parsed = PasswordHash::new(&h).unwrap();
        Argon2::default()
            .verify_password("p@ssw0rd".as_bytes(), &parsed)
            .unwrap();
    }

    #[test]
    fn verify_token_roundtrip() {
        std::env::set_var("JWT_SECRET", "test-secret");
        let claims = Claims {
            sub: Uuid::new_v4(),
            email: "a@b.com".to_string(),
            role: "admin".to_string(),
            tenant_id: Uuid::new_v4(),
            exp: (OffsetDateTime::now_utc() + Duration::hours(1)).unix_timestamp() as usize,
        };
        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret("test-secret".as_bytes()),
        )
        .unwrap();
        let decoded = verify_token(&token).unwrap();
        assert_eq!(decoded.sub, claims.sub);
        assert_eq!(decoded.tenant_id, claims.tenant_id);
    }
}
