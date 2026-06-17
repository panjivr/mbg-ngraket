# Ringkasan Teknis Project (Catatan Arsitektur)

Dokumen ini merangkum struktur frontend, backend, fullstack, dan endpoint API dari project ini agar mudah diingat saat pengerjaan berikutnya.

## 1) Gambaran Besar

Project ini pada praktiknya punya 2 jalur “fullstack”:

1. **Jalur utama (Rust/Axum + Postgres)**  
   Backend Rust (Axum) melayani API di prefix `/api` sekaligus melayani file static UI dari folder `frontend/`.

2. **Jalur legacy/dev (Node/Express + SQLite)**  
   `frontend/server.js` adalah server Express yang melayani UI dan banyak endpoint API berbasis SQLite. Dokumentasi `API_DOCUMENTATION.md` banyak merujuk jalur ini.

Selain itu ada **Tauri** (`src-tauri/`) untuk packaging desktop dan crate **scheduler** untuk algoritma penjadwalan.

## 2) Struktur Folder Penting

- Backend Rust: [backend](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend)
  - Entry point: [main.rs](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/main.rs)
  - Router helpers (auth/tenant): [routes/mod.rs](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/routes/mod.rs)
  - Modul routes: [routes](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/routes)
  - Migrasi DB: [backend/migrations](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/migrations)
- Frontend static UI: [frontend](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/frontend)
  - UI entry: [index.html](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/frontend/index.html), [app.html](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/frontend/app.html)
  - JS client: [frontend/js](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/frontend/js)
  - Server legacy (Express): [server.js](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/frontend/server.js)
  - DB legacy: [database.sqlite](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/frontend/database.sqlite)
- Scheduler (crate): [scheduler](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/scheduler)
- Shared crate: [shared](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/shared)
- Desktop (Tauri): [src-tauri](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/src-tauri)

## 3) Frontend (UI)

Frontend berupa **static web** (HTML/CSS/Vanilla JS).

- UI memanggil API via helper `api()` di [core.js](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/frontend/js/core.js#L52-L86).
- Frontend menyimpan state session di `localStorage`:
  - `app_token` (JWT/Bearer token)
  - `app_tenant_id` (dipakai sebagai header `x-tenant-id`)
  - `app_role`, `app_email`, `app_name`  
  Implementasi awal: [core.js](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/frontend/js/core.js#L1-L9).
- Base URL API dapat diarahkan ke server lain via `app_server_url` (settings). Jika kosong, request memakai path apa adanya.

## 4) Backend Rust (Axum) — Jalur Utama

### Entrypoint & Hosting

- Server menjalankan migrasi SQLx, memasang router API di `/api`, serta melayani static folder `frontend/`: [main.rs](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/main.rs#L17-L73).
- Ada endpoint healthcheck sederhana: `GET /health`: [main.rs](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/main.rs#L63-L66).

### Database

- Database utama: **Postgres** (SQLx) dengan migrasi di [backend/migrations](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/migrations).

### Auth, Role, dan Tenant

- Login: `POST /api/auth/login` via [auth.rs](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/routes/auth.rs#L45-L131).
- Token: JWT disign dengan `JWT_SECRET`; verifikasi token via [verify_token](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/routes/auth.rs#L141-L150).
- Header yang dipakai secara luas:
  - `Authorization: Bearer <token>` (JWT) diverifikasi oleh helper [require_auth](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/routes/mod.rs#L36-L48).
  - `x-tenant-id: <uuid>` diparse oleh [TenantId::parse_from_headers](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/routes/mod.rs#L22-L29).
- Guard “coordinator/admin/owner” tersedia via [require_coordinator](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/routes/mod.rs#L50-L67).

### Peta Endpoint API (Rust)

Catatan: router API Rust digabung (merge) di [main.rs](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/main.rs#L26-L40). Karena tiap modul bisa memiliki detail tambahan, “sumber kebenaran” paling akurat tetap file router di tiap modul.

- Auth: [auth.rs](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/routes/auth.rs)
  - `POST /api/auth/login`
- Tenants: [tenant.rs](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/routes/tenant.rs)
  - `/api/tenants` dan `/api/tenants/:id`
- Users: [user.rs](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/routes/user.rs)
  - `/api/users`
- Kitchen: [kitchen.rs](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/routes/kitchen.rs)
  - `/api/kitchen/config`, `/api/kitchen/equipment`, dll
- Menu/Foods/Ingredients: [menu.rs](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/routes/menu.rs)
  - `/api/ingredients`, `/api/menu`, `/api/foods`, dll
- Pricing: [pricing.rs](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/routes/pricing.rs)
  - `/api/pricing/*`
- Planning: [plan.rs](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/routes/plan.rs)
  - `/api/plans/generate`
- Batches/Checklist: [batch.rs](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/routes/batch.rs)
  - `/api/batches/*`
- Inventory: [inventory.rs](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/routes/inventory.rs)
  - `/api/inventory/*`
- Finance: [finance.rs](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/routes/finance.rs)
  - `/api/finance/*`
- Reports: [report.rs](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/routes/report.rs)
  - `/api/reports/*`
- NutriSurvey integration: [nutri.rs](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/routes/nutri.rs)
  - `/api/nutri/*`
- Tools (nested): [tools.rs](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/routes/tools.rs)
  - `/api/tools/*` (router dinest di [main.rs](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/main.rs#L39-L40))

## 5) Backend Node (Express) — Jalur Legacy/Dev

- Entrypoint: [frontend/server.js](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/frontend/server.js)
- DB: SQLite file [frontend/database.sqlite](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/frontend/database.sqlite) dibuka langsung oleh server.
- Dependencies untuk jalur ini ada di [frontend/package.json](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/frontend/package.json) (express, cors, sqlite3, pdfkit, exceljs, multer).
- API documentation yang ada saat ini banyak merujuk ke endpoint di `server.js`: [API_DOCUMENTATION.md](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/API_DOCUMENTATION.md#L28-L30).

## 6) Konfigurasi (ENV) & Catatan Keamanan

- Ada file [.env](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/.env) untuk backend Rust yang berisi `DATABASE_URL`, `JWT_SECRET`, `PORT`, `RUST_LOG`.
- Hindari menyalin nilai secret ke dokumen/chat. Gunakan hanya nama variabelnya saat berdiskusi.

## 7) “Mulai Dari Sini” Saat Debug/Develop

- Wiring server + mount routes + static frontend: [main.rs](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/main.rs)
- Auth header + tenant scoping: [routes/mod.rs](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/routes/mod.rs)
- Login/JWT: [auth.rs](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/backend/src/routes/auth.rs)
- Client-side API wrapper & session storage: [core.js](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/frontend/js/core.js)
- Legacy server (kalau masih dipakai): [server.js](file:///c:/AJI%20DATA/Bismillah%20Software%20MBG/frontend/server.js)

