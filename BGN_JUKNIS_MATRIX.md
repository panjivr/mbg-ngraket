# Matriks Pemetaan Juknis BGN MBG

Acuan: Keputusan Kepala BGN Nomor 401.1 Tahun 2025 (status berlaku).

## Pemetaan indikator ke implementasi sistem

| Indikator/ketentuan juknis | Role utama | Data source | Endpoint/API | UI section |
|---|---|---|---|---|
| Ketepatan waktu distribusi makanan | Kepala SPPG, Asisten Lapangan, Tauwas Daerah | `batches`, `pm_distribution_events` | `/api/reports/divisions/performance`, `/api/penerima-manfaat/distribution-summary` | `Reports`, `Distribusi` |
| Jumlah penerima manfaat dilayani sesuai target | Kepala SPPG, Yayasan, Tauwas Daerah | `pm_lokasi`, `pm_distribution_events` | `/api/penerima-manfaat/distribution-summary` | `Penerima Manfaat`, `Reports` |
| Kepatuhan SPPG pada SOP produksi | Kepala SPPG, Koordinator Divisi | `tasks`, `batches`, `daily_reports` | `/api/reports/preview/staff`, `/api/reports/daily` | `Performance`, `Reports` |
| Kepatuhan keamanan pangan dan sanitasi | Ahli Gizi, Kepala SPPG | `daily_reports.metrics`, `daily_reports.quality_warnings` | `/api/reports/daily`, `/api/reports/monthly/compile` | `NutriSurvey`, `Reports` |
| Pelaporan harian internal SPPG | Kepala SPPG, Admin SPPG | `daily_reports` (period_type=`daily`) | `/api/reports/daily` | `Reports` |
| Pelaporan bulanan Tauwas Daerah ke pusat | Yayasan, Kepala SPPG, Tauwas Daerah | `daily_reports` -> agregat `monthly` | `/api/reports/monthly/compile` | `Reports` |
| Evaluasi triwulanan berbasis data nasional | Yayasan, Tauwas Pusat/Daerah | `daily_reports` -> agregat `quarterly` | `/api/reports/quarterly/compile` | `Reports` |
| Kualitas data dan kesiapan rilis website | Admin/Kepala SPPG | cek lintas tabel operasional | `/api/compliance/guardrails/smoke-check` | `Settings` (operasional devops) |
| SOP operasional & dokumen Juknis (tautan resmi + PDF lokal opsional) | Semua peran (baca), Admin (arsip PDF) | `frontend/docs/juknis-bgn/manifest.json`, `sop-internal-catalog.json` | `GET /api/juknis-library`, statis `/docs/juknis-bgn/*` | `Jobdesc & Tugas` |

## Role canonical sistem (target implementasi)

- `kepala_sppg`: kendali operasional SPPG, approval pelaporan.
- `asisten_lapangan`: eksekusi distribusi lapangan dan update bukti layanan.
- `ahli_gizi`: validasi gizi, keamanan pangan, review mutu menu.
- `akuntan`: pelaporan keuangan dan rekonsiliasi.
- `yayasan`: pengawasan kinerja lintas SPPG dan pelaporan periodik.
- `admin`: administrasi data, bukan otoritas teknis seluruh domain.
- `koordinator_divisi`: supervisi pelaksanaan divisi produksi/distribusi.
- `driver`: eksekusi rute distribusi.

## Pembedaan tampilan di aplikasi (kinerja per divisi vs per orang)

| UI | Unit analisis | Endpoint utama | Tautan Juknis (baris tabel) |
|----|-----------------|----------------|----------------------------|
| Menu **Kinerja Operasi (Divisi)** | Per **divisi** (tata kerja) | `GET /api/performance/divisions`, `POST /api/performance/division-kpi` | Kehadiran (absensi); kedisiplinan / 5R / improvement (input koordinator) — **tanpa** tabel batch produksi |
| **Manajemen Staff → KPI Staff** | **Batch/SOP + skor** | `GET /api/reports/divisions/performance` (batch per divisi), `GET /api/performance/staff` | SOP/lini produksi (batch on-time) + agregat formula BGN (SOP task, distribusi, cakupan, keamanan) per baris staff |

Dokumen Juknis resmi: portal [Dokumen Juknis BGN](https://www.bgn.go.id/juknis) — pilih peraturan/keputusan terkait MBG/SPPG (nomor spesifik mengikuti revisi terbaru; matriks ini merujuk **Keputusan Kepala BGN 401.1 Tahun 2025** sebagai label acuan).

## Catatan implementasi

- KPI wajib punya formula dan sumber data yang eksplisit, tidak boleh random/mock.
- Endpoint report wajib mengembalikan metadata kualitas data (`generated_at`, `row_counts`, `warnings`).
- Publikasi report periodik harus melewati guardrail kualitas minimum.
