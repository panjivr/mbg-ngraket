# Bismillah Software MBG

Monorepo sistem manajemen dapur / catering (MBG): UI web, API Node (Express + SQLite) untuk operasional lokal, backend Rust (Axum + Postgres) untuk jalur utama, face API opsional, landing marketing, dan tooling deploy.

## Struktur singkat

| Bagian | Isi |
|--------|-----|
| `absensi-dapur/` | **Aplikasi Absensi Dapur** (Next.js 15 + PostgreSQL), siap deploy ke Vercel — clock in/out dengan selfie & geofence GPS. Lihat `absensi-dapur/README.md` |
| `frontend/` | `server.js` (Express), HTML/CSS/JS aplikasi, SQLite per tenant |
| `backend/` | Rust / Axum, migrasi SQL di `backend/migrations/` |
| `landing/` | Halaman statis publik (Azure Static Web Apps) |
| `face_api/` | Python (recognition), tanpa `venv/` di repo |
| `scheduler/`, `shared/`, `src-tauri/` | Scheduler, kode bersama, shell desktop Tauri |
| `scripts/` | Skrip DB, deploy, utilitas |

Detail arsitektur: lihat **`PROJECT_TECH_OVERVIEW.md`**.

## Menjalankan lokal (Node + SQLite)

Perlu **Node 20.17+** (disarankan LTS 20 atau 22).

```bash
npm install
npm run start:dev
```

Buka **`http://localhost:3014`**. Variabel lingkungan: salin **`.env.example`** ke **`.env`** dan sesuaikan.

## Backend Rust & Postgres

Lihat **`deployment.md`**, **`azure_deployment.md`**, **`docker-compose.yml`**, dan skrip di **`scripts/`**. Jalur demo lokal: **`run_demo_local.bat`** (butuh toolchain Rust + Postgres).

## Lisensi

File **`LICENSE`** mengikuti komponen pihak ketiga; berkas aplikasi mengikuti kebijakan tim Anda.
