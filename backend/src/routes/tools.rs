use axum::{extract::State, http::{HeaderMap, StatusCode}, routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::routes::{require_tenant, require_coordinator};
use crate::state::AppState;

#[derive(Serialize, Deserialize)]
pub struct Tool {
    pub id: Uuid,
    pub name: String,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_tools).post(create_tool))
}

async fn list_tools(headers: HeaderMap, State(pool): State<PgPool>) -> Result<Json<Vec<Tool>>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let rows = sqlx::query!(
        "SELECT id, name FROM tools WHERE tenant_id = $1 ORDER BY name",
        tenant.0
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default();
    
    let data = rows
        .into_iter()
        .map(|r| Tool {
            id: r.id,
            name: r.name,
        })
        .collect();
    Ok(Json(data))
}

#[derive(Deserialize)]
pub struct CreateToolRequest {
    pub name: String,
}

async fn create_tool(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<CreateToolRequest>,
) -> Result<Json<Tool>, StatusCode> {
    let tenant = require_tenant(&headers)?;
    let _email = require_coordinator(&headers, &pool, tenant).await?;
    let id = Uuid::new_v4();
    let _ = sqlx::query!(
        "INSERT INTO tools (id, tenant_id, name) VALUES ($1, $2, $3)",
        id,
        tenant.0,
        req.name
    )
    .execute(&pool)
    .await;
    Ok(Json(Tool {
        id,
        name: req.name,
    }))
}
