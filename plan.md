# Comprehensive Plan: User-Centric Resource Scheduling (V7) - Final Integrated

Ini adalah rencana gabungan yang mengembalikan detail V4 (Staff/Shift) dan mengintegrasikan penyempurnaan V5 (Waves/Strict Divisions).
**Filosofi Utama**: Data Master disimpan untuk *reuse*, tapi saat *Planner Harian*, User ditanya kembali untuk konfirmasi strategi (jumlah alat, gelombang pengiriman, dll).

## 1. Konsep & Alur Kerja (Workflow)

### A. Master Data (Knowledge Base)
Kita menyimpan "Fakta Dasar" agar tidak perlu input ulang dari nol.
*   **Menu & Resep**:
    *   *Ayam Goreng*:
        *   Prep: Potong, Cuci.
        *   Cook: Marinasi, Ungkep, Goreng.
        *   **Alat Utama**: Wajan Besar (Kapasitas 50).
        *   **Packing**: Mika + Sendok.
*   **Alat**: Dapur punya 6 Kompor, 2 Steamer, 3 Mobil Box.
*   **Shift**: Shift Pagi (07:00 - 15:00), Shift Siang (11:00 - 19:00).
*   **Staff**: Budi (Cook), Ani (Prep).

#### Checklist Master Data (Minimum)
Agar planner bisa jalan end-to-end tanpa banyak tanya ulang, master data idealnya mencakup:

1. **Organisasi & Akses**
   - Tenant/lokasi dapur (opsional: time zone).
   - User & role (owner/admin/kepala_sppg/koordinator/divisi/driver).
2. **Dapur & Divisi**
   - Definisi divisi (receiving, prep, cooking, packing, driver, cleaning, security, dll) dan aturan batas kerja antar divisi.
   - Konfigurasi kapasitas per divisi (mis. parallel limit, buffer time, checklist QC).
3. **Equipment / Resource**
   - Inventaris alat: tipe, kapasitas batch (porsi/kg), status (aktif/rusak), jumlah unit tersedia.
   - Mapping “resource type” yang dipakai recipe step → tipe alat aktual di dapur.
4. **Staff & Shift**
   - Staff: role, skill, divisi utama (opsional: multi-skill).
   - Shift: jam kerja per divisi (opsional: exception/cuti).
5. **Menu / Resep**
   - Menu/food + recipe steps lengkap: divisi, durasi, dependency antar step.
   - Step → kebutuhan resource: batch capacity, batch duration, buffer antar batch.
6. **Ingredients & Prep Handling**
   - Master ingredient + satuan (kg/gr/pcs) dan konversi (opsional).
   - Prep action per ingredient per menu (cut/wash/peel) + durasi per kg dan waste/yield (opsional).
7. **Packing**
   - Jenis kemasan + rate (porsi/jam) atau durasi per porsi.
   - Extra packing per menu (jenis, qty, durasi tambahan).
8. **Delivery**
   - Driver & (opsional) kendaraan/fleet: kapasitas porsi, waktu loading.
   - Parameter estimasi perjalanan (avg travel time) dan template gelombang (opsional).

### B. Daily Planner (Strategi Harian)
Saat Anda membuat rencana untuk besok (misal: 1000 porsi Ayam & Sayur):

1.  **Step 1: Resource Strategy (Konfirmasi Jumlah Alat)**
    *   Sistem membaca dari Menu bahwa Ayam Goreng pakai Wajan.
    *   Sistem hanya bertanya: "**Untuk Ayam Goreng, hari ini mau pakai berapa Wajan?**" (Default: 4, User bisa ubah jadi 5).
    *   Sistem tidak tanya "Pakai alat apa?", karena sudah fix di Menu.

2.  **Step 2: Delivery Strategy (Gelombang Pengiriman)**
    *   Sistem: "Total 1000 porsi. Mau dikirim sekaligus atau bertahap?"
    *   User: "**Bertahap (Waves)**. Kirim 500 porsi jam 09:00, dan 500 porsi jam 11:00."
    *   *Sistem akan memecah jadwal masak mengikuti gelombang ini.*

3.  **Step 3: Division Boundary (Batasan Divisi)**
    *   **Prep**: Hanya Potong, Kupas, Cuci (Bahan Mentah). Selesai di sini -> Handover ke Masak.
    *   **Cook**: Marinasi, Ungkep, Goreng (Proses Bumbu & Panas).
    *   **Pack**: Pemorsian ke wadah + Extra Packing (Plastik/Mika).
    *   **Support**: Jika tugas Prep selesai jam 10:00 (padahal shift sampai 15:00), sistem otomatis buat task: *"Bantu Divisi Packing/Cleaning"*.

---

## 2. Struktur Data (Database)

Kita perlu memperkaya database agar bisa menyimpan "Knowledge" yang user inputkan.

### A. Staff & Shift Management
Agar sistem tahu "Siapa kerja kapan".
```sql
CREATE TABLE staff (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT, -- 'cook', 'prep', 'packer', 'driver'
    skills_json TEXT -- ['grill', 'fry', 'cut']
);

CREATE TABLE shifts (
    id TEXT PRIMARY KEY,
    name TEXT, -- "Shift Pagi", "Shift Siang"
    start_time TEXT, -- "05:00"
    end_time TEXT, -- "13:00"
    division_id TEXT
);
```

### B. Recipe & Resource Mapping
Satukan kebutuhan alat dengan langkah spesifik.
```sql
-- Update tabel recipe_steps untuk menyimpan kebutuhan resource
ALTER TABLE recipe_steps ADD COLUMN required_resource_type TEXT; -- 'stove', 'oven', 'mixer'
ALTER TABLE recipe_steps ADD COLUMN batch_capacity REAL; -- e.g. 50 porsi
ALTER TABLE recipe_steps ADD COLUMN batch_duration_minutes INTEGER; -- e.g. 20 menit
```

### C. Ingredient Prep Details
Menyimpan detail perlakuan bahan baku per menu (potong, kupas, cuci).
```sql
-- Detail prep per ingredient per menu
CREATE TABLE menu_ingredient_prep (
    id TEXT PRIMARY KEY,
    menu_id TEXT,
    ingredient_id TEXT,
    action_type TEXT, -- 'CUT', 'WASH', 'PEEL'
    duration_per_kg_minutes INTEGER, -- e.g., 10 mins/kg
    is_enabled BOOLEAN DEFAULT 1
);
```

### D. Extra Packing Configuration
Menyimpan konfigurasi packing tambahan.
```sql
ALTER TABLE menu ADD COLUMN extra_packing_json TEXT; 
-- Format JSON: { type: "plastik", quantity: 1, duration_per_item_seconds: 5 }
```

### E. Delivery Waves
Menyimpan jadwal pengiriman bertahap.
```sql
CREATE TABLE delivery_waves (
    id TEXT PRIMARY KEY,
    plan_id TEXT,
    wave_number INTEGER, -- 1, 2, 3
    target_time TEXT, -- "09:00"
    portion_count INTEGER, -- 500
    driver_id TEXT -- Assigned Driver
);
```

### F. Draft Plan
Tempat user "bermain" strategi sebelum finalisasi.
```sql
CREATE TABLE production_drafts (
    id TEXT PRIMARY KEY,
    plan_date TEXT,
    data_json TEXT, -- Menyimpan struktur timeline sementara (drag-and-drop state)
    status TEXT -- 'DRAFT', 'PUBLISHED'
);
```

---

## 3. Implementasi UI/UX

### Fase 1: Konfigurasi (User Input - Master Data)
Halaman `Kitchen Setup` & `Menu Management` akan diperbarui.

1.  **Inventory Alat (Setup)**:
    *   User input: "Saya punya 4 Kompor High Pressure, 2 Steamer".
    *   *Disimpan di `kitchen_equipment`*.
2.  **Jam Kerja (Setup)**:
    *   User input: "Prep mulai jam 2 pagi, Masak mulai jam 5 pagi".
    *   *Disimpan di `shifts`*.
3.  **Resep Detail (Menu)**:
    *   Saat buat menu "Ayam Goreng", user input Step:
        *   Step 1: Marinasi (Prep) - Durasi 10 menit.
        *   Step 2: Ungkep (Cook) - Pakai **Wajan Besar** - Kapasitas 50 porsi - Durasi 30 menit.
        *   Step 3: Goreng (Cook) - Pakai **Wajan Deep Fry** - Kapasitas 20 porsi - Durasi 15 menit.
    *   *Sistem menyimpan ini sebagai "Knowledge Base"*.
4.  **Ingredient Prep (Menu)**:
    *   Untuk "Wortel" di menu "Sop":
        *   [x] Kupas (5 menit/kg)
        *   [x] Potong Dadu (10 menit/kg)
        *   [ ] Cuci (Skip, beli bersih)
5.  **Extra Packing (Menu)**:
    *   User centang "Extra Packing?". Jika ya, pilih tipe (Plastik/Mika/Box) dan durasi tambahan.

### Fase 2: Perencanaan Harian (The Planner)
Saat ada order masuk, User masuk ke halaman **Drafting Mode**:

1.  **Tab 1: Order & Waves**
    *   Input Menu & Jumlah.
    *   Tombol "Add Delivery Wave" (+). User set jam & jumlah per kiriman.

2.  **Tab 2: Resource Allocation**
    *   Tabel List Menu.
    *   Kolom "Alat Utama": Read-only (dari Master).
    *   Kolom "Jumlah Alat": Input number (Default ambil dari Master, tapi bisa diedit).
    *   *Live Preview*: "Estimasi Selesai: 10:30".

3.  **Tab 3: Timeline & Assignments (The War Room)**
    *   Gantt Chart visual.
    *   User bisa geser blok waktu (Drag & Drop).
    *   **Shift Indicator**: Garis batas jam kerja 8 jam.
    *   **Idle Time Alert**: "Tim Prep nganggur dari jam 10:00. Assign bantuan?"
    *   **Action**: User geser tugas Goreng ke Wajan Cadangan.
    *   **Action**: User ubah jam mulai Ungkep jadi lebih pagi.

4.  **Publish**:
    *   Setelah user puas, klik "Finalize".
    *   Sistem generate Task real ke tiap divisi.

### Fase 3: Eksekusi & Feedback
*   Di lapangan, staff klik "Start" dan "Finish".
*   Data aktual ini disimpan untuk laporan KPI (Planned vs Actual).

---

## 4. Keunggulan Solusi Ini
1.  **Reuse Data**: Master data jadi default, tapi daily plan tanya user lagi.
2.  **Resource Allocation**: User tentukan jumlah alat per hari per menu.
3.  **Packing**: Ada konfigurasi detail extra packing.
4.  **Delivery**: Bisa multi-wave (berkala).
5.  **Divisi**: Batas tegas (Prep=Bahan, Cook=Bumbu/Masak).
6.  **Efisiensi Shift**: Fitur otomatisasi task bantuan jika tugas utama selesai cepat.
7.  **Komprehensif**: Mencakup Staff, Shift, dan Alat (V4 restored).

## Action Items (Prioritas)
1.  [Backend] Buat tabel `shifts`, `staff`, `delivery_waves`, `menu_ingredient_prep`, dan update `recipe_steps`.
2.  [Frontend] Update form Menu untuk input detail Prep, Step & Resource, serta Extra Packing.
3.  [Frontend] Buat halaman "Production Planner" (Draft Mode) dengan UI Drag-and-Drop.

---

# Rencana Lanjutan: Settings (UI + Infrastruktur)

Tujuan: halaman Settings jadi tempat konfigurasi yang jarang diubah tapi berdampak besar ke pengalaman user dan operasional (tema, bahasa, printer/dokumen, koneksi server/API, backup).

## 1) Theme (Theme Factory + Dark/Light)

### Scope
- User bisa memilih:
  - Mode: Light / Dark
  - Theme preset (dari theme factory) untuk mengubah “rasa” UI: warna utama, accent, background/card tone, font.

### UX
- Settings → Theme:
  - Dropdown “Theme Preset”
  - Toggle “Dark/Light”
  - Preview kecil (chip/mini card) dan tombol “Apply”

### Teknis (high level)
- Definisikan “theme tokens” (CSS variables) dan mekanisme apply:
  - Persist ke `localStorage` (mirip `app_theme`)
  - Aplikasikan ke `document.documentElement` via `data-theme` + variabel tambahan (mis. `data-preset`)
- Catatan: Saat ini sudah ada `data-theme="dark"` dan CSS variables untuk dark/light.

## 2) Translate Bahasa (i18n sederhana)

### Scope
- Wajib: Bahasa Indonesia (ID) dan English (EN).
- Bahasa lain opsional dan bisa ditambah beberapa saja setelah ID/EN stabil.
- Fokus label UI (judul, tombol, placeholder), bukan konten data.

### UX
- Settings → Language:
  - Dropdown bahasa
  - “Apply” + notifikasi sukses

### Teknis (high level)
- Buat dictionary per bahasa (key → string) dan helper `t(key)`:
  - Untuk HTML yang dirender via JS: gunakan `t('...')` saat template string.
  - Untuk HTML statis: gunakan atribut `data-i18n="..."` lalu fungsi scan/replace.
- Persist pilihan bahasa di `localStorage`.

## 3) Setting Printer & Dokumen

### Scope
- Default format dokumen: PDF/XLSX
- Template/format:
  - ukuran kertas (A4/Letter)
  - orientasi (portrait/landscape)
  - margin
  - header/footer (opsional)
- Default export path (khusus desktop/Tauri) atau “download behavior” (web).

### UX
- Settings → Printer & Dokumen:
  - “Default Document Format” (PDF/XLSX)
  - “Paper Size”, “Orientation”, “Margins”
  - “Test Print / Preview” (generate sample)

### Teknis (high level)
- Untuk web: gunakan browser print/preview; untuk PDF/XLSX tetap di backend seperti saat ini.
- Untuk desktop: pertimbangkan integrasi Tauri (print dialog / saving).

## 4) Server / API

### Scope
- “Server URL (API Base)” (sudah ada konsepnya di frontend)
- Tombol “Test Connection”:
  - ping `/health`
  - validasi `/api/*` reachable
- Info status: “Connected / Unauthorized / Wrong URL”

### UX
- Settings → Server/API:
  - Input URL
  - Tombol Test
  - Status badge

### Teknis (high level)
- Simpan URL ke `localStorage` (sudah ada key server URL di frontend).
- Test endpoint: `/health` (backend Rust) dan fallback yang ramah jika 404/connection error.

### Hak Akses (disarankan)
- Pengaturan Server/API sebaiknya dibatasi untuk role tertentu (mis. owner/admin) karena berdampak ke seluruh sistem.
- Untuk role non-admin: tampilkan read-only atau sembunyikan section ini.

## 5) Database (Backup & Restore)

### Scope
- Backup (export):
  - Backup data master (equipment, shifts, menu/ingredients, config)
  - Format: JSON + versi schema
- Restore (import):
  - Validasi versi schema
  - Mode: merge vs replace (ditentukan nanti)

### UX
- Settings → Database:
  - Tombol “Backup” (download file)
  - Upload file “Restore”
  - Ringkasan data yang akan direstore sebelum konfirmasi

### Teknis (high level)
- Jika backend utama Postgres:
  - Sediakan endpoint backup/restore berbasis JSON untuk subset tabel master
  - Audit log minimal (siapa, kapan)
- Jika mode legacy SQLite masih dipakai:
  - Tentukan strategi khusus (export table subset, bukan raw file sqlite).

### Hak Akses & Safety (wajib)
- Akses:
  - Backup: boleh untuk admin (opsional: boleh juga untuk supervisor).
  - Restore: hanya admin/owner.
- Safety untuk Restore:
  - Konfirmasi 2 langkah (mis. ketik RESTORE atau masukkan PIN admin) sebelum menjalankan restore.
  - Tampilkan “dry-run summary”: jumlah record per tabel yang akan diubah (insert/update/delete) sebelum user menekan tombol final.
  - Auto-backup sebelum restore (buat backup baru dengan timestamp) agar bisa rollback.
  - Validasi file: schema_version, tenant scope, serta ukuran file (hindari file terlalu besar).
  - Logging: simpan audit trail (user, waktu, source file name/hash).
