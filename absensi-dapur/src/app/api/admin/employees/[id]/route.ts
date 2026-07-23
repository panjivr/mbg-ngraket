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
    await query<User>(`SELECT * FROM users WHERE id = $1 AND sppg_id = $2`, [
      id,
      admin.sppg_id,
    ])
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
  const divisi_id =
    body.divisi_id !== undefined
      ? (() => {
          const n = parseInt(String(body.divisi_id), 10);
          return Number.isFinite(n) && n > 0 ? n : null;
        })()
      : existing.divisi_id;
  const tempat_lahir =
    body.tempat_lahir !== undefined
      ? (body.tempat_lahir ? String(body.tempat_lahir).trim() : null) || null
      : existing.tempat_lahir ?? null;
  const tanggal_lahir =
    body.tanggal_lahir !== undefined
      ? /^\d{4}-\d{2}-\d{2}$/.test(String(body.tanggal_lahir))
        ? String(body.tanggal_lahir)
        : null
      : existing.tanggal_lahir ?? null;
  const jenis_kelamin =
    body.jenis_kelamin !== undefined
      ? (() => {
          const s = String(body.jenis_kelamin).trim().toLowerCase();
          if (s === "l" || s.startsWith("laki") || s === "pria") return "L";
          if (s === "p" || s.startsWith("perempuan") || s === "wanita") return "P";
          return null;
        })()
      : existing.jenis_kelamin ?? null;

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
      `SELECT COUNT(*)::text AS c FROM users
        WHERE role = 'admin' AND aktif = TRUE AND id <> $1 AND sppg_id = $2`,
      [id, admin.sppg_id],
    );
    if (Number(otherAdmins[0].c) === 0) {
      return fail(409, "Tidak bisa menonaktifkan/menurunkan admin terakhir.");
    }
  }

  const is_driver =
    body.is_driver !== undefined ? Boolean(body.is_driver) : (existing.is_driver ?? false);
  const akses_distribusi =
    body.akses_distribusi !== undefined ? Boolean(body.akses_distribusi) : (existing.akses_distribusi ?? false);
  const akses_laporan =
    body.akses_laporan !== undefined ? Boolean(body.akses_laporan) : (existing.akses_laporan ?? false);
  const akses_gudang_keluar =
    body.akses_gudang_keluar !== undefined ? Boolean(body.akses_gudang_keluar) : (existing.akses_gudang_keluar ?? false);

  const toRupiah = (v: unknown, fallback: number) => {
    if (v === undefined) return fallback;
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  const gaji_harian = toRupiah(body.gaji_harian, existing.gaji_harian ?? 0);
  const tunjangan = toRupiah(body.tunjangan, existing.tunjangan ?? 0);
  const lembur_per_jam = toRupiah(body.lembur_per_jam, existing.lembur_per_jam ?? 0);
  const potongan_per_telat = toRupiah(body.potongan_per_telat, existing.potongan_per_telat ?? 0);

  let passwordClause = "";
  const paramsArr: unknown[] = [
    nama, username, role, jabatan, nip, aktif, divisi_id, tempat_lahir, tanggal_lahir,
    jenis_kelamin, is_driver, akses_distribusi, akses_laporan, akses_gudang_keluar,
    gaji_harian, tunjangan, lembur_per_jam, potongan_per_telat,
  ];
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
    `UPDATE users SET nama=$1, username=$2, role=$3, jabatan=$4, nip=$5, aktif=$6,
            divisi_id=$7, tempat_lahir=$8, tanggal_lahir=$9, jenis_kelamin=$10, is_driver=$11,
            akses_distribusi=$12, akses_laporan=$13, akses_gudang_keluar=$14,
            gaji_harian=$15, tunjangan=$16, lembur_per_jam=$17, potongan_per_telat=$18${passwordClause}
       WHERE id = $${paramsArr.length}
     RETURNING id, nama, username, role, jabatan, nip, aktif, created_at, divisi_id,
               tempat_lahir, tanggal_lahir, jenis_kelamin, is_driver, akses_distribusi, akses_laporan, akses_gudang_keluar,
               gaji_harian, tunjangan, lembur_per_jam, potongan_per_telat`,
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
    await query<User>(`SELECT id, role FROM users WHERE id = $1 AND sppg_id = $2`, [
      id,
      admin.sppg_id,
    ])
  )[0];
  if (!target) return fail(404, "Pegawai tidak ditemukan.");

  if (target.role === "admin") {
    const otherAdmins = await query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM users
        WHERE role = 'admin' AND id <> $1 AND sppg_id = $2`,
      [id, admin.sppg_id],
    );
    if (Number(otherAdmins[0].c) === 0) {
      return fail(409, "Tidak bisa menghapus admin terakhir.");
    }
  }

  await query(`DELETE FROM users WHERE id = $1 AND sppg_id = $2`, [id, admin.sppg_id]);
  return ok({ ok: true });
});
