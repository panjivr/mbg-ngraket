"use client";

/**
 * Panel Ringkasan & Kirim — auditor menuliskan ringkasan sesi lalu mengirim (finalisasi).
 * Ringkasan disimpan via PUT /api/audit/sesi (updateSesi). Tombol "Kirim" mengeset
 * dikirim_at (server) sehingga sesi terkunci sebagai laporan resmi.
 */
import { useState } from "react";
import { updateSesi, getObservasi, getTemuan, getWaste, getCrossCheck } from "@/lib/audit-client";
import { areaLabel } from "@/lib/audit-seed";
import type { AuditSesi } from "@/lib/audit-types";

export default function RingkasanPanel({
  sesi,
  onUpdated,
}: {
  sesi: AuditSesi;
  onUpdated: (sesi: AuditSesi) => void;
}) {
  const [ringkasan, setRingkasan] = useState(sesi.ringkasan ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const terkirim = Boolean(sesi.dikirim_at);

  async function unduhPdf() {
    setPdfBusy(true);
    setMsg(null);
    try {
      const [obs, tem, wst, cc] = await Promise.all([
        getObservasi(sesi.id).then((r) => r.observasi).catch(() => []),
        getTemuan({ sesi_id: sesi.id }).then((r) => r.temuan).catch(() => []),
        getWaste(sesi.id).then((r) => r.waste).catch(() => []),
        getCrossCheck(sesi.id).then((r) => r.cross_check).catch(() => []),
      ]);
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const navy: [number, number, number] = [14, 31, 85];
      let y = 15;

      doc.setFontSize(14);
      doc.setTextColor(...navy);
      doc.text("Laporan Audit Mutu Dapur — Badan Gizi Nasional", 14, y);
      y += 6;
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(`Tanggal audit: ${sesi.tanggal} · Mode: ${sesi.mode}`, 14, y);
      y += 5;
      doc.text(
        `Status: ${terkirim ? "Terkirim (resmi)" : "Draf"} · Dicetak: ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}`,
        14,
        y,
      );
      y += 7;

      if (ringkasan.trim()) {
        doc.setFontSize(11);
        doc.setTextColor(...navy);
        doc.text("Ringkasan", 14, y);
        y += 5;
        doc.setFontSize(9);
        doc.setTextColor(30);
        const lines = doc.splitTextToSize(ringkasan.trim(), 182);
        doc.text(lines, 14, y);
        y += lines.length * 4.3 + 4;
      }

      // Observasi per area — rekap Ya/Tidak/N/A + daftar item "Tidak".
      const obsBody = obs.map((o) => {
        const c = o.checklist || [];
        const ya = c.filter((x) => x.jawaban === "ya").length;
        const tidak = c.filter((x) => x.jawaban === "tidak").length;
        const na = c.filter((x) => x.jawaban === "na").length;
        return [areaLabel(String(o.area)), String(ya), String(tidak), String(na), o.catatan || "-"];
      });
      if (obsBody.length) {
        autoTable(doc, {
          startY: y,
          head: [["Area", "Ya", "Tidak", "N/A", "Catatan"]],
          body: obsBody,
          styles: { fontSize: 8, cellPadding: 1.6, overflow: "linebreak" },
          headStyles: { fillColor: navy, textColor: 255 },
          alternateRowStyles: { fillColor: [243, 246, 252] },
          columnStyles: { 0: { cellWidth: 42 }, 1: { cellWidth: 12 }, 2: { cellWidth: 14 }, 3: { cellWidth: 12 }, 4: { cellWidth: "auto" } },
        });
        y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
        y += 6;
      }

      // Item checklist yang "Tidak" (perlu perhatian).
      const flag: string[][] = [];
      for (const o of obs) for (const it of o.checklist || []) if (it.jawaban === "tidak") flag.push([areaLabel(String(o.area)), it.pertanyaan, it.catatan || "-"]);
      if (flag.length) {
        autoTable(doc, {
          startY: y,
          head: [["Area", "Butir tidak sesuai", "Catatan"]],
          body: flag,
          styles: { fontSize: 8, cellPadding: 1.6, overflow: "linebreak" },
          headStyles: { fillColor: [153, 27, 27], textColor: 255 },
          columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: "auto" }, 2: { cellWidth: 50 } },
        });
        y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
        y += 6;
      }

      // Temuan.
      if (tem.length) {
        autoTable(doc, {
          startY: y,
          head: [["Area", "Kategori", "Tingkat", "Risk", "Status", "Rekomendasi"]],
          body: tem.map((t) => [areaLabel(String(t.area)), String(t.kategori), String(t.tingkat), String(t.risk_score), String(t.status), t.rekomendasi || "-"]),
          styles: { fontSize: 8, cellPadding: 1.6, overflow: "linebreak" },
          headStyles: { fillColor: navy, textColor: 255 },
          alternateRowStyles: { fillColor: [243, 246, 252] },
          columnStyles: { 0: { cellWidth: 30 }, 3: { cellWidth: 12 }, 5: { cellWidth: "auto" } },
        });
        y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
        y += 6;
      }

      // Cross-check bahan.
      if (cc.length) {
        autoTable(doc, {
          startY: y,
          head: [["Bahan", "Sat", "PO", "Receiving", "Storage", "Produksi", "Waste", "Output"]],
          body: cc.map((x) => [x.bahan, x.satuan, String(x.po), String(x.receiving), String(x.storage), String(x.production), String(x.waste), String(x.output_porsi)]),
          styles: { fontSize: 8, cellPadding: 1.6 },
          headStyles: { fillColor: navy, textColor: 255 },
          alternateRowStyles: { fillColor: [243, 246, 252] },
        });
        y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
        y += 6;
      }

      // Food waste.
      if (wst.length) {
        autoTable(doc, {
          startY: y,
          head: [["Jenis", "Penyebab", "Jumlah", "Satuan", "Catatan"]],
          body: wst.map((w) => [String(w.jenis), String(w.penyebab), String(w.jumlah), w.satuan, w.catatan || "-"]),
          styles: { fontSize: 8, cellPadding: 1.6, overflow: "linebreak" },
          headStyles: { fillColor: navy, textColor: 255 },
          alternateRowStyles: { fillColor: [243, 246, 252] },
        });
      }

      doc.save(`audit-dapur-${sesi.tanggal}.pdf`);
    } catch (e) {
      setMsg((e as Error).message || "Gagal membuat PDF.");
    } finally {
      setPdfBusy(false);
    }
  }

  async function simpan(kirim: boolean) {
    setSaving(true);
    setMsg(null);
    try {
      const r = await updateSesi({ id: sesi.id, ringkasan: ringkasan.trim(), kirim });
      onUpdated(r.sesi);
      setMsg(kirim ? "Laporan dikirim." : "Ringkasan tersimpan.");
      setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-850 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">Ringkasan & Kirim</h3>
          <p className="text-xs text-slate-500">Simpulkan kondisi audit sesi ini, lalu kirim sebagai laporan resmi.</p>
        </div>
        {terkirim && (
          <span className="rounded-md bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
            Terkirim · {new Date(sesi.dikirim_at as string).toLocaleString("id-ID")}
          </span>
        )}
      </div>

      <textarea
        value={ringkasan}
        onChange={(e) => setRingkasan(e.target.value)}
        rows={8}
        placeholder="Ringkasan kondisi umum, temuan utama, dan rekomendasi prioritas…"
        className="w-full rounded-xl border border-ink-700 bg-ink-900 px-3 py-2.5 text-sm leading-relaxed text-slate-100 placeholder:text-slate-600 focus:border-gold-500/40 focus:outline-none"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => simpan(false)}
          disabled={saving}
          className="rounded-lg border border-ink-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
        >
          {saving ? "Menyimpan…" : "Simpan draf"}
        </button>
        <button
          type="button"
          onClick={() => simpan(true)}
          disabled={saving}
          className="rounded-lg bg-gold-500/15 px-4 py-2 text-sm font-semibold text-gold-300 ring-1 ring-gold-500/30 transition hover:bg-gold-500/25 disabled:opacity-50"
        >
          {terkirim ? "Kirim ulang laporan" : "Kirim laporan"}
        </button>
        <button
          type="button"
          onClick={unduhPdf}
          disabled={pdfBusy}
          className="rounded-lg border border-ink-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
        >
          {pdfBusy ? "Menyiapkan…" : "Unduh PDF"}
        </button>
        {msg && <span className="text-xs text-gold-300">{msg}</span>}
      </div>
    </div>
  );
}
