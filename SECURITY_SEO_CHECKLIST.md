# Checklist Keamanan & SEO

## 1) OWASP Top 10 (Ringkas)

- A01 Broken Access Control
  - Pastikan semua `/api/*` memvalidasi `Authorization` dan tenant scope bila perlu.
- A02 Cryptographic Failures
  - `JWT_SECRET` tidak boleh hardcoded, rotasi secret terencana.
  - TLS via reverse proxy, HSTS hanya saat HTTPS.
- A03 Injection
  - SQL sudah via SQLx query binding; hindari string concat untuk query.
- A05 Security Misconfiguration
  - CORS default deny; gunakan `CORS_ORIGINS` allowlist.
  - CSP aktif (default-src self).
- A07 Identification and Authentication Failures
  - Session via cookie HttpOnly, SameSite=Lax.
  - Rate limiting disarankan untuk `/login`.
- A09 Security Logging and Monitoring Failures
  - Logging request/error tanpa membocorkan secret/token.

## 2) Header Keamanan (Baseline)

Backend sudah memasang:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection
- Strict-Transport-Security
- Content-Security-Policy
- Permissions-Policy
- Referrer-Policy: strict-origin-when-cross-origin
- X-DNS-Prefetch-Control: off

## 2b) Proteksi Kode Sumber

- **Anti-view-source**: Script inline di semua halaman mencegah right-click, Ctrl+U, F12.
- **Block source maps**: Request ke `*.map` di-block (404).
- **JS Minification + Obfuscation**: Jalankan `cd frontend && npm run build:secure` sebelum deploy. Menghasilkan `bundle.app.min.js` dan `bundle.staff.min.js` yang di-minify dan di-obfuscate. Loader inline akan memuat bundle jika ada, fallback ke file individual untuk development.

**Catatan**: Menyembunyikan kode JS secara total tidak mungkin di web; browser harus mengeksekusi kode. Obfuscation memperbesar usaha yang dibutuhkan penyerang untuk membaca logika.

Referensi: [main.rs](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/backend/src/main.rs)

## 3) SEO (Baseline)

- Landing page `/`:
  - Meta description
  - OpenGraph basic
  - JSON-LD schema.org WebSite

Referensi: [home.html](file:///c:/ADMIN/New%20folder/Bismillah%20Software%20MBG/backend/templates/home.html)

Catatan:
- Halaman aplikasi setelah login umumnya tidak ditargetkan untuk indexing; fokus SEO di landing/public pages.

