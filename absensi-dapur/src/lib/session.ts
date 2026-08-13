import { cookies } from "next/headers";
import { query } from "./db";
import { getUserAccess } from "./user-access";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSession,
  verifySession,
  type SessionData,
} from "./auth";

/** Read + verify the session inside a Route Handler / Server Component. */
export async function getSession(): Promise<SessionData | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

export async function setSessionCookie(data: SessionData): Promise<void> {
  const token = await signSession(data);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

/** Require a session; throw 401-style sentinel handled by route wrapper. */
export async function requireSession(): Promise<SessionData> {
  const s = await getSession();
  if (!s) throw new HttpError(401, "Belum login.");
  // Backfill sppg_id/is_super untuk token lama (sebelum fitur multi-dapur).
  if (s.sppg_id == null || s.is_super === undefined) {
    const r = await query<{ sppg_id: number | null; is_super: boolean }>(
      `SELECT sppg_id, is_super FROM users WHERE id = $1`,
      [s.uid],
    );
    s.sppg_id = r[0]?.sppg_id ?? 1;
    s.is_super = !!r[0]?.is_super;
  }
  return s;
}

export async function requireAdmin(): Promise<SessionData> {
  const s = await requireSession();
  if (s.role !== "admin") throw new HttpError(403, "Khusus admin.");
  return s;
}

export type AksesArea = "distribusi" | "laporan" | "keuangan" | "gizi" | "audit";

/**
 * Izinkan admin penuh ATAU sub-admin dengan akses area tertentu. Menerima satu
 * area atau daftar area (any-of: cukup punya salah satu). Flag SELALU dibaca
 * ulang dari DB agar pemberian/pencabutan akses langsung berlaku tanpa login
 * ulang (token berumur 7 hari bisa basi — sama alasannya dengan requireHr).
 */
export async function requireAkses(area: AksesArea | AksesArea[]): Promise<SessionData> {
  const s = await requireSession();
  if (s.role === "admin") return s;
  const areas = Array.isArray(area) ? area : [area];
  // Flag akses dibaca via cache in-memory pendek (getUserAccess) — hemat 1
  // round-trip DB tiap request; di-invalidasi saat hak akses pegawai diubah.
  const acc = await getUserAccess(s.uid);
  s.akses_distribusi = !!acc?.akses_distribusi;
  s.akses_laporan = !!acc?.akses_laporan;
  s.akses_keuangan = !!acc?.akses_keuangan;
  s.akses_gizi = !!acc?.akses_gizi;
  s.akses_audit = !!acc?.akses_audit;
  const flags: Record<AksesArea, boolean> = {
    distribusi: s.akses_distribusi,
    laporan: s.akses_laporan,
    keuangan: s.akses_keuangan,
    gizi: s.akses_gizi,
    audit: s.akses_audit,
  };
  const ok = areas.some((a) => flags[a]);
  if (!ok) throw new HttpError(403, "Tidak punya akses ke fitur ini.");
  return s;
}

/**
 * Peran HR — satu-satunya yang boleh mengelola data gaji & pengaturan slip.
 * Admin biasa TIDAK cukup; wajib flag is_hr. Selalu diverifikasi dari DB (bukan
 * token) agar pemberian/pencabutan peran HR langsung berlaku tanpa login ulang —
 * token berumur 7 hari, jadi flag di token bisa basi.
 */
export async function requireHr(): Promise<SessionData> {
  const s = await requireSession();
  const acc = await getUserAccess(s.uid);
  s.is_hr = !!acc?.is_hr;
  if (!s.is_hr) throw new HttpError(403, "Khusus HR.");
  return s;
}

/**
 * Akses gudang. "full" = admin atau admin penerimaan (akses_laporan) —
 * kelola barang, masuk, keluar, opname. "keluar" = full ATAU petugas gudang
 * keluar (persiapan/pengolahan/pemorsian). "read" = boleh melihat daftar stok.
 */
export async function requireGudang(mode: "full" | "keluar" | "read"): Promise<SessionData> {
  const s = await requireSession();
  if (s.role === "admin") return s;
  const acc = await getUserAccess(s.uid);
  s.akses_laporan = !!acc?.akses_laporan;
  s.akses_gudang_keluar = !!acc?.akses_gudang_keluar;
  const full = !!s.akses_laporan;
  const keluar = full || !!s.akses_gudang_keluar;
  const ok = mode === "full" ? full : keluar;
  if (!ok) throw new HttpError(403, "Tidak punya akses gudang.");
  return s;
}

/** Hanya super admin pusat. */
export async function requireSuper(): Promise<SessionData> {
  const s = await requireAdmin();
  if (!s.is_super) throw new HttpError(403, "Khusus super admin.");
  return s;
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
