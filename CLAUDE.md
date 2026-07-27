# CLAUDE.md — Konteks untuk Claude Code

Dokumen ini otomatis dibaca Claude Code saat kamu jalankan `claude` di root repo. Isinya menjelaskan arsitektur, konvensi, dan cara jalanin proyek supaya Claude bantu ngoding tanpa harus nebak.

---

## Ringkasan proyek

**Nama:** `mbg-ngraket` / Bismillah Software MBG
**GitHub:** https://github.com/panjivr/mbg-ngraket
**Vercel:** https://vercel.com/mr-ps-projects-8da5766a/mbg-ngraket

Monorepo sistem manajemen dapur/catering MBG. **Fokus deploy saat ini = folder `absensi-dapur/`** (aplikasi Next.js 15 yang di-host di Vercel).

## Struktur monorepo

| Folder | Isi | Status |
|---|---|---|
| `absensi-dapur/` | **Next.js 15 + React 19 + TS + Postgres** — aplikasi absensi (target Vercel) | **AKTIF DIKEMBANGKAN** |
| `frontend/` | Express server.js + SQLite + HTML/CSS/JS legacy | Operasional lokal |
| `backend/` | Rust (Axum) + Postgres — jalur utama enterprise | Backend |
| `landing/` | Halaman statis marketing (Azure SWA) | Statis |
| `face_api/` | Python face recognition | Opsional |
| `scheduler/`, `shared/`, `src-tauri/` | Scheduler, kode bersama, shell desktop Tauri | Support |
| `scripts/` | DB init, deploy, utilitas | Tooling |

**Untuk fitur baru di aplikasi Vercel — kerjakan di `absensi-dapur/`.**

---

## Stack `absensi-dapur/` (target Vercel)

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **TailwindCSS** — tema gelap, aksen emas
- **PostgreSQL** via `pg` — kompatibel Vercel Postgres / Neon / Supabase
- **jose** untuk JWT, **bcryptjs** untuk hash password
- **exceljs**, **jspdf**, **html-to-image** untuk ekspor rekap
- Node **>=20**

### Struktur `absensi-dapur/src/`

```
src/
  app/
    admin/      # Halaman & dashboard admin
    api/        # Route handlers (Next.js API routes)
    aura/       # (fitur khusus)
    cetak/      # Halaman cetak slip/rekap
    dapur/      # UI staf dapur (clock in/out)
    login/
    layout.tsx
    page.tsx
    globals.css
  components/
  lib/
  middleware.ts # Auth guard (JWT dari cookie httpOnly)
```

### Environment variables (`.env.local` untuk dev)

```
DATABASE_URL="postgres://user:pass@host:5432/db?sslmode=require"
AUTH_SECRET="string acak >=32 karakter (openssl rand -hex 32)"
SEED_ADMIN_USERNAME="admin"
SEED_ADMIN_PASSWORD="admin123"
SEED_ADMIN_NAMA="Administrator Dapur"
```

Di Vercel: **Root Directory harus di-set ke `absensi-dapur`** saat impor project.

---

## Perintah yang sering dipakai

Semua dijalankan **dari root `absensi-dapur/`** kecuali disebutkan lain.

```bash
# Development
cd absensi-dapur
npm install
npm run dev              # localhost:3000

# Build & preview production
npm run build
npm start

# Lint
npm run lint

# Inisialisasi database (skema tabel + seed admin)
npm run db:init
```

Legacy Node app (folder `frontend/`) dijalankan dari root repo:
```bash
npm install
npm run start:dev        # localhost:3014
```

---

## Konvensi git

- Branch utama: **`main`** — auto-deploy ke Vercel production
- Branch fitur: gunakan pola `claude/<nama-fitur>` atau `feat/<nama>` — Vercel auto-buat preview deployment
- Commit message: bahasa Indonesia OK (lihat riwayat commit)
- PR ke `main` → merge setelah preview OK

## Konvensi kode

- TypeScript **strict** — hindari `any`
- Server components default (Next.js App Router), tandai `"use client"` hanya kalau perlu state/browser API
- Route handlers di `src/app/api/*/route.ts` — pakai `NextRequest`/`NextResponse`
- Query Postgres pakai `pg` Pool — jangan buat koneksi baru per request (pakai singleton di `lib/db.ts` atau sejenis)
- Password selalu di-hash dengan `bcryptjs`, session JWT via `jose`
- Style: Tailwind utility classes, hindari CSS module baru kecuali perlu

---

## Yang perlu Claude perhatikan

1. **Jangan sentuh folder lain** kecuali diminta — fokus di `absensi-dapur/` untuk fitur Vercel
2. **Jangan commit `.env.local`** — sudah di `.gitignore`
3. **Sebelum push:** jalankan `npm run lint` dan `npm run build` di `absensi-dapur/`
4. **Baca dulu file terkait** sebelum edit — pakai `Read` dan `Grep` untuk pahami konteks
5. **DB migrasi:** skema dibuat otomatis saat aplikasi pertama diakses (lihat `scripts/init-db.mjs`) — kalau tambah tabel, update script itu

---

## Dokumentasi tambahan (di root repo)

- `README.md` — overview monorepo
- `absensi-dapur/README.md` — panduan deploy Vercel lengkap
- `PROJECT_TECH_OVERVIEW.md` — arsitektur detail
- `API_DOCUMENTATION.md` — endpoint API
- `DOKUMENTASI_TEKNIS.md` — teknis mendalam
- `UX_DESIGN.md` — panduan UX
- `TESTING.md` — cara testing
