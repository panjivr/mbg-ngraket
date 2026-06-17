use axum::{extract::State, http::HeaderMap, routing::post, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::routes::TenantId;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct CreateUserRequest {
    pub email: String,
    pub name: String,
    pub role: String, // "coordinator" only for MVP
    pub password: Option<String>,
}

#[derive(Serialize)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub role: String,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/users", post(create_user).get(list_users))
}

async fn create_user(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<CreateUserRequest>,
) -> Json<User> {
    let tenant = TenantId::parse_from_headers(&headers).expect("x-tenant-id required");
    let id = Uuid::new_v4();
    let pwd = req.password.unwrap_or_else(|| "password".to_string());
    let hash = crate::routes::auth::hash_password(&pwd);

    let _ = sqlx::query!(
        "INSERT INTO users (id, tenant_id, email, name, role, password_hash) VALUES ($1, $2, $3, $4, $5, $6)",
        id,
        tenant.0,
        req.email,
        req.name,
        req.role,
        hash
    )
    .execute(&pool)
    .await;
    Json(User {
        id,
        email: req.email,
        name: req.name,
        role: req.role,
    })
}

async fn list_users(headers: HeaderMap, State(pool): State<PgPool>) -> Json<Vec<User>> {
    let tenant = TenantId::parse_from_headers(&headers).expect("x-tenant-id required");
    let rows = sqlx::query!(
        "SELECT id, email, name, role FROM users WHERE tenant_id = $1 ORDER BY name",
        tenant.0
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();
    let data = rows
        .into_iter()
        .map(|r| User {
            id: r.id,
            email: r.email,
            name: r.name,
            role: r.role,
        })
        .collect();
    Json(data)
}
