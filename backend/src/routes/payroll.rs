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
use super::{require_coordinator, require_tenant, TenantId};

time::serde::format_description!(date_only, Date, "[year]-[month]-[day]");

#[derive(Serialize, FromRow)]
pub struct StaffCompensationView {
    pub id: Uuid,
    pub staff_id: Uuid,
    pub staff_name: String,
    pub pay_type: String,
    pub rate: f64,
    pub currency: String,
    #[serde(with = "date_only")]
    pub effective_from: Date,
    pub meta_json: serde_json::Value,
}

#[derive(Deserialize)]
pub struct ListCompensationQuery {
    pub staff_id: Option<Uuid>,
}

#[derive(Deserialize)]
pub struct CreateCompensationRequest {
    pub staff_id: Uuid,
    pub pay_type: String,
    pub rate: f64,
    pub currency: Option<String>,
    #[serde(with = "date_only")]
    pub effective_from: Date,
    pub meta_json: Option<serde_json::Value>,
}

#[derive(Deserialize)]
pub struct UpdateCompensationRequest {
    pub pay_type: Option<String>,
    pub rate: Option<f64>,
    pub currency: Option<String>,
    #[serde(with = "date_only::option")]
    pub effective_from: Option<Date>,
    pub meta_json: Option<serde_json::Value>,
}

#[derive(Serialize, FromRow)]
pub struct PayrollPeriodView {
    pub id: Uuid,
    #[serde(with = "date_only")]
    pub start_date: Date,
    #[serde(with = "date_only")]
    pub end_date: Date,
    pub status: String,
    pub created_by: Option<String>,
    #[serde(with = "time::serde::iso8601")]
    pub created_at: OffsetDateTime,
    #[serde(with = "time::serde::iso8601::option")]
    pub posted_at: Option<OffsetDateTime>,
    pub total_net: f64,
    pub currency: Option<String>,
}

#[derive(Deserialize)]
pub struct CreatePayrollPeriodRequest {
    #[serde(with = "date_only")]
    pub start_date: Date,
    #[serde(with = "date_only")]
    pub end_date: Date,
}

#[derive(Serialize, FromRow)]
pub struct PayrollItemView {
    pub id: Uuid,
    pub period_id: Uuid,
    pub staff_id: Uuid,
    pub staff_name: String,
    pub pay_type: String,
    pub rate: f64,
    pub minutes_worked: i32,
    pub gross: f64,
    pub deductions: f64,
    pub net: f64,
    pub currency: String,
    pub breakdown_json: serde_json::Value,
}

#[derive(Deserialize)]
pub struct UpsertPayrollItemRequest {
    pub staff_id: Uuid,
    pub pay_type: String,
    pub rate: f64,
    pub minutes_worked: Option<i32>,
    pub gross: f64,
    pub deductions: Option<f64>,
    pub net: Option<f64>,
    pub currency: Option<String>,
    pub breakdown_json: Option<serde_json::Value>,
}

#[derive(Serialize)]
pub struct CalculatePayrollResponse {
    pub updated_items: i32,
    pub skipped_no_rate: i32,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/compensation", get(list_compensation).post(create_compensation))
        .route(
            "/compensation/:id",
            put(update_compensation).delete(delete_compensation),
        )
        .route("/periods", get(list_periods).post(create_period))
        .route("/periods/:id/items", get(list_items).post(upsert_item))
        .route("/periods/:id/calculate", post(calculate_period))
        .route("/periods/:id/post", post(post_period))
}

async fn ensure_payroll_access(headers: &HeaderMap, pool: &PgPool) -> Result<(TenantId, String), StatusCode> {
    let tenant_id = require_tenant(headers)?;
    let email = require_coordinator(headers, pool, tenant_id).await?;
    Ok((tenant_id, email))
}

async fn list_compensation(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Query(q): Query<ListCompensationQuery>,
) -> Result<Json<Vec<StaffCompensationView>>, StatusCode> {
    let (tenant_id, _) = ensure_payroll_access(&headers, &pool).await?;

    let rows = sqlx::query_as::<_, StaffCompensationView>(
        r#"
        SELECT c.id, c.staff_id, s.name AS staff_name, c.pay_type, c.rate, c.currency, c.effective_from, c.meta_json
        FROM staff_compensation c
        JOIN staff s ON s.id = c.staff_id
        WHERE c.tenant_id = $1
          AND ($2::uuid IS NULL OR c.staff_id = $2)
        ORDER BY s.name, c.effective_from DESC
        "#,
    )
    .bind(tenant_id.0)
    .bind(q.staff_id)
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(rows))
}

async fn create_compensation(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<CreateCompensationRequest>,
) -> Result<Json<StaffCompensationView>, StatusCode> {
    let (tenant_id, _) = ensure_payroll_access(&headers, &pool).await?;
    let id = Uuid::new_v4();
    let currency = req.currency.unwrap_or_else(|| "IDR".to_string());
    let meta = req.meta_json.unwrap_or_else(|| serde_json::json!({}));

    let row = sqlx::query_as::<_, StaffCompensationView>(
        r#"
        WITH inserted AS (
            INSERT INTO staff_compensation (id, tenant_id, staff_id, pay_type, rate, currency, effective_from, meta_json)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, staff_id, pay_type, rate, currency, effective_from, meta_json
        )
        SELECT i.id, i.staff_id, s.name AS staff_name, i.pay_type, i.rate, i.currency, i.effective_from, i.meta_json
        FROM inserted i
        JOIN staff s ON s.id = i.staff_id
        "#,
    )
    .bind(id)
    .bind(tenant_id.0)
    .bind(req.staff_id)
    .bind(req.pay_type)
    .bind(req.rate)
    .bind(currency)
    .bind(req.effective_from)
    .bind(meta)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(row))
}

async fn update_compensation(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(req): Json<UpdateCompensationRequest>,
) -> Result<Json<StaffCompensationView>, StatusCode> {
    let (tenant_id, _) = ensure_payroll_access(&headers, &pool).await?;

    let row = sqlx::query_as::<_, StaffCompensationView>(
        r#"
        WITH updated AS (
            UPDATE staff_compensation
            SET
                pay_type = COALESCE($1, pay_type),
                rate = COALESCE($2, rate),
                currency = COALESCE($3, currency),
                effective_from = COALESCE($4, effective_from),
                meta_json = COALESCE($5, meta_json)
            WHERE id = $6 AND tenant_id = $7
            RETURNING id, staff_id, pay_type, rate, currency, effective_from, meta_json
        )
        SELECT u.id, u.staff_id, s.name AS staff_name, u.pay_type, u.rate, u.currency, u.effective_from, u.meta_json
        FROM updated u
        JOIN staff s ON s.id = u.staff_id
        "#,
    )
    .bind(req.pay_type)
    .bind(req.rate)
    .bind(req.currency)
    .bind(req.effective_from)
    .bind(req.meta_json)
    .bind(id)
    .bind(tenant_id.0)
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(row))
}

async fn delete_compensation(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<StatusCode, StatusCode> {
    let (tenant_id, _) = ensure_payroll_access(&headers, &pool).await?;

    let result = sqlx::query("DELETE FROM staff_compensation WHERE id = $1 AND tenant_id = $2")
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

async fn list_periods(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<PayrollPeriodView>>, StatusCode> {
    let (tenant_id, _) = ensure_payroll_access(&headers, &pool).await?;

    let rows = sqlx::query_as::<_, PayrollPeriodView>(
        r#"
        SELECT p.id, p.start_date, p.end_date, p.status, p.created_by, p.created_at, p.posted_at,
               COALESCE(SUM(i.net), 0) AS total_net,
               (ARRAY_REMOVE(ARRAY_AGG(DISTINCT i.currency), NULL))[1] AS currency
        FROM payroll_periods p
        LEFT JOIN payroll_items i ON i.period_id = p.id
        WHERE p.tenant_id = $1
        GROUP BY p.id
        ORDER BY p.start_date DESC
        "#,
    )
    .bind(tenant_id.0)
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(rows))
}

async fn create_period(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<CreatePayrollPeriodRequest>,
) -> Result<Json<PayrollPeriodView>, StatusCode> {
    let (tenant_id, email) = ensure_payroll_access(&headers, &pool).await?;
    if req.start_date > req.end_date {
        return Err(StatusCode::BAD_REQUEST);
    }
    let id = Uuid::new_v4();

    let row = sqlx::query_as::<_, PayrollPeriodView>(
        r#"
        WITH inserted AS (
            INSERT INTO payroll_periods (id, tenant_id, start_date, end_date, status, created_by)
            VALUES ($1, $2, $3, $4, 'DRAFT', $5)
            RETURNING id, start_date, end_date, status, created_by, created_at, posted_at
        )
        SELECT i.id, i.start_date, i.end_date, i.status, i.created_by, i.created_at, i.posted_at,
               0.0 AS total_net,
               NULL::text AS currency
        FROM inserted i
        "#,
    )
    .bind(id)
    .bind(tenant_id.0)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(email)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(row))
}

async fn list_items(
    headers: HeaderMap,
    Path(period_id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<PayrollItemView>>, StatusCode> {
    let (tenant_id, _) = ensure_payroll_access(&headers, &pool).await?;

    let rows = sqlx::query_as::<_, PayrollItemView>(
        r#"
        SELECT i.id, i.period_id, i.staff_id, s.name AS staff_name, i.pay_type, i.rate, i.minutes_worked,
               i.gross, i.deductions, i.net, i.currency, i.breakdown_json
        FROM payroll_items i
        JOIN staff s ON s.id = i.staff_id
        WHERE i.tenant_id = $1 AND i.period_id = $2
        ORDER BY s.name
        "#,
    )
    .bind(tenant_id.0)
    .bind(period_id)
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(rows))
}

async fn upsert_item(
    headers: HeaderMap,
    Path(period_id): Path<Uuid>,
    State(pool): State<PgPool>,
    Json(req): Json<UpsertPayrollItemRequest>,
) -> Result<Json<PayrollItemView>, StatusCode> {
    let (tenant_id, _) = ensure_payroll_access(&headers, &pool).await?;
    let id = Uuid::new_v4();

    let deductions = req.deductions.unwrap_or(0.0);
    let net = req.net.unwrap_or(req.gross - deductions);
    let minutes_worked = req.minutes_worked.unwrap_or(0);
    let currency = req.currency.unwrap_or_else(|| "IDR".to_string());
    let breakdown = req.breakdown_json.unwrap_or_else(|| serde_json::json!({}));

    let row = sqlx::query_as::<_, PayrollItemView>(
        r#"
        WITH upsert AS (
            INSERT INTO payroll_items (id, tenant_id, period_id, staff_id, pay_type, rate, minutes_worked, gross, deductions, net, currency, breakdown_json)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (tenant_id, period_id, staff_id)
            DO UPDATE SET
                pay_type = EXCLUDED.pay_type,
                rate = EXCLUDED.rate,
                minutes_worked = EXCLUDED.minutes_worked,
                gross = EXCLUDED.gross,
                deductions = EXCLUDED.deductions,
                net = EXCLUDED.net,
                currency = EXCLUDED.currency,
                breakdown_json = EXCLUDED.breakdown_json,
                updated_at = NOW()
            RETURNING id, period_id, staff_id, pay_type, rate, minutes_worked, gross, deductions, net, currency, breakdown_json
        )
        SELECT u.id, u.period_id, u.staff_id, s.name AS staff_name, u.pay_type, u.rate, u.minutes_worked,
               u.gross, u.deductions, u.net, u.currency, u.breakdown_json
        FROM upsert u
        JOIN staff s ON s.id = u.staff_id
        "#,
    )
    .bind(id)
    .bind(tenant_id.0)
    .bind(period_id)
    .bind(req.staff_id)
    .bind(req.pay_type)
    .bind(req.rate)
    .bind(minutes_worked)
    .bind(req.gross)
    .bind(deductions)
    .bind(net)
    .bind(currency)
    .bind(breakdown)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(row))
}

#[derive(FromRow)]
struct CalcBaseRow {
    staff_id: Uuid,
    minutes_worked: i32,
    days_present: i32,
    pay_type: Option<String>,
    rate: Option<f64>,
    currency: Option<String>,
}

async fn calculate_period(
    headers: HeaderMap,
    Path(period_id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<CalculatePayrollResponse>, StatusCode> {
    let (tenant_id, _) = ensure_payroll_access(&headers, &pool).await?;

    let period = sqlx::query!(
        "SELECT start_date, end_date, status FROM payroll_periods WHERE id = $1 AND tenant_id = $2",
        period_id,
        tenant_id.0
    )
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    if period.status != "DRAFT" {
        return Err(StatusCode::CONFLICT);
    }

    let rows = sqlx::query_as::<_, CalcBaseRow>(
        r#"
        WITH stats AS (
            SELECT
                staff_id,
                COALESCE(SUM(minutes_worked), 0)::int AS minutes_worked,
                COALESCE(SUM(CASE WHEN status = 'ABSENT' THEN 0 ELSE 1 END), 0)::int AS days_present
            FROM attendance_daily
            WHERE tenant_id = $1 AND work_date BETWEEN $2 AND $3
            GROUP BY staff_id
        ),
        rates AS (
            SELECT DISTINCT ON (c.staff_id)
                   c.staff_id, c.pay_type, c.rate, c.currency
            FROM staff_compensation c
            WHERE c.tenant_id = $1 AND c.effective_from <= $3
            ORDER BY c.staff_id, c.effective_from DESC
        )
        SELECT s.staff_id, s.minutes_worked, s.days_present, r.pay_type, r.rate, r.currency
        FROM stats s
        LEFT JOIN rates r ON r.staff_id = s.staff_id
        "#,
    )
    .bind(tenant_id.0)
    .bind(period.start_date)
    .bind(period.end_date)
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut tx = pool.begin().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let mut updated_items = 0;
    let mut skipped_no_rate = 0;

    let mut working_days = 0;
    let mut cur = period.start_date;
    loop {
        let wd = cur.weekday();
        if wd != time::Weekday::Sunday {
            working_days += 1;
        }
        if cur >= period.end_date {
            break;
        }
        cur = cur.next_day().ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    for r in rows {
        let Some(pay_type) = r.pay_type else {
            skipped_no_rate += 1;
            continue;
        };
        let Some(rate) = r.rate else {
            skipped_no_rate += 1;
            continue;
        };
        let currency = r.currency.unwrap_or_else(|| "IDR".to_string());

        let pay_type_upper = pay_type.to_uppercase();
        let gross = if pay_type_upper == "HOURLY" {
            rate * (r.minutes_worked as f64) / 60.0
        } else if pay_type_upper == "DAILY" {
            rate * (r.days_present as f64)
        } else if pay_type_upper == "MONTHLY" {
            if working_days > 0 {
                rate * (r.days_present as f64) / (working_days as f64)
            } else {
                0.0
            }
        } else {
            skipped_no_rate += 1;
            continue;
        };
        let deductions = 0.0;
        let net = gross;

        let breakdown = serde_json::json!({
            "minutes_worked": r.minutes_worked,
            "days_present": r.days_present,
            "working_days": working_days,
            "calc": pay_type_upper,
        });

        let id = Uuid::new_v4();
        sqlx::query(
            r#"
            INSERT INTO payroll_items (id, tenant_id, period_id, staff_id, pay_type, rate, minutes_worked, gross, deductions, net, currency, breakdown_json)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (tenant_id, period_id, staff_id)
            DO UPDATE SET
                pay_type = EXCLUDED.pay_type,
                rate = EXCLUDED.rate,
                minutes_worked = EXCLUDED.minutes_worked,
                gross = EXCLUDED.gross,
                deductions = EXCLUDED.deductions,
                net = EXCLUDED.net,
                currency = EXCLUDED.currency,
                breakdown_json = EXCLUDED.breakdown_json,
                updated_at = NOW()
            "#,
        )
        .bind(id)
        .bind(tenant_id.0)
        .bind(period_id)
        .bind(r.staff_id)
        .bind(pay_type)
        .bind(rate)
        .bind(r.minutes_worked)
        .bind(gross)
        .bind(deductions)
        .bind(net)
        .bind(currency)
        .bind(breakdown)
        .execute(&mut *tx)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        updated_items += 1;
    }

    tx.commit().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(CalculatePayrollResponse {
        updated_items,
        skipped_no_rate,
    }))
}

#[derive(FromRow)]
struct CurrencySumRow {
    currency: String,
    total: f64,
}

async fn post_period(
    headers: HeaderMap,
    Path(period_id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<StatusCode, StatusCode> {
    let (tenant_id, email) = ensure_payroll_access(&headers, &pool).await?;

    let mut tx = pool.begin().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let period = sqlx::query!(
        "SELECT start_date, end_date, status FROM payroll_periods WHERE id = $1 AND tenant_id = $2 FOR UPDATE",
        period_id,
        tenant_id.0
    )
    .fetch_optional(&mut *tx)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    if period.status != "DRAFT" {
        return Err(StatusCode::CONFLICT);
    }

    let sums = sqlx::query_as::<_, CurrencySumRow>(
        "SELECT currency, COALESCE(SUM(net), 0) AS total FROM payroll_items WHERE tenant_id = $1 AND period_id = $2 GROUP BY currency",
    )
    .bind(tenant_id.0)
    .bind(period_id)
    .fetch_all(&mut *tx)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let (currency, total) = match sums.as_slice() {
        [] => ("IDR".to_string(), 0.0),
        [one] => (one.currency.clone(), one.total),
        _ => return Err(StatusCode::BAD_REQUEST),
    };

    let desc = format!(
        "Payroll {}..{} (posted by {})",
        period.start_date,
        period.end_date,
        email
    );

    let txn_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO finance_transactions (id, tenant_id, category, amount, currency, occurred_at, description, payroll_period_id) VALUES ($1, $2, 'payroll', $3, $4, NOW(), $5, $6)",
    )
    .bind(txn_id)
    .bind(tenant_id.0)
    .bind(total)
    .bind(currency)
    .bind(desc)
    .bind(period_id)
    .execute(&mut *tx)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    sqlx::query(
        "UPDATE payroll_periods SET status = 'POSTED', posted_at = NOW() WHERE id = $1 AND tenant_id = $2",
    )
    .bind(period_id)
    .bind(tenant_id.0)
    .execute(&mut *tx)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    tx.commit().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(StatusCode::NO_CONTENT)
}
