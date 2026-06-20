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
