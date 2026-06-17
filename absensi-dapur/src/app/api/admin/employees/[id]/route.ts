import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { ok, fail, route } from "@/lib/api";
import type { User } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route(async (req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");

  const body = await req.json().catch(() => ({}));
  const existing = (
    await query<User>(`SELECT * FROM users WHERE id = $1`, [id])
  )[0];
  if (!existing) return fail(404, "Pegawai tidak ditemukan.");

  const nama = body.nama !== undefined ? String(body.nama).trim() : existing.nama;
  const jabatan =
    body.jabatan !== undefined
      ? body.jabatan
        ? String(body.jabatan).trim()
        : null
      : existing.jabatan;
  const nip =
    body.nip !== undefined ? (body.nip ? String(body.nip).trim() : null) : existing.nip;
  const role =
    body.role !== undefined
      ? body.role === "admin"
        ? "admin"
        : "staff"
      : existing.role;
  const aktif = body.aktif !== undefined ? Boolean(body.aktif) : existing.aktif;

  let username = existing.username;
  if (body.username !== undefined) {
    username = String(body.username).trim().toLowerCase();
    if (!/^[a-z0-9._-]+$/.test(username)) {
      return fail(400, "Format username tidak valid.");
    }
    const dup = await query<{ id: number }>(
      `SELECT id FROM users WHERE lower(username) = $1 AND id <> $2`,
      [username, id],
    );
    if (dup.length) return fail(409, "Username sudah dipakai.");
  }

  // Guard: jangan menonaktifkan / menurunkan admin terakhir.
  if ((existing.role === "admin" && role !== "admin") || (existing.role === "admin" && !aktif)) {
    const otherAdmins = await query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM users WHERE role = 'admin' AND aktif = TRUE AND id <> $1`,
      [id],
    );
    if (Number(otherAdmins[0].c) === 0) {
      return fail(409, "Tidak bisa menonaktifkan/menurunkan admin terakhir.");
    }
  }

  let passwordClause = "";
  const paramsArr: unknown[] = [nama, username, role, jabatan, nip, aktif];
  if (body.password) {
    if (String(body.password).length < 6) {
      return fail(400, "Password minimal 6 karakter.");
    }
    const hash = await hashPassword(String(body.password));
    paramsArr.push(hash);
    passwordClause = `, password_hash = $${paramsArr.length}`;
  }
  paramsArr.push(id);

  const rows = await query<User>(
    `UPDATE users SET nama=$1, username=$2, role=$3, jabatan=$4, nip=$5, aktif=$6${passwordClause}
       WHERE id = $${paramsArr.length}
     RETURNING id, nama, username, role, jabatan, nip, aktif, created_at`,
    paramsArr,
  );
  void admin;
  return ok({ employee: rows[0] });
});

export const DELETE = route(async (_req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  if (id === admin.uid) return fail(409, "Tidak bisa menghapus akun sendiri.");

  const target = (
    await query<User>(`SELECT id, role FROM users WHERE id = $1`, [id])
  )[0];
  if (!target) return fail(404, "Pegawai tidak ditemukan.");

  if (target.role === "admin") {
    const otherAdmins = await query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM users WHERE role = 'admin' AND id <> $1`,
      [id],
    );
    if (Number(otherAdmins[0].c) === 0) {
      return fail(409, "Tidak bisa menghapus admin terakhir.");
    }
  }

  await query(`DELETE FROM users WHERE id = $1`, [id]);
  return ok({ ok: true });
});
