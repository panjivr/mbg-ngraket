"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface Row {
  id: number;
  user_nama: string;
  aksi: string;
  entitas: string;
  ringkasan: string;
  created_at: string;
}

const AKSI_STYLE: Record<string, string> = {
  buat: "bg-emerald-500/15 text-emerald-300",
  ubah: "bg-amber-500/15 text-amber-300",
  hapus: "bg-red-500/15 text-red-300",
};

function fmt(v: string) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function initials(nama: string) {
  const p = (nama || "?").trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
}

export default function AuditPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterAksi, setFilterAksi] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/audit?limit=300", { cache: "no-store" });
      const d = await r.json();
      setRows(Array.isArray(d.log) ? d.log : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterAksi && r.aksi !== filterAksi) return false;
      if (!s) return true;
      return (
        r.user_nama.toLowerCase().includes(s) ||
        r.entitas.toLowerCase().includes(s) ||
        r.ringkasan.toLowerCase().includes(s)
      );
    });
  }, [rows, q, filterAksi]);

  const exportCsv = useCallback(() => {
    const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Waktu", "Nama", "Aksi", "Objek", "Keterangan"];
    const body = filtered.map((r) =>
      [fmt(r.created_at), r.user_nama, r.aksi, r.entitas, r.ringkasan].map(esc).join(","),
    );
    const csv = "﻿" + [head.map(esc).join(","), ...body].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `jejak-aktivitas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  const exportPdf = useCallback(async () => {
    if (filtered.length === 0) return;
    setPdfBusy(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      doc.setFontSize(14);
      doc.setTextColor(14, 31, 85);
      doc.text("Jejak Aktivitas — Badan Gizi Nasional", 14, 15);
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(
        `Dicetak: ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}`,
        14,
        21,
      );
      doc.text(
        `${filtered.length} aktivitas${filterAksi ? ` · filter: ${filterAksi}` : ""}${q.trim() ? ` · cari: "${q.trim()}"` : ""}`,
        14,
        26,
      );

      autoTable(doc, {
        startY: 31,
        head: [["Waktu", "Nama", "Aksi", "Objek", "Keterangan"]],
        body: filtered.map((r) => [fmt(r.created_at), r.user_nama || "-", r.aksi, r.entitas, r.ringkasan || "-"]),
        styles: { fontSize: 8, cellPadding: 1.8, overflow: "linebreak" },
        headStyles: { fillColor: [14, 31, 85], textColor: 255 },
        alternateRowStyles: { fillColor: [243, 246, 252] },
        columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 32 }, 2: { cellWidth: 16 }, 3: { cellWidth: 28 }, 4: { cellWidth: "auto" } },
      });

      doc.save(`jejak-aktivitas-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setPdfBusy(false);
    }
  }, [filtered, filterAksi, q]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Jejak Aktivitas</h1>
          <p className="text-sm text-slate-400">
            Riwayat perubahan penting oleh admin — untuk akuntabilitas & audit.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} disabled={loading || rows.length === 0} className="btn-ghost px-3 py-1.5 text-xs">
            Ekspor CSV
          </button>
          <button onClick={exportPdf} disabled={loading || pdfBusy || filtered.length === 0} className="btn-ghost px-3 py-1.5 text-xs">
            {pdfBusy ? "Menyiapkan…" : "Ekspor PDF"}
          </button>
          <button onClick={load} disabled={loading} className="btn-ghost px-3 py-1.5 text-xs">
            {loading ? "Memuat…" : "Segarkan"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input max-w-xs flex-1"
          placeholder="Cari nama / objek / keterangan…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex items-center gap-1">
          {[
            ["", "Semua"],
            ["buat", "Buat"],
            ["ubah", "Ubah"],
            ["hapus", "Hapus"],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilterAksi(val)}
              className={
                "rounded-lg px-3 py-1.5 text-xs font-medium " +
                (filterAksi === val ? "bg-white/10 text-slate-100" : "text-slate-400 hover:bg-white/5")
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <p className="p-6 text-center text-slate-400">Memuat…</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-slate-500">
            {rows.length === 0 ? "Belum ada aktivitas tercatat." : "Tidak ada yang cocok dengan pencarian."}
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {filtered.map((r) => (
              <li key={r.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02]">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold-500/20 text-[10px] font-bold text-gold-400">
                  {initials(r.user_nama)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="font-medium">{r.user_nama || "—"}</span>
                    <span className={"badge " + (AKSI_STYLE[r.aksi] || "bg-slate-500/15 text-slate-300")}>
                      {r.aksi}
                    </span>
                    <span className="text-slate-300">{r.entitas}</span>
                  </p>
                  {r.ringkasan && <p className="mt-0.5 text-xs text-slate-400">{r.ringkasan}</p>}
                </div>
                <span className="shrink-0 whitespace-nowrap text-xs text-slate-500">{fmt(r.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {!loading && filtered.length > 0 && (
        <p className="text-center text-xs text-slate-500">
          Menampilkan {filtered.length} dari {rows.length} aktivitas terakhir.
        </p>
      )}
    </div>
  );
}
