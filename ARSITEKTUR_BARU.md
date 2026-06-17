# Arsitektur Baru (Rancangan Implementasi)

Target rancangan ini adalah website modern, profesional, ringan, dan scalable tanpa ketergantungan tooling Node.js di environment build saat ini.

## 1) Stack yang Dipilih

### Backend + Web UI (Monolith ringan)
- **Rust + Axum + SQLx (Postgres)** untuk API dan akses data.
- **Askama templates (SSR)** untuk halaman website utama (SEO-friendly).
- **JavaScript minimal** (tanpa SPA framework) untuk progressive enhancement.
- Static assets (CSS/JS) disajikan via `ServeDir`.

Alasan:
- Environment saat ini tidak memiliki `node/npm`, sehingga React/Vue/Svelte build pipeline belum bisa dipakai secara lokal.
- SSR + HTML-first menghasilkan payload kecil, cepat di 3G, dan mudah memenuhi target bundle < 200KB gzipped.
- Progressive enhancement lebih natural: halaman tetap usable tanpa JS; JS hanya menambah kenyamanan.

### Kompatibilitas dengan sistem lama
- Endpoint API `/api/*` tetap dipertahankan.
- UI legacy statik dipindahkan menjadi `/legacy` untuk referensi selama proses parity fitur.

## 2) Struktur dan Boundary

- `backend/src/pages/*`: routing dan handler halaman SSR (`/`, `/login`, `/app/*`).
- `backend/templates/*`: template HTML (Askama).
- `web/assets/*`: CSS/JS untuk UI baru.
- `backend/src/routes/*`: API JSON (existing), bertahap ditutup gap endpoint yang masih dibutuhkan.

## 3) Halaman Utama (Minimal 5)

1. `/` (Landing, SEO + schema markup)
2. `/login` (Auth)
3. `/app` (Dashboard)
4. `/app/plans` (Generate plan + list plan)
5. `/app/batches` (List batch per plan)
6. `/app/inventory` (Inventory + forecast + quick opname)
7. `/app/nutrition` (Entry point NutriSurvey module)

## 4) Keamanan (Baseline)

- Session disimpan di **cookie HttpOnly** (`app_token`) untuk mengurangi risiko token theft via XSS.
- Security headers sudah ada di backend; tahap berikutnya menambah CSP dan memperketat CORS.

## 5) Performa (Baseline)

- Bundle JS: hanya `web/assets/app.js` (sangat kecil).
- CSS: 1 file (`web/assets/app.css`).
- SSR mengurangi kebutuhan client-side rendering; cocok untuk TTFB dan SEO.

