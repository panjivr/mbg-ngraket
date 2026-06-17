use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::state::AppState;
use super::{auth, require_coordinator, require_tenant};

#[derive(Serialize)]
pub struct Staff {
    pub id: Uuid,
    pub name: String,
    pub role: String,
    pub skills_json: serde_json::Value,
    pub skills: Vec<String>,
    pub user_id: Option<Uuid>,
    pub email: Option<String>,
    #[serde(rename = "division_id")]
    pub division: Option<String>,
    pub staff_code: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateStaffRequest {
    pub name: String,
    pub role: String,
    pub skills: Option<Vec<String>>,
    pub skills_json: Option<serde_json::Value>,
    pub email: Option<String>,
    #[serde(default, alias = "division_id")]
    pub division: Option<String>,
    #[serde(default)]
    pub staff_code: Option<String>,
    #[serde(default)]
    pub pin: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateStaffRequest {
    pub name: Option<String>,
    pub role: Option<String>,
    pub skills: Option<Vec<String>>,
    pub skills_json: Option<serde_json::Value>,
    pub email: Option<String>,
    #[serde(default, alias = "division_id")]
    pub division: Option<String>,
    #[serde(default)]
    pub staff_code: Option<String>,
    #[serde(default)]
    pub pin: Option<String>,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_staff).post(create_staff))
        .route("/:id", get(get_staff).put(update_staff).delete(delete_staff))
}

fn skills_from_json(v: &serde_json::Value) -> Vec<String> {
    match v.as_array() {
        Some(arr) => arr.iter().filter_map(|x| x.as_str().map(String::from)).collect(),
        None => Vec::new(),
    }
}

async fn staff_code_taken(
    pool: &PgPool,
    tenant_id: Uuid,
    code: &str,
    except_id: Option<Uuid>,
) -> Result<bool, StatusCode> {
    let row = if let Some(eid) = except_id {
        sqlx::query_scalar!(
            "SELECT id FROM staff WHERE tenant_id = $1 AND staff_code = $2 AND id <> $3",
            tenant_id,
            code,
            eid
        )
        .fetch_optional(pool)
        .await
    } else {
        sqlx::query_scalar!(
            "SELECT id FROM staff WHERE tenant_id = $1 AND staff_code = $2",
            tenant_id,
            code
        )
        .fetch_optional(pool)
        .await
    }
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(row.is_some())
}

fn normalized_staff_code(payload: &Option<String>) -> Option<String> {
    let s = payload.as_deref().unwrap_or("").trim();
    if s.is_empty() {
        None
    } else {
        Some(s.to_string())
    }
}

fn row_to_staff(
    id: Uuid,
    name: String,
    role: String,
    skills_json: serde_json::Value,
    user_id: Option<Uuid>,
    email: Option<String>,
    division: Option<String>,
    staff_code: Option<String>,
) -> Staff {
    let skills = skills_from_json(&skills_json);
    Staff {
        id,
        name,
        role,
        skills_json,
        skills,
        user_id,
        email,
        division,
        staff_code,
    }
}

async fn list_staff(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<Staff>>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;

    let rows = sqlx::query!(
        r#"SELECT s.id, s.name, s.role, s.skills_json, s.user_id, s.email, s.division, s.staff_code
           FROM staff s WHERE s.tenant_id = $1 ORDER BY s.name"#,
        tenant_id.0
    )
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(
        rows.into_iter()
            .map(|r| {
                row_to_staff(
                    r.id,
                    r.name,
                    r.role,
                    r.skills_json.unwrap_or_else(|| serde_json::json!([])),
                    r.user_id,
                    r.email,
                    r.division,
                    r.staff_code,
                )
            })
            .collect(),
    ))
}

async fn get_staff(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<Staff>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;

    let r = sqlx::query!(
        r#"SELECT s.id, s.name, s.role, s.skills_json, s.user_id, s.email, s.division, s.staff_code
           FROM staff s WHERE s.id = $1 AND s.tenant_id = $2"#,
        id,
        tenant_id.0
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(row_to_staff(
        r.id,
        r.name,
        r.role,
        r.skills_json.unwrap_or_else(|| serde_json::json!([])),
        r.user_id,
        r.email,
        r.division,
        r.staff_code,
    )))
}

async fn create_staff(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(payload): Json<CreateStaffRequest>,
) -> Result<Json<Staff>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    require_coordinator(&headers, &pool, tenant_id).await?;

    let id = Uuid::new_v4();
    let skills = payload
        .skills_json
        .or_else(|| payload.skills.as_ref().map(|v| serde_json::json!(v)))
        .unwrap_or_else(|| serde_json::json!([]));

    let email = payload.email.clone().unwrap_or_default();
    let division = payload.division.clone().unwrap_or_default();

    let staff_code = normalized_staff_code(&payload.staff_code);
    if let Some(ref c) = staff_code {
        if staff_code_taken(&pool, tenant_id.0, c, None).await? {
            return Err(StatusCode::CONFLICT);
        }
    }

    let pin_hash: Option<String> = match payload.pin.as_deref().map(str::trim) {
        Some(p) if !p.is_empty() => Some(auth::hash_password(p)),
        _ => None,
    };

    let user_id: Option<Uuid> = if !email.is_empty() {
        sqlx::query_scalar!(
            "SELECT id FROM users WHERE tenant_id = $1 AND LOWER(email) = LOWER($2)",
            tenant_id.0,
            email
        )
        .fetch_optional(&pool)
        .await
        .ok()
        .flatten()
    } else {
        None
    };

    let r = sqlx::query!(
        r#"INSERT INTO staff (id, tenant_id, name, role, skills_json, email, division, user_id, staff_code, pin_hash)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id, name, role, skills_json, user_id, email, division, staff_code"#,
        id,
        tenant_id.0,
        payload.name,
        payload.role,
        skills,
        email,
        division,
        user_id,
        staff_code.as_deref(),
        pin_hash.as_deref()
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        let msg = e.to_string();
        if msg.contains("idx_staff_tenant_staff_code") || msg.contains("unique") {
            StatusCode::CONFLICT
        } else {
            StatusCode::INTERNAL_SERVER_ERROR
        }
    })?;

    Ok(Json(row_to_staff(
        r.id,
        r.name,
        r.role,
        r.skills_json.unwrap_or_else(|| serde_json::json!([])),
        r.user_id,
        r.email,
        r.division,
        r.staff_code,
    )))
}

async fn update_staff(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(payload): Json<UpdateStaffRequest>,
) -> Result<Json<Staff>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    require_coordinator(&headers, &pool, tenant_id).await?;

    let cur = sqlx::query!(
        r#"SELECT id, name, role, skills_json, email, division, user_id, staff_code, pin_hash
           FROM staff WHERE id = $1 AND tenant_id = $2"#,
        id,
        tenant_id.0
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    let skills_json = payload
        .skills_json
        .or_else(|| payload.skills.as_ref().map(|v| serde_json::json!(v)));

    let name = payload.name.unwrap_or(cur.name);
    let role = payload.role.unwrap_or(cur.role);
    let skills_json = skills_json.unwrap_or(cur.skills_json.unwrap_or_else(|| serde_json::json!([])));
    let email = match &payload.email {
        Some(e) => e.clone(),
        None => cur.email.unwrap_or_default(),
    };
    let division = match &payload.division {
        Some(d) => d.clone(),
        None => cur.division.unwrap_or_default(),
    };

    let staff_code = if payload.staff_code.is_some() {
        normalized_staff_code(&payload.staff_code)
    } else {
        cur.staff_code.clone()
    };

    if let Some(ref c) = staff_code {
        if staff_code_taken(&pool, tenant_id.0, c, Some(id)).await? {
            return Err(StatusCode::CONFLICT);
        }
    }

    let pin_hash = match payload.pin.as_deref().map(str::trim) {
        None => cur.pin_hash,
        Some("") => cur.pin_hash,
        Some(p) => Some(auth::hash_password(p)),
    };

    let user_id: Option<Uuid> = if !email.is_empty() {
        sqlx::query_scalar!(
            "SELECT id FROM users WHERE tenant_id = $1 AND LOWER(email) = LOWER($2)",
            tenant_id.0,
            email
        )
        .fetch_optional(&pool)
        .await
        .ok()
        .flatten()
    } else {
        None
    };

    let r = sqlx::query!(
        r#"UPDATE staff SET
               name = $1,
               role = $2,
               skills_json = $3,
               email = $4,
               division = $5,
               user_id = $6,
               staff_code = $7,
               pin_hash = $8,
               updated_at = NOW()
           WHERE id = $9 AND tenant_id = $10
           RETURNING id, name, role, skills_json, user_id, email, division, staff_code"#,
        name,
        role,
        skills_json,
        email,
        division,
        user_id,
        staff_code.as_deref(),
        pin_hash.as_deref(),
        id,
        tenant_id.0
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        let msg = e.to_string();
        if msg.contains("idx_staff_tenant_staff_code") || msg.contains("unique") {
            StatusCode::CONFLICT
        } else {
            StatusCode::INTERNAL_SERVER_ERROR
        }
    })?;

    Ok(Json(row_to_staff(
        r.id,
        r.name,
        r.role,
        r.skills_json.unwrap_or_else(|| serde_json::json!([])),
        r.user_id,
        r.email,
        r.division,
        r.staff_code,
    )))
}

async fn delete_staff(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<StatusCode, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    require_coordinator(&headers, &pool, tenant_id).await?;

    let result = sqlx::query("DELETE FROM staff WHERE id = $1 AND tenant_id = $2")
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
