# Manifest Pembersihan

Diff nyata antara folder asli `Bismillah Software MBG/` dan salinan bersih `_DEPLOY_READY/`.
**Tidak ada file asli yang dihapus** — ini hanya daftar apa yang *tidak ikut* disalin & alasannya.

---

## A. Dipertahankan (inti aplikasi)

`backend/` `frontend/` `face_api/` `landing/` `scheduler/` `shared/` `web/` `src-tauri/`
`Cargo.toml` `Cargo.lock` `package.json` `package-lock.json`
`docker-compose.yml` (lama, sbg referensi) + semua dokumentasi `.md` yang berguna.

Plus file baru: `docker-compose.prod.yml`, `deploy.sh`, `ops/Caddyfile`, `.env.production(.example)`, `data-seed/`, `scripts/`, dan dokumen panduan.

---

## B. Dibuang — sampah teknis (aman)

**Build & dependensi** (regenerasi otomatis): `node_modules/`, `target/`, `backend/dist/`, `face_api/venv/`, `face_api/weights/` (1,4 GB).

**Log & PID**: `server.log`, `lighthouse_legacy.*.log`, `frontend/server_*.log`, `frontend/*.pid`, `backend/*.log`, `backend/*.pid`, `face_api/*.log`, `face_api/*.pid`, `live_logs*.txt`, `post_result.txt`.

**Rusak / kosong**: `~$lapkeu_master.xlsx`, `frontend/mb_gizi.db`, `frontend/mbg.db` (0 B), `frontend/db.json`, `frontend/dev.html`, `face_api/facenet512_weights.h5` (9 B rusak), `face_api/temp_*.jpg`, `face_api/search_*.jpg`, `face_api/azure_logs.zip`.

**Backup membengkak**: `frontend/.backup_azure_pull_*` ×3, `frontend/tenant_dbs/.backup_hr_*` (369 MB).

**Folder kosong/nyasar**: `%dest%/`, `Software/`, `Microsoft/`, `folder/`.

**Tooling editor/CI**: `.cursor/`, `.trae/`, `.tools/`, `@testsprite/`, `testsprite_tests/`, `tools/`, `.git/`, `.github/`.

**Skrip dev/test/seed/migrate sekali‑pakai** (67 file di `frontend/`, mis. `seed_*.js`, `test_*.js`, `migrate_*.js`, `mock_*.js`, `debug_*.js`, `audit_*.js`, `check_*.js`, `fix_*.js`, `reset_*.js`, `update_*_schema.js`, dst) + root `migrate_fix_config*.js`, `migrate_v6.js`, `run_all.sh`, `run_backend.bat`, `run_demo_local.bat`, `backup_data.sh`.

**Khusus Azure/Contabo** (tak relevan): `azure_deployment.md`, `AZURE_MBG_SMOKE_TEST.md`, `docker-compose-azure.yml`, folder `deploy/` & `scripts/` lama.

---

## C. Data lama → dipindah ke `data-seed/` (dibawa ke produksi)

| Sumber asli | Tujuan | Isi |
|---|---|---|
| `deploy/mbg_data_export_LATEST.tar.gz` | `data-seed/` | SQLite platform + semua tenant + foto wajah |
| `backups/mbg_cloud_postgres_azure_local_restore.sql` | `data-seed/postgres/01_restore.sql` | Skema + data Postgres (57 tabel) |
| `frontend/uploads/` | `data-seed/uploads_live/` | Foto absensi |
| `frontend/database.sqlite` | `data-seed/platform_db_live.sqlite` | Platform DB versi live terbaru |

---

## D. Dokumen bisnismu — sengaja TIDAK disalin (tetap aman di folder asli)

Ini **bukan** file aplikasi, jadi tidak dimasukkan ke bundel deploy. Semuanya masih ada utuh di `Bismillah Software MBG/`:

- `BAST (BERITA ACARA SERAH TERIMA).pdf`, `SURAT JALAN *.pdf` (4 file), `contoh distribusi.pdf`
- `lapkeu_master.xlsx` (laporan keuangan)
- `Nutr/` (data NutriSurvey desktop — kemungkinan legacy; fitur gizi web pakai Postgres)
- `storage/` (folder faces tingkat atas — kemungkinan duplikat)

> Kalau ternyata salah satu di atas memang dipakai aplikasi, beri tahu — tinggal disalin masuk.
