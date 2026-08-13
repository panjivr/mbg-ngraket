"use client";

/**
 * Panel Ringkasan & Kirim — auditor menuliskan ringkasan sesi lalu mengirim (finalisasi).
 * Ringkasan disimpan via PUT /api/audit/sesi (updateSesi). Tombol "Kirim" mengeset
 * dikirim_at (server) sehingga sesi terkunci sebagai laporan resmi.
 */
import { useState } from "react";
import { updateSesi } from "@/lib/audit-client";
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

  const terkirim = Boolean(sesi.dikirim_at);

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
        {msg && <span className="text-xs text-gold-300">{msg}</span>}
      </div>
    </div>
  );
}
