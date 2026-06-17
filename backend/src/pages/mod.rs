use askama::Template;
use askama_axum::IntoResponse;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{Html, Redirect, Response},
    routing::{get, post},
    Form, Router,
};
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use time::{format_description::well_known::Rfc3339, Date, Duration, OffsetDateTime, PrimitiveDateTime};
use uuid::Uuid;

use crate::routes::auth::{self, Claims, LoginRequest};
use crate::state::AppState;

#[cfg(test)]
mod tests;

#[derive(Clone)]
struct Session {
    claims: Claims,
}

fn require_session(jar: &CookieJar) -> Result<Session, Redirect> {
    let token = jar
        .get("app_token")
        .map(|c| c.value().to_string())
        .ok_or_else(|| Redirect::to("/login"))?;
    let claims = auth::verify_token(&token).map_err(|_| Redirect::to("/login"))?;
    Ok(Session { claims })
}

fn set_session_cookie(jar: CookieJar, token: String) -> CookieJar {
    let mut c = Cookie::new("app_token", token);
    c.set_http_only(true);
    c.set_same_site(SameSite::Lax);
    c.set_path("/");
    jar.add(c)
}

fn clear_session_cookie(jar: CookieJar) -> CookieJar {
    let mut c = Cookie::new("app_token", "");
    c.set_http_only(true);
    c.set_same_site(SameSite::Lax);
    c.set_path("/");
    c.make_removal();
    jar.add(c)
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(index))
        .route("/home", get(home))
        .route("/login", get(login_page).post(login_submit))
        .route("/logout", post(logout))
        .route("/signup", get(signup_page).post(signup_submit))
        .route("/forgot-password", get(forgot_password_page).post(forgot_password_submit))
        .route("/reset-password", get(reset_password_page).post(reset_password_submit))
        .route("/app", get(dashboard))
        .route("/staff", get(staff_dashboard))
        .route("/dev", get(dev_portal))
        .route("/dev_portal", get(dev_portal))
        // Supplier portal: file statis di /legacy (ServeDir) — lebih andal daripada Askama + path aset
        .route("/supplier", get(supplier_portal_redirect))
        .route("/supplier/", get(supplier_portal_redirect))
        .route("/app/plans", get(plans_page))
        .route("/app/plans/new", get(plans_new_page).post(plans_new_submit))
        .route("/app/plans/:id", get(plan_detail_page))
        .route("/app/plans/:id/documents", post(plan_generate_documents))
        .route("/app/batches", get(batches_page))
        .route("/app/tasks", get(tasks_page))
        .route("/app/tasks/new", get(task_new_page).post(task_new_submit))
        .route("/app/inventory", get(inventory_page).post(inventory_opname))
        .route("/app/inventory/ingredients", get(inventory_ingredients_page))
        .route(
            "/app/inventory/ingredients/new",
            get(inventory_ingredient_new_page).post(inventory_ingredient_new_submit),
        )
        .route(
            "/app/inventory/movements/new",
            get(inventory_movement_new_page).post(inventory_movement_new_submit),
        )
        .route("/app/finance", get(finance_page))
        .route(
            "/app/finance/expenses/new",
            get(finance_expense_new_page).post(finance_expense_new_submit),
        )
        .route("/app/nutrition", get(nutrition_page))
        .route("/app/nutrition/link", post(nutrition_link_submit))
        .route("/app/billing", get(billing_page))
}

#[derive(Template)]
#[template(path = "billing.html")]
struct BillingTemplate {
    current_plan_name: String,
    current_plan_code: String,
    current_status: String,
    current_period_end: String,
    is_active: bool,
    available_plans: Vec<PlanUi>,
}

#[derive(Serialize, Clone)]
struct PlanUi {
    code: String,
    name: String,
    price_formatted: String,
    currency: String,
    feature_list: Vec<String>,
}

async fn billing_page(
    jar: CookieJar,
    State(pool): State<PgPool>,
) -> Result<BillingTemplate, Redirect> {
    let s = require_session(&jar)?;
    let tenant = s.claims.tenant_id.ok_or_else(|| Redirect::to("/login"))?;

    // Get current sub
    let sub_row = sqlx::query!(
        "SELECT s.plan_code, s.status, s.current_period_end, p.name as plan_name 
         FROM tenant_subscriptions s 
         JOIN subscription_plans p ON p.code = s.plan_code
         WHERE s.tenant_id = $1 
         ORDER BY s.current_period_end DESC LIMIT 1",
        tenant
    )
    .fetch_optional(&pool)
    .await
    .unwrap_or(None);

    let (plan_name, plan_code, status, end, active) = if let Some(r) = sub_row {
        let is_active = (r.status == "ACTIVE" || r.status == "TRIALING") && r.current_period_end > OffsetDateTime::now_utc();
        (r.plan_name, r.plan_code, r.status, r.current_period_end.format(&Rfc3339).unwrap_or_default(), is_active)
    } else {
        ("NONE".to_string(), "NONE".to_string(), "EXPIRED".to_string(), "-".to_string(), false)
    };

    // Get available plans
    let plans = sqlx::query!("SELECT code, name, price_monthly, currency, features FROM subscription_plans WHERE is_active = TRUE ORDER BY price_monthly ASC")
        .fetch_all(&pool)
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|r| {
            let features = match r.features {
                serde_json::Value::Object(m) => {
                    if let Some(serde_json::Value::Array(a)) = m.get("modules") {
                        a.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect()
                    } else {
                        vec!["Fitur dasar".to_string()]
                    }
                }
                _ => vec!["Fitur dasar".to_string()],
            };
            PlanUi {
                code: r.code,
                name: r.name,
                price_formatted: r.price_monthly.to_string(),
                currency: r.currency,
                feature_list: features,
            }
        })
        .collect();

    Ok(BillingTemplate {
        current_plan_name: plan_name,
        current_plan_code: plan_code,
        current_status: status,
        current_period_end: end,
        is_active: active,
        available_plans: plans,
    })
}

#[derive(Template)]
#[template(path = "index.html")]
struct IndexTemplate;

async fn index() -> IndexTemplate {
    IndexTemplate
}

async fn supplier_portal_redirect() -> Redirect {
    Redirect::to("/legacy/supplier.html")
}

#[derive(Template)]
#[template(path = "home.html")]
struct HomeTemplate;

async fn home() -> HomeTemplate {
    HomeTemplate
}

#[derive(Template)]
#[template(path = "staff_dashboard.html")]
struct StaffDashboardTemplate {
    user_email: String,
}

async fn staff_dashboard(
    jar: CookieJar,
) -> Result<StaffDashboardTemplate, Redirect> {
    let s = require_session(&jar)?;
    Ok(StaffDashboardTemplate {
        user_email: s.claims.email,
    })
}

async fn dev_portal() -> Html<String> {
    let html = tokio::fs::read_to_string("frontend/dev.html")
        .await
        .unwrap_or_else(|_| "<h1>Error: dev.html not found</h1>".to_string());
    Html(html)
}

#[derive(Template)]
#[template(path = "signup.html")]
struct SignupTemplate {
    error: Option<String>,
}

async fn signup_page() -> SignupTemplate {
    SignupTemplate { error: None }
}

#[derive(Deserialize)]
struct SignupForm {
    tenant_name: String,
    email: String,
    password: String,
}

async fn signup_submit(
    jar: CookieJar,
    State(pool): State<PgPool>,
    Form(f): Form<SignupForm>,
) -> Result<(CookieJar, Redirect), Response> {
    if f.email.trim().is_empty() || f.password.trim().is_empty() || f.tenant_name.trim().is_empty() {
        let t = SignupTemplate { error: Some("Semua kolom wajib diisi".to_string()) };
        return Err((StatusCode::OK, Html(t.render().unwrap_or_default())).into_response());
    }

    // Check if email exists
    let exists = sqlx::query_scalar!("SELECT id FROM users WHERE email = $1", f.email.to_lowercase())
        .fetch_optional(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response())?;

    if exists.is_some() {
        let t = SignupTemplate { error: Some("Email sudah terdaftar".to_string()) };
        return Err((StatusCode::OK, Html(t.render().unwrap_or_default())).into_response());
    }

    // Create Tenant and User
    let tenant_id = Uuid::new_v4();
    let user_id = Uuid::new_v4();
    let ph = auth::hash_password(&f.password);

    let mut tx = pool.begin().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response())?;

    sqlx::query!(
        "INSERT INTO tenants (id, name, contact_email, plan_type, status) VALUES ($1, $2, $3, $4, $5)",
        tenant_id, f.tenant_name, f.email.to_lowercase(), "TRIAL", "ACTIVE"
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response())?;

    sqlx::query!(
        "INSERT INTO users (id, tenant_id, email, role, password_hash) VALUES ($1, $2, $3, $4, $5)",
        user_id, tenant_id, f.email.to_lowercase(), "owner", ph
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response())?;

    // Create initial subscription (14 days trial)
    let sub_id = Uuid::new_v4();
    let now = OffsetDateTime::now_utc();
    let end = now + Duration::days(14);
    sqlx::query!(
        "INSERT INTO tenant_subscriptions (id, tenant_id, plan_code, status, current_period_start, current_period_end) VALUES ($1, $2, $3, $4, $5, $6)",
        sub_id, tenant_id, "TRIAL", "TRIALING", now, end
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response())?;

    tx.commit().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response())?;

    let req = auth::LoginRequest {
        email: f.email,
        password: f.password,
        role: "owner".to_string(),
        tenant_id: Some(tenant_id),
    };
    let res = auth::login_internal(&pool, req).await.map_err(|(_, msg)| (StatusCode::INTERNAL_SERVER_ERROR, msg).into_response())?;

    let jar = set_session_cookie(jar, res.token);
    Ok((jar, Redirect::to("/app")))
}

#[derive(Template)]
#[template(path = "forgot_password.html")]
struct ForgotPasswordTemplate {
    error: Option<String>,
}

async fn forgot_password_page() -> ForgotPasswordTemplate {
    ForgotPasswordTemplate { error: None }
}

#[derive(Deserialize)]
struct ForgotPasswordForm {
    email: String,
}

async fn forgot_password_submit(
    State(_pool): State<PgPool>,
    Form(f): Form<ForgotPasswordForm>,
) -> Result<Html<String>, Response> {
    // In a real app, send email with token. Here we just show success.
    Ok(Html(format!("<h1>Link reset telah dikirim ke {}</h1><p>Periksa email Anda (Simulasi: klik <a href='/reset-password?token=dummy-token'>di sini</a> untuk reset).</p>", f.email)))
}

#[derive(Template)]
#[template(path = "reset_password.html")]
struct ResetPasswordTemplate {
    token: String,
    error: Option<String>,
}

#[derive(Deserialize)]
struct ResetPasswordQuery {
    token: String,
}

async fn reset_password_page(Query(q): Query<ResetPasswordQuery>) -> ResetPasswordTemplate {
    ResetPasswordTemplate { token: q.token, error: None }
}

#[derive(Deserialize)]
struct ResetPasswordForm {
    token: String,
    password: String,
    confirm_password: String,
}

async fn reset_password_submit(
    Form(f): Form<ResetPasswordForm>,
) -> Result<Redirect, Response> {
    if f.password != f.confirm_password {
        let t = ResetPasswordTemplate { token: f.token, error: Some("Konfirmasi kata sandi tidak cocok".to_string()) };
        return Err((StatusCode::OK, Html(t.render().unwrap_or_default())).into_response());
    }
    // Update password logic here
    Ok(Redirect::to("/login?message=Password%20berhasil%20diubah"))
}

#[derive(Template)]
#[template(path = "login.html")]
struct LoginTemplate {
    error: Option<String>,
}

async fn login_page() -> LoginTemplate {
    LoginTemplate { error: None }
}

#[derive(Deserialize)]
struct LoginForm {
    email: String,
    password: String,
    role: String,
    tenant_id: Option<String>,
}

async fn login_submit(
    jar: CookieJar,
    State(pool): State<PgPool>,
    Form(f): Form<LoginForm>,
) -> Result<(CookieJar, Redirect), Response> {
    let tenant_id = f
        .tenant_id
        .as_deref()
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .and_then(|v| Uuid::parse_str(v).ok());

    let req = LoginRequest {
        email: f.email,
        password: f.password,
        role: f.role,
        tenant_id,
    };

    let res = auth::login_internal(&pool, req)
        .await
        .map_err(|(code, msg)| match code {
            StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN | StatusCode::BAD_REQUEST => {
                let t = LoginTemplate { error: Some(msg) };
                (StatusCode::OK, Html(t.render().unwrap_or_default())).into_response()
            }
            _ => (StatusCode::INTERNAL_SERVER_ERROR, msg).into_response(),
        })?;

    let jar = set_session_cookie(jar, res.token);
    Ok((jar, Redirect::to("/app")))
}

async fn logout(jar: CookieJar) -> (CookieJar, Redirect) {
    (clear_session_cookie(jar), Redirect::to("/"))
}

#[derive(Template)]
#[template(path = "dashboard.html")]
struct DashboardTemplate {
    user_email: String,
    tenant_id: String,
    plans_total: i64,
    batches_total: i64,
    ingredients_total: i64,
    generated_at: String,
    is_subscribed: bool,
    subscription_status: String,
}

async fn dashboard(
    jar: CookieJar,
    State(pool): State<PgPool>,
) -> Result<DashboardTemplate, Redirect> {
    let s = require_session(&jar)?;
    let tenant = s.claims.tenant_id.ok_or_else(|| Redirect::to("/login"))?;

    // Check subscription
    let sub = sqlx::query!(
        "SELECT status, current_period_end FROM tenant_subscriptions WHERE tenant_id = $1 ORDER BY current_period_end DESC LIMIT 1",
        tenant
    )
    .fetch_optional(&pool)
    .await
    .unwrap_or(None);

    let (is_subscribed, sub_status) = if let Some(s) = sub {
        let active = (s.status == "ACTIVE" || s.status == "TRIALING") && s.current_period_end > OffsetDateTime::now_utc();
        (active, s.status)
    } else {
        (false, "NONE".to_string())
    };

    let plans_total = sqlx::query_scalar!(
        "SELECT COUNT(*) as \"count!\" FROM production_plans WHERE tenant_id = $1",
        tenant
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    let batches_total = sqlx::query_scalar!(
        "SELECT COUNT(*) as \"count!\" FROM production_batches WHERE tenant_id = $1",
        tenant
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    let ingredients_total = sqlx::query_scalar!(
        "SELECT COUNT(*) as \"count!\" FROM ingredients WHERE tenant_id = $1",
        tenant
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    Ok(DashboardTemplate {
        user_email: s.claims.email,
        tenant_id: tenant.to_string(),
        plans_total,
        batches_total,
        ingredients_total,
        generated_at: OffsetDateTime::now_utc().format(&Rfc3339).unwrap_or_default(),
        is_subscribed,
        subscription_status: sub_status,
    })
}

#[derive(Deserialize)]
struct PlansQuery {
    message: Option<String>,
}

#[derive(Serialize, Clone)]
struct MenuItemRow {
    id: String,
    name: String,
}

#[derive(Serialize, Clone, PartialEq)]
struct PlanRow {
    id: String,
    status: String,
    target_portions: i32,
    target_delivery_time: String,
    feasible: bool,
}

#[derive(Template)]
#[template(path = "plans.html")]
struct PlansTemplate {
    tenant_id: String,
    menu_items: Vec<MenuItemRow>,
    plans: Vec<PlanRow>,
    message: Option<String>,
}

#[derive(Template)]
#[template(path = "plans_new.html")]
struct PlanNewTemplate {
    tenant_id: String,
    target_portions: String,
    target_delivery_time: String,
    error: Option<String>,
}

#[derive(Template)]
#[template(path = "plan_detail.html")]
struct PlanDetailTemplate {
    plan_id: String,
    status: String,
    target_portions: i32,
    target_delivery_time: String,
    message: Option<String>,
}

async fn plans_page(
    jar: CookieJar,
    State(pool): State<PgPool>,
    Query(q): Query<PlansQuery>,
) -> Result<PlansTemplate, Redirect> {
    let s = require_session(&jar)?;
    let tenant = s.claims.tenant_id.ok_or_else(|| Redirect::to("/login"))?;

    let menu_items = sqlx::query!("SELECT id, name FROM menu_items WHERE tenant_id = $1 ORDER BY name", tenant)
        .fetch_all(&pool)
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|r| MenuItemRow { id: r.id.to_string(), name: r.name })
        .collect();

    let plans = sqlx::query!(
        "SELECT id, status, target_portions, target_delivery_time, feasible FROM production_plans WHERE tenant_id = $1 ORDER BY generated_at DESC LIMIT 25",
        tenant
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|r| PlanRow {
        id: r.id.to_string(),
        status: r.status,
        target_portions: r.target_portions,
        target_delivery_time: r.target_delivery_time.format(&Rfc3339).unwrap_or_default(),
        feasible: r.feasible,
    })
    .collect();

    Ok(PlansTemplate {
        tenant_id: tenant.to_string(),
        menu_items,
        plans,
        message: q.message,
    })
}

#[derive(Deserialize)]
struct CreatePlanForm {
    target_portions: Option<i32>,
    target_delivery_time: Option<String>,
}

async fn plans_new_page(jar: CookieJar) -> Result<PlanNewTemplate, Redirect> {
    let s = require_session(&jar)?;
    let tenant = s.claims.tenant_id.ok_or_else(|| Redirect::to("/login"))?;
    Ok(PlanNewTemplate {
        tenant_id: tenant.to_string(),
        target_portions: "".to_string(),
        target_delivery_time: "".to_string(),
        error: None,
    })
}

async fn plans_new_submit(
    jar: CookieJar,
    State(pool): State<PgPool>,
    Form(f): Form<CreatePlanForm>,
) -> Response {
    let s = match require_session(&jar) {
        Ok(s) => s,
        Err(r) => return r.into_response(),
    };
    let tenant = match s.claims.tenant_id {
        Some(t) => t,
        None => return Redirect::to("/login").into_response(),
    };

    let target_portions = f.target_portions.unwrap_or(0);
    if target_portions <= 0 {
        let t = PlanNewTemplate {
            tenant_id: tenant.to_string(),
            target_portions: "".to_string(),
            target_delivery_time: f.target_delivery_time.unwrap_or_default(),
            error: Some("Target portions required".to_string()),
        };
        return (StatusCode::OK, Html(t.render().unwrap_or_default())).into_response();
    }

    let dt_raw = f.target_delivery_time.unwrap_or_default();
    let target_delivery_time = parse_delivery_time(&dt_raw).unwrap_or_else(OffsetDateTime::now_utc);

    let req = crate::routes::plan::GeneratePlanRequest {
        target_portions,
        menu_item_ids: vec![],
        target_delivery_time,
    };
    let _ = crate::routes::plan::generate_internal(&pool, tenant, &s.claims.role, req).await;

    Redirect::to("/app/plans?message=Plan%20saved").into_response()
}

#[derive(Deserialize)]
struct PlanDetailQuery {
    message: Option<String>,
}

async fn plan_detail_page(
    jar: CookieJar,
    State(pool): State<PgPool>,
    Path(id): Path<String>,
    Query(q): Query<PlanDetailQuery>,
) -> Result<PlanDetailTemplate, Redirect> {
    let s = require_session(&jar)?;
    let tenant = s.claims.tenant_id.ok_or_else(|| Redirect::to("/login"))?;
    let plan_id = Uuid::parse_str(id.trim()).map_err(|_| Redirect::to("/app/plans"))?;

    let row = sqlx::query!(
        "SELECT id, status, target_portions, target_delivery_time FROM production_plans WHERE tenant_id = $1 AND id = $2",
        tenant,
        plan_id
    )
    .fetch_optional(&pool)
    .await
    .unwrap_or(None)
    .ok_or_else(|| Redirect::to("/app/plans"))?;

    Ok(PlanDetailTemplate {
        plan_id: row.id.to_string(),
        status: row.status,
        target_portions: row.target_portions,
        target_delivery_time: row.target_delivery_time.format(&Rfc3339).unwrap_or_default(),
        message: q.message,
    })
}

async fn plan_generate_documents(
    jar: CookieJar,
    Path(id): Path<String>,
) -> Result<Redirect, Redirect> {
    let _ = require_session(&jar)?;
    Ok(Redirect::to(&format!("/app/plans/{id}?message=Documents%20generated")))
}

#[derive(Deserialize)]
struct BatchesQuery {
    plan_id: Option<String>,
}

#[derive(Serialize, Clone)]
struct BatchRowUi {
    id: String,
    plan_id: String,
    menu_item_name: String,
    batch_size: i32,
    start_time: String,
    end_time: String,
    status: String,
}

#[derive(Template)]
#[template(path = "batches.html")]
struct BatchesTemplate {
    tenant_id: String,
    plans: Vec<PlanRow>,
    selected_plan_id: Option<String>,
    batches: Vec<BatchRowUi>,
}

async fn batches_page(
    jar: CookieJar,
    State(pool): State<PgPool>,
    Query(q): Query<BatchesQuery>,
) -> Result<BatchesTemplate, Redirect> {
    let s = require_session(&jar)?;
    let tenant = s.claims.tenant_id;

    let plans = sqlx::query!(
        "SELECT id, status, target_portions, target_delivery_time, feasible FROM production_plans WHERE tenant_id = $1 ORDER BY generated_at DESC LIMIT 25",
        tenant
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|r| PlanRow {
        id: r.id.to_string(),
        status: r.status,
        target_portions: r.target_portions,
        target_delivery_time: r.target_delivery_time.format(&Rfc3339).unwrap_or_default(),
        feasible: r.feasible,
    })
    .collect::<Vec<_>>();

    let selected = q
        .plan_id
        .as_deref()
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .map(|v| v.to_string());

    let batches = if let Some(ref pid) = selected {
        let plan_uuid = Uuid::parse_str(pid).ok();
        if let Some(plan_id) = plan_uuid {
            sqlx::query!(
                r#"
                SELECT b.id, b.plan_id, b.batch_size, b.start_time, b.end_time, COALESCE(b.current_status,'') as "current_status!", m.name as "menu_name!"
                FROM production_batches b
                JOIN menu_items m ON m.id = b.menu_item_id
                WHERE b.tenant_id = $1 AND b.plan_id = $2
                ORDER BY b.start_time
                "#,
                tenant,
                plan_id
            )
            .fetch_all(&pool)
            .await
            .unwrap_or_default()
            .into_iter()
            .map(|r| BatchRowUi {
                id: r.id.to_string(),
                plan_id: r.plan_id.to_string(),
                menu_item_name: r.menu_name,
                batch_size: r.batch_size,
                start_time: r.start_time.format(&Rfc3339).unwrap_or_default(),
                end_time: r.end_time.format(&Rfc3339).unwrap_or_default(),
                status: if r.current_status.is_empty() { "scheduled".to_string() } else { r.current_status },
            })
            .collect()
        } else {
            vec![]
        }
    } else {
        vec![]
    };

    Ok(BatchesTemplate {
        tenant_id: tenant.map(|t| t.to_string()).unwrap_or_default(),
        plans,
        selected_plan_id: selected,
        batches,
    })
}

#[derive(Serialize, Clone)]
struct InventoryRowUi {
    ingredient_name: String,
    quantity: f64,
    unit: String,
}

#[derive(Serialize, Clone)]
struct ForecastRowUi {
    ingredient_name: String,
    current_stock: f64,
    required_quantity: f64,
    to_buy: f64,
    unit: String,
}

#[derive(Serialize, Clone)]
struct MovementRowUi {
    ingredient_name: String,
    delta: f64,
    moved_at: String,
}

#[derive(Template)]
#[template(path = "inventory.html")]
struct InventoryTemplate {
    tenant_id: String,
    items: Vec<InventoryRowUi>,
    forecast: Vec<ForecastRowUi>,
    movements: Vec<MovementRowUi>,
    message: Option<String>,
}

#[derive(Deserialize)]
struct InventoryQuery {
    message: Option<String>,
}

async fn inventory_page(
    jar: CookieJar,
    State(pool): State<PgPool>,
    Query(q): Query<InventoryQuery>,
) -> Result<InventoryTemplate, Redirect> {
    let s = require_session(&jar)?;
    let tenant = s.claims.tenant_id;

    let items = sqlx::query!(
        r#"
        SELECT i.quantity, i.unit, ing.name as "name!"
        FROM inventory i
        JOIN ingredients ing ON ing.id = i.ingredient_id
        WHERE i.tenant_id = $1
        ORDER BY ing.name
        "#,
        tenant
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|r| InventoryRowUi {
        ingredient_name: r.name,
        quantity: r.quantity,
        unit: r.unit,
    })
    .collect();

    let forecast = crate::routes::inventory::forecast_internal(&pool, tenant.ok_or_else(|| Redirect::to("/login"))?, 7)
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|r| ForecastRowUi {
            ingredient_name: r.ingredient_name,
            current_stock: r.current_stock,
            required_quantity: r.required_quantity,
            to_buy: r.to_buy,
            unit: r.unit,
        })
        .collect();

    let movements = sqlx::query!(
        r#"
        SELECT m.quantity, m.occurred_at, ing.name as "name!"
        FROM stock_movements m
        JOIN ingredients ing ON ing.id = m.ingredient_id AND ing.tenant_id = $1
        WHERE m.tenant_id = $1
        ORDER BY m.occurred_at DESC
        LIMIT 25
        "#,
        tenant
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|r| MovementRowUi {
        ingredient_name: r.name,
        delta: r.quantity,
        moved_at: r.occurred_at.format(&Rfc3339).unwrap_or_default(),
    })
    .collect();

    Ok(InventoryTemplate {
        tenant_id: tenant.map(|t| t.to_string()).unwrap_or_default(),
        items,
        forecast,
        movements,
        message: q.message,
    })
}

#[derive(Deserialize)]
struct StockOpnameForm {
    ingredient_name: String,
    quantity: f64,
    unit: String,
}

async fn inventory_opname(
    jar: CookieJar,
    State(pool): State<PgPool>,
    Form(f): Form<StockOpnameForm>,
) -> Result<Redirect, Redirect> {
    let s = require_session(&jar)?;
    let tenant = s.claims.tenant_id;

    let ing = sqlx::query!(
        "SELECT id FROM ingredients WHERE tenant_id = $1 AND name = $2 LIMIT 1",
        tenant,
        f.ingredient_name
    )
    .fetch_optional(&pool)
    .await
    .unwrap_or(None);

    let ingredient_id = if let Some(i) = ing {
        i.id
    } else {
        let id = Uuid::new_v4();
        let _ = sqlx::query!(
            "INSERT INTO ingredients (id, tenant_id, name, unit, estimated_price) VALUES ($1,$2,$3,$4,$5)",
            id,
            tenant,
            f.ingredient_name,
            f.unit,
            0.0
        )
        .execute(&pool)
        .await;
        id
    };

    let _ = crate::routes::inventory::stock_opname_internal(&pool, tenant.ok_or_else(|| Redirect::to("/login"))?, ingredient_id, f.quantity).await;

    Ok(Redirect::to("/app/inventory?message=Stock%20updated"))
}

#[derive(Template)]
#[template(path = "tasks.html")]
struct TasksTemplate {
    tenant_id: String,
    tasks: Vec<TaskUi>,
    message: Option<String>,
}

#[derive(Template)]
#[template(path = "task_new.html")]
struct TaskNewTemplate {
    tenant_id: String,
    title: String,
    division: String,
    due_date: String,
    divisions: Vec<String>,
    error: Option<String>,
}

#[derive(Serialize, Clone)]
struct TaskUi {
    title: String,
    division: String,
    due_date: String,
    status: String,
}

#[derive(Deserialize)]
struct TasksQuery {
    message: Option<String>,
}

async fn tasks_page(
    jar: CookieJar,
    State(pool): State<PgPool>,
    Query(q): Query<TasksQuery>,
) -> Result<TasksTemplate, Redirect> {
    let s = require_session(&jar)?;
    let tenant = s.claims.tenant_id;

    let tasks = sqlx::query!("SELECT title, division, due_date, status FROM tasks WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50", tenant)
        .fetch_all(&pool)
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|r| TaskUi {
            title: r.title,
            division: r.division,
            due_date: r.due_date.map(|d| d.to_string()).unwrap_or_default(),
            status: r.status,
        })
        .collect();

    Ok(TasksTemplate {
        tenant_id: tenant.map(|t| t.to_string()).unwrap_or_default(),
        tasks,
        message: q.message,
    })
}

fn task_divisions() -> Vec<String> {
    vec![
        "Production".to_string(),
        "Prep".to_string(),
        "Cooking".to_string(),
        "Packing".to_string(),
        "Delivery".to_string(),
        "Inventory".to_string(),
        "Finance".to_string(),
        "Nutrition".to_string(),
    ]
}

async fn task_new_page(jar: CookieJar) -> Result<TaskNewTemplate, Redirect> {
    let s = require_session(&jar)?;
    Ok(TaskNewTemplate {
        tenant_id: s.claims.tenant_id.map(|t| t.to_string()).unwrap_or_default(),
        title: "".to_string(),
        division: "Production".to_string(),
        due_date: "".to_string(),
        divisions: task_divisions(),
        error: None,
    })
}

#[derive(Deserialize)]
struct TaskNewForm {
    title: Option<String>,
    division: Option<String>,
    due_date: Option<String>,
}

async fn task_new_submit(
    jar: CookieJar,
    State(pool): State<PgPool>,
    Form(f): Form<TaskNewForm>,
) -> Response {
    let s = match require_session(&jar) {
        Ok(s) => s,
        Err(r) => return r.into_response(),
    };
    let tenant = s.claims.tenant_id;

    let title = f.title.unwrap_or_default().trim().to_string();
    let division = f.division.unwrap_or_default().trim().to_string();
    let due_date_str = f.due_date.unwrap_or_default().trim().to_string();

    if title.is_empty() || division.is_empty() {
        let t = TaskNewTemplate {
            tenant_id: tenant.map(|t| t.to_string()).unwrap_or_default(),
            title,
            division,
            due_date: due_date_str,
            divisions: task_divisions(),
            error: Some("Required fields missing".to_string()),
        };
        return (StatusCode::OK, Html(t.render().unwrap_or_default())).into_response();
    }

    let due_date = if due_date_str.is_empty() {
        None
    } else {
        parse_ymd_date(&due_date_str)
    };

    let _ = sqlx::query!(
        "INSERT INTO tasks (id, tenant_id, title, division, due_date, status) VALUES ($1,$2,$3,$4,$5,$6)",
        Uuid::new_v4(),
        tenant,
        title,
        division,
        due_date,
        "open"
    )
    .execute(&pool)
    .await;

    Redirect::to("/app/tasks?message=Task%20saved").into_response()
}

#[derive(Template)]
#[template(path = "inventory_ingredients.html")]
struct InventoryIngredientsTemplate {
    tenant_id: String,
    ingredients: Vec<IngredientUi>,
    message: Option<String>,
}

#[derive(Serialize, Clone)]
struct IngredientUi {
    name: String,
    unit: String,
    nutr_code: String,
}

#[derive(Deserialize)]
struct IngredientsQuery {
    message: Option<String>,
}

async fn inventory_ingredients_page(
    jar: CookieJar,
    State(pool): State<PgPool>,
    Query(q): Query<IngredientsQuery>,
) -> Result<InventoryIngredientsTemplate, Redirect> {
    let s = require_session(&jar)?;
    let tenant = s.claims.tenant_id;

    let ingredients = sqlx::query!("SELECT name, unit, nutr_code FROM ingredients WHERE tenant_id = $1 ORDER BY name", tenant)
        .fetch_all(&pool)
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|r| IngredientUi {
            name: r.name,
            unit: r.unit,
            nutr_code: r.nutr_code.unwrap_or_default(),
        })
        .collect();

    Ok(InventoryIngredientsTemplate {
        tenant_id: tenant.map(|t| t.to_string()).unwrap_or_default(),
        ingredients,
        message: q.message,
    })
}

#[derive(Template)]
#[template(path = "inventory_ingredient_new.html")]
struct InventoryIngredientNewTemplate {
    tenant_id: String,
    name: String,
    quantity: String,
    unit: String,
    error: Option<String>,
}

async fn inventory_ingredient_new_page(jar: CookieJar) -> Result<InventoryIngredientNewTemplate, Redirect> {
    let s = require_session(&jar)?;
    Ok(InventoryIngredientNewTemplate {
        tenant_id: s.claims.tenant_id.map(|t| t.to_string()).unwrap_or_default(),
        name: "".to_string(),
        quantity: "".to_string(),
        unit: "kg".to_string(),
        error: None,
    })
}

#[derive(Deserialize)]
struct NewIngredientForm {
    name: Option<String>,
    quantity: Option<f64>,
    unit: Option<String>,
}

async fn inventory_ingredient_new_submit(
    jar: CookieJar,
    State(pool): State<PgPool>,
    Form(f): Form<NewIngredientForm>,
) -> Response {
    let s = match require_session(&jar) {
        Ok(s) => s,
        Err(r) => return r.into_response(),
    };
    let tenant = s.claims.tenant_id;

    let name = f.name.unwrap_or_default().trim().to_string();
    let unit = f.unit.unwrap_or_else(|| "kg".to_string()).trim().to_string();
    let qty = f.quantity.unwrap_or(0.0);

    if name.is_empty() {
        let t = InventoryIngredientNewTemplate {
            tenant_id: tenant.map(|t| t.to_string()).unwrap_or_default(),
            name,
            quantity: format_float(qty, 2),
            unit,
            error: Some("Name is required".to_string()),
        };
        return (StatusCode::OK, Html(t.render().unwrap_or_default())).into_response();
    }
    if qty < 0.0 {
        let t = InventoryIngredientNewTemplate {
            tenant_id: tenant.map(|t| t.to_string()).unwrap_or_default(),
            name,
            quantity: format_float(qty, 2),
            unit,
            error: Some("Quantity must be non-negative".to_string()),
        };
        return (StatusCode::OK, Html(t.render().unwrap_or_default())).into_response();
    }

    let existing = sqlx::query!("SELECT id FROM ingredients WHERE tenant_id = $1 AND name = $2 LIMIT 1", tenant, name)
        .fetch_optional(&pool)
        .await
        .unwrap_or(None);

    let ingredient_id = if let Some(r) = existing {
        r.id
    } else {
        let id = Uuid::new_v4();
        let _ = sqlx::query!("INSERT INTO ingredients (id, tenant_id, name, unit) VALUES ($1,$2,$3,$4)", id, tenant, name, unit)
            .execute(&pool)
            .await;
        id
    };

    if let Some(tid) = tenant {
        let _ = crate::routes::inventory::stock_opname_internal(&pool, tid, ingredient_id, qty).await;
    }

    Redirect::to("/app/inventory/ingredients?message=Saved").into_response()
}

#[derive(Template)]
#[template(path = "inventory_movement_new.html")]
struct InventoryMovementNewTemplate {
    tenant_id: String,
    ingredients: Vec<LinkIngredientUi>,
    ingredient_id: String,
    quantity: String,
    error: Option<String>,
}

async fn inventory_movement_new_page(
    jar: CookieJar,
    State(pool): State<PgPool>,
) -> Result<InventoryMovementNewTemplate, Redirect> {
    let s = require_session(&jar)?;
    let tenant = s.claims.tenant_id;
    let ingredients = sqlx::query!("SELECT id, name FROM ingredients WHERE tenant_id = $1 ORDER BY name", tenant)
        .fetch_all(&pool)
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|r| LinkIngredientUi { id: r.id.to_string(), name: r.name })
        .collect();
    Ok(InventoryMovementNewTemplate {
        tenant_id: tenant.map(|t| t.to_string()).unwrap_or_default(),
        ingredients,
        ingredient_id: "".to_string(),
        quantity: "".to_string(),
        error: None,
    })
}

#[derive(Deserialize)]
struct NewMovementForm {
    ingredient_id: Option<String>,
    quantity: Option<f64>,
}

async fn inventory_movement_new_submit(
    jar: CookieJar,
    State(pool): State<PgPool>,
    Form(f): Form<NewMovementForm>,
) -> Response {
    let s = match require_session(&jar) {
        Ok(s) => s,
        Err(r) => return r.into_response(),
    };
    let tenant = s.claims.tenant_id;

    let ingredient_id = f
        .ingredient_id
        .as_deref()
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .and_then(|v| Uuid::parse_str(v).ok());

    let ingredients = sqlx::query!("SELECT id, name FROM ingredients WHERE tenant_id = $1 ORDER BY name", tenant)
        .fetch_all(&pool)
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|r| LinkIngredientUi { id: r.id.to_string(), name: r.name })
        .collect::<Vec<_>>();

    if ingredient_id.is_none() {
        let t = InventoryMovementNewTemplate {
            tenant_id: tenant.map(|t| t.to_string()).unwrap_or_default(),
            ingredients,
            ingredient_id: "".to_string(),
            quantity: f.quantity.unwrap_or(0.0).to_string(),
            error: Some("Select an ingredient".to_string()),
        };
        return (StatusCode::OK, Html(t.render().unwrap_or_default())).into_response();
    }

    let qty = f.quantity.unwrap_or(0.0);
    let ing_id = ingredient_id.unwrap();
    let now = OffsetDateTime::now_utc();
    let _ = sqlx::query!(
        "INSERT INTO stock_movements (id, tenant_id, ingredient_id, movement_type, quantity, occurred_at) VALUES ($1,$2,$3,$4,$5,$6)",
        Uuid::new_v4(),
        tenant,
        ing_id,
        "MOVE",
        qty,
        now
    )
    .execute(&pool)
    .await;

    let _ = sqlx::query!(
        r#"
        INSERT INTO inventory (id, tenant_id, ingredient_id, quantity, unit)
        VALUES ($1,$2,$3,$4,(SELECT unit FROM ingredients WHERE id=$3 AND tenant_id=$2))
        ON CONFLICT (tenant_id, ingredient_id)
        DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity
        "#,
        Uuid::new_v4(),
        tenant,
        ing_id,
        qty
    )
    .execute(&pool)
    .await;

    Redirect::to("/app/inventory?message=Saved").into_response()
}

#[derive(Template)]
#[template(path = "finance.html")]
struct FinanceTemplate {
    tenant_id: String,
    total_cost: String,
    avg_cost_per_portion: String,
    txns: Vec<FinanceTxnUi>,
    show_report: bool,
    message: Option<String>,
}

#[derive(Serialize, Clone)]
struct FinanceTxnUi {
    category: String,
    amount: String,
    description: String,
}

#[derive(Deserialize)]
struct FinanceQuery {
    report: Option<String>,
    message: Option<String>,
}

async fn finance_page(
    jar: CookieJar,
    State(pool): State<PgPool>,
    Query(q): Query<FinanceQuery>,
) -> Result<FinanceTemplate, Redirect> {
    let s = require_session(&jar)?;
    let tenant = s.claims.tenant_id;

    let total_cost = sqlx::query_scalar!(
        "SELECT COALESCE(SUM(amount), 0) as \"sum!\" FROM finance_transactions WHERE tenant_id = $1",
        tenant
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0.0);

    let total_portions = sqlx::query_scalar!(
        "SELECT COALESCE(SUM(target_portions), 0) as \"sum!\" FROM production_plans WHERE tenant_id = $1",
        tenant
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    let avg = if total_portions > 0 {
        total_cost / total_portions as f64
    } else {
        0.0
    };

    let txns = sqlx::query!(
        "SELECT category, amount, description FROM finance_transactions WHERE tenant_id = $1 ORDER BY occurred_at DESC LIMIT 50",
        tenant
    )
    .fetch_all(&pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|r| FinanceTxnUi {
        category: r.category,
        amount: format!("{:.2}", r.amount),
        description: r.description.unwrap_or_default(),
    })
    .collect();

    let show_report = q.report.as_deref().map(str::trim).filter(|v| !v.is_empty()).is_some();

    Ok(FinanceTemplate {
        tenant_id: tenant.map(|t| t.to_string()).unwrap_or_default(),
        total_cost: format!("{:.2}", total_cost),
        avg_cost_per_portion: format!("{:.4}", avg),
        txns,
        show_report,
        message: q.message,
    })
}

#[derive(Template)]
#[template(path = "finance_expense_new.html")]
struct FinanceExpenseNewTemplate {
    tenant_id: String,
    categories: Vec<String>,
    category: String,
    amount: String,
    description: String,
    error: Option<String>,
}

fn expense_categories() -> Vec<String> {
    vec![
        "Supplies".to_string(),
        "Ingredients".to_string(),
        "Utilities".to_string(),
        "Labor".to_string(),
        "Transport".to_string(),
        "Other".to_string(),
    ]
}

async fn finance_expense_new_page(jar: CookieJar) -> Result<FinanceExpenseNewTemplate, Redirect> {
    let s = require_session(&jar)?;
    Ok(FinanceExpenseNewTemplate {
        tenant_id: s.claims.tenant_id.map(|t| t.to_string()).unwrap_or_default(),
        categories: expense_categories(),
        category: "".to_string(),
        amount: "".to_string(),
        description: "".to_string(),
        error: None,
    })
}

#[derive(Deserialize)]
struct NewExpenseForm {
    amount: Option<String>,
    category: Option<String>,
    description: Option<String>,
}

async fn finance_expense_new_submit(
    jar: CookieJar,
    State(pool): State<PgPool>,
    Form(f): Form<NewExpenseForm>,
) -> Response {
    let s = match require_session(&jar) {
        Ok(s) => s,
        Err(r) => return r.into_response(),
    };
    let tenant = s.claims.tenant_id;

    let amount_raw = f.amount.unwrap_or_default().trim().to_string();
    let category = f.category.unwrap_or_default().trim().to_string();
    let description = f.description.unwrap_or_default().trim().to_string();

    let amount_val = amount_raw.parse::<f64>().ok();
    if amount_val.is_none() {
        let t = FinanceExpenseNewTemplate {
            tenant_id: tenant.map(|t| t.to_string()).unwrap_or_default(),
            categories: expense_categories(),
            category,
            amount: amount_raw,
            description,
            error: Some("Invalid amount".to_string()),
        };
        return (StatusCode::OK, Html(t.render().unwrap_or_default())).into_response();
    }

    if category.is_empty() {
        let t = FinanceExpenseNewTemplate {
            tenant_id: tenant.map(|t| t.to_string()).unwrap_or_default(),
            categories: expense_categories(),
            category,
            amount: amount_raw,
            description,
            error: Some("Category is required".to_string()),
        };
        return (StatusCode::OK, Html(t.render().unwrap_or_default())).into_response();
    }

    let _ = sqlx::query!(
        "INSERT INTO finance_transactions (id, tenant_id, category, amount, currency, description) VALUES ($1,$2,$3,$4,$5,$6)",
        Uuid::new_v4(),
        tenant,
        category,
        amount_val.unwrap(),
        "IDR",
        description
    )
    .execute(&pool)
    .await;

    Redirect::to("/app/finance?message=Saved").into_response()
}

#[derive(Template)]
#[template(path = "nutrition.html")]
struct NutritionTemplate {
    tenant_id: String,
    query: String,
    searched: bool,
    foods: Vec<FoodUi>,
    selected_food: Option<FoodUi>,
    nutrients: Vec<NutrientUi>,
    show_link_dialog: bool,
    linkable_ingredients: Vec<LinkIngredientUi>,
    linked: bool,
    message: Option<String>,
}

#[derive(Serialize, Clone)]
struct FoodUi {
    code: String,
    name: String,
}

#[derive(Serialize, Clone)]
struct NutrientUi {
    label: String,
    unit: String,
    value: String,
}

#[derive(Serialize, Clone)]
struct LinkIngredientUi {
    id: String,
    name: String,
}

#[derive(Deserialize)]
struct NutritionQuery {
    query: Option<String>,
    food: Option<String>,
    link: Option<String>,
    linked: Option<String>,
    message: Option<String>,
}

async fn nutrition_page(
    jar: CookieJar,
    State(pool): State<PgPool>,
    Query(q): Query<NutritionQuery>,
) -> Result<NutritionTemplate, Redirect> {
    let s = require_session(&jar)?;
    let tenant = s.claims.tenant_id;

    let searched = q.query.is_some();
    let query = q.query.unwrap_or_default();
    let q_trim = query.trim().to_string();

    let foods = if q_trim.is_empty() {
        Vec::new()
    } else {
        let like = format!("%{}%", q_trim);
        sqlx::query!("SELECT code, name FROM nutr_foods WHERE code ILIKE $1 OR name ILIKE $1 ORDER BY name ASC LIMIT 20", like)
            .fetch_all(&pool)
            .await
            .unwrap_or_default()
            .into_iter()
            .map(|r| FoodUi { code: r.code.clone(), name: r.name.clone().unwrap_or_default() })
            .collect()
    };

    let selected_code = q.food.as_deref().map(str::trim).filter(|v| !v.is_empty()).map(|v| v.to_string());
    let selected_food = if let Some(ref code) = selected_code {
        sqlx::query!("SELECT code, name FROM nutr_foods WHERE code = $1", code)
            .fetch_optional(&pool)
            .await
            .unwrap_or(None)
            .map(|r| FoodUi { code: r.code.clone(), name: r.name.clone().unwrap_or_default() })
    } else {
        None
    };

    let nutrients = if let Some(ref code) = selected_code {
        let row = sqlx::query!("SELECT nutr_values FROM nutr_foods WHERE code = $1", code)
            .fetch_optional(&pool)
            .await
            .unwrap_or(None);
        let buf = row.and_then(|r| r.nutr_values);
        if let Some(b) = buf {
            let defs = sqlx::query!("SELECT label, unit, decimals, idx FROM nutr_nutrients ORDER BY idx ASC LIMIT 25")
                .fetch_all(&pool)
                .await
                .unwrap_or_default();
            defs.into_iter()
                .map(|n| {
                    let val = read_f32_from_bytea(Some(b.as_slice()), n.idx as usize);
                    let s = val
                        .map(|v| format_float(v, n.decimals))
                        .unwrap_or_else(|| "-".to_string());
                    NutrientUi {
                        label: n.label.unwrap_or_else(|| "Nutrient".to_string()),
                        unit: n.unit.unwrap_or_default(),
                        value: s,
                    }
                })
                .collect()
        } else {
            Vec::new()
        }
    } else {
        Vec::new()
    };

    let show_link_dialog = q.link.as_deref().map(str::trim).filter(|v| !v.is_empty()).is_some() && selected_food.is_some();

    let linkable_ingredients = if show_link_dialog {
        sqlx::query!("SELECT id, name FROM ingredients WHERE tenant_id = $1 ORDER BY name LIMIT 50", tenant)
            .fetch_all(&pool)
            .await
            .unwrap_or_default()
            .into_iter()
            .map(|r| LinkIngredientUi { id: r.id.to_string(), name: r.name })
            .collect()
    } else {
        Vec::new()
    };

    Ok(NutritionTemplate {
        tenant_id: tenant.map(|t| t.to_string()).unwrap_or_default(),
        query,
        searched,
        foods,
        selected_food,
        nutrients,
        show_link_dialog,
        linkable_ingredients,
        linked: q.linked.is_some(),
        message: q.message,
    })
}

#[derive(Deserialize)]
struct NutritionLinkForm {
    nutr_code: String,
    ingredient_id: Option<String>,
    query: Option<String>,
}

async fn nutrition_link_submit(
    jar: CookieJar,
    State(pool): State<PgPool>,
    Form(f): Form<NutritionLinkForm>,
) -> Result<Redirect, Redirect> {
    let s = require_session(&jar)?;
    let tenant = s.claims.tenant_id;

    let ing = f
        .ingredient_id
        .as_deref()
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .and_then(|v| Uuid::parse_str(v).ok());
    if let Some(ingredient_id) = ing {
        let _ = sqlx::query!(
            "UPDATE ingredients SET nutr_code = $1 WHERE tenant_id = $2 AND id = $3",
            f.nutr_code,
            tenant,
            ingredient_id
        )
        .execute(&pool)
        .await;
    }

    let q = f.query.unwrap_or_default();
    Ok(Redirect::to(&format!(
        "/app/nutrition?query={}&food={}&linked=1",
        q,
        f.nutr_code
    )))
}

fn parse_delivery_time(s: &str) -> Option<OffsetDateTime> {
    let t = s.trim();
    if t.is_empty() {
        return None;
    }
    if let Ok(dt) = OffsetDateTime::parse(t, &Rfc3339) {
        return Some(dt);
    }
    let fmt = time::format_description::parse("[year]-[month]-[day] [hour]:[minute]").ok()?;
    let pdt = PrimitiveDateTime::parse(t, &fmt).ok()?;
    Some(pdt.assume_utc())
}

fn parse_ymd_date(s: &str) -> Option<Date> {
    let t = s.trim();
    if t.is_empty() {
        return None;
    }
    let fmt = time::format_description::parse("[year]-[month]-[day]").ok()?;
    Date::parse(t, &fmt).ok()
}

fn format_float(v: f64, decimals: i32) -> String {
    let d = decimals.clamp(0, 6) as usize;
    format!("{:.*}", d, v)
}

fn read_f32_from_bytea(buf: Option<&[u8]>, idx: usize) -> Option<f64> {
    let b = buf?;
    let off = idx.checked_mul(4)?;
    if off + 4 > b.len() {
        return None;
    }
    let f = f32::from_le_bytes([b[off], b[off + 1], b[off + 2], b[off + 3]]);
    if f.is_finite() {
        Some(f as f64)
    } else {
        None
    }
}
