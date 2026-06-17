# Dokumentasi Teknis (Build & Deploy)

## 1) Komponen Utama

- **API + Web (Rust/Axum)**: [backend](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/backend)
  - API JSON: `GET/POST/PUT /api/*`
  - Website SSR: `/`, `/login`, `/app/*`
- **Scheduler engine (Rust)**: [scheduler](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/scheduler)
- **Shared model (Rust)**: [shared](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/shared)
- **Assets UI baru**: [web/assets](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/web/assets)
- **UI legacy (referensi)**: disajikan di `/legacy` dari folder [frontend](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/frontend)

## 2) Dependensi

### Backend (Rust)
- axum, tokio, tower-http, sqlx (postgres)
- askama + askama_axum (SSR templates)
- axum-extra (cookie)

Lihat: [backend/Cargo.toml](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/backend/Cargo.toml)

### Database
- Postgres (wajib), schema via SQLx migrations: [backend/migrations](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/backend/migrations)

## 3) Konfigurasi ENV

Gunakan variabel:
- `DATABASE_URL` (Postgres connection string)
- `JWT_SECRET` (secret untuk sign JWT)
- `PORT` (default 8080)
- `CORS_ANY` (opsional, `true` untuk allow any origin; default lebih ketat)
- `CORS_ORIGINS` (opsional, comma-separated origin yang diizinkan)

Contoh file ada di: [.env](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/.env)

## 4) Build & Run (Local)

Prerequisite:
- Install Rust toolchain (cargo)
- Windows: Install **Build Tools for Visual Studio** (komponen C++/MSVC) agar `link.exe` tersedia untuk compile crate Rust.
- Install & run Postgres
 
Alternatif (Windows GNU toolchain):
- Install MinGW-w64 (gcc)
- Set `MBG_RUST_TARGET=x86_64-pc-windows-gnu`

Langkah:
1. Set `DATABASE_URL` dan `JWT_SECRET`
2. (Opsional) Seed demo data (tenant + user demo):
   - `cargo run -p backend --bin seed_demo`
   - Default user: `owner@demo.local` / `Owner12345!`
   - One-click (env + seed + run): jalankan [run_demo_local.bat](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/run_demo_local.bat)
3. Jalankan migrasi otomatis saat server start
4. Jalankan backend:
   - Workspace root: `cargo run -p backend`

Endpoint:
- Website: `http://localhost:8080/`
- Healthcheck: `http://localhost:8080/health`
- API: `http://localhost:8080/api/*`
- UI legacy: `http://localhost:8080/legacy/`
- SSR App:
  - `http://localhost:8080/app` (Dashboard)
  - `http://localhost:8080/app/plans` (Production)
  - `http://localhost:8080/app/tasks` (Tasks)
  - `http://localhost:8080/app/inventory` (Inventory + Movements)
  - `http://localhost:8080/app/finance` (Finance)
  - `http://localhost:8080/app/nutrition` (Nutrition)

## 5) Deploy (Ringkas)

Opsi umum:
- Build binary: `cargo build -p backend --release`
- Jalankan di VM/container:
  - Set ENV (`DATABASE_URL`, `JWT_SECRET`, `PORT`, `CORS_ORIGINS`)
  - Reverse-proxy (Nginx/Caddy) untuk TLS termination

Catatan:
- HSTS aktif: pastikan hanya diaktifkan di environment HTTPS.
