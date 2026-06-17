# 🍲 Absensi Dapur MBG

Sistem absensi digital untuk tim **dapur MBG** (Makan Bergizi Gratis). Staf
melakukan **clock in / clock out** dengan **verifikasi selfie** dan **validasi
lokasi GPS (geofence)**; admin memantau kehadiran real-time, mengelola pegawai,
mengatur lokasi & jam kerja, lalu mengunduh rekap ke CSV/Excel.

Terinspirasi oleh [grebeg-suro](https://github.com/panjivr/grebeg-suro), dibangun
ulang khusus untuk operasional dapur dan **siap deploy ke Vercel**.

---

## ✨ Fitur

| Untuk Staf | Untuk Admin |
|---|---|
| Absen masuk & pulang 1 ketuk | Dashboard kehadiran harian (hadir / terlambat / pulang / belum absen) |
| Verifikasi selfie (kamera HP) | Rekap absensi dengan filter rentang tanggal |
| Validasi lokasi GPS (radius dapur) | Ekspor rekap ke **CSV** (siap dibuka di Excel) |
| Status otomatis **Tepat Waktu / Terlambat** | CRUD pegawai (nama, jabatan, NIP, peran, status) |
| Riwayat absensi pribadi | Pengaturan lokasi dapur, radius geofence, jam kerja, zona waktu |
| | Peran terpisah **Admin** & **Staf**, sesi aman (JWT + cookie httpOnly) |

## 🧱 Teknologi

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **TailwindCSS** (tema gelap, aksen emas)
- **PostgreSQL** via `pg` (node-postgres) — kompatibel Vercel Postgres / Neon / Supabase
- **jose** (JWT) + **bcryptjs** (hash password)
- Tanpa layanan eksternal lain — selfie disimpan langsung di database (terkompresi)

---

## 🚀 Deploy ke Vercel (rekomendasi)

> Aplikasi ini berada di **subfolder `absensi-dapur/`** dari repo. Saat impor ke
> Vercel, **set Root Directory ke `absensi-dapur`**.

### 1. Impor repo
1. Buka [vercel.com/new](https://vercel.com/new) → pilih repo `panjivr/mbg-ngraket`.
2. Di **Configure Project → Root Directory**, klik **Edit** lalu pilih `absensi-dapur`.
3. Framework otomatis terdeteksi: **Next.js**. Biarkan Build/Output default.

### 2. Siapkan database (gratis)
Di dashboard project → tab **Storage** → **Create Database** → **Postgres**
(Vercel Postgres / Neon). Vercel akan otomatis menambahkan variabel
`DATABASE_URL` / `POSTGRES_URL` ke project.

> Alternatif: pakai [Neon](https://neon.tech) atau [Supabase](https://supabase.com)
> gratis, lalu salin **connection string (pooled)** ke env var `DATABASE_URL`.

### 3. Tambah environment variable
Di **Settings → Environment Variables**, tambahkan:

| Key | Value |
|---|---|
| `AUTH_SECRET` | string acak panjang — buat dengan `openssl rand -hex 32` |
| `DATABASE_URL` | (otomatis terisi jika pakai Vercel Postgres) |

(Opsional) `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAMA` untuk
menentukan akun admin pertama.

### 4. Deploy
Klik **Deploy**. Saat aplikasi diakses pertama kali, **skema tabel dibuat
otomatis** dan akun admin awal di-seed. Selesai. ✅

### 5. (Opsional) Pasang domain `djati.web.id`
1. Vercel → **Settings → Domains** → tambahkan `djati.web.id` (atau subdomain
   mis. `absensi.djati.web.id`).
2. Di **DomaiNesia → DNS Management** domain `djati.web.id`, tambahkan record
   sesuai instruksi Vercel:
   - Subdomain (mis. `absensi`): **CNAME** → `cname.vercel-dns.com`
   - Root/apex (`djati.web.id`): **A** → `76.76.21.21` (ikuti nilai terbaru yang
     ditampilkan Vercel).
3. Tunggu propagasi DNS & penerbitan SSL otomatis oleh Vercel.

---

## 🔑 Akun default (WAJIB diganti setelah login)

| Peran | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Staf (contoh) | `siti`, `budi`, `rina`, `joko`, `dewi` | `dapur123` |

Setelah login admin, buka **Pegawai** untuk mengganti password/menghapus akun
contoh, dan **Pengaturan** untuk mengatur titik lokasi dapur + radius geofence.

---

## 💻 Menjalankan lokal

Butuh **Node 20+** dan **PostgreSQL**.

```bash
cd absensi-dapur
cp .env.example .env.local      # isi DATABASE_URL & AUTH_SECRET
npm install
npm run db:init                 # buat tabel + seed (opsional; juga otomatis saat runtime)
npm run dev                     # http://localhost:3000
```

> Catatan: fitur **kamera** dan **GPS** hanya aktif pada konteks aman
> (HTTPS atau `localhost`). Di produksi Vercel sudah HTTPS otomatis.

### Variabel lingkungan

| Var | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ✅ | Connection string PostgreSQL (pooled untuk serverless) |
| `AUTH_SECRET` | ✅ (produksi) | Kunci penandatangan sesi JWT |
| `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAMA` | — | Akun admin awal |

---

## 🗂️ Struktur

```
absensi-dapur/
├─ src/
│  ├─ middleware.ts            # proteksi rute /dapur & /admin
│  ├─ lib/                     # db (pg), auth (jose), password (bcrypt), geo, time
│  ├─ components/              # AbsenPanel (kamera+GPS), NavLink, LogoutButton
│  └─ app/
│     ├─ page.tsx              # landing
│     ├─ login/               # halaman masuk
│     ├─ dapur/               # area staf: absen + riwayat
│     ├─ admin/               # dashboard, rekap, pegawai, pengaturan
│     └─ api/                 # REST API (auth, attendance, admin)
└─ scripts/init-db.mjs        # inisialisasi & seed DB (idempotent)
```

## 🔒 Catatan keamanan

- Password di-hash dengan **bcrypt**; sesi pakai **JWT** dalam cookie `httpOnly`,
  `secure`, `sameSite=lax`.
- Geofence & kewajiban selfie **divalidasi di server**, bukan hanya di browser.
- Ganti `AUTH_SECRET` dan password default sebelum dipakai produksi.
