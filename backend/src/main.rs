use axum::{
    body::Body,
    http::{header::{self, HeaderName, HeaderValue}, Method},
    middleware::{self, Next},
    response::Response,
    http::Request,
    routing::get,
    Router,
};
use dotenvy::dotenv;
use std::net::SocketAddr;
use std::path::PathBuf;
use tower_http::{
    cors::{AllowOrigin, CorsLayer},
    services::ServeDir,
    set_header::SetResponseHeaderLayer,
};

mod state;
mod routes;
mod pages;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();
    
    let pool = state::make_db_pool().await?;
    // sqlx::migrate!("./migrations").run(&pool).await?;

    let app_state = state::AppState::new(pool);

    let root_auth = routes::auth::router().with_state(app_state.clone());

    let api = Router::new()
        // Supplier portal auth (signup/login) — di-merge awal agar tidak tertutup route lain
        .merge(Router::new().nest("/supplier-portal", routes::supplier_portal::router()))
        .merge(routes::tenant::router())
        .merge(routes::user::router())
        .merge(Router::new().nest("/admin", routes::admin::router()))
        .merge(routes::kitchen::router())
        .merge(routes::menu::router())
        .merge(routes::pricing::router())
        .merge(routes::plan::router())
        .merge(routes::batch::router())
        .merge(routes::inventory::router())
        .merge(routes::finance::router())
        .merge(routes::report::router())
        .merge(routes::nutri::router())
        .merge(Router::new().nest("/tools", routes::tools::router()))
        .merge(Router::new().nest("/staff", routes::staff::router()))
        .merge(Router::new().nest("/shifts", routes::shifts::router()))
        .merge(Router::new().nest("/attendance", routes::attendance::router()))
        .merge(Router::new().nest("/payroll", routes::payroll::router()))
        .merge(Router::new().nest("/waves", routes::waves::router()))
        .merge(Router::new().nest("/drafts", routes::drafts::router()))
        .merge(Router::new().nest("/procurement", routes::procurement::router()))
        .merge(Router::new().nest("/suppliers", routes::supplier::router()))
        .merge(Router::new().nest("/tasks", routes::tasks::router()))
        .merge(routes::dashboard::router())
        .merge(routes::subscription::router())
        .with_state(app_state.clone());

    // Path relatif ke crate backend → folder `frontend` & `web/assets` di root repo (bukan tergantung CWD proses)
    let frontend_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("frontend");
    let assets_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("web")
        .join("assets");
    let legacy_static = ServeDir::new(frontend_dir);
    let assets = ServeDir::new(assets_dir);
    
    // Security Headers Middleware
    let security_headers = tower::ServiceBuilder::new()
        .layer(SetResponseHeaderLayer::overriding(
            header::X_FRAME_OPTIONS,
            HeaderValue::from_static("DENY"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::X_XSS_PROTECTION,
            HeaderValue::from_static("1; mode=block"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::STRICT_TRANSPORT_SECURITY,
            HeaderValue::from_static("max-age=31536000; includeSubDomains"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            HeaderName::from_static("permissions-policy"),
            HeaderValue::from_static("camera=(), microphone=(), geolocation=(), payment=()"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::REFERRER_POLICY,
            HeaderValue::from_static("strict-origin-when-cross-origin"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            HeaderName::from_static("x-dns-prefetch-control"),
            HeaderValue::from_static("off"),
        ));

    let cors_any = std::env::var("CORS_ANY")
        .ok()
        .map(|v| v.trim().eq_ignore_ascii_case("true"))
        .unwrap_or(false);

    let allow_origin = if cors_any {
        AllowOrigin::any()
    } else if let Ok(v) = std::env::var("CORS_ORIGINS") {
        let list = v
            .split(',')
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .filter_map(|s| HeaderValue::from_str(s).ok())
            .collect::<Vec<_>>();
        if list.is_empty() {
            AllowOrigin::predicate(|_, _| false)
        } else {
            AllowOrigin::list(list)
        }
    } else {
        AllowOrigin::predicate(|_, _| false)
    };

    let app = Router::new()
        .route("/health", get(|| async { "OK" }))
        .merge(root_auth)
        .nest("/api", api)
        .merge(pages::router())
        .with_state(app_state)
        .nest_service("/assets", assets)
        .nest_service("/legacy", legacy_static)
        .layer(middleware::from_fn(host_routing))
        .layer(
            CorsLayer::new()
                .allow_methods([
                    Method::GET,
                    Method::POST,
                    Method::PUT,
                    Method::DELETE,
                    Method::OPTIONS,
                ])
                .allow_origin(allow_origin)
                .allow_headers([header::AUTHORIZATION, HeaderName::from_static("x-tenant-id"), header::CONTENT_TYPE]),
        )
        .layer(middleware::from_fn(block_source_maps))
        .layer(middleware::from_fn(set_csp))
        .layer(security_headers);

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    println!("Server running on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

async fn block_source_maps(req: Request<Body>, next: Next) -> Response {
    if req.uri().path().ends_with(".map") {
        return Response::builder()
            .status(axum::http::StatusCode::NOT_FOUND)
            .body(Body::empty())
            .unwrap();
    }
    next.run(req).await
}

async fn set_csp(req: Request<Body>, next: Next) -> Response {
    let path = req.uri().path().to_string();
    let mut res = next.run(req).await;
    let v = if path.starts_with("/legacy")
        || path.starts_with("/supplier")
        || path.starts_with("/dev")
        || path.starts_with("/dev_portal")
    {
        "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: blob:; connect-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:; object-src 'none'"
    } else {
        "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; connect-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self'; font-src 'self'; object-src 'none'"
    };
    res.headers_mut().insert(
        HeaderName::from_static("content-security-policy"),
        HeaderValue::from_static(v),
    );
    res
}

async fn host_routing(mut req: Request<Body>, next: Next) -> Response {
    let host = req
        .headers()
        .get(header::HOST)
        .and_then(|h| h.to_str().ok())
        .unwrap_or("");
    let path = req.uri().path();

    if host.starts_with("dev.") && path == "/" {
        let mut parts = req.uri().clone().into_parts();
        parts.path_and_query = Some("/dev_portal".parse().unwrap());
        *req.uri_mut() = axum::http::Uri::from_parts(parts).unwrap();
    }

    next.run(req).await
}
