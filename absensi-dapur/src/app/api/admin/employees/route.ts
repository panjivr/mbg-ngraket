import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { ok, fail, route } from "@/lib/api";
import type { User } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toDivisiId(v: unknown): number | null {
  if (v === null || v === undefined || v === "" || v === "0") return null;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function toTanggal(v: unknown): string | null {
  if (typeof v === "string" && DATE_RE.test(v)) return v;
  return null;
}
function toTempat(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}
/** Normalisasi jenis kelamin ke 'L' / 'P' (atau null). Menerima banyak variasi. */
function toKelamin(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().toLowerCase();
  if (!s) return null;
  if (s === "l" || s.startsWith("laki") || s === "pria" || s === "male" || s === "m") return "L";
  if (s === "p" || s.startsWith("perempuan") || s === "wanita" || s === "female" || s === "f") return "P";
  return null;
}

export const GET = route(async () => {
  const admin = await requireAdmin();
  const rows = await query<User>(
    `SELECT u.id, u.nama, u.username, u.role, u.jabatan, u.nip, u.aktif,
            u.created_at, u.divisi_id, u.tempat_lahir, u.tanggal_lahir, u.jenis_kelamin,
            d.nama AS divisi_nama
       FROM users u
       LEFT JOIN divisi d ON d.id = u.divisi_id
      WHERE u.sppg_id = $1
      ORDER BY u.role DESC, u.nama ASC`,
    [admin.sppg_id],
  );
  return ok({ employees: rows });
});

export const POST = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const body = await req.json().catch(() => ({}));

  const nama = String(body.nama ?? "").trim();
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const role = body.role === "admin" ? "admin" : "staff";
  const jabatan = body.jabatan ? String(body.jabatan).trim() : null;
  const nip = body.nip ? String(body.nip).trim() : null;
  const aktif = body.aktif === false ? false : true;
  const divisi_id = toDivisiId(body.divisi_id);
  const tempat_lahir = toTempat(body.tempat_lahir);
  const tanggal_lahir = toTanggal(body.tanggal_lahir);
  const jenis_kelamin = toKelamin(body.jenis_kelamin);

  if (!nama || !username || !password) {
    return fail(400, "Nama, username, dan password wajib diisi.");
  }
  if (password.length < 6) {
    return fail(400, "Password minimal 6 karakter.");
  }
  if (!/^[a-z0-9._-]+$/.test(username)) {
    return fail(400, "Username hanya boleh huruf kecil, angka, titik, _ atau -.");
  }

  const dup = await query<{ id: number }>(
    `SELECT id FROM users WHERE lower(username) = $1`,
    [username],
  );
  if (dup.length) return fail(409, "Username sudah dipakai.");

  // Pastikan divisi (bila dipilih) milik dapur admin ini.
  let divId = divisi_id;
  if (divId !== null) {
    const okDiv = await query<{ id: number }>(
      `SELECT id FROM divisi WHERE id = $1 AND sppg_id = $2`,
      [divId, admin.sppg_id],
    );
    if (!okDiv.length) divId = null;
  }

  const hash = await hashPassword(password);
  const rows = await query<User>(
    `INSERT INTO users (nama, username, password_hash, role, jabatan, nip, aktif, divisi_id, tempat_lahir, tanggal_lahir, jenis_kelamin, sppg_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id, nama, username, role, jabatan, nip, aktif, created_at, divisi_id, tempat_lahir, tanggal_lahir, jenis_kelamin`,
    [nama, username, hash, role, jabatan, nip, aktif, divId, tempat_lahir, tanggal_lahir, jenis_kelamin, admin.sppg_id],
  );
  return ok({ employee: rows[0] }, { status: 201 });
});
