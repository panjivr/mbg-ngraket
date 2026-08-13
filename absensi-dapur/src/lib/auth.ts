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
  /** Sub-admin scoped: akses Keuangan (Akuntan/Berita Acara). */
  akses_keuangan?: boolean;
  /** Sub-admin scoped: akses Gizi (Ahli Gizi + Menu/Jadwal Menu). */
  akses_gizi?: boolean;
  /** Sub-admin scoped: akses modul Audit Dapur (auditor mutu). */
  akses_audit?: boolean;
  /** Petugas gudang keluar (hanya boleh barang keluar). */
  akses_gudang_keluar?: boolean;
  /** Peran HR: satu-satunya yang boleh kelola data gaji & slip. */
  is_hr?: boolean;
}

function secretKey(): Uint8Array {
  if (process.env.AUTH_SECRET) {
    return new TextEncoder().encode(process.env.AUTH_SECRET);
  }
  // Tanpa AUTH_SECRET: turunkan kunci dari DATABASE_URL (rahasia & stabil antar
  // deploy) agar token TIDAK bisa dipalsukan dengan konstanta publik, tanpa
  // memaksa downtime. Set AUTH_SECRET di Vercel untuk kunci khusus.
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    "";
  if (dbUrl) {
    console.warn(
      "[absensi] AUTH_SECRET tidak diset — memakai kunci turunan dari DATABASE_URL. Set AUTH_SECRET di Vercel.",
    );
    return new TextEncoder().encode("absensi-dapur::v1::" + dbUrl);
  }
  if (process.env.NODE_ENV !== "production") {
    return new TextEncoder().encode("dev-secret-change-me-please-32chars-min");
  }
  throw new Error("AUTH_SECRET (atau DATABASE_URL) wajib diset di produksi.");
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
        akses_keuangan: payload.akses_keuangan === true,
        akses_gizi: payload.akses_gizi === true,
    akses_audit: payload.akses_audit === true,
        is_hr: payload.is_hr === true,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;
