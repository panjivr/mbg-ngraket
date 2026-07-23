import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "absensi_session";
const SESSION_DAYS = 7;

export type Role = "admin" | "staff";

export interface SessionData {
  uid: number;
  username: string;
  nama: string;
  role: Role;
  /** Dapur/SPPG tempat akun bernaung (multi-tenant). */
  sppg_id?: number;
  /** Super admin pusat — bisa mengelola semua dapur. */
  is_super?: boolean;
  /** Sub-admin scoped: akses ke fitur Distribusi. */
  akses_distribusi?: boolean;
  /** Sub-admin scoped: akses ke fitur Laporan Harian. */
  akses_laporan?: boolean;
}

function secretKey(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV !== "production"
      ? "dev-secret-change-me-please-32chars-min"
      : "");
  if (!secret) {
    // Stable fallback so the app never crashes if AUTH_SECRET is missing in
    // production; sessions reset if it later changes. Set AUTH_SECRET to fix.
    console.warn(
      "[absensi] AUTH_SECRET tidak diset — memakai kunci fallback. Set AUTH_SECRET di Vercel.",
    );
    return new TextEncoder().encode(
      "absensi-dapur-fallback-key-please-set-AUTH_SECRET",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(data: SessionData): Promise<string> {
  return new SignJWT({ ...data })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

export async function verifySession(
  token: string | undefined,
): Promise<SessionData | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (
      typeof payload.uid === "number" &&
      typeof payload.username === "string" &&
      typeof payload.nama === "string" &&
      (payload.role === "admin" || payload.role === "staff")
    ) {
      return {
        uid: payload.uid,
        username: payload.username,
        nama: payload.nama,
        role: payload.role,
        sppg_id: typeof payload.sppg_id === "number" ? payload.sppg_id : undefined,
        is_super: payload.is_super === true,
        akses_distribusi: payload.akses_distribusi === true,
        akses_laporan: payload.akses_laporan === true,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;
