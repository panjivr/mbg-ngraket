# Analisis Mendalam Codebase (Baseline)

Dokumen ini merangkum business logic, workflow, struktur data, serta komponen yang dapat diregunakan dan area yang perlu dibersihkan untuk migrasi ke website modern.

## 1) Ringkasan Arsitektur Saat Ini

Codebase ini memiliki dua jalur aplikasi yang berjalan paralel:

1. **Jalur utama: Rust (Axum) + Postgres**  
   Backend Rust melayani API pada prefix `/api` dan juga men-serve UI statik dari folder `frontend/`.  
   Referensi: [main.rs](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/backend/src/main.rs), [PROJECT_TECH_OVERVIEW.md](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/PROJECT_TECH_OVERVIEW.md)

2. **Jalur legacy/dev: Node (Express) + SQLite**  
   `frontend/server.js` melayani UI statik + banyak endpoint API berbasis SQLite. Dokumentasi API yang ada saat ini masih banyak merujuk jalur ini.  
   Referensi: [server.js](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/frontend/server.js), [API_DOCUMENTATION.md](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/API_DOCUMENTATION.md)

Tambahan komponen:
- **Scheduler engine**: crate Rust `scheduler` + model bersama `shared`.  
  Referensi: [scheduler/lib.rs](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/scheduler/src/lib.rs), [shared/lib.rs](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/shared/src/lib.rs)
- **Desktop wrapper**: Tauri (`src-tauri/`).  
  Referensi: [src-tauri/main.rs](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/src-tauri/src/main.rs)
- **NutriSurvey data & binary**: folder `Nutr/` berisi data dan executable.

Konsekuensi arsitektur paralel:
- UI statik saat ini memanggil endpoint yang merupakan campuran antara API Rust dan API Node, sehingga ada potensi “fitur jalan di satu mode, rusak di mode lain”.
- Ada dua sumber kebenaran schema data (Postgres migrations vs SQLite schema in-code), membuat migrasi/maintenance rentan inkonsisten.

## 2) Business Logic & Workflow Utama

### 2.1 Auth, Role, dan Tenant Scoping

**Frontend**
- Session disimpan di `localStorage`: `app_token`, `app_tenant_id`, `app_role`, `app_email`, `app_name`.
- Wrapper request: `api(path, method, body)` menambahkan header `Authorization: Bearer …` dan `x-tenant-id`.  
  Referensi: [core.js](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/frontend/js/core.js#L1-L267)

**Backend Rust (jalur utama)**
- Login JWT: `POST /api/auth/login`.  
  Referensi: [auth.rs](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/backend/src/routes/auth.rs)
- Guard tenant: `x-tenant-id` wajib untuk sebagian besar request.  
  Referensi: [routes/mod.rs](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/backend/src/routes/mod.rs#L26-L41)
- Guard role coordinator/admin/owner tersedia.  
  Referensi: [require_coordinator](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/backend/src/routes/mod.rs#L57-L74)

**Backend Node (legacy)**
- Auth & hashing password (scrypt) dan security headers sudah ada.  
  Referensi: [server.js](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/frontend/server.js#L16-L120)

Catatan risiko:
- Mekanisme auth di Rust (argon2 + JWT) berbeda dari Node (scrypt + token/jwt versi lain). Ini harus disatukan saat migrasi agar tidak ada kehilangan fungsionalitas inti.

### 2.2 Master Data: Ingredients, Foods, Menu, Recipes

**Postgres (Rust)**
- Endpoint utama:
  - `GET/POST /api/ingredients`
  - `GET/POST /api/menu`, `PUT/DELETE /api/menu/:id`
  - `GET/POST /api/foods`
  Referensi: [menu.rs](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/backend/src/routes/menu.rs#L90-L99)

**Struktur data kunci (Postgres)**
- `ingredients`, `recipes`, `recipe_ingredients`, `menu_items` menjadi fondasi perhitungan inventory dan scheduling.  
  Referensi: [01_init.sql](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/backend/migrations/01_init.sql)

### 2.3 Production Planning (Scheduling) → Plans → Batches → Checklist

**Plan generation (Rust)**
- Endpoint: `POST /api/plans/generate`.
- Alur:
  1) Ambil resource (equipment) READY dari `kitchen_resources` (di-aggregate per `resource_type`).  
  2) Ambil recipe steps (`recipe_steps`) dan requirement per step (`recipe_step_requirements`).  
  3) Panggil `scheduler.make_plan` untuk menghasilkan batch window `start/end`.  
  4) Simpan ke `production_plans`, `production_batches`, dan buat checklist awal di `batch_checklist`.  
  Referensi: [plan.rs](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/backend/src/routes/plan.rs#L33-L234)

Catatan gap penting (mempengaruhi “fungsionalitas inti”):
- `division_id` batch saat ini diisi placeholder (ambil divisi pertama atau UUID baru) dan tidak diturunkan dari `division_type` step; berisiko data batch tidak konsisten.
- Checklist yang dibuat masih generik (“Execute Production Batch”), belum mem-breakdown per step/timewindow.

**Batch checklist (Rust)**
- `GET /api/batches/:id/checklist` untuk load checklist.
- `POST /api/batches/:id/checklist/complete` menandai item done; jika semua selesai, batch di-set `current_status='completed'`.  
  Referensi: [batch.rs](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/backend/src/routes/batch.rs#L37-L179)

Catatan gap:
- Inventory deduction masih TODO ketika batch selesai.

**Scheduler algorithm (Rust crate)**
- Model input: `PlanRequest { target_portions, menu_items(steps), resources, start_time, target_delivery_time }`.
- Heuristik saat ini:
  - Batch size hardcoded 50.
  - Round-robin menu item per batch.
  - Discrete-event scheduling dengan resource pool per `resource_type`.
  Referensi: [scheduler/lib.rs](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/scheduler/src/lib.rs#L31-L312)

### 2.4 Inventory & Forecast

**Inventory list & stock opname (Rust)**
- `GET /api/inventory/items`
- `POST /api/inventory/stock_opname` mencatat `stock_movements` dan upsert `inventory`.  
  Referensi: [inventory.rs](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/backend/src/routes/inventory.rs#L40-L109)

**Forecast (Rust)**
- `GET /api/inventory/forecast?days=N` menghitung kebutuhan ingredient berdasarkan batch yang terjadwal dan `recipe_ingredients`, lalu membandingkan stok untuk menghasilkan `to_buy`.  
  Referensi: [inventory.rs](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/backend/src/routes/inventory.rs#L111-L210)

### 2.5 Finance

**Rust**
- `GET /api/finance/transactions`, `GET /api/finance/summary` (agregasi sederhana).  
  Referensi: [finance.rs](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/backend/src/routes/finance.rs#L23-L74)

Catatan gap:
- UI lama memanggil endpoint untuk input expense/purchases yang belum terlihat tersedia di Rust (perlu dipastikan/migrasikan).

### 2.6 Nutrition (NutriSurvey Integration)

**Rust**
- Endpoint nutrisi mencakup status, nutrients, foods search, target sets, kalkulasi menu, linking ingredient, dan history.  
  Referensi: [nutri.rs](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/backend/src/routes/nutri.rs)

## 3) Struktur Data (Sumber Kebenaran)

### 3.1 Postgres (disarankan jadi sumber kebenaran)
- Migrations tersusun dan mencakup tenant/user, subscription, roles/audit, recipe steps, nutrisurvey, master data, kitchen resources, dll.  
  Referensi: [backend/migrations](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/backend/migrations)

### 3.2 SQLite (legacy/dev)
- Schema dibangun dari `CREATE TABLE IF NOT EXISTS ...` di runtime `frontend/server.js` dan ditambal lewat banyak skrip migrasi/repair (`fix_schema.js`, `migrate_*.js`, dll).  
  Referensi: [server.js](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/frontend/server.js), folder [frontend](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/frontend)

## 4) Komponen yang Reusable (Layak Dipertahankan)

### 4.1 Rust backend (Axum) + Postgres migrations
- Pola tenant scoping dan guard auth sudah jelas dan cocok untuk skala multi-tenant.
- Migrations sudah memuat domain model yang cukup lengkap.

### 4.2 Scheduler + Shared model (perlu hardening)
- Konsep resource-based scheduling dan model `BatchPlanItem` sudah cukup untuk basis engine.  
  Perlu perbaikan robustness (misalnya menghindari placeholder division, membangun checklist per step, menghitung utilization/bottleneck, dan menambah test).

### 4.3 UX guideline dan CSS utility
- Ada design system yang bisa jadi acuan visual saat membangun UI modern.  
  Referensi: [UX_DESIGN.md](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/UX_DESIGN.md)

## 5) Kandidat Kode Tidak Terpakai / Usang / Duplikat

Prioritas tinggi untuk mengurangi beban aplikasi dan risiko:

1. **Dual backend**: `frontend/server.js` (Node+SQLite) duplikatif terhadap `backend/` (Rust+Postgres).  
   Ini sumber utama kebingungan dan mismatch endpoint.
2. **Multi versi scheduler di frontend**: `scheduler.js`, `scheduler_v2.js`, `scheduler_v4_engine.js` berpotensi usang setelah scheduler Rust dipakai penuh.
3. **Banyak skrip migrasi/repair SQLite** di root dan `frontend/` (`fix_*schema.js`, `migrate_*.js`, `seed_*.js`, `reset_db.js`, dll). Banyak yang hanya berguna untuk tahap transisi.
4. **Artefak build besar**:
   - `target/` (output build Rust) tidak semestinya tersimpan di repo.
   - File DB lokal `frontend/database.sqlite` beserta `-wal/-shm` adalah state runtime.

## 6) Daftar Fitur (Dipertahankan vs Dihapus) — Draft Awal

### Dipertahankan (inti domain)
- Multi-tenant + auth + role guard.
- Master data: ingredients, foods, menu/recipes.
- Production planning + batch + checklist.
- Inventory + forecast.
- Finance ringkas (transactions + summary) dan bisa dikembangkan.
- NutriSurvey integration (status, nutrients, kalkulasi, history).

### Dihapus/Diarsipkan setelah migrasi sukses
- Node server (Express+SQLite) dan seluruh skrip migrasi/seed yang spesifik SQLite.
- Database file SQLite dan log runtime.
- Output build seperti `target/`.

## 7) Rekomendasi Arah Migrasi (High-Level)

Untuk memenuhi target performa, keamanan, dan maintainability:
- Konsolidasi backend menjadi satu (disarankan: Rust/Axum yang sudah ada).
- Bangun frontend modern dengan bundle kecil, SSR untuk SEO, dan lazy-loading; UI lama dipertahankan sebagai referensi sampai parity tercapai.
- Tutup gap endpoint yang masih dipakai UI tetapi belum tersedia di Rust (contoh: tasks/dashboard/orders) atau redesign UX agar lebih fokus pada flow inti.

