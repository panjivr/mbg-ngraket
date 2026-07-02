import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { fail, route } from "@/lib/api";
import { fmtJam, localDate } from "@/lib/time";
import type { AttendanceWithUser } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function csvCell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function durasi(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return "";
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return "";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}j ${m}m`;
}

export const GET = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const sp = req.nextUrl.searchParams;
  const sppg = await getSppg(admin.sppg_id as number);
  const tz = sppg?.tz || "Asia/Jakarta";
  const today = localDate(tz);

  const from = DATE_RE.test(sp.get("from") || "") ? sp.get("from")! : today;
  const to = DATE_RE.test(sp.get("to") || "") ? sp.get("to")! : today;
  if (from > to) return fail(400, "Rentang tanggal tidak valid.");

  const rows = await query<AttendanceWithUser>(
    `SELECT a.*, COALESCE(a.shift_tanggal, a.tanggal) AS tanggal,
            u.nama, u.jabatan, u.nip, d.nama AS divisi_nama
       FROM attendance a
       JOIN users u ON u.id = a.user_id
       LEFT JOIN divisi d ON d.id = a.divisi_id
      WHERE COALESCE(a.shift_tanggal, a.tanggal) BETWEEN $1 AND $2 AND u.sppg_id = $3
      ORDER BY COALESCE(a.shift_tanggal, a.tanggal) ASC, a.check_in ASC NULLS LAST, u.nama ASC`,
    [from, to, admin.sppg_id],
  );

  const header = [
    "Tanggal Shift",
    "NIP",
    "Nama",
    "Jabatan",
    "Divisi",
    "Jadwal Shift",
    "Lokasi",
    "Jam Masuk",
    "Jam Pulang",
    "Status",
    "Jarak Masuk (m)",
    "Jarak Pulang (m)",
    "Durasi Kerja",
  ];

  const lines = [header.map(csvCell).join(",")];
  for (const r of rows) {
    const jadwal =
      r.shift_masuk && r.shift_pulang ? `${r.shift_masuk}-${r.shift_pulang}` : "";
    lines.push(
      [
        r.tanggal,
        r.nip ?? "",
        r.nama,
        r.jabatan ?? "",
        r.divisi_nama ?? "",
        jadwal,
        r.lokasi ?? "",
        fmtJam(r.check_in, tz),
        fmtJam(r.check_out, tz),
        r.status_masuk ?? "",
        r.check_in_jarak ?? "",
        r.check_out_jarak ?? "",
        durasi(r.check_in, r.check_out),
      ]
        .map(csvCell)
        .join(","),
    );
  }

  const csv = "﻿" + lines.join("\r\n");
  const filename = `absensi-dapur_${from}_sd_${to}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
