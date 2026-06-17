use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    routing::{get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::routes::{require_coordinator, require_tenant, require_auth};
use crate::state::AppState;

// ─── Data Structures ────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct FinanceTxn {
    pub id: Uuid,
    pub category: String,
    pub amount: f64,
    pub currency: String,
    #[serde(with = "time::serde::iso8601")]
    pub date: OffsetDateTime,
    pub description: Option<String>,
}

#[derive(Serialize)]
pub struct FinanceBreakdown {
    pub category: String,
    pub total: f64,
}

#[derive(Serialize)]
pub struct FinanceSummary {
    pub total_cost: f64,
    pub avg_cost_per_portion: f64,
    pub breakdown: Vec<FinanceBreakdown>,
}

#[derive(Deserialize)]
pub struct CreateExpenseRequest {
    pub category: String,
    pub amount: f64,
    pub description: Option<String>,
    pub date: Option<String>,
    pub currency: Option<String>,
}

#[derive(Serialize)]
pub struct CoaRow {
    pub id: Uuid,
    pub account_code: String,
    pub account_name: String,
    pub account_group: String,
    pub normal_balance: String,
    pub is_active: bool,
}

#[derive(Deserialize)]
pub struct CreateCoaRequest {
    pub account_code: String,
    pub account_name: String,
    pub account_group: Option<String>,
    pub normal_balance: Option<String>,
    pub is_active: Option<i32>,
}

#[derive(Serialize)]
pub struct JournalRow {
    pub id: Uuid,
    pub journal_no: String,
    pub journal_date: String,
    pub description: String,
    pub status: String,
    pub lines: Vec<JournalLineRow>,
}

#[derive(Serialize)]
pub struct JournalLineRow {
    pub id: Uuid,
    pub account_code: String,
    pub description: String,
    pub debit: f64,
    pub credit: f64,
}

#[derive(Deserialize)]
pub struct CreateJournalRequest {
    pub journal_no: String,
    pub journal_date: Option<String>,
    pub description: Option<String>,
    pub lines: Vec<JournalLineInput>,
    pub auto_post: Option<bool>,
}

#[derive(Deserialize)]
pub struct JournalLineInput {
    pub account_code: String,
    pub description: Option<String>,
    pub debit: Option<f64>,
    pub credit: Option<f64>,
}

#[derive(Serialize)]
pub struct SetupRow {
    pub key: String,
    pub value: String,
    pub source_row: i32,
}

#[derive(Deserialize)]
pub struct SetupUpdateRequest {
    pub value: Option<String>,
    pub source_row: Option<i32>,
}

#[derive(Deserialize)]
pub struct SetupBatchRequest {
    pub updates: Vec<SetupBatchItem>,
}

#[derive(Deserialize)]
pub struct SetupBatchItem {
    pub key: String,
    pub value: String,
    pub source_row: Option<i32>,
}

#[derive(Serialize)]
pub struct SheetRow {
    pub row_no: i32,
    pub cells: serde_json::Value,
}

#[derive(Deserialize)]
pub struct SheetUpdateRequest {
    pub cells: serde_json::Value,
}

#[derive(Deserialize)]
pub struct SheetQuery {
    pub sheet: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Deserialize)]
pub struct ManualTxnRequest {
    pub category: String,
    pub amount: f64,
    pub description: Option<String>,
    pub date: Option<String>,
    pub currency: Option<String>,
    pub account_code: Option<String>,
}

// ─── Router ─────────────────────────────────────────────────────────────────

pub fn router() -> Router<AppState> {
    Router::new()
        // Existing
        .route("/finance/transactions", get(list_transactions))
        .route("/finance/transactions/manual", post(create_manual_txn))
        .route("/finance/summary", get(summary))
        .route("/finance/expense", post(create_expense))
        // COA
        .route("/finance/coa", get(list_coa).post(create_coa))
        // Journals
        .route("/finance/journals", get(list_journals).post(create_journal))
        .route("/finance/journals/:id", get(get_journal))
        .route("/finance/journals/:id/post", post(post_journal))
        // Ledger & Reports
        .route("/finance/ledger", get(get_ledger))
        .route("/finance/trial-balance", get(get_trial_balance))
        .route("/finance/reports/lr", get(report_lr))
        .route("/finance/reports/balance-sheet", get(report_balance_sheet))
        .route("/finance/reports/cashflow", get(report_cashflow))
        .route("/finance/reports/lpa", get(report_lpa))
        .route("/finance/reports/sptj", get(report_sptj))
        .route("/finance/reports/bapsd", get(report_bapsd))
        // Setup
        .route("/finance/setup", get(list_setup))
        .route("/finance/setup/batch", put(batch_update_setup))
        .route("/finance/setup/:key", put(update_setup_key))
        // Sheets (spreadsheet data)
        .route("/finance/import/sheets", get(get_sheet_data))
        .route("/finance/import/sheets/:sheet/:row_no", put(update_sheet_row))
        // Coverage & Reconciliation
        .route("/finance/coverage", get(get_coverage))
        .route("/finance/reconciliation-check", get(reconciliation_check))
        // Saldo/Clean
        .route("/finance/saldo-buku/cleanup", post(saldo_buku_cleanup))
        .route("/finance/clear-anggaran-op-keterangan", post(clear_anggaran_op_keterangan))
        // Stock
        .route("/finance/stock/rekap", get(stock_rekap))
        .route("/finance/stock/detail", get(stock_detail))
        // Print
        .route("/finance/print/:doc_type", get(print_doc))
}

// ─── Existing Endpoints ─────────────────────────────────────────────────────

async fn list_transactions(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<FinanceTxn>>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    let rows = sqlx::query!(
        "SELECT id, category, amount, currency, occurred_at, description FROM finance_transactions WHERE tenant_id = $1 ORDER BY occurred_at DESC LIMIT 200",
        tenant_id.0
    )
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(rows.into_iter().map(|r| FinanceTxn {
        id: r.id, category: r.category, amount: r.amount,
        currency: r.currency, date: r.occurred_at, description: r.description,
    }).collect()))
}

async fn summary(headers: HeaderMap, State(pool): State<PgPool>) -> Result<Json<FinanceSummary>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;

    let total_cost = sqlx::query_scalar!(
        "SELECT COALESCE(SUM(amount), 0) as \"sum!\" FROM finance_transactions WHERE tenant_id = $1",
        tenant_id.0
    ).fetch_one(&pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let total_portions = sqlx::query_scalar!(
        "SELECT COALESCE(SUM(target_portions), 0) as \"sum!\" FROM production_plans WHERE tenant_id = $1",
        tenant_id.0
    ).fetch_one(&pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let breakdown_rows = sqlx::query!(
        "SELECT category, COALESCE(SUM(amount), 0) AS total FROM finance_transactions WHERE tenant_id = $1 GROUP BY category ORDER BY total DESC",
        tenant_id.0
    ).fetch_all(&pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let breakdown: Vec<FinanceBreakdown> = breakdown_rows.into_iter().map(|r| FinanceBreakdown {
        category: r.category, total: r.total.unwrap_or(0.0),
    }).collect();

    let avg = if total_portions > 0 { total_cost / total_portions as f64 } else { 0.0 };

    Ok(Json(FinanceSummary { total_cost, avg_cost_per_portion: avg, breakdown }))
}

async fn create_expense(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<CreateExpenseRequest>,
) -> Result<Json<FinanceTxn>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    require_coordinator(&headers, &pool, tenant_id).await?;

    if req.category.trim().is_empty() { return Err(StatusCode::BAD_REQUEST); }
    if !req.amount.is_finite() || req.amount <= 0.0 { return Err(StatusCode::BAD_REQUEST); }

    let currency = req.currency.unwrap_or_else(|| "IDR".to_string());
    let occurred_at = parse_datetime_or_now(req.date.as_deref())?;

    let id = Uuid::new_v4();
    let row = sqlx::query!(
        "INSERT INTO finance_transactions (id, tenant_id, category, amount, currency, occurred_at, description) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, category, amount, currency, occurred_at, description",
        id, tenant_id.0, req.category, req.amount, currency, occurred_at, req.description
    ).fetch_one(&pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(FinanceTxn {
        id: row.id, category: row.category, amount: row.amount,
        currency: row.currency, date: row.occurred_at, description: row.description,
    }))
}

async fn create_manual_txn(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<ManualTxnRequest>,
) -> Result<Json<FinanceTxn>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    let _claims = require_auth(&headers)?;

    let currency = req.currency.unwrap_or_else(|| "IDR".to_string());
    let occurred_at = parse_datetime_or_now(req.date.as_deref())?;

    let id = Uuid::new_v4();
    let row = sqlx::query!(
        "INSERT INTO finance_transactions (id, tenant_id, category, amount, currency, occurred_at, description) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, category, amount, currency, occurred_at, description",
        id, tenant_id.0, req.category, req.amount, currency, occurred_at, req.description
    ).fetch_one(&pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(FinanceTxn {
        id: row.id, category: row.category, amount: row.amount,
        currency: row.currency, date: row.occurred_at, description: row.description,
    }))
}

// ─── COA ────────────────────────────────────────────────────────────────────

async fn list_coa(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<CoaRow>>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    let rows = sqlx::query!(
        "SELECT id, account_code, account_name, account_group, normal_balance, is_active FROM finance_coa WHERE tenant_id = $1 ORDER BY account_code",
        tenant_id.0
    ).fetch_all(&pool).await.unwrap_or_default();

    Ok(Json(rows.iter().map(|r| CoaRow {
        id: r.id, account_code: r.account_code.clone(), account_name: r.account_name.clone(),
        account_group: r.account_group.clone(), normal_balance: r.normal_balance.clone(),
        is_active: r.is_active.unwrap_or(true),
    }).collect()))
}

async fn create_coa(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<CreateCoaRequest>,
) -> Result<Json<CoaRow>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    let _claims = require_auth(&headers)?;

    let id = Uuid::new_v4();
    let group = req.account_group.unwrap_or_else(|| "asset".into());
    let balance = req.normal_balance.unwrap_or_else(|| "debit".into());
    let active = req.is_active.unwrap_or(1) != 0;

    sqlx::query!(
        r#"INSERT INTO finance_coa (id, tenant_id, account_code, account_name, account_group, normal_balance, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (tenant_id, account_code) DO UPDATE SET account_name = $4, account_group = $5, normal_balance = $6, is_active = $7"#,
        id, tenant_id.0, req.account_code, req.account_name, group, balance, active
    ).execute(&pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(CoaRow { id, account_code: req.account_code, account_name: req.account_name,
        account_group: group, normal_balance: balance, is_active: active }))
}

// ─── Journals ───────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct JournalQuery {
    pub limit: Option<i64>,
}

async fn list_journals(
    headers: HeaderMap,
    Query(q): Query<JournalQuery>,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<JournalRow>>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    let lim = q.limit.unwrap_or(150).min(500);

    let journals = sqlx::query!(
        "SELECT id, journal_no, journal_date, description, status FROM finance_journals WHERE tenant_id = $1 ORDER BY journal_date DESC LIMIT $2",
        tenant_id.0, lim
    ).fetch_all(&pool).await.unwrap_or_default();

    let mut result = Vec::new();
    for j in &journals {
        let lines = sqlx::query!(
            "SELECT id, account_code, description, debit, credit FROM finance_journal_lines WHERE journal_id = $1 AND tenant_id = $2",
            j.id, tenant_id.0
        ).fetch_all(&pool).await.unwrap_or_default();

        result.push(JournalRow {
            id: j.id,
            journal_no: j.journal_no.clone(),
            journal_date: j.journal_date.to_string(),
            description: j.description.clone().unwrap_or_default(),
            status: j.status.clone(),
            lines: lines.iter().map(|l| JournalLineRow {
                id: l.id, account_code: l.account_code.clone(),
                description: l.description.clone().unwrap_or_default(),
                debit: l.debit.unwrap_or(0.0), credit: l.credit.unwrap_or(0.0),
            }).collect(),
        });
    }

    Ok(Json(result))
}

async fn get_journal(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<JournalRow>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;

    let j = sqlx::query!(
        "SELECT id, journal_no, journal_date, description, status FROM finance_journals WHERE id = $1 AND tenant_id = $2",
        id, tenant_id.0
    ).fetch_optional(&pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?.ok_or(StatusCode::NOT_FOUND)?;

    let lines = sqlx::query!(
        "SELECT id, account_code, description, debit, credit FROM finance_journal_lines WHERE journal_id = $1 AND tenant_id = $2",
        id, tenant_id.0
    ).fetch_all(&pool).await.unwrap_or_default();

    Ok(Json(JournalRow {
        id: j.id,
        journal_no: j.journal_no,
        journal_date: j.journal_date.to_string(),
        description: j.description.unwrap_or_default(),
        status: j.status,
        lines: lines.iter().map(|l| JournalLineRow {
            id: l.id, account_code: l.account_code.clone(),
            description: l.description.clone().unwrap_or_default(),
            debit: l.debit.unwrap_or(0.0), credit: l.credit.unwrap_or(0.0),
        }).collect(),
    }))
}

async fn create_journal(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<CreateJournalRequest>,
) -> Result<Json<JournalRow>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    let _claims = require_auth(&headers)?;

    let id = Uuid::new_v4();
    let date = if let Some(ref d) = req.journal_date {
        time::Date::parse(d, &time::format_description::well_known::Iso8601::DEFAULT)
            .unwrap_or_else(|_| OffsetDateTime::now_utc().date())
    } else {
        OffsetDateTime::now_utc().date()
    };

    let status = if req.auto_post.unwrap_or(false) { "posted" } else { "draft" };
    let desc = req.description.clone().unwrap_or_default();

    sqlx::query!(
        "INSERT INTO finance_journals (id, tenant_id, journal_no, journal_date, description, status) VALUES ($1, $2, $3, $4, $5, $6)",
        id, tenant_id.0, req.journal_no, date, desc, status
    ).execute(&pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut lines_out = Vec::new();
    for line in &req.lines {
        let lid = Uuid::new_v4();
        let ldesc = line.description.clone().unwrap_or_default();
        let debit = line.debit.unwrap_or(0.0);
        let credit = line.credit.unwrap_or(0.0);
        sqlx::query!(
            "INSERT INTO finance_journal_lines (id, journal_id, tenant_id, account_code, description, debit, credit) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            lid, id, tenant_id.0, line.account_code, ldesc, debit, credit
        ).execute(&pool).await.ok();

        lines_out.push(JournalLineRow {
            id: lid, account_code: line.account_code.clone(),
            description: ldesc, debit, credit,
        });
    }

    if req.auto_post.unwrap_or(false) {
        sqlx::query!("UPDATE finance_journals SET status = 'posted', posted_at = now() WHERE id = $1", id)
            .execute(&pool).await.ok();
    }

    Ok(Json(JournalRow {
        id, journal_no: req.journal_no, journal_date: date.to_string(),
        description: desc, status: status.into(), lines: lines_out,
    }))
}

async fn post_journal(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    State(pool): State<PgPool>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    let _claims = require_auth(&headers)?;

    sqlx::query!(
        "UPDATE finance_journals SET status = 'posted', posted_at = now() WHERE id = $1 AND tenant_id = $2",
        id, tenant_id.0
    ).execute(&pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({ "id": id, "status": "posted" })))
}

// ─── Ledger & Reports ───────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct LedgerEntry {
    pub account_code: String,
    pub account_name: String,
    pub total_debit: f64,
    pub total_credit: f64,
    pub balance: f64,
}

async fn get_ledger(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<LedgerEntry>>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;

    let rows = sqlx::query!(
        r#"SELECT jl.account_code,
                  COALESCE(c.account_name, jl.account_code) as account_name,
                  COALESCE(SUM(jl.debit), 0) as total_debit,
                  COALESCE(SUM(jl.credit), 0) as total_credit
           FROM finance_journal_lines jl
           JOIN finance_journals j ON j.id = jl.journal_id
           LEFT JOIN finance_coa c ON c.tenant_id = jl.tenant_id AND c.account_code = jl.account_code
           WHERE jl.tenant_id = $1 AND j.status = 'posted'
           GROUP BY jl.account_code, c.account_name
           ORDER BY jl.account_code"#,
        tenant_id.0
    ).fetch_all(&pool).await.unwrap_or_default();

    Ok(Json(rows.iter().map(|r| {
        let d = r.total_debit.unwrap_or(0.0);
        let c = r.total_credit.unwrap_or(0.0);
        LedgerEntry {
            account_code: r.account_code.clone(),
            account_name: r.account_name.clone().unwrap_or_default(),
            total_debit: d, total_credit: c, balance: d - c,
        }
    }).collect()))
}

#[derive(Serialize)]
pub struct TrialBalanceRow {
    pub account_code: String,
    pub account_name: String,
    pub debit: f64,
    pub credit: f64,
}

#[derive(Serialize)]
pub struct TrialBalance {
    pub rows: Vec<TrialBalanceRow>,
    pub total_debit: f64,
    pub total_credit: f64,
}

async fn get_trial_balance(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<TrialBalance>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;

    let rows = sqlx::query!(
        r#"SELECT jl.account_code,
                  COALESCE(c.account_name, jl.account_code) as account_name,
                  COALESCE(c.normal_balance, 'debit') as normal_balance,
                  COALESCE(SUM(jl.debit), 0) as total_debit,
                  COALESCE(SUM(jl.credit), 0) as total_credit
           FROM finance_journal_lines jl
           JOIN finance_journals j ON j.id = jl.journal_id
           LEFT JOIN finance_coa c ON c.tenant_id = jl.tenant_id AND c.account_code = jl.account_code
           WHERE jl.tenant_id = $1 AND j.status = 'posted'
           GROUP BY jl.account_code, c.account_name, c.normal_balance
           ORDER BY jl.account_code"#,
        tenant_id.0
    ).fetch_all(&pool).await.unwrap_or_default();

    let mut tb_rows = Vec::new();
    let mut sum_d = 0.0;
    let mut sum_c = 0.0;
    for r in &rows {
        let d = r.total_debit.unwrap_or(0.0);
        let c = r.total_credit.unwrap_or(0.0);
        let net = d - c;
        let (debit, credit) = if net >= 0.0 { (net, 0.0) } else { (0.0, -net) };
        sum_d += debit;
        sum_c += credit;
        tb_rows.push(TrialBalanceRow {
            account_code: r.account_code.clone(),
            account_name: r.account_name.clone().unwrap_or_default(),
            debit, credit,
        });
    }

    Ok(Json(TrialBalance { rows: tb_rows, total_debit: sum_d, total_credit: sum_c }))
}

async fn report_lr(headers: HeaderMap, State(pool): State<PgPool>) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    let revenue = total_by_group(&pool, tenant_id.0, "revenue").await;
    let expense = total_by_group(&pool, tenant_id.0, "expense").await;
    Ok(Json(serde_json::json!({
        "revenue": revenue, "expense": expense,
        "net_income": revenue - expense
    })))
}

async fn report_balance_sheet(headers: HeaderMap, State(pool): State<PgPool>) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    let asset = total_by_group(&pool, tenant_id.0, "asset").await;
    let liability = total_by_group(&pool, tenant_id.0, "liability").await;
    let equity = total_by_group(&pool, tenant_id.0, "equity").await;
    Ok(Json(serde_json::json!({
        "asset": asset, "liability": liability, "equity": equity,
        "balanced": (asset - liability - equity).abs() < 0.01
    })))
}

async fn report_cashflow(headers: HeaderMap, State(pool): State<PgPool>) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;

    let inflow = sqlx::query_scalar!(
        "SELECT COALESCE(SUM(amount), 0) as \"v!\" FROM finance_transactions WHERE tenant_id = $1 AND amount > 0",
        tenant_id.0
    ).fetch_one(&pool).await.unwrap_or(0.0);

    let outflow = sqlx::query_scalar!(
        "SELECT COALESCE(SUM(ABS(amount)), 0) as \"v!\" FROM finance_transactions WHERE tenant_id = $1 AND amount < 0",
        tenant_id.0
    ).fetch_one(&pool).await.unwrap_or(0.0);

    Ok(Json(serde_json::json!({
        "inflow": inflow, "outflow": outflow,
        "net_cashflow": inflow - outflow
    })))
}

async fn report_lpa(headers: HeaderMap, State(pool): State<PgPool>) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    let revenue = total_by_group(&pool, tenant_id.0, "revenue").await;
    let expense = total_by_group(&pool, tenant_id.0, "expense").await;
    Ok(Json(serde_json::json!({
        "title": "Laporan Pertanggungjawaban Anggaran",
        "total_budget_used": expense,
        "total_revenue": revenue,
        "balance": revenue - expense
    })))
}

async fn report_sptj(headers: HeaderMap, State(_pool): State<PgPool>) -> Result<Json<serde_json::Value>, StatusCode> {
    let _tenant_id = require_tenant(&headers)?;
    Ok(Json(serde_json::json!({
        "title": "Surat Pernyataan Tanggung Jawab",
        "signed": false, "date": OffsetDateTime::now_utc().date().to_string()
    })))
}

async fn report_bapsd(headers: HeaderMap, State(_pool): State<PgPool>) -> Result<Json<serde_json::Value>, StatusCode> {
    let _tenant_id = require_tenant(&headers)?;
    Ok(Json(serde_json::json!({
        "title": "Berita Acara Pemeriksaan/Serah Terima Dokumen",
        "verified": false, "date": OffsetDateTime::now_utc().date().to_string()
    })))
}

async fn total_by_group(pool: &PgPool, tenant_id: Uuid, group: &str) -> f64 {
    sqlx::query_scalar!(
        r#"SELECT COALESCE(SUM(jl.debit - jl.credit), 0) as "v!"
           FROM finance_journal_lines jl
           JOIN finance_journals j ON j.id = jl.journal_id
           JOIN finance_coa c ON c.tenant_id = jl.tenant_id AND c.account_code = jl.account_code
           WHERE jl.tenant_id = $1 AND j.status = 'posted' AND c.account_group = $2"#,
        tenant_id, group
    ).fetch_one(pool).await.unwrap_or(0.0)
}

// ─── Finance Setup ──────────────────────────────────────────────────────────

async fn list_setup(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<SetupRow>>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    let rows = sqlx::query!(
        "SELECT key, value, source_row FROM finance_setup WHERE tenant_id = $1 ORDER BY key",
        tenant_id.0
    ).fetch_all(&pool).await.unwrap_or_default();

    Ok(Json(rows.iter().map(|r| SetupRow {
        key: r.key.clone(), value: r.value.clone().unwrap_or_default(),
        source_row: r.source_row.unwrap_or(0),
    }).collect()))
}

async fn update_setup_key(
    headers: HeaderMap,
    Path(key): Path<String>,
    State(pool): State<PgPool>,
    Json(req): Json<SetupUpdateRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    let _claims = require_auth(&headers)?;

    let value = req.value.unwrap_or_default();
    let source_row = req.source_row.unwrap_or(0);

    sqlx::query!(
        r#"INSERT INTO finance_setup (tenant_id, key, value, source_row, updated_at)
           VALUES ($1, $2, $3, $4, now())
           ON CONFLICT (tenant_id, key) DO UPDATE SET value = $3, source_row = $4, updated_at = now()"#,
        tenant_id.0, key, value, source_row
    ).execute(&pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({ "key": key, "value": value })))
}

async fn batch_update_setup(
    headers: HeaderMap,
    State(pool): State<PgPool>,
    Json(req): Json<SetupBatchRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    let _claims = require_auth(&headers)?;

    for item in &req.updates {
        let sr = item.source_row.unwrap_or(0);
        sqlx::query!(
            r#"INSERT INTO finance_setup (tenant_id, key, value, source_row, updated_at)
               VALUES ($1, $2, $3, $4, now())
               ON CONFLICT (tenant_id, key) DO UPDATE SET value = $3, source_row = $4, updated_at = now()"#,
            tenant_id.0, item.key, item.value, sr
        ).execute(&pool).await.ok();
    }

    Ok(Json(serde_json::json!({ "updated": req.updates.len() })))
}

// ─── Finance Sheets ─────────────────────────────────────────────────────────

async fn get_sheet_data(
    headers: HeaderMap,
    Query(q): Query<SheetQuery>,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<SheetRow>>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    let sheet = q.sheet.unwrap_or_else(|| "Transaksi".into());
    let limit = q.limit.unwrap_or(2000).min(5000);

    let rows = sqlx::query!(
        "SELECT row_no, cells FROM finance_sheets WHERE tenant_id = $1 AND sheet_name = $2 ORDER BY row_no LIMIT $3",
        tenant_id.0, sheet, limit
    ).fetch_all(&pool).await.unwrap_or_default();

    Ok(Json(rows.iter().map(|r| SheetRow {
        row_no: r.row_no, cells: r.cells.clone(),
    }).collect()))
}

async fn update_sheet_row(
    headers: HeaderMap,
    Path((sheet, row_no)): Path<(String, i32)>,
    State(pool): State<PgPool>,
    Json(req): Json<SheetUpdateRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    let _claims = require_auth(&headers)?;

    sqlx::query!(
        r#"INSERT INTO finance_sheets (tenant_id, sheet_name, row_no, cells, updated_at)
           VALUES ($1, $2, $3, $4, now())
           ON CONFLICT (tenant_id, sheet_name, row_no) DO UPDATE SET cells = $4, updated_at = now()"#,
        tenant_id.0, sheet, row_no, req.cells
    ).execute(&pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({ "sheet": sheet, "row_no": row_no, "updated": true })))
}

// ─── Coverage & Reconciliation ──────────────────────────────────────────────

async fn get_coverage(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;

    let sheets_count = sqlx::query_scalar!(
        "SELECT COUNT(DISTINCT sheet_name) FROM finance_sheets WHERE tenant_id = $1",
        tenant_id.0
    ).fetch_one(&pool).await.unwrap_or(Some(0)).unwrap_or(0);

    let setup_count = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM finance_setup WHERE tenant_id = $1",
        tenant_id.0
    ).fetch_one(&pool).await.unwrap_or(Some(0)).unwrap_or(0);

    let coa_count = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM finance_coa WHERE tenant_id = $1",
        tenant_id.0
    ).fetch_one(&pool).await.unwrap_or(Some(0)).unwrap_or(0);

    Ok(Json(serde_json::json!({
        "sheets_count": sheets_count,
        "setup_keys": setup_count,
        "coa_accounts": coa_count,
        "coverage_pct": if coa_count > 0 { 100 } else { 0 }
    })))
}

async fn reconciliation_check(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;

    let total_debit = sqlx::query_scalar!(
        r#"SELECT COALESCE(SUM(jl.debit), 0) as "v!"
           FROM finance_journal_lines jl
           JOIN finance_journals j ON j.id = jl.journal_id
           WHERE jl.tenant_id = $1 AND j.status = 'posted'"#,
        tenant_id.0
    ).fetch_one(&pool).await.unwrap_or(0.0);

    let total_credit = sqlx::query_scalar!(
        r#"SELECT COALESCE(SUM(jl.credit), 0) as "v!"
           FROM finance_journal_lines jl
           JOIN finance_journals j ON j.id = jl.journal_id
           WHERE jl.tenant_id = $1 AND j.status = 'posted'"#,
        tenant_id.0
    ).fetch_one(&pool).await.unwrap_or(0.0);

    let balanced = (total_debit - total_credit).abs() < 0.01;

    Ok(Json(serde_json::json!({
        "total_debit": total_debit,
        "total_credit": total_credit,
        "difference": total_debit - total_credit,
        "is_balanced": balanced
    })))
}

// ─── Cleanup utilities ──────────────────────────────────────────────────────

async fn saldo_buku_cleanup(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    let _claims = require_auth(&headers)?;

    let deleted = sqlx::query!(
        "DELETE FROM finance_sheets WHERE tenant_id = $1 AND sheet_name = 'Saldo Buku'",
        tenant_id.0
    ).execute(&pool).await.map(|r| r.rows_affected()).unwrap_or(0);

    Ok(Json(serde_json::json!({ "deleted_rows": deleted })))
}

async fn clear_anggaran_op_keterangan(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;
    let _claims = require_auth(&headers)?;

    let rows = sqlx::query!(
        "SELECT id, cells FROM finance_sheets WHERE tenant_id = $1 AND sheet_name = 'Anggaran Operasional'",
        tenant_id.0
    ).fetch_all(&pool).await.unwrap_or_default();

    let mut cleared = 0u64;
    for row in &rows {
        if let Some(obj) = row.cells.as_object() {
            let mut new_cells = obj.clone();
            if new_cells.contains_key("keterangan") {
                new_cells.insert("keterangan".into(), serde_json::json!(""));
                sqlx::query!(
                    "UPDATE finance_sheets SET cells = $1, updated_at = now() WHERE id = $2",
                    serde_json::Value::Object(new_cells), row.id
                ).execute(&pool).await.ok();
                cleared += 1;
            }
        }
    }

    Ok(Json(serde_json::json!({ "cleared_rows": cleared })))
}

// ─── Stock Finance Reports ──────────────────────────────────────────────────

async fn stock_rekap(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;

    let rows = sqlx::query!(
        r#"SELECT i.name, inv.quantity, i.unit, i.estimated_price,
                  (inv.quantity * COALESCE(i.estimated_price, 0)) as total_value
           FROM inventory inv
           JOIN ingredients i ON i.id = inv.ingredient_id AND i.tenant_id = inv.tenant_id
           WHERE inv.tenant_id = $1
           ORDER BY i.name"#,
        tenant_id.0
    ).fetch_all(&pool).await.unwrap_or_default();

    let items: Vec<serde_json::Value> = rows.iter().map(|r| serde_json::json!({
        "name": r.name,
        "quantity": r.quantity,
        "unit": r.unit,
        "estimated_price": r.estimated_price,
        "total_value": r.total_value
    })).collect();

    let total_value: f64 = rows.iter().map(|r| r.total_value.unwrap_or(0.0)).sum();

    Ok(Json(serde_json::json!({
        "items": items,
        "total_value": total_value
    })))
}

async fn stock_detail(
    headers: HeaderMap,
    State(pool): State<PgPool>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;

    let movements = sqlx::query!(
        r#"SELECT sm.id, i.name as ingredient_name, sm.movement_type, sm.quantity,
                  sm.qty_before, sm.qty_after, sm.note, sm.occurred_at
           FROM stock_movements sm
           JOIN ingredients i ON i.id = sm.ingredient_id
           WHERE sm.tenant_id = $1
           ORDER BY sm.occurred_at DESC LIMIT 200"#,
        tenant_id.0
    ).fetch_all(&pool).await.unwrap_or_default();

    let items: Vec<serde_json::Value> = movements.iter().map(|m| serde_json::json!({
        "id": m.id,
        "ingredient_name": m.ingredient_name,
        "movement_type": m.movement_type,
        "quantity": m.quantity,
        "qty_before": m.qty_before,
        "qty_after": m.qty_after,
        "note": m.note,
        "occurred_at": m.occurred_at.to_string()
    })).collect();

    Ok(Json(serde_json::json!({ "movements": items })))
}

// ─── Print ──────────────────────────────────────────────────────────────────

async fn print_doc(
    headers: HeaderMap,
    Path(doc_type): Path<String>,
    State(_pool): State<PgPool>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let tenant_id = require_tenant(&headers)?;

    Ok(Json(serde_json::json!({
        "doc_type": doc_type,
        "html": format!("<h1>{}</h1><p>Print template placeholder for tenant {}</p>", doc_type, tenant_id.0),
        "generated_at": OffsetDateTime::now_utc().to_string()
    })))
}

// ─── Helpers ────────────────────────────────────────────────────────────────

fn parse_datetime_or_now(s: Option<&str>) -> Result<OffsetDateTime, StatusCode> {
    if let Some(s) = s {
        OffsetDateTime::parse(s, &time::format_description::well_known::Rfc3339)
            .map_err(|_| StatusCode::BAD_REQUEST)
    } else {
        Ok(OffsetDateTime::now_utc())
    }
}
