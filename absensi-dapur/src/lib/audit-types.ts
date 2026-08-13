// Tipe bersama untuk modul Audit Dapur. Mirror langsung dari skema tabel di
// src/lib/db.ts (audit_sesi, audit_observasi, ...). Tanggal/timestamp direpresentasi
// sebagai string ISO ("YYYY-MM-DD" untuk DATE, ISO penuh untuk TIMESTAMPTZ).

import type { AreaKey } from "./audit-seed";
import type { KategoriTemuan, PenyebabWaste, Tingkat } from "./audit-risk";

export type SesiMode = "lapangan" | "dokumen";
export type JawabanChecklist = "ya" | "tidak" | "na";
export type TimelineStatus = "normal" | "over_time" | "lebih_awal";
export type TemuanStatus = "open" | "improvement" | "closed";
export type FollowupStatus = "belum_sesuai" | "improvement" | "closed" | "masih_terjadi";

export interface ChecklistItem {
  pertanyaan: string;
  jawaban: JawabanChecklist;
  catatan: string;
}

export interface FotoBukti {
  url: string;
  keterangan_bukti: string;
}

export interface AuditSesi {
  id: number;
  sppg_id: number | null;
  auditor_id: number | null;
  tanggal: string; // YYYY-MM-DD
  mode: SesiMode;
  ringkasan: string;
  dikirim_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditObservasi {
  id: number;
  sesi_id: number;
  area: AreaKey | string;
  checklist: ChecklistItem[];
  catatan: string;
  foto: FotoBukti[];
  updated_at: string;
}

export interface AuditTimeline {
  id: number;
  sesi_id: number;
  proses: string;
  mulai: string | null; // HH:mm[:ss]
  selesai: string | null;
  durasi_menit: number | null; // GENERATED STORED
  status: TimelineStatus;
  catatan: string;
  urutan: number;
}

export interface AuditTemuan {
  id: number;
  sppg_id: number | null;
  sesi_id: number | null;
  auditor_id: number | null;
  waktu: string;
  area: string;
  kategori: KategoriTemuan | string;
  observasi: string;
  statement_: string;
  bukti: string;
  foto: FotoBukti[];
  standar_sop: string;
  gap: string;
  kemungkinan: number; // 1–5
  dampak: number; // 1–5
  risk_score: number; // GENERATED STORED = kemungkinan * dampak
  tingkat: Tingkat | string;
  status: TemuanStatus;
  rekomendasi: string;
  created_at: string;
  updated_at: string;
}

export interface AuditTemuanFollowup {
  id: number;
  temuan_id: number;
  minggu_ke: number;
  tanggal_cek: string; // YYYY-MM-DD
  status: FollowupStatus;
  catatan: string;
  created_at: string;
}

export interface AuditFoodWaste {
  id: number;
  sesi_id: number;
  jenis: string;
  penyebab: PenyebabWaste | string;
  jumlah: number;
  satuan: string;
  catatan: string;
  foto: FotoBukti[];
}

export interface AuditCrossCheck {
  id: number;
  sesi_id: number;
  bahan: string;
  satuan: string;
  po: number;
  receiving: number;
  storage: number;
  production: number;
  waste: number;
  output_porsi: number;
  gap_catatan: string;
}

/** Jenis food waste umum (dipakai sebagai opsi dropdown di form waste). */
export const JENIS_WASTE = [
  "bahan_terbuang",
  "gagal_masak",
  "tumpah",
  "rusak",
  "sisa",
  "reject",
  "box_rusak",
  "penggunaan_berlebih",
] as const;
export type JenisWaste = (typeof JENIS_WASTE)[number];

export const JENIS_WASTE_LABEL: Record<JenisWaste, string> = {
  bahan_terbuang: "Bahan Terbuang",
  gagal_masak: "Gagal Masak",
  tumpah: "Tumpah",
  rusak: "Rusak",
  sisa: "Sisa",
  reject: "Reject",
  box_rusak: "Box Rusak",
  penggunaan_berlebih: "Penggunaan Berlebih",
};
