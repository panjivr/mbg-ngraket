# Opsi Hosting — Perbandingan (Juni 2026)

App ini butuh **server Node yang nyala terus + disk persisten (SQLite) + Postgres**. Itu menyingkirkan host "serverless/static" gratis.

| Platform | Gratis? | Cocok untuk stack ini? | Catatan |
|---|---|---|---|
| **Oracle Cloud Always Free** ✅ | Gratis permanen | **Ya — direkomendasikan** | 1 VM ARM 2 OCPU/12 GB/200 GB. Jalankan `docker-compose` apa adanya. Panduan: `DEPLOY_ORACLE_FREE.md`. |
| Fly.io | ❌ Free tier dihapus (2024) | — | Sekarang bayar mulai ~$2/bln. |
| Render (free) | Sebagian | Tidak | Akun baru: hanya situs statis + jam web service terbatas, **tanpa disk persisten**. Data hilang. |
| Railway | ❌ (≈$1 kredit/bln) | Tidak untuk always‑on | Tidak benar‑benar gratis untuk app nyala 24/7. |
| Koyeb (free) | Sebagian | Sebagian | Ada Postgres gratis, tapi web service **tanpa volume persisten** → SQLite tidak aman. Perlu ubah app agar full‑Postgres. |
| Google Cloud (e2‑micro) | Gratis permanen | Hanya sebagian | 1 vCPU/1 GB RAM — terlalu kecil untuk Rust+Postgres+Python sekaligus. Bisa untuk **frontend Node saja**. |

## Kalau Oracle "out of capacity" (kadang terjadi untuk ARM)

- Coba ulang beberapa jam / pilih region lain saat daftar.
- Atau VPS murah berbayar (bukan gratis, tapi andal & simpel): mis. **Hetzner CX22 ~€4/bln** atau **Contabo** (proyek ini sudah punya skrip Contabo lama). Cara deploy **sama persis**: upload folder ini → `./deploy.sh`.

## Kalau hanya butuh halaman marketing online (gratis & instan)

Folder `landing/` adalah situs statis. Bisa di‑deploy gratis tanpa server:
- **Cloudflare Pages** / **Netlify** / **GitHub Pages** → drag folder `landing/`, arahkan domain. Selesai dalam menit.
- Ini **bukan** aplikasinya — hanya landing. Aplikasi tetap perlu VM (di atas).

## Frontend‑only (tanpa backend Rust)

Aplikasi Node+SQLite hampir mandiri. Kalau mau lebih ringan/murah, bisa deploy **hanya `frontend/`** (matikan service `backend`, `db`, `face_api` di compose). Beberapa fitur "jalur Rust" akan nonaktif, tapi inti operasional (SQLite) jalan. Cocok untuk Google Cloud e2‑micro gratis.
