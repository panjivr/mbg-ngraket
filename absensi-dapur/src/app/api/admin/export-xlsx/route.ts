import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { fail, route } from "@/lib/api";
import { fmtJam, localDate } from "@/lib/time";
import ExcelJS from "exceljs";
import type { AttendanceWithUser } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Palet warna (ARGB) selaras dengan tata letak PDF. */
const NAVY = "FF0E1F55";
const ZEBRA = "FFF3F6FC";
const BORDER = "FFD9DEE8";
const HEAD_TEXT = "FFFFFFFF";
const SUMMARY_FILL = "FFE8EDF6";
const RED = "FFC0392B";
const GREEN = "FF1E8449";

/** "YYYY-MM-DD" -> "DD Mon YYYY" (Bahasa Indonesia). */
function fmtDate(d: string): string {
  const dt = new Date(`${d}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return d;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(dt);
}

/** Selisih menit kerja (0 bila belum/tak valid). */
function durasiMenit(checkIn: string | null, checkOut: string | null): number {
  if (!checkIn || !checkOut) return 0;
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.floor(ms / 60000);
}

/** Format durasi menit -> "Xj Ym". */
function fmtDurasi(menit: number): string {
  const h = Math.floor(menit / 60);
  const m = menit % 60;
  return `${h}j ${m}m`;
}

/** Durasi kerja untuk sel data ("Xj Ym", atau "-" bila kosong). */
function durasi(checkIn: string | null, checkOut: string | null): string {
  const menit = durasiMenit(checkIn, checkOut);
  return menit > 0 ? fmtDurasi(menit) : "-";
}

const thinBorder = {
  top: { style: "thin", color: { argb: BORDER } },
  left: { style: "thin", color: { argb: BORDER } },
  bottom: { style: "thin", color: { argb: BORDER } },
  right: { style: "thin", color: { argb: BORDER } },
} as const;

/** Kolom yang diratakan tengah (sisanya rata kiri). */
const CENTERED = new Set<number>([1, 2, 6, 8, 9, 10, 11]);

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

  // ---- Bangun workbook (seluruhnya di memori) ----
  const wb = new ExcelJS.Workbook();
  wb.creator = "Absensi Dapur MBG";
  const ws = wb.addWorksheet("Rekap Absensi", {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  const LAST_COL = 11; // A..K

  // Judul (baris 1-3), tiap baris di-merge sepanjang kolom.
  ws.mergeCells("A1:K1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "REKAP ABSENSI DAPUR — BADAN GIZI NASIONAL";
  titleCell.font = { bold: true, size: 14, color: { argb: NAVY } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 24;

  ws.mergeCells("A2:K2");
  const periodeCell = ws.getCell("A2");
  periodeCell.value = `Periode: ${fmtDate(from)} s/d ${fmtDate(to)}`;
  periodeCell.font = { size: 11 };
  periodeCell.alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A3:K3");
  const dapurCell = ws.getCell("A3");
  dapurCell.value = `Dapur: ${sppg?.nama ?? "-"}`;
  dapurCell.font = { size: 11 };
  dapurCell.alignment = { horizontal: "center", vertical: "middle" };

  // Header (baris 4).
  const header = [
    "Tanggal",
    "NIP",
    "Nama",
    "Jabatan",
    "Divisi",
    "Jadwal",
    "Lokasi",
    "Masuk",
    "Status",
    "Pulang",
    "Durasi",
  ];
  const headerRow = ws.getRow(4);
  headerRow.values = header;
  headerRow.height = 20;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEAD_TEXT } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder;
  });

  // Baris data.
  let totalMenit = 0;
  let totalTerlambat = 0;

  rows.forEach((r, i) => {
    const jadwal =
      r.shift_masuk && r.shift_pulang
        ? `${r.shift_masuk}-${r.shift_pulang}`
        : "-";
    const menit = durasiMenit(r.check_in, r.check_out);
    totalMenit += menit;
    const isTerlambat = r.status_masuk === "Terlambat";
    if (isTerlambat) totalTerlambat += 1;

    const values: string[] = [
      r.tanggal ?? "-",
      r.nip ?? "-",
      r.nama,
      r.jabatan ?? "-",
      r.divisi_nama ?? "-",
      jadwal,
      r.lokasi ?? "-",
      fmtJam(r.check_in, tz),
      r.status_masuk ?? "-",
      fmtJam(r.check_out, tz),
      menit > 0 ? fmtDurasi(menit) : "-",
    ];

    const row = ws.addRow(values);
    const zebra = i % 2 === 1;
    row.eachCell((cell, col) => {
      cell.border = thinBorder;
      cell.alignment = {
        horizontal: CENTERED.has(col) ? "center" : "left",
        vertical: "middle",
      };
      if (zebra) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: ZEBRA },
        };
      }
    });
    // Warnai sel status: merah (Terlambat) / hijau (lainnya).
    const statusCell = row.getCell(9);
    statusCell.font = { color: { argb: isTerlambat ? RED : GREEN }, bold: true };
  });

  // Baris ringkasan (bold).
  const summary = ws.addRow([]);
  const rn = summary.number;
  ws.mergeCells(rn, 1, rn, 2);
  ws.getCell(rn, 1).value = `TOTAL — ${rows.length} catatan`;
  ws.getCell(rn, 9).value = `Terlambat: ${totalTerlambat}`;
  ws.getCell(rn, 10).value = "Jam kerja:";
  ws.getCell(rn, 11).value = fmtDurasi(totalMenit);
  for (let c = 1; c <= LAST_COL; c++) {
    const cell = ws.getCell(rn, c);
    cell.font = { bold: true, color: { argb: NAVY } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: SUMMARY_FILL },
    };
    cell.border = {
      top: { style: "medium", color: { argb: NAVY } },
      bottom: { style: "thin", color: { argb: BORDER } },
    };
    cell.alignment = {
      horizontal: c === 1 ? "left" : c === 10 ? "right" : "center",
      vertical: "middle",
    };
  }

  // Lebar kolom.
  const widths = [12, 12, 26, 20, 18, 14, 20, 9, 12, 9, 10];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  // Autofilter di baris header.
  ws.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: LAST_COL },
  };

  // ---- Response ----
  const buf = await wb.xlsx.writeBuffer();
  const filename = `absensi-dapur_${from}_sd_${to}.xlsx`;

  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
