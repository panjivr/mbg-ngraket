import { NextRequest } from "next/server";
import { query, withClient } from "@/lib/db";
import { requireSuper } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { ok, fail, route } from "@/lib/api";
import type { Sppg } from "@/lib/sppg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

interface SppgRow extends Sppg {
  jumlah_staf?: number;
  jumlah_admin?: number;
}

export const GET = route(async () => {
  await requireSuper();
  const rows = await query<SppgRow>(
    `SELECT s.*,
            (SELECT COUNT(*)::int FROM users u WHERE u.sppg_id = s.id AND u.role = 'staff') AS jumlah_staf,
            (SELECT COUNT(*)::int FROM users u WHERE u.sppg_id = s.id AND u.role = 'admin') AS jumlah_admin
       FROM sppg s ORDER BY s.id ASC`,
  );
  return ok({ sppg: rows });
});

export const POST = route(async (req: NextRequest) => {
  await requireSuper();
  const b = await req.json().catch(() => ({}));

  const nama = String(b.nama ?? "").trim();
  const alamat = b.alamat != null ? String(b.alamat).trim() : "";
  const lat = b.lat !== undefined ? Number(b.lat) : -7.8657;
  const lng = b.lng !== undefined ? Number(b.lng) : 111.4625;
  const radius_m = b.radius_m !== undefined ? Math.round(Number(b.radius_m)) : 150;
  const geofence_aktif = b.geofence_aktif === false ? false : true;
  const selfie_wajib = b.selfie_wajib === false ? false : true;
  const jam_masuk = b.jam_masuk ? String(b.jam_masuk) : "07:00";
  const jam_pulang = b.jam_pulang ? String(b.jam_pulang) : "15:00";
  const tz = b.tz ? String(b.tz).trim() : "Asia/Jakarta";

  const adminNama = String(b.admin_nama ?? "").trim();
  const adminUser = String(b.admin_username ?? "").trim().toLowerCase();
  const adminPass = String(b.admin_password ?? "");

  if (!nama) return fail(400, "Nama dapur wajib diisi.");
  if (!TIME_RE.test(jam_masuk) || !TIME_RE.test(jam_pulang)) {
    return fail(400, "Format jam harus HH:mm.");
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return fail(400, "Koordinat tidak valid.");
  }
  if (!adminNama || !adminUser || !adminPass) {
    return fail(400, "Nama, username, dan password admin dapur wajib diisi.");
  }
  if (adminPass.length < 6) return fail(400, "Password admin minimal 6 karakter.");
  if (!/^[a-z0-9._-]+$/.test(adminUser)) {
    return fail(400, "Username admin hanya boleh huruf kecil, angka, titik, _ atau -.");
  }

  const dup = await query<{ id: number }>(
    `SELECT id FROM users WHERE lower(username) = $1`,
    [adminUser],
  );
  if (dup.length) return fail(409, "Username admin sudah dipakai.");

  const result = await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      const sppg = (
        await client.query<Sppg>(
          `INSERT INTO sppg (nama, alamat, lat, lng, radius_m, geofence_aktif,
                             selfie_wajib, jam_masuk, jam_pulang, tz)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
          [nama, alamat, lat, lng, radius_m, geofence_aktif, selfie_wajib, jam_masuk, jam_pulang, tz],
        )
      ).rows[0];
      const hash = await hashPassword(adminPass);
      await client.query(
        `INSERT INTO users (nama, username, password_hash, role, jabatan, sppg_id, is_super)
         VALUES ($1,$2,$3,'admin','Kepala Dapur',$4,FALSE)`,
        [adminNama, adminUser, hash, sppg.id],
      );
      await client.query("COMMIT");
      return sppg;
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    }
  });

  return ok({ sppg: result }, { status: 201 });
});
