import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import type { Role } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface UserRow {
  id: number;
  nama: string;
  username: string;
  password_hash: string;
  role: Role;
  aktif: boolean;
  sppg_id: number | null;
  is_super: boolean;
  akses_distribusi: boolean;
  akses_laporan: boolean;
}

export const POST = route(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!username || !password) {
    return fail(400, "Username dan password wajib diisi.");
  }

  const rows = await query<UserRow>(
    `SELECT id, nama, username, password_hash, role, aktif, sppg_id, is_super, akses_distribusi, akses_laporan
       FROM users WHERE lower(username) = $1 LIMIT 1`,
    [username],
  );
  const user = rows[0];

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return fail(401, "Username atau password salah.");
  }
  if (!user.aktif) {
    return fail(403, "Akun nonaktif. Hubungi admin.");
  }

  const session = {
    uid: user.id,
    username: user.username,
    nama: user.nama,
    role: user.role,
    sppg_id: user.sppg_id ?? 1,
    is_super: !!user.is_super,
    akses_distribusi: !!user.akses_distribusi,
    akses_laporan: !!user.akses_laporan,
  };
  await setSessionCookie(session);
  return ok({ user: session });
});
