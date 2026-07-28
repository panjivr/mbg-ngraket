import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ok, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USERNAME_RE = /^[a-z0-9._-]+$/;

/**
 * Cek ketersediaan username secara real-time saat admin mengetik di form
 * pegawai. Username unik GLOBAL (lintas semua dapur) agar tidak bentrok saat
 * sistem dipakai ribuan dapur. `id` opsional untuk mengecualikan akun sendiri
 * ketika sedang mengedit.
 */
export const GET = route(async (req: NextRequest) => {
  await requireAdmin();
  const sp = req.nextUrl.searchParams;
  const username = String(sp.get("u") ?? "").trim().toLowerCase();
  const excludeId = parseInt(sp.get("id") ?? "", 10);

  if (!username) {
    return ok({ available: false, status: "kosong", pesan: "Username wajib diisi." });
  }
  if (!USERNAME_RE.test(username)) {
    return ok({
      available: false,
      status: "format",
      pesan: "Hanya huruf kecil, angka, titik, _ atau -.",
    });
  }

  const rows = Number.isFinite(excludeId)
    ? await query<{ id: number }>(
        `SELECT id FROM users WHERE lower(username) = $1 AND id <> $2 LIMIT 1`,
        [username, excludeId],
      )
    : await query<{ id: number }>(
        `SELECT id FROM users WHERE lower(username) = $1 LIMIT 1`,
        [username],
      );

  if (rows.length) {
    return ok({
      available: false,
      status: "dipakai",
      pesan: "Username sudah dipakai. Pilih yang lain.",
    });
  }
  return ok({ available: true, status: "ok", pesan: "Username tersedia." });
});
