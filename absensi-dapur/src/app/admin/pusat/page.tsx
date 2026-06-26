"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildMatrix,
  hariDariTanggal,
  KOLOM_BIAYA,
  type BarisAbsensi,
  type Matriks,
} from "@/lib/gaji";
import { fmtDurasi } from "@/lib/time";

interface SppgRow {
  id: number;
  nama: string;
}

interface RekapRow extends BarisAbsensi {
  sppg_id: number;
  sppg_nama: string;
}

interface KelompokDapur {
  sppg_id: number;
  sppg_nama: string;
  matriks: Matriks;
}

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

const WARNA_DIVISI = [
  "rgba(253,226,179,0.18)",
  "rgba(207,232,207,0.18)",
  "rgba(214,228,240,0.18)",
  "rgba(240,214,228,0.18)",
  "rgba(228,214,240,0.18)",
  "rgba(240,230,200,0.18)",
  "rgba(214,240,236,0.18)",
];
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

export default function PusatPage() {
  const today = jakartaToday();
  const [sppgList, setSppgList] = useState<SppgRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [lemburJam, setLemburJam] = useState(10);
  const [rows, setRows] = useState<RekapRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const [ready, setReady] = useState(false);

  // Muat daftar dapur (super-only). 403 → tampilkan pesan khusus super admin.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/sppg", { cache: "no-store" });
        if (res.status === 403) {
          setDenied(true);
          return;
        }
        const data = await res.json();
        const list: SppgRow[] = data.sppg || [];
        setSppgList(list);
        setSelected(new Set(list.map((s) => s.id)));
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const idsKey = useMemo(
    () => [...selected].sort((a, b) => a - b).join(","),
    [selected],
  );

  const load = useCallback(async () => {
    if (!idsKey) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/super/rekap?from=${from}&to=${to}&sppg_ids=${idsKey}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      setRows(data.rows || []);
    } finally {
      setLoading(false);
    }
  }, [from, to, idsKey]);

  useEffect(() => {
    if (ready && !denied) load();
  }, [ready, denied, load]);

  const ambangMenit = Math.max(1, Math.round((lemburJam || 10) * 60));

  // Kelompokkan baris per dapur, urut nama dapur, lalu buildMatrix per dapur.
  const kelompok = useMemo<KelompokDapur[]>(() => {
    const map = new Map<number, RekapRow[]>();
    for (const r of rows) {
      const arr = map.get(r.sppg_id) ?? [];
      arr.push(r);
      map.set(r.sppg_id, arr);
    }
    const namaById = new Map(rows.map((r) => [r.sppg_id, r.sppg_nama]));
    return [...map.entries()]
      .map(([sppg_id, grp]) => ({
        sppg_id,
        sppg_nama: namaById.get(sppg_id) || `Dapur ${sppg_id}`,
        matriks: buildMatrix(grp, { from, to, ambangMenit }),
      }))
      .sort((a, b) => a.sppg_nama.localeCompare(b.sppg_nama, "id"));
  }, [rows, from, to, ambangMenit]);

  // Ringkasan A–Z gabungan semua dapur terpilih.
  const ringkasan = useMemo(() => {
    const out: Array<{
      sppg_nama: string;
      divisi: string;
      nama: string;
      jabatan: string | null;
      jumlahHadir: number;
      totalMenit: number;
    }> = [];
    for (const k of kelompok) {
      for (const grup of k.matriks.divisiList) {
        for (const p of grup.pegawai) {
          out.push({
            sppg_nama: k.sppg_nama,
            divisi: grup.nama,
            nama: p.nama,
            jabatan: p.jabatan,
            jumlahHadir: p.jumlahHadir,
            totalMenit: p.totalMenit,
          });
        }
      }
    }
    out.sort((a, b) => a.nama.localeCompare(b.nama, "id"));
    return out;
  }, [kelompok]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const pilihSemua = () => setSelected(new Set(sppgList.map((s) => s.id)));
  const kosongkan = () => setSelected(new Set());

  const excelHref = `/api/admin/super/export?from=${from}&to=${to}&sppg_ids=${idsKey}&lembur_jam=${lemburJam}`;

  async function unduhPdf() {
    if (!ringkasan.length) return;
    setPdfBusy(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFontSize(14);
      doc.setTextColor(14, 31, 85);
      doc.text("Rekap Gaji Lintas Dapur — Badan Gizi Nasional", 14, 15);
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(`Periode: ${fmtDate(from)} s/d ${fmtDate(to)}`, 14, 21);
      doc.text(`Ambang lembur: > ${lemburJam} jam/hari (ditandai merah)`, 14, 26);

      // Tabel ringkasan A–Z.
      autoTable(doc, {
        startY: 31,
        head: [
          ["NO", "DAPUR", "NAMA", "DIVISI", "JABATAN", "HADIR", "TOTAL JAM", ...KOLOM_BIAYA],
        ],
        body: ringkasan.map((r, i) => [
          String(i + 1),
          r.sppg_nama,
          r.nama,
          r.divisi,
          r.jabatan ?? "",
          String(r.jumlahHadir),
          fmtDurasi(r.totalMenit),
          ...KOLOM_BIAYA.map(() => ""),
        ]),
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fillColor: [14, 31, 85], textColor: 255 },
      });

      type Cell =
        | string
        | { content: string; colSpan?: number; styles?: Record<string, unknown> };

      // Satu tabel matriks per dapur.
      for (const k of kelompok) {
        const m = k.matriks;
        const totalKolom = 4 + m.tanggal.length + KOLOM_BIAYA.length;
        const prevY =
          (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
            ?.finalY ?? 31;
        doc.setFontSize(11);
        doc.setTextColor(14, 31, 85);
        doc.text(k.sppg_nama, 14, prevY + 8);

        const body: Cell[][] = [];
        let no = 0;
        m.divisiList.forEach((grup, gi) => {
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
            for (const t of m.tanggal) {
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
          startY: prevY + 11,
          head: [
            [
              "NO",
              "NAMA",
              "JABATAN",
              "HADIR",
              ...m.tanggal.map((t) => hariDariTanggal(t)),
              ...KOLOM_BIAYA,
            ],
          ],
          body: body as unknown as (string | object)[][],
          styles: { fontSize: 7, cellPadding: 1, halign: "center" },
          columnStyles: { 1: { halign: "left" }, 2: { halign: "left" } },
          headStyles: { fillColor: [14, 31, 85], textColor: 255 },
        });
      }

      doc.save(`rekap-gaji-lintas-dapur_${from}_sd_${to}.pdf`);
    } finally {
      setPdfBusy(false);
    }
  }

  if (denied) {
    return (
      <div className="card p-6 text-center text-slate-400">
        Halaman ini khusus Super Admin.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Semua Dapur (Super Admin)</h1>
        <p className="text-sm text-slate-400">
          Pilih dapur yang ingin dilihat, lalu lihat rekap kehadiran & jam kerja
          gabungan. Kolom GAJI/LEMBUR/UANG/TOTAL diisi manual setelah diekspor.
        </p>
      </div>

      {/* Pemilih dapur */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">
            Dapur Terpilih ({selected.size}/{sppgList.length})
          </p>
          <div className="flex gap-2">
            <button onClick={pilihSemua} className="btn-ghost px-2.5 py-1 text-xs">
              Pilih semua
            </button>
            <button onClick={kosongkan} className="btn-ghost px-2.5 py-1 text-xs">
              Kosongkan
            </button>
          </div>
        </div>
        {!ready ? (
          <p className="mt-3 text-sm text-slate-400">Memuat daftar dapur…</p>
        ) : sppgList.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">Belum ada dapur.</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {sppgList.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
              >
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => toggle(s.id)}
                />
                <span className="truncate" title={s.nama}>
                  {s.nama}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Periode & ambang */}
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
          <a
            href={excelHref}
            className={"btn-ghost " + (selected.size ? "" : "pointer-events-none opacity-50")}
          >
            ⬇ Excel
          </a>
          <button
            onClick={unduhPdf}
            className="btn-gold"
            disabled={pdfBusy || !ringkasan.length}
          >
            {pdfBusy ? "Menyiapkan…" : "⬇ PDF"}
          </button>
        </div>
      </div>

      {selected.size === 0 ? (
        <div className="card p-6 text-center text-slate-400">
          Pilih minimal satu dapur untuk melihat rekap.
        </div>
      ) : (
        <>
          {/* Ringkasan A–Z */}
          <div className="card overflow-hidden">
            <div className="border-b border-white/5 px-4 py-3 text-sm text-slate-400">
              Ringkasan A–Z · {ringkasan.length} pegawai · {kelompok.length} dapur
            </div>
            {loading ? (
              <p className="p-6 text-center text-slate-400">Memuat…</p>
            ) : ringkasan.length === 0 ? (
              <p className="p-6 text-center text-slate-400">
                Tidak ada data pada rentang ini.
              </p>
            ) : (
              <div className="scroll-x overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="text-left text-xs uppercase text-slate-400">
                    <tr className="border-b border-white/5">
                      <th className="px-3 py-2.5">No</th>
                      <th className="px-3 py-2.5">Dapur</th>
                      <th className="px-3 py-2.5">Nama</th>
                      <th className="px-3 py-2.5">Divisi</th>
                      <th className="px-3 py-2.5">Jabatan</th>
                      <th className="px-3 py-2.5 text-center">Jumlah Hadir</th>
                      <th className="px-3 py-2.5">Total Jam</th>
                      {KOLOM_BIAYA.map((k) => (
                        <th key={k} className="px-3 py-2.5 text-center">
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {ringkasan.map((r, i) => (
                      <tr key={`${r.sppg_nama}-${r.nama}-${i}`}>
                        <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{r.sppg_nama}</td>
                        <td className="px-3 py-2 font-medium whitespace-nowrap">{r.nama}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-400">
                          {r.divisi}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-400">
                          {r.jabatan || "—"}
                        </td>
                        <td className="px-3 py-2 text-center font-medium">{r.jumlahHadir}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gold-400">
                          {fmtDurasi(r.totalMenit)}
                        </td>
                        {KOLOM_BIAYA.map((k) => (
                          <td key={k} className="px-3 py-2 text-center text-slate-600">
                            —
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Matriks per dapur */}
          {kelompok.map((k) => (
            <div key={k.sppg_id} className="card overflow-hidden">
              <div className="border-b border-white/5 px-4 py-3">
                <p className="text-sm font-bold">{k.sppg_nama}</p>
                <p className="text-xs text-slate-400">
                  {k.matriks.divisiList.reduce((s, g) => s + g.pegawai.length, 0)} pegawai ·{" "}
                  {k.matriks.tanggal.length} hari
                </p>
              </div>
              <div className="scroll-x overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-xs uppercase text-slate-400">
                    <tr className="border-b border-white/5">
                      <th className="px-2 py-2 text-left">No</th>
                      <th className="px-2 py-2 text-left">Nama</th>
                      <th className="px-2 py-2 text-left">Jabatan</th>
                      <th className="px-2 py-2 text-center">Hadir</th>
                      {k.matriks.tanggal.map((t) => (
                        <th key={t} className="px-1.5 py-2 text-center" title={fmtDate(t)}>
                          {hariDariTanggal(t)}
                        </th>
                      ))}
                      {KOLOM_BIAYA.map((c) => (
                        <th key={c} className="px-2 py-2 text-center">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(() => {
                      let no = 0;
                      const totalKolom =
                        4 + k.matriks.tanggal.length + KOLOM_BIAYA.length;
                      return k.matriks.divisiList.flatMap((grup, gi) => {
                        const bg = WARNA_DIVISI[gi % WARNA_DIVISI.length];
                        const out = [
                          <tr key={`d-${k.sppg_id}-${grup.nama}`} style={{ background: bg }}>
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
                          out.push(
                            <tr key={`p-${k.sppg_id}-${p.user_id}-${grup.nama}`}>
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
                              {k.matriks.tanggal.map((t) => {
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
                              {KOLOM_BIAYA.map((c) => (
                                <td key={c} className="px-2 py-1.5 text-slate-600">
                                  —
                                </td>
                              ))}
                            </tr>,
                          );
                        }
                        return out;
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
