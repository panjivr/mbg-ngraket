use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::PgPool;
use time::{Date, OffsetDateTime};
use uuid::Uuid;

use crate::state::AppState;
use super::require_tenant;

time::serde::format_description!(date_only, Date, "[year]-[month]-[day]");

#[derive(Serialize, Deserialize)]
pub struct ProductionDraft {
    pub id: Uuid,
    #[serde(with = "date_only")]
    pub plan_date: Date,
    pub data_json: Value,
    pub status: String,
    #[serde(with = "time::serde::iso8601::option")]
    pub created_at: Option<OffsetDateTime>,
}

#[derive(Deserialize)]
pub struct SaveDraftRequest {
    #[serde(with = "date_only")]
    pub plan_date: Date,
    pub data_json: Value,
    pub status: String,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", post(save_draft))
        .route("/date/:date", get(get_draft_by_date))
        .route("/:id", get(get_draft).delete(delete_draft))
}

async fn get_draft_by_date(
    headers: HeaderMap,
    Path(date_str): Path<String>, // We parse manually to avoid format issues or use Date directly if axum supports it well
    State(pool): State<PgPool>,
) -> Result<Json<Option<ProductionDraft>>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    
    // Parse date: YYYY-MM-DD
    let date = Date::parse(&date_str, &time::format_description::well_known::Iso8601::DEFAULT)
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    let draft = sqlx::query_as!(
        ProductionDraft,
        r#"
        SELECT id, plan_date, data_json, status, created_at
        FROM production_drafts
        WHERE tenant_id = $1 AND plan_date = $2
        ORDER BY created_at DESC
        LIMIT 1
        "#,
        tenant_id.0,
        date
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(draft))
}

async fn get_draft(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<ProductionDraft>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;

    let draft = sqlx::query_as!(
        ProductionDraft,
        r#"
        SELECT id, plan_date, data_json, status, created_at
        FROM production_drafts
        WHERE id = $1 AND tenant_id = $2
        "#,
        id,
        tenant_id.0
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(draft))
}

async fn save_draft(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<SaveDraftRequest>,
) -> Result<Json<ProductionDraft>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    
    // Check if draft exists for this date? Or just always create new/update?
    // Usually one draft per date is enough for "Draft Mode", but we might want history.
    // Let's implement Upsert (Insert or Update) based on Date for simplicity of UI.
    
    let existing = sqlx::query!(
        "SELECT id FROM production_drafts WHERE tenant_id = $1 AND plan_date = $2",
        tenant_id.0,
        req.plan_date
    )
    .fetch_optional(&pool)
    .await
    .unwrap_or(None);

    let draft = if let Some(row) = existing {
        // Update
        sqlx::query_as!(
            ProductionDraft,
            r#"
            UPDATE production_drafts 
            SET data_json = $1, status = $2, updated_at = NOW()
            WHERE id = $3
            RETURNING id, plan_date, data_json, status, created_at
            "#,
            req.data_json,
            req.status,
            row.id
        )
        .fetch_one(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    } else {
        // Insert
        let id = Uuid::new_v4();
        sqlx::query_as!(
            ProductionDraft,
            r#"
            INSERT INTO production_drafts (id, tenant_id, plan_date, data_json, status)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, plan_date, data_json, status, created_at
            "#,
            id,
            tenant_id.0,
            req.plan_date,
            req.data_json,
            req.status
        )
        .fetch_one(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    };

    Ok(Json(draft))
}

async fn delete_draft(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<StatusCode, StatusCode> {
    let tenant_id = require_tenant(&headers)?;

    let result = sqlx::query("DELETE FROM production_drafts WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id.0)
        .execute(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if result.rows_affected() == 0 {
        return Err(StatusCode::NOT_FOUND);
    }

    Ok(StatusCode::NO_CONTENT)
}
