"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { durasiMenit, fmtDurasi } from "@/lib/time";
import FotoAbsen from "@/components/FotoAbsen";

interface RekapRow {
  id: number;
  nama: string;
  jabatan: string | null;
  nip: string | null;
  divisi_nama: string | null;
  shift_masuk: string | null;
  shift_pulang: string | null;
  tanggal: string;
  check_in: string | null;
  check_out: string | null;
  status_masuk: string | null;
  check_in_jarak: number | null;
  check_out_jarak: number | null;
  lokasi: string | null;
}

function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function fmtTime(v: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function fmtDate(v: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(v + "T00:00:00"));
}

export default function RekapPage() {
  const today = jakartaToday();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<RekapRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [q, setQ] = useState("");
  const [divisiFilter, setDivisiFilter] = useState("");
  const [sortBy, setSortBy] = useState<"waktu" | "nama" | "divisi" | "status">("waktu");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/attendance?from=${from}&to=${to}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      setRows(data.rekap || []);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  // Opsi divisi untuk filter (unik, urut abjad).
  const divisiOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.divisi_nama) set.add(r.divisi_nama);
    return [...set].sort((a, b) => a.localeCompare(b, "id"));
  }, [rows]);

  // Tampilan setelah filter (nama/divisi) & urut (waktu/nama/divisi/status).
  const view = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let v = rows.filter((r) => {
      const okNama = !needle || r.nama.toLowerCase().includes(needle);
      const okDiv = !divisiFilter || (r.divisi_nama || "") === divisiFilter;
      return okNama && okDiv;
    });
    v = [...v].sort((a, b) => {
      if (sortBy === "nama") return a.nama.localeCompare(b.nama, "id");
      if (sortBy === "divisi")
        return (a.divisi_nama || "~").localeCompare(b.divisi_nama || "~", "id") ||
          a.nama.localeCompare(b.nama, "id");
      if (sortBy === "status")
        return (a.status_masuk || "~").localeCompare(b.status_masuk || "~", "id");
      // waktu: terbaru dulu (tanggal lalu jam masuk)
      const ta = `${a.tanggal} ${a.check_in || ""}`;
      const tb = `${b.tanggal} ${b.check_in || ""}`;
      return tb.localeCompare(ta);
    });
    return v;
  }, [rows, q, divisiFilter, sortBy]);

  const ringkasan = useMemo(() => {
    let totalMenit = 0;
    let terlambat = 0;
    let selesai = 0;
    for (const r of view) {
      totalMenit += durasiMenit(r.check_in, r.check_out);
      if (r.status_masuk === "Terlambat") terlambat += 1;
      if (r.check_out) selesai += 1;
    }
    return { totalMenit, terlambat, selesai };
  }, [view]);

  async function unduhPdf() {
    if (!view.length) return;
    setPdfBusy(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFontSize(14);
      doc.setTextColor(14, 31, 85);
      doc.text("Rekap Absensi Dapur — Badan Gizi Nasional", 14, 15);
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(`Periode: ${fmtDate(from)} s/d ${fmtDate(to)}`, 14, 21);
      doc.text(
        `Dicetak: ${new Intl.DateTimeFormat("id-ID", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date())}`,
        14,
        26,
      );

      const body = view.map((r) => [
        fmtDate(r.tanggal),
        r.nama,
        r.divisi_nama || "-",
        r.shift_masuk && r.shift_pulang ? `${r.shift_masuk}-${r.shift_pulang}` : "-",
        fmtTime(r.check_in),
        r.status_masuk || "-",
        fmtTime(r.check_out),
        fmtDurasi(durasiMenit(r.check_in, r.check_out)),
      ]);

      autoTable(doc, {
        startY: 31,
        head: [
          ["Tanggal", "Nama", "Divisi", "Jadwal", "Masuk", "Status", "Pulang", "Durasi"],
        ],
        body,
        styles: { fontSize: 8, cellPadding: 1.8 },
        headStyles: { fillColor: [14, 31, 85], textColor: 255 },
        alternateRowStyles: { fillColor: [243, 246, 252] },
      });

      const finalY =
        (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
        31;
      doc.setFontSize(10);
      doc.setTextColor(20);
      doc.text(
        `Total: ${view.length} catatan · Total jam kerja: ${fmtDurasi(
          ringkasan.totalMenit,
        )} · Terlambat: ${ringkasan.terlambat}`,
        14,
        finalY + 8,
      );

      doc.save(`absensi-dapur_${from}_sd_${to}.pdf`);
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Rekap Absensi</h1>

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
        <button onClick={load} className="btn-ghost" disabled={loading}>
          {loading ? "Memuat…" : "Tampilkan"}
        </button>
        <div className="ml-auto flex gap-2">
          <a href={`/api/admin/export?from=${from}&to=${to}`} className="btn-ghost">
            ⬇ CSV
          </a>
          <button onClick={unduhPdf} className="btn-gold" disabled={pdfBusy || !view.length}>
            {pdfBusy ? "Menyiapkan…" : "⬇ PDF"}
          </button>
        </div>
      </div>

      {/* Filter & urutan */}
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[160px] flex-1">
          <label className="label">Cari Nama</label>
          <input
            className="input"
            value={q}
            placeholder="Ketik nama pegawai…"
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Divisi</label>
          <select
            className="input"
            value={divisiFilter}
            onChange={(e) => setDivisiFilter(e.target.value)}
          >
            <option value="">Semua Divisi</option>
            {divisiOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Urutkan</label>
          <select
            className="input"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="waktu">Waktu (terbaru)</option>
            <option value="nama">Nama (A–Z)</option>
            <option value="divisi">Divisi (A–Z)</option>
            <option value="status">Status</option>
          </select>
        </div>
        {(q || divisiFilter || sortBy !== "waktu") && (
          <button
            onClick={() => {
              setQ("");
              setDivisiFilter("");
              setSortBy("waktu");
            }}
            className="btn-ghost"
          >
            Reset
          </button>
        )}
      </div>

      {/* Ringkasan jam kerja */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-slate-400">Total Catatan</p>
          <p className="mt-1 text-2xl font-bold">{rows.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400">Total Jam Kerja</p>
          <p className="mt-1 text-2xl font-bold text-gold-400">
            {fmtDurasi(ringkasan.totalMenit)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400">Shift Selesai</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">{ringkasan.selesai}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400">Terlambat</p>
          <p className="mt-1 text-2xl font-bold text-amber-300">{ringkasan.terlambat}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-white/5 px-4 py-3 text-sm text-slate-400">
          {view.length} dari {rows.length} catatan
        </div>
        {loading ? (
          <p className="p-6 text-center text-slate-400">Memuat…</p>
        ) : view.length === 0 ? (
          <p className="p-6 text-center text-slate-400">
            {rows.length === 0
              ? "Tidak ada data pada rentang ini."
              : "Tidak ada catatan yang cocok dengan filter."}
          </p>
        ) : (
          <div className="scroll-x overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr className="border-b border-white/5">
                  <th className="px-4 py-2.5">Tanggal</th>
                  <th className="px-4 py-2.5">Nama</th>
                  <th className="px-4 py-2.5">Divisi</th>
                  <th className="px-4 py-2.5">Lokasi</th>
                  <th className="px-4 py-2.5">Jadwal</th>
                  <th className="px-4 py-2.5">Masuk</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Pulang</th>
                  <th className="px-4 py-2.5">Durasi</th>
                  <th className="px-4 py-2.5 text-right">Foto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {view.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5 whitespace-nowrap">{fmtDate(r.tanggal)}</td>
                    <td className="px-4 py-2.5 font-medium">{r.nama}</td>
                    <td className="px-4 py-2.5">{r.divisi_nama || "—"}</td>
                    <td className="px-4 py-2.5 text-slate-400">{r.lokasi || "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-400">
                      {r.shift_masuk && r.shift_pulang
                        ? `${r.shift_masuk}–${r.shift_pulang}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5">{fmtTime(r.check_in)}</td>
                    <td className="px-4 py-2.5">
                      {r.status_masuk ? (
                        <span
                          className={
                            "badge " +
                            (r.status_masuk === "Terlambat"
                              ? "bg-red-500/15 text-red-300"
                              : "bg-emerald-500/15 text-emerald-300")
                          }
                        >
                          {r.status_masuk}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2.5">{fmtTime(r.check_out)}</td>
                    <td className="px-4 py-2.5 font-medium text-gold-400">
                      {fmtDurasi(durasiMenit(r.check_in, r.check_out))}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end">
                        <FotoAbsen id={r.id} nama={r.nama} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
