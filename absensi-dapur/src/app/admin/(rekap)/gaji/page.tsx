"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildMatrix,
  hariDariTanggal,
  KOLOM_BIAYA,
  type BarisAbsensi,
} from "@/lib/gaji";
import { fmtDurasi } from "@/lib/time";

function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function fmtDate(v: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(v + "T00:00:00"));
}

/** Palet warna latar judul divisi untuk preview (selang-seling). */
const WARNA_DIVISI = [
  "rgba(253,226,179,0.18)",
  "rgba(207,232,207,0.18)",
  "rgba(214,228,240,0.18)",
  "rgba(240,214,228,0.18)",
  "rgba(228,214,240,0.18)",
  "rgba(240,230,200,0.18)",
  "rgba(214,240,236,0.18)",
];

// Untuk PDF (RGB).
const WARNA_DIVISI_PDF: [number, number, number][] = [
  [253, 226, 179],
  [207, 232, 207],
  [214, 228, 240],
  [240, 214, 228],
  [228, 214, 240],
  [240, 230, 200],
  [214, 240, 236],
];
const WARNA_LEMBUR_PDF: [number, number, number] = [244, 180, 180];

export default function GajiPage() {
  const today = jakartaToday();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [lemburJam, setLemburJam] = useState(10);
  const [rows, setRows] = useState<BarisAbsensi[]>([]);
  const [loading, setLoading] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/attendance?from=${from}&to=${to}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setRows(data.rekap || []);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const ambangMenit = Math.max(1, Math.round((lemburJam || 10) * 60));

  const matriks = useMemo(
    () => buildMatrix(rows, { from, to, ambangMenit }),
    [rows, from, to, ambangMenit],
  );

  const totalPegawai = useMemo(
    () => matriks.divisiList.reduce((s, g) => s + g.pegawai.length, 0),
    [matriks],
  );

  const excelHref = `/api/admin/export/gaji?from=${from}&to=${to}&lembur_jam=${lemburJam}`;

  async function unduhPdf() {
    if (!totalPegawai) return;
    setPdfBusy(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFontSize(14);
      doc.setTextColor(14, 31, 85);
      doc.text("Rekap Gaji Karyawan — Badan Gizi Nasional", 14, 15);
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(`Periode: ${fmtDate(from)} s/d ${fmtDate(to)}`, 14, 21);
      doc.text(`Ambang lembur: > ${lemburJam} jam/hari (ditandai merah)`, 14, 26);

      const totalKolom = 4 + matriks.tanggal.length + KOLOM_BIAYA.length;
      const head = [
        [
          "NO",
          "NAMA",
          "JABATAN",
          "HADIR",
          ...matriks.tanggal.map((t) => hariDariTanggal(t)),
          ...KOLOM_BIAYA,
        ],
      ];

      type Cell = string | { content: string; colSpan?: number; styles?: Record<string, unknown> };
      const body: Cell[][] = [];
      let no = 0;
      matriks.divisiList.forEach((grup, gi) => {
        const w = WARNA_DIVISI_PDF[gi % WARNA_DIVISI_PDF.length];
        body.push([
          {
            content: grup.nama,
            colSpan: totalKolom,
            styles: { fillColor: w, textColor: 20, fontStyle: "bold" },
          },
        ]);
        for (const p of grup.pegawai) {
          no += 1;
          const cells: Cell[] = [
            String(no),
            p.nama,
            p.jabatan ?? "",
            String(p.jumlahHadir),
          ];
          for (const t of matriks.tanggal) {
            const sel = p.sel.get(t);
            if (sel?.hadir) {
              cells.push(
                sel.lembur
                  ? { content: "✓", styles: { fillColor: WARNA_LEMBUR_PDF, halign: "center" } }
                  : { content: "✓", styles: { halign: "center" } },
              );
            } else {
              cells.push("");
            }
          }
          for (let i = 0; i < KOLOM_BIAYA.length; i++) cells.push("");
          body.push(cells);
        }
      });

      autoTable(doc, {
        startY: 31,
        head,
        body: body as unknown as (string | object)[][],
        styles: { fontSize: 7, cellPadding: 1, halign: "center" },
        columnStyles: { 1: { halign: "left" }, 2: { halign: "left" } },
        headStyles: { fillColor: [14, 31, 85], textColor: 255 },
      });

      doc.save(`rekap-gaji_${from}_sd_${to}.pdf`);
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Rekap Gaji (Matriks per Divisi)</h1>

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label">Dari Tanggal</label>
          <input
            type="date"
            className="input"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Sampai Tanggal</label>
          <input
            type="date"
            className="input"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Ambang Lembur (jam)</label>
          <input
            type="number"
            min={1}
            max={24}
            step={1}
            className="input w-28"
            value={lemburJam}
            onChange={(e) => setLemburJam(Math.max(1, Number(e.target.value) || 10))}
          />
        </div>
        <button onClick={load} className="btn-ghost" disabled={loading}>
          {loading ? "Memuat…" : "Tampilkan"}
        </button>
        <div className="ml-auto flex gap-2">
          <a href={excelHref} className="btn-ghost">
            ⬇ Excel
          </a>
          <button
            onClick={unduhPdf}
            className="btn-gold"
            disabled={pdfBusy || !totalPegawai}
          >
            {pdfBusy ? "Menyiapkan…" : "⬇ PDF"}
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Sel tanggal <span className="rounded bg-red-500/30 px-1.5 py-0.5 text-red-200">merah</span>{" "}
        = jam kerja harian melebihi {lemburJam} jam. Kolom GAJI/LEMBUR/UANG/TOTAL
        dikosongkan untuk diisi manual setelah diekspor.
      </p>

      <div className="card overflow-hidden">
        <div className="border-b border-white/5 px-4 py-3 text-sm text-slate-400">
          {totalPegawai} pegawai · {matriks.divisiList.length} divisi ·{" "}
          {matriks.tanggal.length} hari
        </div>
        {loading ? (
          <p className="p-6 text-center text-slate-400">Memuat…</p>
        ) : totalPegawai === 0 ? (
          <p className="p-6 text-center text-slate-400">
            Tidak ada data pada rentang ini.
          </p>
        ) : (
          <div className="scroll-x overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-xs uppercase text-slate-400">
                <tr className="border-b border-white/5">
                  <th className="px-2 py-2 text-left">No</th>
                  <th className="px-2 py-2 text-left">Nama</th>
                  <th className="px-2 py-2 text-left">Jabatan</th>
                  <th className="px-2 py-2 text-center">Hadir</th>
                  {matriks.tanggal.map((t) => (
                    <th key={t} className="px-1.5 py-2 text-center" title={fmtDate(t)}>
                      {hariDariTanggal(t)}
                    </th>
                  ))}
                  {KOLOM_BIAYA.map((k) => (
                    <th key={k} className="px-2 py-2 text-center">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(() => {
                  let no = 0;
                  const totalKolom = 4 + matriks.tanggal.length + KOLOM_BIAYA.length;
                  return matriks.divisiList.flatMap((grup, gi) => {
                    const bg = WARNA_DIVISI[gi % WARNA_DIVISI.length];
                    const rowsOut = [
                      <tr key={`div-${grup.nama}`} style={{ background: bg }}>
                        <td
                          colSpan={totalKolom}
                          className="px-2 py-1.5 font-bold text-slate-100"
                        >
                          {grup.nama}
                        </td>
                      </tr>,
                    ];
                    for (const p of grup.pegawai) {
                      no += 1;
                      rowsOut.push(
                        <tr key={`p-${p.user_id}`}>
                          <td className="px-2 py-1.5 text-center text-slate-400">{no}</td>
                          <td className="px-2 py-1.5 font-medium whitespace-nowrap">
                            {p.nama}
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-slate-400">
                            {p.jabatan || "—"}
                          </td>
                          <td className="px-2 py-1.5 text-center font-medium">
                            {p.jumlahHadir}
                          </td>
                          {matriks.tanggal.map((t) => {
                            const sel = p.sel.get(t);
                            return (
                              <td
                                key={t}
                                className={
                                  "px-1.5 py-1.5 text-center " +
                                  (sel?.lembur ? "bg-red-500/40 text-red-100" : "")
                                }
                                title={sel?.hadir ? fmtDurasi(sel.menit) : ""}
                              >
                                {sel?.hadir ? "✓" : ""}
                              </td>
                            );
                          })}
                          {KOLOM_BIAYA.map((k) => (
                            <td key={k} className="px-2 py-1.5 text-slate-600">
                              —
                            </td>
                          ))}
                        </tr>,
                      );
                    }
                    return rowsOut;
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
