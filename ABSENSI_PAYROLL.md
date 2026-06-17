# Absensi & Payroll (HR)

Dokumen ini menjelaskan modul HR untuk absensi dan payroll pada jalur backend Rust (Postgres) serta UI legacy.

## Gambaran

Tujuan modul:

- Menyimpan master data staff & shift.
- Mencatat absensi harian (rekap) dan/atau event clock-in/out.
- Menghitung payroll period berdasarkan absensi + rate (kompensasi).
- Mencatat payroll yang sudah dipost ke modul finance.

Semua endpoint bersifat multi-tenant dan wajib mengirim header `x-tenant-id`. Endpoint HR/payroll juga mewajibkan `Authorization: Bearer <JWT>` dengan role yang lolos gate coordinator.

## Skema Data (Postgres)

Migration: `backend/migrations/16_attendance_payroll.sql`

- `staff_shift_assignments`: penugasan shift per staff per tanggal.
- `attendance_events`: event clock-in/out dan break.
- `attendance_daily`: rekap absensi harian (menit kerja, telat, lembur, status).
- `staff_compensation`: rate staff (HOURLY/DAILY/MONTHLY) efektif per tanggal.
- `payroll_periods`: periode payroll.
- `payroll_items`: item payroll per staff per periode.
- `finance_transactions`: ditambah kolom `payroll_period_id` dan `staff_id` (nullable).

## Konvensi Event Absensi

`attendance_events.event_type` yang dipakai UI dan recompute:

- `CLOCK_IN`
- `CLOCK_OUT`
- `BREAK_START`
- `BREAK_END`

Catatan:

- Waktu event disimpan sebagai `timestamptz`.
- Perhitungan `work_date` untuk recompute menggunakan zona waktu `Asia/Jakarta`.

## Endpoint API

Prefix API: `/api`

### Staff & Shifts

- `GET /api/staff`
- `POST /api/staff` (payload mendukung `skills: string[]` atau `skills_json`)
- `PUT /api/staff/:id`
- `DELETE /api/staff/:id`

- `GET /api/shifts`
- `POST /api/shifts`
- `PUT /api/shifts/:id`
- `DELETE /api/shifts/:id`

### Absensi

- Shift assignment
  - `GET /api/attendance/assignments?work_date=YYYY-MM-DD&staff_id=<uuid?>`
  - `POST /api/attendance/assignments`
  - `PUT /api/attendance/assignments/:id`
  - `DELETE /api/attendance/assignments/:id`

- Daily rekap
  - `GET /api/attendance/daily?work_date=YYYY-MM-DD&staff_id=<uuid?>`
  - `POST /api/attendance/daily` (upsert by `(tenant_id, staff_id, work_date)`)

- Events
  - `GET /api/attendance/events?from=<rfc3339?>&to=<rfc3339?>&staff_id=<uuid?>`
  - `POST /api/attendance/events`

- Recompute daily dari events
  - `POST /api/attendance/recompute`
    - body: `{ staff_id?: uuid, from_date: 'YYYY-MM-DD', to_date: 'YYYY-MM-DD' }`
    - output: `{ updated_days, skipped_days }`

### Payroll

- Rate/kompensasi
  - `GET /api/payroll/compensation`
  - `POST /api/payroll/compensation`
  - `PUT /api/payroll/compensation/:id`
  - `DELETE /api/payroll/compensation/:id`

- Period
  - `GET /api/payroll/periods`
  - `POST /api/payroll/periods` (validasi `start_date <= end_date`)
  - `GET /api/payroll/periods/:id/items`
  - `POST /api/payroll/periods/:id/items` (upsert manual per staff)
  - `POST /api/payroll/periods/:id/calculate` (mengisi/overwrite item dari absensi + rate)
  - `POST /api/payroll/periods/:id/post` (set status `POSTED` + buat transaksi finance)

### Finance (terkait payroll)

- `GET /api/finance/transactions`
- `GET /api/finance/summary` (termasuk breakdown)
- `POST /api/finance/expense`

## Logika Perhitungan Payroll

`POST /api/payroll/periods/:id/calculate`:

- Mengambil `attendance_daily` pada rentang periode.
- Mengambil rate terbaru dari `staff_compensation` dengan `effective_from <= end_date`.
- Menghitung gross:
  - `HOURLY`: `rate * minutes_worked / 60`
  - `DAILY`: `rate * days_present`
  - `MONTHLY`: pro-rate `rate * days_present / working_days` (working_days = hari kerja periode, exclude Sunday)
- Mengisi `breakdown_json` untuk audit (minutes, days, working_days, jenis kalkulasi).

## UI Legacy

Menu `Staff Management` sekarang berisi tab:

- Staff
- Shifts
- Absensi
- Payroll
- Kinerja Staff

UI berada di:

- `frontend/app.html` (section `#view-staff`)
- `frontend/js/views/hr.js`

## Portal Staff (Clock-in/Clock-out)

Untuk kebutuhan absensi dari sisi staff, tersedia portal khusus staff:

- URL: `/staff` atau `/staff/attendance`
- File UI:
  - `frontend/staff.html`
  - `frontend/js/staff_attendance.js`

Login staff menggunakan:

- `POST /auth/staff/code-login` dengan body `{ tenant_id, staff_code, pin }`.

Catatan implementasi:

- Admin mengisi `staff_code` dan `PIN` pada form Staff di modul HR (tab Staff).
- Saat staff mengirim event absensi, portal mewajibkan foto (kamera atau upload).
- Foto disimpan di disk sebagai file dan URL-nya disimpan ke `attendance_events.meta_json.photo_url`.
