# MULAI DI SINI — Paket Deploy MBG

Folder ini (`_DEPLOY_READY/`) adalah **salinan bersih siap‑deploy** dari proyek kamu. File aslimu di folder `Bismillah Software MBG/` **tidak diubah sama sekali**.

## Baca berurutan

1. **`AUDIT_REPORT.md`** — hasil audit: apa yang dibuang, apa yang rusak/diperbaiki, isu keamanan.
2. **`DEPLOY_ORACLE_FREE.md`** — panduan deploy gratis langkah demi langkah (mulai dari nol).
3. **`CLEANUP_MANIFEST.md`** — daftar detail file yang dibuang vs dipertahankan.
4. **`DEPLOY_ALTERNATIVES.md`** — opsi hosting gratis lain bila tak mau urus VM.

## Yang sudah disiapkan

- `docker-compose.prod.yml` — stack produksi (Caddy HTTPS + Node + Rust + Postgres + face_api).
- `.env.production` — secret **sudah digenerate**; kamu cukup isi `DOMAIN`.
- `deploy.sh` — deploy satu perintah di server.
- `backend/Dockerfile` & `frontend/Dockerfile` — sudah diperbaiki agar jalan di VM gratis (ARM).
- `data-seed/` — data lama kamu (SQLite + foto wajah + dump Postgres) siap di‑restore.
- `ops/Caddyfile`, `scripts/` — reverse proxy & utilitas data.

## Deploy super singkat (untuk yang sudah paham)

```bash
# di VM (Ubuntu + Docker), folder ini diupload ke ~/mbg
cd ~/mbg
nano .env.production         # set DOMAIN=domainkamu.com
./deploy.sh
```

➡️ Detail lengkap (akun Oracle, VM, DNS, port): **`DEPLOY_ORACLE_FREE.md`**.

## Penting

- Hosting **gratis + data persisten + full stack** praktis = **1 VM** (Oracle Always Free). Vercel/Netlify tidak bisa karena app ini butuh server Node + disk (SQLite) + Postgres.
- Data di bundel = snapshot ringkas. Untuk data **paling baru**, jalankan `scripts/export-data.ps1` sebelum deploy (lihat panduan).
- Jaga `.env.production` tetap rahasia.

---

## Update terbaru (langganan OFF + GitHub)

- **Langganan/billing dimatikan** (`MBG_DISABLE_SUBSCRIPTION=1`): absensi, distribusi, dan semua tools langsung bisa dipakai tanpa berlangganan. Reversibel (set `=0` untuk mengaktifkan lagi).
- **Taruh di GitHub & deploy mudah**: lihat **`GITHUB_SETUP.md`**. Singkatnya: buat repo kosong → jalankan `push-to-github.ps1` → di server `git clone ... && ./deploy.sh`.
- `deploy.sh` kini **otomatis membuat secret** bila `.env.production` belum ada (jadi secret tak perlu ada di Git).
