import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireSuper } from "@/lib/session";
import { fail, route } from "@/lib/api";
import { localDate, fmtDurasi } from "@/lib/time";
import {
  buildMatrix,
  hariDariTanggal,
  KOLOM_BIAYA,
  AMBANG_LEMBUR_DEFAULT_MENIT,
  type BarisAbsensi,
} from "@/lib/gaji";
import { parseSppgIds, type SuperRekapRow } from "@/lib/super";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const WARNA_DIVISI = [
  "#fde2b3",
  "#cfe8cf",
  "#d6e4f0",
  "#f0d6e4",
  "#e4d6f0",
  "#f0e6c8",
  "#d6f0ec",
];
const WARNA_LEMBUR = "#f4b4b4";
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

interface Kelompok {
  sppg_id: number;
  sppg_nama: string;
  rows: BarisAbsensi[];
}

export const GET = route(async (req: NextRequest) => {
  await requireSuper();
  const sp = req.nextUrl.searchParams;
  const today = localDate("Asia/Jakarta");

  const from = DATE_RE.test(sp.get("from") || "") ? sp.get("from")! : today;
  const to = DATE_RE.test(sp.get("to") || "") ? sp.get("to")! : today;
  if (from > to) return fail(400, "Rentang tanggal tidak valid.");

  const ids = parseSppgIds(sp.get("sppg_ids"));
  const lemburJam = Number(sp.get("lembur_jam"));
  const ambangMenit =
    Number.isFinite(lemburJam) && lemburJam > 0
      ? Math.round(lemburJam * 60)
      : AMBANG_LEMBUR_DEFAULT_MENIT;

  const params: unknown[] = [from, to];
  let filter = "";
  if (ids.length) {
    params.push(ids);
    filter = `AND u.sppg_id = ANY($${params.length}::int[])`;
  }

  const rows = await query<SuperRekapRow>(
    `SELECT a.user_id,
            COALESCE(a.shift_tanggal, a.tanggal) AS tanggal,
            a.check_in, a.check_out,
            u.nama, u.jabatan, u.nip, u.sppg_id,
            s.nama AS sppg_nama, d.nama AS divisi_nama
       FROM attendance a
       JOIN users u ON u.id = a.user_id
       JOIN sppg  s ON s.id = u.sppg_id
       LEFT JOIN divisi d ON d.id = a.divisi_id
      WHERE COALESCE(a.shift_tanggal, a.tanggal) BETWEEN $1 AND $2 ${filter}
      ORDER BY s.nama ASC, d.nama ASC NULLS LAST, u.nama ASC`,
    params,
  );

  // Kelompokkan baris per dapur (urut nama dapur).
  const map = new Map<number, Kelompok>();
  for (const r of rows) {
    let g = map.get(r.sppg_id);
    if (!g) {
      g = { sppg_id: r.sppg_id, sppg_nama: r.sppg_nama, rows: [] };
      map.set(r.sppg_id, g);
    }
    g.rows.push(r);
  }
  const kelompok = [...map.values()].sort((a, b) =>
    a.sppg_nama.localeCompare(b.sppg_nama, "id"),
  );

  const thStyle = `background:${WARNA_HEADER};color:#fff;font-weight:bold;text-align:center;`;
  const parts: string[] = [];

  // ---- Judul ----
  parts.push(
    `<h2 style="font-family:Arial,sans-serif;">REKAP GAJI LINTAS DAPUR — Periode ${esc(
      fmtTanggalID(from),
    )} s/d ${esc(fmtTanggalID(to))}</h2>`,
  );

  // ---- Tabel Ringkasan A–Z (semua dapur terpilih) ----
  interface Ringkas {
    sppg_nama: string;
    divisi: string;
    nama: string;
    jabatan: string | null;
    jumlahHadir: number;
    totalMenit: number;
  }
  const ringkas: Ringkas[] = [];
  for (const g of kelompok) {
    const m = buildMatrix(g.rows, { from, to, ambangMenit });
    for (const grup of m.divisiList) {
      for (const p of grup.pegawai) {
        ringkas.push({
          sppg_nama: g.sppg_nama,
          divisi: grup.nama,
          nama: p.nama,
          jabatan: p.jabatan,
          jumlahHadir: p.jumlahHadir,
          totalMenit: p.totalMenit,
        });
      }
    }
  }
  ringkas.sort((a, b) => a.nama.localeCompare(b.nama, "id"));

  parts.push(
    `<h3 style="font-family:Arial,sans-serif;">Ringkasan A–Z (${ringkas.length} pegawai)</h3>`,
  );
  parts.push(
    `<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;">`,
  );
  const ringkasHead = [
    "NO",
    "DAPUR",
    "NAMA",
    "DIVISI",
    "JABATAN",
    "JUMLAH HADIR",
    "TOTAL JAM",
    ...KOLOM_BIAYA,
  ];
  parts.push(`<tr>${ringkasHead.map((h) => `<td style="${thStyle}">${esc(h)}</td>`).join("")}</tr>`);
  ringkas.forEach((r, i) => {
    const tds = [
      `<td style="text-align:center;">${i + 1}</td>`,
      `<td>${esc(r.sppg_nama)}</td>`,
      `<td>${esc(r.nama)}</td>`,
      `<td>${esc(r.divisi)}</td>`,
      `<td>${esc(r.jabatan ?? "")}</td>`,
      `<td style="text-align:center;">${r.jumlahHadir}</td>`,
      `<td style="text-align:center;">${esc(fmtDurasi(r.totalMenit))}</td>`,
    ];
    for (let k = 0; k < KOLOM_BIAYA.length; k++) tds.push(`<td></td>`);
    parts.push(`<tr>${tds.join("")}</tr>`);
  });
  parts.push(`</table>`);

  // ---- Matriks per dapur ----
  for (const g of kelompok) {
    const m = buildMatrix(g.rows, { from, to, ambangMenit });
    const totalKolom = 4 + m.tanggal.length + KOLOM_BIAYA.length;

    parts.push(
      `<h3 style="font-family:Arial,sans-serif;margin-top:18px;">${esc(g.sppg_nama)}</h3>`,
    );
    parts.push(
      `<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;">`,
    );

    const head: string[] = [
      `<td style="${thStyle}">NO</td>`,
      `<td style="${thStyle}">NAMA</td>`,
      `<td style="${thStyle}">JABATAN</td>`,
      `<td style="${thStyle}">JUMLAH KEHADIRAN</td>`,
    ];
    for (const t of m.tanggal) head.push(`<td style="${thStyle}">${esc(hariDariTanggal(t))}</td>`);
    for (const k of KOLOM_BIAYA) head.push(`<td style="${thStyle}">${esc(k)}</td>`);
    parts.push(`<tr>${head.join("")}</tr>`);

    if (m.divisiList.length === 0) {
      parts.push(
        `<tr><td colspan="${totalKolom}" style="text-align:center;color:#666;">Tidak ada data pada rentang ini.</td></tr>`,
      );
    }

    let no = 0;
    m.divisiList.forEach((grup, gi) => {
      const warna = WARNA_DIVISI[gi % WARNA_DIVISI.length];
      parts.push(
        `<tr><td colspan="${totalKolom}" style="background:${warna};font-weight:bold;">${esc(
          grup.nama,
        )}</td></tr>`,
      );
      for (const p of grup.pegawai) {
        no += 1;
        const tds: string[] = [
          `<td style="background:${warna};text-align:center;">${no}</td>`,
          `<td style="background:${warna};">${esc(p.nama)}</td>`,
          `<td style="background:${warna};">${esc(p.jabatan ?? "")}</td>`,
          `<td style="background:${warna};text-align:center;">${p.jumlahHadir}</td>`,
        ];
        for (const t of m.tanggal) {
          const sel = p.sel.get(t);
          if (sel?.hadir) {
            const bg = sel.lembur ? `background:${WARNA_LEMBUR};` : "";
            tds.push(`<td style="text-align:center;${bg}">&#10003;</td>`);
          } else {
            tds.push(`<td></td>`);
          }
        }
        for (let k = 0; k < KOLOM_BIAYA.length; k++) tds.push(`<td></td>`);
        parts.push(`<tr>${tds.join("")}</tr>`);
      }
    });

    parts.push(`</table>`);
  }

  parts.push(
    `<p style="font-family:Arial,sans-serif;font-size:11px;">Keterangan: sel tanggal merah = jam kerja harian melebihi ${
      ambangMenit / 60
    } jam (lembur). Kolom GAJI/LEMBUR/UANG/TOTAL dikosongkan untuk diisi manual.</p>`,
  );

  const html =
    `<html><head><meta charset="utf-8" /></head><body>` +
    parts.join("") +
    `</body></html>`;

  const filename = `rekap-gaji-lintas-dapur_${from}_sd_${to}.xls`;

  return new Response("﻿" + html, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
