import { cookies } from "next/headers";
import { query } from "./db";
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

/**
 * Izinkan admin penuh ATAU sub-admin dengan akses area tertentu
 * ("distribusi" | "laporan"). Backfill flag dari DB bila token lama.
 */
export async function requireAkses(area: "distribusi" | "laporan"): Promise<SessionData> {
  const s = await requireSession();
  if (s.role === "admin") return s;
  if (s.akses_distribusi === undefined || s.akses_laporan === undefined) {
    const r = await query<{ akses_distribusi: boolean; akses_laporan: boolean }>(
      `SELECT akses_distribusi, akses_laporan FROM users WHERE id = $1`,
      [s.uid],
    );
    s.akses_distribusi = !!r[0]?.akses_distribusi;
    s.akses_laporan = !!r[0]?.akses_laporan;
  }
  const ok = area === "distribusi" ? s.akses_distribusi : s.akses_laporan;
  if (!ok) throw new HttpError(403, "Tidak punya akses ke fitur ini.");
  return s;
}

/**
 * Peran HR — satu-satunya yang boleh mengelola data gaji & pengaturan slip.
 * Admin biasa TIDAK cukup; wajib flag is_hr. Backfill dari DB bila perlu.
 */
export async function requireHr(): Promise<SessionData> {
  const s = await requireSession();
  if (s.is_hr === undefined) {
    const r = await query<{ is_hr: boolean }>(
      `SELECT is_hr FROM users WHERE id = $1`,
      [s.uid],
    );
    s.is_hr = !!r[0]?.is_hr;
  }
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
  if (s.akses_laporan === undefined || s.akses_gudang_keluar === undefined) {
    const r = await query<{ akses_laporan: boolean; akses_gudang_keluar: boolean }>(
      `SELECT akses_laporan, akses_gudang_keluar FROM users WHERE id = $1`,
      [s.uid],
    );
    s.akses_laporan = !!r[0]?.akses_laporan;
    s.akses_gudang_keluar = !!r[0]?.akses_gudang_keluar;
  }
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
