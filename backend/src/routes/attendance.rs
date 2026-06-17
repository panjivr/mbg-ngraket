use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    routing::{get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use time::{Date, OffsetDateTime};
use uuid::Uuid;

use crate::state::AppState;
use super::{require_auth, require_coordinator, require_tenant, TenantId};

time::serde::format_description!(date_only, Date, "[year]-[month]-[day]");

#[derive(Serialize, FromRow)]
pub struct ShiftAssignmentView {
    pub id: Uuid,
    pub staff_id: Uuid,
    pub staff_name: String,
    pub shift_id: Uuid,
    pub shift_name: String,
    #[serde(with = "date_only")]
    pub work_date: Date,
}

#[derive(Deserialize)]
pub struct UpsertAssignmentRequest {
    pub staff_id: Uuid,
    pub shift_id: Uuid,
    #[serde(with = "date_only")]
    pub work_date: Date,
}

#[derive(Deserialize)]
pub struct UpdateAssignmentRequest {
    pub staff_id: Option<Uuid>,
    pub shift_id: Option<Uuid>,
    #[serde(with = "date_only::option")]
    pub work_date: Option<Date>,
}

#[derive(Deserialize)]
pub struct ListAssignmentsQuery {
    pub work_date: Option<String>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
    pub staff_id: Option<Uuid>,
}

#[derive(Serialize, FromRow)]
pub struct AttendanceEventView {
    pub id: Uuid,
    pub staff_id: Uuid,
    pub staff_name: String,
    pub event_type: String,
    #[serde(with = "time::serde::iso8601")]
    pub occurred_at: OffsetDateTime,
    pub source: String,
    pub note: Option<String>,
    pub meta_json: serde_json::Value,
}

#[derive(Deserialize)]
pub struct CreateAttendanceEventRequest {
    pub staff_id: Uuid,
    pub event_type: String,
    #[serde(with = "time::serde::iso8601")]
    pub occurred_at: OffsetDateTime,
    pub source: Option<String>,
    pub note: Option<String>,
    pub meta_json: Option<serde_json::Value>,
}

#[derive(Deserialize)]
pub struct ListEventsQuery {
    pub staff_id: Option<Uuid>,
    pub from: Option<String>,
    pub to: Option<String>,
}

#[derive(Serialize, FromRow)]
pub struct AttendanceDailyView {
    pub staff_id: Uuid,
    pub staff_name: String,
    #[serde(with = "date_only")]
    pub work_date: Date,
    pub shift_id: Option<Uuid>,
    pub shift_name: Option<String>,
    pub minutes_worked: i32,
    pub late_minutes: i32,
    pub overtime_minutes: i32,
    pub status: String,
    pub note: Option<String>,
}

#[derive(Deserialize)]
pub struct UpsertAttendanceDailyRequest {
    pub staff_id: Uuid,
    #[serde(with = "date_only")]
    pub work_date: Date,
    pub shift_id: Option<Uuid>,
    pub minutes_worked: i32,
    pub late_minutes: Option<i32>,
    pub overtime_minutes: Option<i32>,
    pub status: Option<String>,
    pub note: Option<String>,
}

#[derive(Deserialize)]
pub struct ListDailyQuery {
    pub work_date: Option<String>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
    pub staff_id: Option<Uuid>,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/assignments", get(list_assignments).post(upsert_assignment))
        .route(
            "/assignments/:id",
            put(update_assignment).delete(delete_assignment),
        )
        .route("/events", get(list_events).post(create_event))
        .route("/events/direct", post(create_event_direct))
        .route("/events/raw", get(list_events_raw))
        .route("/daily", get(list_daily).post(upsert_daily))
        .route("/recompute", post(recompute_daily_from_events))
}

async fn ensure_hr_access(headers: &HeaderMap, pool: &PgPool) -> Result<TenantId, StatusCode> {
    let tenant_id = require_tenant(headers)?;
    require_coordinator(headers, pool, tenant_id).await?;
    Ok(tenant_id)
}

/// Portal relawan: JWT `sub` harus sama dengan `staff.id` di tenant ini.
async fn ensure_staff_self_for_events(
    headers: &HeaderMap,
    pool: &PgPool,
    tenant_id: TenantId,
    staff_id: Uuid,
) -> Result<(), StatusCode> {
    let claims = require_auth(headers)?;
    if claims.tenant_id != Some(tenant_id.0) {
        return Err(StatusCode::FORBIDDEN);
    }
    if claims.sub != staff_id {
        return Err(StatusCode::FORBIDDEN);
    }
    let ok = sqlx::query_scalar!(
        "SELECT id FROM staff WHERE id = $1 AND tenant_id = $2",
        staff_id,
        tenant_id.0
    )
    .fetch_optional(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    if ok.is_none() {
        return Err(StatusCode::FORBIDDEN);
    }
    Ok(())
}

async fn ensure_event_create_access(
    headers: &HeaderMap,
    pool: &PgPool,
    staff_id: Uuid,
) -> Result<TenantId, StatusCode> {
    let tenant_id = require_tenant(headers)?;
    if ensure_hr_access(headers, pool).await.is_ok() {
        let ok = sqlx::query_scalar!(
            "SELECT id FROM staff WHERE id = $1 AND tenant_id = $2",
            staff_id,
            tenant_id.0
        )
        .fetch_optional(pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        if ok.is_none() {
            return Err(StatusCode::BAD_REQUEST);
        }
        return Ok(tenant_id);
    }
    ensure_staff_self_for_events(headers, pool, tenant_id, staff_id).await?;
    Ok(tenant_id)
}

async fn list_assignments(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Query(q): Query<ListAssignmentsQuery>,
) -> Result<Json<Vec<ShiftAssignmentView>>, StatusCode> {
    let tenant_id = ensure_hr_access(&headers, &pool).await?;

    let staff_filter = q.staff_id;
    let rows = if let Some(date_str) = q.work_date {
        let work_date = Date::parse(&date_str, &time::format_description::well_known::Iso8601::DEFAULT)
            .map_err(|_| StatusCode::BAD_REQUEST)?;
        sqlx::query_as::<_, ShiftAssignmentView>(
            r#"
            SELECT a.id, a.staff_id, s.name AS staff_name, a.shift_id, sh.name AS shift_name, a.work_date
            FROM staff_shift_assignments a
            JOIN staff s ON s.id = a.staff_id
            JOIN shifts sh ON sh.id = a.shift_id
            WHERE a.tenant_id = $1
              AND a.work_date = $2
              AND ($3::uuid IS NULL OR a.staff_id = $3)
            ORDER BY s.name
            "#,
        )
        .bind(tenant_id.0)
        .bind(work_date)
        .bind(staff_filter)
        .fetch_all(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    } else if q.from_date.is_some() || q.to_date.is_some() {
        let from_date = q
            .from_date
            .as_deref()
            .unwrap_or("1970-01-01");
        let to_date = q
            .to_date
            .as_deref()
            .unwrap_or("2999-12-31");
        let from_date = Date::parse(from_date, &time::format_description::well_known::Iso8601::DEFAULT)
            .map_err(|_| StatusCode::BAD_REQUEST)?;
        let to_date = Date::parse(to_date, &time::format_description::well_known::Iso8601::DEFAULT)
            .map_err(|_| StatusCode::BAD_REQUEST)?;
        sqlx::query_as::<_, ShiftAssignmentView>(
            r#"
            SELECT a.id, a.staff_id, s.name AS staff_name, a.shift_id, sh.name AS shift_name, a.work_date
            FROM staff_shift_assignments a
            JOIN staff s ON s.id = a.staff_id
            JOIN shifts sh ON sh.id = a.shift_id
            WHERE a.tenant_id = $1
              AND a.work_date BETWEEN $2 AND $3
              AND ($4::uuid IS NULL OR a.staff_id = $4)
            ORDER BY a.work_date DESC, s.name
            "#,
        )
        .bind(tenant_id.0)
        .bind(from_date)
        .bind(to_date)
        .bind(staff_filter)
        .fetch_all(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    } else {
        sqlx::query_as::<_, ShiftAssignmentView>(
            r#"
            SELECT a.id, a.staff_id, s.name AS staff_name, a.shift_id, sh.name AS shift_name, a.work_date
            FROM staff_shift_assignments a
            JOIN staff s ON s.id = a.staff_id
            JOIN shifts sh ON sh.id = a.shift_id
            WHERE a.tenant_id = $1
              AND ($2::uuid IS NULL OR a.staff_id = $2)
            ORDER BY a.work_date DESC, s.name
            LIMIT 200
            "#,
        )
        .bind(tenant_id.0)
        .bind(staff_filter)
        .fetch_all(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    };

    Ok(Json(rows))
}

async fn upsert_assignment(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<UpsertAssignmentRequest>,
) -> Result<Json<ShiftAssignmentView>, StatusCode> {
    let tenant_id = ensure_hr_access(&headers, &pool).await?;
    let id = Uuid::new_v4();

    let row = sqlx::query_as::<_, ShiftAssignmentView>(
        r#"
        WITH upsert AS (
            INSERT INTO staff_shift_assignments (id, tenant_id, staff_id, shift_id, work_date)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (tenant_id, staff_id, work_date)
            DO UPDATE SET shift_id = EXCLUDED.shift_id, updated_at = NOW()
            RETURNING id, staff_id, shift_id, work_date
        )
        SELECT u.id, u.staff_id, s.name AS staff_name, u.shift_id, sh.name AS shift_name, u.work_date
        FROM upsert u
        JOIN staff s ON s.id = u.staff_id
        JOIN shifts sh ON sh.id = u.shift_id
        "#,
    )
    .bind(id)
    .bind(tenant_id.0)
    .bind(req.staff_id)
    .bind(req.shift_id)
    .bind(req.work_date)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(row))
}

async fn update_assignment(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(req): Json<UpdateAssignmentRequest>,
) -> Result<Json<ShiftAssignmentView>, StatusCode> {
    let tenant_id = ensure_hr_access(&headers, &pool).await?;

    let row = sqlx::query_as::<_, ShiftAssignmentView>(
        r#"
        WITH updated AS (
            UPDATE staff_shift_assignments
            SET
                staff_id = COALESCE($1, staff_id),
                shift_id = COALESCE($2, shift_id),
                work_date = COALESCE($3, work_date),
                updated_at = NOW()
            WHERE id = $4 AND tenant_id = $5
            RETURNING id, staff_id, shift_id, work_date
        )
        SELECT u.id, u.staff_id, s.name AS staff_name, u.shift_id, sh.name AS shift_name, u.work_date
        FROM updated u
        JOIN staff s ON s.id = u.staff_id
        JOIN shifts sh ON sh.id = u.shift_id
        "#,
    )
    .bind(req.staff_id)
    .bind(req.shift_id)
    .bind(req.work_date)
    .bind(id)
    .bind(tenant_id.0)
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(row))
}

async fn delete_assignment(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<StatusCode, StatusCode> {
    let tenant_id = ensure_hr_access(&headers, &pool).await?;

    let result = sqlx::query("DELETE FROM staff_shift_assignments WHERE id = $1 AND tenant_id = $2")
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

async fn list_events(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Query(q): Query<ListEventsQuery>,
) -> Result<Json<Vec<AttendanceEventView>>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    let staff_filter: Option<Uuid> = if ensure_hr_access(&headers, &pool).await.is_ok() {
        q.staff_id
    } else {
        let sid = q.staff_id.ok_or(StatusCode::BAD_REQUEST)?;
        ensure_staff_self_for_events(&headers, &pool, tenant_id, sid).await?;
        Some(sid)
    };

    let from = if let Some(s) = q.from.as_deref() {
        Some(
            OffsetDateTime::parse(s, &time::format_description::well_known::Rfc3339)
                .map_err(|_| StatusCode::BAD_REQUEST)?,
        )
    } else {
        None
    };
    let to = if let Some(s) = q.to.as_deref() {
        Some(
            OffsetDateTime::parse(s, &time::format_description::well_known::Rfc3339)
                .map_err(|_| StatusCode::BAD_REQUEST)?,
        )
    } else {
        None
    };

    let rows = sqlx::query_as::<_, AttendanceEventView>(
        r#"
        SELECT e.id, e.staff_id, s.name AS staff_name, e.event_type, e.occurred_at, e.source, e.note, e.meta_json
        FROM attendance_events e
        JOIN staff s ON s.id = e.staff_id
        WHERE e.tenant_id = $1
          AND ($2::uuid IS NULL OR e.staff_id = $2)
          AND ($3::timestamptz IS NULL OR e.occurred_at >= $3)
          AND ($4::timestamptz IS NULL OR e.occurred_at <= $4)
        ORDER BY e.occurred_at DESC
        LIMIT 500
        "#,
    )
    .bind(tenant_id.0)
    .bind(staff_filter)
    .bind(from)
    .bind(to)
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(rows))
}

async fn create_event(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<CreateAttendanceEventRequest>,
) -> Result<Json<AttendanceEventView>, StatusCode> {
    let tenant_id = ensure_event_create_access(&headers, &pool, req.staff_id).await?;
    let id = Uuid::new_v4();
    let source = req.source.unwrap_or_else(|| "manual".to_string());
    let meta = req.meta_json.unwrap_or_else(|| serde_json::json!({}));

    let row = sqlx::query_as::<_, AttendanceEventView>(
        r#"
        WITH inserted AS (
            INSERT INTO attendance_events (id, tenant_id, staff_id, event_type, occurred_at, source, note, meta_json)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, staff_id, event_type, occurred_at, source, note, meta_json
        )
        SELECT i.id, i.staff_id, s.name AS staff_name, i.event_type, i.occurred_at, i.source, i.note, i.meta_json
        FROM inserted i
        JOIN staff s ON s.id = i.staff_id
        "#,
    )
    .bind(id)
    .bind(tenant_id.0)
    .bind(req.staff_id)
    .bind(req.event_type)
    .bind(req.occurred_at)
    .bind(source)
    .bind(req.note)
    .bind(meta)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(row))
}

#[derive(Deserialize)]
pub struct CreateEventDirectRequest {
    pub tenant_id: Uuid,
    pub staff_code: String,
    pub event_type: String,
    #[serde(with = "time::serde::iso8601")]
    pub occurred_at: OffsetDateTime,
    pub source: Option<String>,
    pub note: Option<String>,
}

async fn create_event_direct(
    State(pool): State<PgPool>,
    Json(req): Json<CreateEventDirectRequest>,
) -> Result<Json<AttendanceEventView>, StatusCode> {
    let staff = sqlx::query!("SELECT id, name FROM staff WHERE tenant_id = $1 AND staff_code = $2", req.tenant_id, req.staff_code)
        .fetch_optional(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    let id = Uuid::new_v4();
    let source = req.source.unwrap_or_else(|| "direct".to_string());

    let row = sqlx::query_as::<_, AttendanceEventView>(
        r#"
        WITH inserted AS (
            INSERT INTO attendance_events (id, tenant_id, staff_id, event_type, occurred_at, source, note, meta_json)
            VALUES ($1, $2, $3, $4, $5, $6, $7, '{}')
            RETURNING id, staff_id, event_type, occurred_at, source, note, meta_json
        )
        SELECT i.id, i.staff_id, s.name AS staff_name, i.event_type, i.occurred_at, i.source, i.note, i.meta_json
        FROM inserted i
        JOIN staff s ON s.id = i.staff_id
        "#,
    )
    .bind(id)
    .bind(req.tenant_id)
    .bind(staff.id)
    .bind(req.event_type)
    .bind(req.occurred_at)
    .bind(source)
    .bind(req.note)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(row))
}

#[derive(Deserialize)]
pub struct ListEventsRawQuery {
    pub tenant_id: Uuid,
    pub staff_code: String,
    pub from: String,
    pub to: String,
}

async fn list_events_raw(
    State(pool): State<PgPool>,
    Query(q): Query<ListEventsRawQuery>,
) -> Result<Json<Vec<AttendanceEventView>>, StatusCode> {
    let staff = sqlx::query!("SELECT id FROM staff WHERE tenant_id = $1 AND staff_code = $2", q.tenant_id, q.staff_code)
        .fetch_optional(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;
        
    let from = OffsetDateTime::parse(&q.from, &time::format_description::well_known::Rfc3339).unwrap_or(OffsetDateTime::now_utc());
    let to = OffsetDateTime::parse(&q.to, &time::format_description::well_known::Rfc3339).unwrap_or(OffsetDateTime::now_utc());

    let rows = sqlx::query_as::<_, AttendanceEventView>(
        r#"
        SELECT e.id, e.staff_id, s.name AS staff_name, e.event_type, e.occurred_at, e.source, e.note, e.meta_json
        FROM attendance_events e
        JOIN staff s ON s.id = e.staff_id
        WHERE e.tenant_id = $1 AND e.staff_id = $2 AND e.occurred_at >= $3 AND e.occurred_at <= $4
        ORDER BY e.occurred_at DESC
        LIMIT 100
        "#,
    )
    .bind(q.tenant_id)
    .bind(staff.id)
    .bind(from)
    .bind(to)
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(rows))
}

async fn list_daily(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Query(q): Query<ListDailyQuery>,
) -> Result<Json<Vec<AttendanceDailyView>>, StatusCode> {
    let tenant_id = ensure_hr_access(&headers, &pool).await?;
    let staff_filter = q.staff_id;

    let rows = if let Some(date_str) = q.work_date {
        let work_date = Date::parse(&date_str, &time::format_description::well_known::Iso8601::DEFAULT)
            .map_err(|_| StatusCode::BAD_REQUEST)?;
        sqlx::query_as::<_, AttendanceDailyView>(
            r#"
            SELECT d.staff_id, s.name AS staff_name, d.work_date, d.shift_id, sh.name AS shift_name,
                   d.minutes_worked, d.late_minutes, d.overtime_minutes, d.status, d.note
            FROM attendance_daily d
            JOIN staff s ON s.id = d.staff_id
            LEFT JOIN shifts sh ON sh.id = d.shift_id
            WHERE d.tenant_id = $1
              AND d.work_date = $2
              AND ($3::uuid IS NULL OR d.staff_id = $3)
            ORDER BY s.name
            "#,
        )
        .bind(tenant_id.0)
        .bind(work_date)
        .bind(staff_filter)
        .fetch_all(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    } else if q.from_date.is_some() || q.to_date.is_some() {
        let from_date = q
            .from_date
            .as_deref()
            .unwrap_or("1970-01-01");
        let to_date = q
            .to_date
            .as_deref()
            .unwrap_or("2999-12-31");
        let from_date = Date::parse(from_date, &time::format_description::well_known::Iso8601::DEFAULT)
            .map_err(|_| StatusCode::BAD_REQUEST)?;
        let to_date = Date::parse(to_date, &time::format_description::well_known::Iso8601::DEFAULT)
            .map_err(|_| StatusCode::BAD_REQUEST)?;
        sqlx::query_as::<_, AttendanceDailyView>(
            r#"
            SELECT d.staff_id, s.name AS staff_name, d.work_date, d.shift_id, sh.name AS shift_name,
                   d.minutes_worked, d.late_minutes, d.overtime_minutes, d.status, d.note
            FROM attendance_daily d
            JOIN staff s ON s.id = d.staff_id
            LEFT JOIN shifts sh ON sh.id = d.shift_id
            WHERE d.tenant_id = $1
              AND d.work_date BETWEEN $2 AND $3
              AND ($4::uuid IS NULL OR d.staff_id = $4)
            ORDER BY d.work_date DESC, s.name
            LIMIT 1000
            "#,
        )
        .bind(tenant_id.0)
        .bind(from_date)
        .bind(to_date)
        .bind(staff_filter)
        .fetch_all(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    } else {
        sqlx::query_as::<_, AttendanceDailyView>(
            r#"
            SELECT d.staff_id, s.name AS staff_name, d.work_date, d.shift_id, sh.name AS shift_name,
                   d.minutes_worked, d.late_minutes, d.overtime_minutes, d.status, d.note
            FROM attendance_daily d
            JOIN staff s ON s.id = d.staff_id
            LEFT JOIN shifts sh ON sh.id = d.shift_id
            WHERE d.tenant_id = $1
              AND ($2::uuid IS NULL OR d.staff_id = $2)
            ORDER BY d.work_date DESC, s.name
            LIMIT 200
            "#,
        )
        .bind(tenant_id.0)
        .bind(staff_filter)
        .fetch_all(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    };

    Ok(Json(rows))
}

async fn upsert_daily(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<UpsertAttendanceDailyRequest>,
) -> Result<Json<AttendanceDailyView>, StatusCode> {
    let tenant_id = ensure_hr_access(&headers, &pool).await?;
    let late_minutes = req.late_minutes.unwrap_or(0);
    let overtime_minutes = req.overtime_minutes.unwrap_or(0);
    let status = req.status.unwrap_or_else(|| "PRESENT".to_string());

    let row = sqlx::query_as::<_, AttendanceDailyView>(
        r#"
        WITH upsert AS (
            INSERT INTO attendance_daily (tenant_id, staff_id, work_date, shift_id, minutes_worked, late_minutes, overtime_minutes, status, note)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (tenant_id, staff_id, work_date)
            DO UPDATE SET
                shift_id = EXCLUDED.shift_id,
                minutes_worked = EXCLUDED.minutes_worked,
                late_minutes = EXCLUDED.late_minutes,
                overtime_minutes = EXCLUDED.overtime_minutes,
                status = EXCLUDED.status,
                note = EXCLUDED.note,
                updated_at = NOW()
            RETURNING staff_id, work_date, shift_id, minutes_worked, late_minutes, overtime_minutes, status, note
        )
        SELECT u.staff_id, s.name AS staff_name, u.work_date, u.shift_id, sh.name AS shift_name,
               u.minutes_worked, u.late_minutes, u.overtime_minutes, u.status, u.note
        FROM upsert u
        JOIN staff s ON s.id = u.staff_id
        LEFT JOIN shifts sh ON sh.id = u.shift_id
        "#,
    )
    .bind(tenant_id.0)
    .bind(req.staff_id)
    .bind(req.work_date)
    .bind(req.shift_id)
    .bind(req.minutes_worked)
    .bind(late_minutes)
    .bind(overtime_minutes)
    .bind(status)
    .bind(req.note)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(row))
}

#[derive(Deserialize)]
pub struct RecomputeRequest {
    pub staff_id: Option<Uuid>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
    pub today_jakarta: Option<bool>,
}

#[derive(Serialize)]
pub struct RecomputeResponse {
    pub updated_days: i32,
    pub skipped_days: i32,
    pub from_date: String,
    pub to_date: String,
}

#[derive(FromRow)]
struct RawEventRow {
    staff_id: Uuid,
    #[sqlx(rename = "work_date")]
    work_date: Date,
    event_type: String,
    occurred_at: OffsetDateTime,
}

async fn recompute_daily_from_events(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<RecomputeRequest>,
) -> Result<Json<RecomputeResponse>, StatusCode> {
    let tenant_id = ensure_hr_access(&headers, &pool).await?;
    let (from_raw, to_raw) = if req.today_jakarta.unwrap_or(false) {
        let tz = time::UtcOffset::from_hms(7, 0, 0).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        let d = OffsetDateTime::now_utc().to_offset(tz).date();
        let ds = d.to_string();
        (ds.clone(), ds)
    } else {
        let from = req.from_date.as_deref().unwrap_or("").trim().to_string();
        let to = req.to_date.as_deref().unwrap_or("").trim().to_string();
        if from.is_empty() || to.is_empty() {
            return Err(StatusCode::BAD_REQUEST);
        }
        (from, to)
    };

    let from_date = Date::parse(&from_raw, &time::format_description::well_known::Iso8601::DEFAULT)
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    let to_date = Date::parse(&to_raw, &time::format_description::well_known::Iso8601::DEFAULT)
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    if from_date > to_date {
        return Err(StatusCode::BAD_REQUEST);
    }

    let events = sqlx::query_as::<_, RawEventRow>(
        r#"
        SELECT
            e.staff_id,
            (e.occurred_at AT TIME ZONE 'Asia/Jakarta')::date AS work_date,
            e.event_type,
            e.occurred_at
        FROM attendance_events e
        WHERE e.tenant_id = $1
          AND ($2::uuid IS NULL OR e.staff_id = $2)
          AND (e.occurred_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN $3 AND $4
        ORDER BY e.staff_id, work_date, e.occurred_at
        "#,
    )
    .bind(tenant_id.0)
    .bind(req.staff_id)
    .bind(from_date)
    .bind(to_date)
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut updated_days = 0;
    let mut skipped_days = 0;

    let mut tx = pool.begin().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut i = 0usize;
    while i < events.len() {
        let staff_id = events[i].staff_id;
        let work_date = events[i].work_date;
        let mut group = Vec::new();
        while i < events.len() && events[i].staff_id == staff_id && events[i].work_date == work_date {
            group.push((events[i].event_type.clone(), events[i].occurred_at));
            i += 1;
        }

        let mut current_in: Option<OffsetDateTime> = None;
        let mut break_start: Option<OffsetDateTime> = None;
        let mut break_minutes: i64 = 0;
        let mut worked_minutes: i64 = 0;

        for (t, at) in group {
            let ty = t.trim().to_uppercase();
            if ty == "CLOCK_IN" {
                if current_in.is_none() {
                    current_in = Some(at);
                }
            } else if ty == "BREAK_START" {
                if current_in.is_some() && break_start.is_none() {
                    break_start = Some(at);
                }
            } else if ty == "BREAK_END" {
                if let Some(bs) = break_start.take() {
                    let d = at - bs;
                    break_minutes += d.whole_minutes();
                }
            } else if ty == "CLOCK_OUT" {
                if let Some(ci) = current_in.take() {
                    let d = at - ci;
                    let total = d.whole_minutes() - break_minutes;
                    if total > 0 {
                        worked_minutes += total;
                    }
                    break_start = None;
                    break_minutes = 0;
                }
            }
        }

        if worked_minutes <= 0 {
            skipped_days += 1;
            continue;
        }

        let status = "PRESENT";
        sqlx::query(
            r#"
            INSERT INTO attendance_daily (tenant_id, staff_id, work_date, minutes_worked, status)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (tenant_id, staff_id, work_date)
            DO UPDATE SET minutes_worked = EXCLUDED.minutes_worked, status = EXCLUDED.status, updated_at = NOW()
            "#,
        )
        .bind(tenant_id.0)
        .bind(staff_id)
        .bind(work_date)
        .bind(worked_minutes as i32)
        .bind(status)
        .execute(&mut *tx)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        updated_days += 1;
    }

    tx.commit().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(RecomputeResponse {
        updated_days,
        skipped_days,
        from_date: from_date.to_string(),
        to_date: to_date.to_string(),
    }))
}
