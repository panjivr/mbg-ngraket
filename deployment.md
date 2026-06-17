# Panduan Deployment MBG Kitchen Management System

Sistem ini terdiri dari dua komponen utama: **Backend (Rust)** dan **Frontend (Node.js)**. Anda dapat menjalankan sistem ini menggunakan Docker (direkomendasikan) atau secara manual.

---

## 🏗️ Persyaratan Sistem
- **Docker & Docker Compose** (Paling mudah)
- **Rust 1.80+** (Untuk build manual)
- **Node.js 20+** (Untuk runtime frontend manual)
- **PostgreSQL 15+**

---

## 🐳 Opsi 1: Deployment via Docker (Rekomendasi)

Gunakan Docker untuk menjalankan seluruh stack (Database + Backend + Frontend) dalam satu perintah.

1.  **Siapkan Environment**:
    Salin file `.env.example` menjadi `.env` di direktori utama:
    ```bash
    cp .env.example .env
    ```
    Buka `.env` dan sesuaikan `DATABASE_URL` serta `JWT_SECRET`.

2.  **Jalankan Docker Compose**:
    ```bash
    docker-compose up -d --build
    ```

3.  **Akses Aplikasi**:
    - **Portal Utama**: `http://localhost:3014`
    - **Developer Portal**: `http://dev.localhost:3014` (atau tambahkan `/dev` di URL)

---

## 🛠️ Opsi 2: Deployment Manual

### 1. Database (PostgreSQL)
Pastikan PostgreSQL berjalan dan buat database bernama `mbg_kitchen`. Jalankan migrasi jika perlu (menggunakan `sqlx-cli` atau manual dari folder `backend/migrations`).

### 2. Backend (Rust)
```bash
cd backend
# Salin env
cp .env.example .env 
# Build & Run
cargo run --release --bin backend
```
Backend akan berjalan di port `8080`.

### 3. Frontend (Node.js)
```bash
cd frontend
# Install dependencies
npm install --production
# Jalankan server
node server.js
```
Frontend akan berjalan di port `3014`.

---

## 🌐 Konfigurasi Produksi

Untuk environment produksi, pastikan konfigurasi `CORS` sudah disesuaikan, dan frontend tidak terekspos langsung tanpa perlindungan memadai. Gunakan reverse proxy (Nginx, Caddy) atau layanan CDN/WAF.

---

## 🔐 Keamanan (Security)
- Pastikan `JWT_SECRET` di `.env` bersifat rahasia dan panjang.
- Gunakan HTTPS di lingkungan produksi.
- Selalu update database secara berkala.

---

**Kontak Pengembang**: Bismillah Software MBG
