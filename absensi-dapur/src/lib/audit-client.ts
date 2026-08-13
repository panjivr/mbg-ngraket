"use client";

/**
 * Helper fetch sisi klien untuk modul Audit Dapur. Semua route audit memakai
 * envelope polos (`ok({ ... })` → body langsung data; error → `{ error }` + status).
 * Fungsi di sini membungkus fetch supaya komponen cukup `await auditGet(...)`.
 */
import type {
  AuditSesi,
  AuditObservasi,
  AuditTimeline,
  AuditTemuan,
  AuditTemuanFollowup,
  AuditFoodWaste,
  AuditCrossCheck,
  SesiMode,
  ChecklistItem,
  FotoBukti,
} from "./audit-types";

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error((body.error as string) || `Gagal memuat (${res.status}).`);
  }
  return body as T;
}

const j = (data: unknown): RequestInit => ({ body: JSON.stringify(data) });

// ---- Sesi -------------------------------------------------------------------
export function getSesi(tanggal: string): Promise<{ sesi: AuditSesi | null; observasi?: AuditObservasi[] }> {
  return req(`/api/audit/sesi?tanggal=${encodeURIComponent(tanggal)}`);
}
export function buatSesi(payload: { tanggal?: string; mode?: SesiMode }): Promise<{ sesi: AuditSesi }> {
  return req(`/api/audit/sesi`, { method: "POST", ...j(payload) });
}
export function updateSesi(payload: { id: number; ringkasan?: string; kirim?: boolean }): Promise<{ sesi: AuditSesi }> {
  return req(`/api/audit/sesi`, { method: "PUT", ...j(payload) });
}

// ---- Observasi --------------------------------------------------------------
export function getObservasi(sesiId: number): Promise<{ observasi: AuditObservasi[] }> {
  return req(`/api/audit/observasi?sesi_id=${sesiId}`);
}
export function simpanObservasi(payload: {
  sesi_id: number;
  area: string;
  checklist?: ChecklistItem[];
  catatan?: string;
  foto?: FotoBukti[];
}): Promise<{ observasi: AuditObservasi }> {
  return req(`/api/audit/observasi`, { method: "PUT", ...j(payload) });
}

// ---- Timeline ---------------------------------------------------------------
export function getTimeline(sesiId: number): Promise<{ timeline: AuditTimeline[] }> {
  return req(`/api/audit/timeline?sesi_id=${sesiId}`);
}
export function simpanTimeline(payload: {
  sesi_id: number;
  baris: { proses: string; mulai?: string; selesai?: string; status?: string; catatan?: string }[];
}): Promise<{ timeline: AuditTimeline[] }> {
  return req(`/api/audit/timeline`, { method: "PUT", ...j(payload) });
}

// ---- Temuan -----------------------------------------------------------------
export function getTemuan(params: { sesi_id?: number; status?: string; area?: string } = {}): Promise<{ temuan: AuditTemuan[] }> {
  const q = new URLSearchParams();
  if (params.sesi_id) q.set("sesi_id", String(params.sesi_id));
  if (params.status) q.set("status", params.status);
  if (params.area) q.set("area", params.area);
  const qs = q.toString();
  return req(`/api/audit/temuan${qs ? `?${qs}` : ""}`);
}
export function buatTemuan(payload: Record<string, unknown>): Promise<{ temuan: AuditTemuan }> {
  return req(`/api/audit/temuan`, { method: "POST", ...j(payload) });
}
export function updateTemuan(id: number, payload: Record<string, unknown>): Promise<{ temuan: AuditTemuan }> {
  return req(`/api/audit/temuan/${id}`, { method: "PUT", ...j(payload) });
}
export function hapusTemuan(id: number): Promise<{ ok: boolean }> {
  return req(`/api/audit/temuan/${id}`, { method: "DELETE" });
}

// ---- Follow-up --------------------------------------------------------------
export function getFollowup(temuanId: number): Promise<{ followup: AuditTemuanFollowup[] }> {
  return req(`/api/audit/temuan/${temuanId}/followup`);
}
export function buatFollowup(
  temuanId: number,
  payload: { minggu_ke?: number; tanggal_cek?: string; status: string; catatan?: string },
): Promise<{ followup: AuditTemuanFollowup; temuan: AuditTemuan }> {
  return req(`/api/audit/temuan/${temuanId}/followup`, { method: "POST", ...j(payload) });
}

// ---- Laporan (rekap lintas sesi) --------------------------------------------
export interface AuditLaporanStats {
  total: number;
  tingkat: { minor: number; mayor: number; kritis: number };
  status: { open: number; improvement: number; closed: number };
  kategori: Record<string, number>;
  area: Record<string, number>;
  sesi_terkirim: number;
}
export interface AuditLaporanSppg {
  nama: string;
  alamat: string;
  kepala_sppg: string;
}
export interface AuditLaporanResponse {
  dari: string | null;
  sampai: string | null;
  sppg: AuditLaporanSppg | null;
  temuan: AuditTemuan[];
  stats: AuditLaporanStats;
}
export function getLaporan(
  params: { dari?: string; sampai?: string } = {},
): Promise<AuditLaporanResponse> {
  const q = new URLSearchParams();
  if (params.dari) q.set("dari", params.dari);
  if (params.sampai) q.set("sampai", params.sampai);
  const qs = q.toString();
  return req(`/api/audit/laporan${qs ? `?${qs}` : ""}`);
}

// ---- Food waste -------------------------------------------------------------
export function getWaste(sesiId: number): Promise<{ waste: AuditFoodWaste[] }> {
  return req(`/api/audit/waste?sesi_id=${sesiId}`);
}
export function simpanWaste(payload: {
  sesi_id: number;
  baris: { jenis: string; penyebab?: string; jumlah?: number; satuan?: string; catatan?: string }[];
}): Promise<{ waste: AuditFoodWaste[] }> {
  return req(`/api/audit/waste`, { method: "PUT", ...j(payload) });
}

// ---- Cross-check ------------------------------------------------------------
export function getCrossCheck(sesiId: number): Promise<{ cross_check: AuditCrossCheck[] }> {
  return req(`/api/audit/cross-check?sesi_id=${sesiId}`);
}
export function simpanCrossCheck(payload: {
  sesi_id: number;
  baris: Record<string, unknown>[];
}): Promise<{ cross_check: AuditCrossCheck[] }> {
  return req(`/api/audit/cross-check`, { method: "PUT", ...j(payload) });
}
