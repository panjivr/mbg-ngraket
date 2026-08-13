"use client";

/**
 * Panel Food Waste — auditor mendata pemborosan/limbah per sesi: jenis, penyebab,
 * jumlah, satuan, catatan. Disimpan sekaligus lewat PUT /api/audit/waste (replace-all).
 */
import { useEffect, useState } from "react";
import { JENIS_WASTE, JENIS_WASTE_LABEL, type JenisWaste } from "@/lib/audit-types";
import { PENYEBAB_WASTE, PENYEBAB_LABEL, type PenyebabWaste } from "@/lib/audit-risk";
import { getWaste, simpanWaste } from "@/lib/audit-client";

interface Baris {
  jenis: string;
  penyebab: string;
  jumlah: string;
  satuan: string;
  catatan: string;
}

const KOSONG: Baris = { jenis: JENIS_WASTE[0], penyebab: PENYEBAB_WASTE[0], jumlah: "", satuan: "kg", catatan: "" };

export default function WastePanel({ sesiId }: { sesiId: number }) {
  const [rows, setRows] = useState<Baris[]>([{ ...KOSONG }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getWaste(sesiId)
      .then((r) => {
        if (!alive) return;
        if (r.waste.length) {
          setRows(
            r.waste.map((w) => ({
              jenis: w.jenis,
              penyebab: w.penyebab,
              jumlah: w.jumlah ? String(w.jumlah) : "",
              satuan: w.satuan ?? "kg",
              catatan: w.catatan ?? "",
            })),
          );
        }
      })
      .catch((e) => alive && setMsg(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [sesiId]);

  function setField(idx: number, key: keyof Baris, val: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: val } : r)));
  }
  function tambah() {
    setRows((prev) => [...prev, { ...KOSONG }]);
  }
  function hapus(idx: number) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  async function simpan() {
    setSaving(true);
    setMsg(null);
    try {
      const baris = rows
        .filter((r) => r.jenis)
        .map((r) => ({
          jenis: r.jenis,
          penyebab: r.penyebab || undefined,
          jumlah: r.jumlah ? Number(r.jumlah) : undefined,
          satuan: r.satuan || undefined,
          catatan: r.catatan || undefined,
        }));
      await simpanWaste({ sesi_id: sesiId, baris });
      setMsg("Tersimpan.");
      setTimeout(() => setMsg(null), 2000);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="py-8 text-center text-sm text-slate-500">Memuat…</p>;

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-850 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">Food Waste</h3>
          <p className="text-xs text-slate-500">Data pemborosan & limbah untuk analisis penyebab.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={tambah}
            className="rounded-lg border border-ink-700 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/5"
          >
            + Baris
          </button>
          <button
            type="button"
            onClick={simpan}
            disabled={saving}
            className="rounded-lg bg-gold-500/15 px-3 py-1.5 text-sm font-semibold text-gold-300 ring-1 ring-gold-500/30 transition hover:bg-gold-500/25 disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : "Simpan waste"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((r, idx) => (
          <div key={idx} className="grid gap-2 rounded-xl border border-ink-700 bg-ink-900/50 p-3 sm:grid-cols-[1fr_1fr_auto_auto_auto]">
            <select
              value={r.jenis}
              onChange={(e) => setField(idx, "jenis", e.target.value)}
              className="rounded-lg border border-ink-700 bg-ink-900 px-2 py-1.5 text-sm text-slate-100 focus:border-gold-500/40 focus:outline-none"
            >
              {JENIS_WASTE.map((j) => (
                <option key={j} value={j}>
                  {JENIS_WASTE_LABEL[j as JenisWaste]}
                </option>
              ))}
            </select>
            <select
              value={r.penyebab}
              onChange={(e) => setField(idx, "penyebab", e.target.value)}
              className="rounded-lg border border-ink-700 bg-ink-900 px-2 py-1.5 text-sm text-slate-100 focus:border-gold-500/40 focus:outline-none"
            >
              {PENYEBAB_WASTE.map((p) => (
                <option key={p} value={p}>
                  {PENYEBAB_LABEL[p as PenyebabWaste]}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="0.1"
              value={r.jumlah}
              onChange={(e) => setField(idx, "jumlah", e.target.value)}
              placeholder="Jumlah"
              className="w-24 rounded-lg border border-ink-700 bg-ink-900 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-gold-500/40 focus:outline-none"
            />
            <input
              value={r.satuan}
              onChange={(e) => setField(idx, "satuan", e.target.value)}
              placeholder="Satuan"
              className="w-20 rounded-lg border border-ink-700 bg-ink-900 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-gold-500/40 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => hapus(idx)}
              className="rounded-lg px-2 py-1.5 text-sm text-slate-500 transition hover:text-red-300"
              aria-label="Hapus baris"
            >
              Hapus
            </button>
            <input
              value={r.catatan}
              onChange={(e) => setField(idx, "catatan", e.target.value)}
              placeholder="Catatan (opsional)…"
              className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-1 text-sm text-slate-100 placeholder:text-slate-600 focus:border-gold-500/40 focus:outline-none sm:col-span-5"
            />
          </div>
        ))}
      </div>

      {msg && <p className="mt-2 text-xs text-gold-300">{msg}</p>}
    </div>
  );
}
