# Laporan Audit — Bismillah Software MBG

Tanggal: 17 Juni 2026 · Repo asal: `ajidewa/mbg-djati` (branch `main`)
Tujuan: deploy full‑stack ke domain sendiri, **gratis**, bawa data lama.

---

## 1. Ringkasan eksekutif

Aplikasi ini **layak di‑deploy** dan sebagian besar mandiri. Tiga hal wajib diperbaiki sebelum live (sudah saya perbaiki di folder `_DEPLOY_READY/`):

1. **Backend Rust tidak bisa di‑build di server biasa apa adanya.** `backend/Dockerfile` lama hanya menyalin binary jadi (`dist/backend`) yang di‑build untuk x86 — **tidak akan jalan di VM gratis Oracle yang ARM**. Saya ganti jadi build dari source (multi‑stage).
2. **Data tidak persisten.** `docker-compose.yml` lama tidak punya volume untuk SQLite/upload frontend → data hilang tiap rebuild. Saya tambahkan bind‑mount `./data`.
3. **Tidak ada HTTPS/reverse proxy & secret lemah.** Saya tambah Caddy (HTTPS otomatis) dan generate ulang semua secret.

Hosting gratis: **Fly.io free tier sudah mati (2024/2026)**. Pilihan gratis + always‑on + disk persisten yang masih ada untuk full Docker stack = **Oracle Cloud Always Free** (1 VM ARM Ampere). Panduan lengkap: `DEPLOY_ORACLE_FREE.md`.

---

## 2. Arsitektur yang terdeteksi

| Komponen | Stack | Peran | Status |
|---|---|---|---|
| `frontend/` | Node + Express + SQLite (`server.js`, 23.730 baris) | Aplikasi operasional (multi‑tenant) | Inti, hampir mandiri |
| `backend/` | Rust + Axum + Postgres (31 migrasi) | API "jalur utama" | Opsional bagi frontend; perlu build dari source |
| `face_api/` | Python + FastAPI + DeepFace | Pengenalan wajah (absensi) | Opsional, berat |
| `landing/` | HTML statis | Halaman marketing | Disajikan via Caddy |
| `scheduler/`, `shared/` | Rust (workspace member) | Dipakai backend | Disertakan |
| `src-tauri/` | Tauri | Shell desktop | **Tidak dipakai untuk web** (tetap disimpan, tidak di‑build) |

Catatan: `frontend/server.js` hanya `require` 4 modul lokal — `./scheduler`, `./scheduler_v2`, `./scheduler_v4_engine`, `./lib/kitchen_planner_engine`. Ketiga file scheduler yang terlihat seperti "versi lama" itu **wajib ada** (dipakai runtime), jadi tidak dibuang.

---

## 3. Yang TIDAK berguna (dibuang dari salinan bersih)

Semua di bawah ini dihapus dari `_DEPLOY_READY/` (file asli kamu tetap utuh):

**Artefak build & dependensi** (di‑generate ulang otomatis): `node_modules/`, `target/` (build Rust), `backend/dist/backend` (binary x86 16 MB), `face_api/venv/`, `face_api/weights/` (**1,4 GB** — model DeepFace diunduh ulang saat runtime).

**Log, PID, file runtime**: semua `*.log` (`server.log`, `backend.log`, `face_api.log`, `server_lh/server_smoke/*.log`, `lighthouse_legacy.*`), semua `*.pid`, `live_logs*.txt`, `post_result.txt`.

**File sampah / korup**: `~$lapkeu_master.xlsx` (lock Office), `frontend/mb_gizi.db` & `frontend/mbg.db` (0 byte), `frontend/db.json`, `frontend/dev.html`, `face_api/facenet512_weights.h5` (**9 byte — rusak**), `face_api/temp_*.jpg`, `face_api/search_*.jpg`, `face_api/azure_logs.zip`.

**Folder backup membengkak**: `frontend/.backup_azure_pull_*` (3 folder), `frontend/tenant_dbs/.backup_hr_*` (**369 MB**).

**Skrip dev/test/seed sekali‑pakai** (tidak dipakai server.js): `frontend/migrate_*.js`, `seed_*.js`, `test_*.js`, `debug_*.js`, `mock_*.js`, `audit_*.js`, `check_*.js`, `fix_*.js`, `insert_attendance*.js`, `reset_*.js`, `get_ids.js`, `add_cooking_time.js`, `import_nutr_data.js`, `production_sim_test.js`, `smoke_plan_engine.js`, `start_server_3015.js`, `cleanup_faces.js`, `setup_coordinators.js`, `update_*_schema.js`.

**Tooling editor / IDE**: `.cursor/` (berisi 15 zip log Azure), `.trae/`, `.tools/rustup-init.exe`, `@testsprite/`, `testsprite_tests/` (31 file test), `tools/` (diff report + `server.js.merged-backup`).

**Folder kosong / nyasar (akibat skrip Windows)**: `%dest%/` (kosong), `Software/` (kosong), `Microsoft/Windows/`, `folder/Bismillah/` (kosong).

**Khusus Azure (tidak relevan ke Oracle)**: `azure_deployment.md`, `AZURE_MBG_SMOKE_TEST.md`, `docker-compose-azure.yml`, `.github/workflows/azure-static-web-apps-*.yml`, `deploy/azure_*`, `deploy/contabo_*`, `scripts/azure_*` (folder `deploy/` & `scripts/` lama tidak disalin).

Detail file‑per‑file: lihat `CLEANUP_MANIFEST.md`.

---

## 4. Yang HILANG / RUSAK untuk produksi (sudah diperbaiki)

| # | Masalah | Dampak | Perbaikan di `_DEPLOY_READY/` |
|---|---|---|---|
| 1 | `backend/Dockerfile` menyalin binary x86 jadi (`dist/backend`) | Backend **crash di VM ARM** | Ditulis ulang: multi‑stage `cargo build -p backend` dari source |
| 2 | 333 makro `sqlx::query!` tanpa cache `.sqlx` (kosong) | Build backend **gagal** tanpa DB | `deploy.sh` menyalakan Postgres dulu, build pakai `network: host` ke DB live |
| 3 | `main.rs` migrasi di‑comment | Skema Postgres tidak dibuat otomatis | Skema+data di‑load dari dump (`data-seed/postgres/01_restore.sql`) saat init DB |
| 4 | Tidak ada volume data frontend | SQLite/upload **hilang** tiap deploy | Bind‑mount `./data/{platform_db,tenant_dbs,uploads}` |
| 5 | `frontend/Dockerfile` `node:slim` tanpa toolchain | Native `sqlite3` gagal build di ARM | Tambah `python3 make g++` |
| 6 | Postgres tanpa healthcheck | Backend race saat boot | `healthcheck` + `depends_on: condition: service_healthy` |
| 7 | Tidak ada HTTPS / reverse proxy | Tidak bisa pakai domain + TLS | Service `caddy` (Let's Encrypt otomatis) |
| 8 | `landing/` tidak tersaji | Halaman marketing tidak online | Opsi disajikan Caddy di subdomain `www` |
| 9 | Dump Postgres dari **pg_dump 18.3** (ada BOM, `\restrict`, 58× `OWNER TO mbgadmin`) | DB **gagal init** (ON_ERROR_STOP) → deploy macet | Image `postgres:18-alpine` (cocok versi), BOM dibuang, role `mbgadmin` dibuat lebih dulu via `00_roles.sql` |

---

## 5. Keamanan (WAJIB diperhatikan)

- **Secret lama bocor & lemah.** `.env.example` dan `docker-compose.yml` lama memuat nilai pasti `JWT_SECRET` *dan* `MBG_INTERNAL_SKIP_AUTH` yang **sama** (`super_secure_..._2026`). Karena `MBG_INTERNAL_SKIP_AUTH` adalah token bypass‑auth internal, siapa pun yang tahu string itu bisa melewati autentikasi. **Sudah saya generate ulang** ketiganya (JWT, skip‑auth berbeda, password Postgres) di `.env.production`.
- `.env` asli (berisi password DB) **tidak ikut** ke salinan bersih. `.gitignore` sudah benar (mengabaikan `.env`, `*.sqlite`, `*.log`).
- Postgres **tidak diekspos publik** (hanya `127.0.0.1`).
- Setelah live: ganti `DOMAIN`/`ACME_EMAIL` di `.env.production`, lalu pertimbangkan reset password admin aplikasi.

---

## 6. Data lama yang dibawa

- **SQLite (data utama frontend)** + foto wajah: dari `deploy/mbg_data_export_LATEST.tar.gz` (snapshot konsisten, ~10 MB) → `data-seed/`.
- **Postgres (backend)**: dump `backups/mbg_cloud_postgres_azure_local_restore.sql` → `data-seed/postgres/01_restore.sql` (57 tabel).
- **Upload** (foto absensi) + **platform DB live terbaru** juga disertakan di `data-seed/`.

> Catatan: data live tenant terbesar di PC kamu **340 MB** (membengkak, banyak free‑page). Bundel memakai versi export yang sudah ringkas. Untuk menarik data **paling baru** saat go‑live, jalankan `scripts/export-data.ps1` (Windows) lalu deploy ulang — lihat panduan.
