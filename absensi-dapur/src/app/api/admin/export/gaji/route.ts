import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { fail, route } from "@/lib/api";
import { localDate } from "@/lib/time";
import {
  buildMatrix,
  hariDariTanggal,
  KOLOM_BIAYA,
  AMBANG_LEMBUR_DEFAULT_MENIT,
  type BarisAbsensi,
} from "@/lib/gaji";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Palet warna latar judul divisi (selang-seling, mirip contoh spreadsheet). */
const WARNA_DIVISI = [
  "#fde2b3",
  "#cfe8cf",
  "#d6e4f0",
  "#f0d6e4",
  "#e4d6f0",
  "#f0e6c8",
  "#d6f0ec",
];

const WARNA_LEMBUR = "#f4b4b4"; // sel hari dengan jam kerja > ambang
const WARNA_HEADER = "#0e1f55";

function esc(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtTanggalID(tgl: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(tgl + "T00:00:00"));
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

  const lemburJam = Number(sp.get("lembur_jam"));
  const ambangMenit =
    Number.isFinite(lemburJam) && lemburJam > 0
      ? Math.round(lemburJam * 60)
      : AMBANG_LEMBUR_DEFAULT_MENIT;

  const rows = await query<BarisAbsensi>(
    `SELECT a.user_id,
            COALESCE(a.shift_tanggal, a.tanggal) AS tanggal,
            a.check_in, a.check_out,
            u.nama, u.jabatan, u.nip, d.nama AS divisi_nama
       FROM attendance a
       JOIN users u ON u.id = a.user_id
       LEFT JOIN divisi d ON d.id = a.divisi_id
      WHERE COALESCE(a.shift_tanggal, a.tanggal) BETWEEN $1 AND $2 AND u.sppg_id = $3
      ORDER BY d.nama ASC NULLS LAST, u.nama ASC`,
    [from, to, admin.sppg_id],
  );

  const matriks = buildMatrix(rows, { from, to, ambangMenit });

  // Lebar tabel (untuk colspan header periode).
  const totalKolom = 4 + matriks.tanggal.length + KOLOM_BIAYA.length;

  const parts: string[] = [];
  parts.push(
    `<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;">`,
  );

  // Judul periode.
  parts.push(
    `<tr><td colspan="${totalKolom}" style="background:${WARNA_HEADER};color:#fff;font-weight:bold;font-size:14px;text-align:center;">` +
      `REKAP GAJI KARYAWAN — Periode ${esc(fmtTanggalID(from))} s/d ${esc(fmtTanggalID(to))}` +
      `</td></tr>`,
  );

  // Header kolom.
  const thStyle = `background:${WARNA_HEADER};color:#fff;font-weight:bold;text-align:center;`;
  const head: string[] = [
    `<td style="${thStyle}">NO</td>`,
    `<td style="${thStyle}">NAMA</td>`,
    `<td style="${thStyle}">JABATAN</td>`,
    `<td style="${thStyle}">JUMLAH KEHADIRAN</td>`,
  ];
  for (const t of matriks.tanggal) {
    head.push(`<td style="${thStyle}">${esc(hariDariTanggal(t))}</td>`);
  }
  for (const k of KOLOM_BIAYA) {
    head.push(`<td style="${thStyle}">${esc(k)}</td>`);
  }
  parts.push(`<tr>${head.join("")}</tr>`);

  // Baris per divisi.
  let no = 0;
  matriks.divisiList.forEach((grup, gi) => {
    const warna = WARNA_DIVISI[gi % WARNA_DIVISI.length];
    parts.push(
      `<tr><td colspan="${totalKolom}" style="background:${warna};font-weight:bold;">` +
        `${esc(grup.nama)}` +
        `</td></tr>`,
    );
    for (const p of grup.pegawai) {
      no += 1;
      const tds: string[] = [
        `<td style="background:${warna};text-align:center;">${no}</td>`,
        `<td style="background:${warna};">${esc(p.nama)}</td>`,
        `<td style="background:${warna};">${esc(p.jabatan ?? "")}</td>`,
        `<td style="background:${warna};text-align:center;">${p.jumlahHadir}</td>`,
      ];
      for (const t of matriks.tanggal) {
        const sel = p.sel.get(t);
        if (sel?.hadir) {
          const bg = sel.lembur ? `background:${WARNA_LEMBUR};` : "";
          tds.push(`<td style="text-align:center;${bg}">&#10003;</td>`);
        } else {
          tds.push(`<td></td>`);
        }
      }
      // Kolom biaya sengaja kosong untuk diisi manual.
      for (let i = 0; i < KOLOM_BIAYA.length; i++) tds.push(`<td></td>`);
      parts.push(`<tr>${tds.join("")}</tr>`);
    }
  });

  parts.push(`</table>`);

  // Keterangan ambang lembur.
  parts.push(
    `<p style="font-family:Arial,sans-serif;font-size:11px;">` +
      `Keterangan: sel tanggal berwarna merah = jam kerja harian melebihi ${ambangMenit / 60} jam (lembur).` +
      `</p>`,
  );

  const html =
    `<html><head><meta charset="utf-8" /></head><body>` +
    parts.join("") +
    `</body></html>`;

  const filename = `rekap-gaji_${from}_sd_${to}.xls`;

  return new Response("﻿" + html, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
