"use client";

/**
 * Panel Cross-check kuantitas — auditor merekonsiliasi bahan dari PO → receiving →
 * storage → production → waste → output porsi, plus catatan gap. Disimpan sekaligus
 * lewat PUT /api/audit/cross-check (replace-all). Selisih dihitung ringan di klien
 * sebagai bantu-baca (bukan sumber kebenaran; server yang final).
 */
import { useEffect, useState } from "react";
import { getCrossCheck, simpanCrossCheck } from "@/lib/audit-client";

interface Baris {
  bahan: string;
  satuan: string;
  po: string;
  receiving: string;
  storage: string;
  production: string;
  waste: string;
  output_porsi: string;
  gap_catatan: string;
}

const KOSONG: Baris = {
  bahan: "",
  satuan: "kg",
  po: "",
  receiving: "",
  storage: "",
  production: "",
  waste: "",
  output_porsi: "",
  gap_catatan: "",
};

const NUM_FIELDS: { key: keyof Baris; label: string }[] = [
  { key: "po", label: "PO" },
  { key: "receiving", label: "Receiving" },
  { key: "storage", label: "Storage" },
  { key: "production", label: "Production" },
  { key: "waste", label: "Waste" },
  { key: "output_porsi", label: "Output porsi" },
];

/** Selisih PO vs receiving sebagai indikator gap cepat (bantu baca saja). */
function gapReceiving(r: Baris): number | null {
  const po = Number(r.po);
  const rec = Number(r.receiving);
  if (!r.po || !r.receiving || Number.isNaN(po) || Number.isNaN(rec)) return null;
  return +(rec - po).toFixed(2);
}

export default function CrossCheckPanel({ sesiId }: { sesiId: number }) {
  const [rows, setRows] = useState<Baris[]>([{ ...KOSONG }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getCrossCheck(sesiId)
      .then((r) => {
        if (!alive) return;
        if (r.cross_check.length) {
          setRows(
            r.cross_check.map((c) => ({
              bahan: c.bahan,
              satuan: c.satuan ?? "kg",
              po: c.po != null ? String(c.po) : "",
              receiving: c.receiving != null ? String(c.receiving) : "",
              storage: c.storage != null ? String(c.storage) : "",
              production: c.production != null ? String(c.production) : "",
              waste: c.waste != null ? String(c.waste) : "",
              output_porsi: c.output_porsi != null ? String(c.output_porsi) : "",
              gap_catatan: c.gap_catatan ?? "",
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
      const num = (v: string) => (v ? Number(v) : undefined);
      const baris = rows
        .filter((r) => r.bahan.trim())
        .map((r) => ({
          bahan: r.bahan.trim(),
          satuan: r.satuan || undefined,
          po: num(r.po),
          receiving: num(r.receiving),
          storage: num(r.storage),
          production: num(r.production),
          waste: num(r.waste),
          output_porsi: num(r.output_porsi),
          gap_catatan: r.gap_catatan || undefined,
        }));
      const res = await simpanCrossCheck({ sesi_id: sesiId, baris });
      if (res.cross_check.length) {
        setRows(
          res.cross_check.map((c) => ({
            bahan: c.bahan,
            satuan: c.satuan ?? "kg",
            po: c.po != null ? String(c.po) : "",
            receiving: c.receiving != null ? String(c.receiving) : "",
            storage: c.storage != null ? String(c.storage) : "",
            production: c.production != null ? String(c.production) : "",
            waste: c.waste != null ? String(c.waste) : "",
            output_porsi: c.output_porsi != null ? String(c.output_porsi) : "",
            gap_catatan: c.gap_catatan ?? "",
          })),
        );
      }
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
          <h3 className="text-base font-semibold">Cross-check Kuantitas</h3>
          <p className="text-xs text-slate-500">Rekonsiliasi PO → receiving → storage → produksi → waste → output.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={tambah}
            className="rounded-lg border border-ink-700 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/5"
          >
            + Bahan
          </button>
          <button
            type="button"
            onClick={simpan}
            disabled={saving}
            className="rounded-lg bg-gold-500/15 px-3 py-1.5 text-sm font-semibold text-gold-300 ring-1 ring-gold-500/30 transition hover:bg-gold-500/25 disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : "Simpan cross-check"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((r, idx) => {
          const gap = gapReceiving(r);
          return (
            <div key={idx} className="rounded-xl border border-ink-700 bg-ink-900/50 p-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <input
                  value={r.bahan}
                  onChange={(e) => setField(idx, "bahan", e.target.value)}
                  placeholder="Nama bahan"
                  className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-gold-500/40 focus:outline-none"
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
                  aria-label="Hapus bahan"
                >
                  Hapus
                </button>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-6">
                {NUM_FIELDS.map((f) => (
                  <label key={f.key} className="block">
                    <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">{f.label}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={r[f.key]}
                      onChange={(e) => setField(idx, f.key, e.target.value)}
                      className="w-full rounded-lg border border-ink-700 bg-ink-900 px-2 py-1.5 text-sm text-slate-100 tabular-nums placeholder:text-slate-600 focus:border-gold-500/40 focus:outline-none"
                    />
                  </label>
                ))}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {gap != null && (
                  <span
                    className={
                      "rounded-md px-2 py-0.5 text-[11px] font-medium tabular-nums ring-1 ring-inset " +
                      (gap === 0
                        ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                        : "bg-amber-500/15 text-amber-300 ring-amber-500/30")
                    }
                    title="Selisih receiving − PO"
                  >
                    Δ receiving {gap > 0 ? "+" : ""}
                    {gap} {r.satuan}
                  </span>
                )}
                <input
                  value={r.gap_catatan}
                  onChange={(e) => setField(idx, "gap_catatan", e.target.value)}
                  placeholder="Catatan gap (opsional)…"
                  className="flex-1 rounded-lg border border-ink-700 bg-ink-900 px-3 py-1 text-sm text-slate-100 placeholder:text-slate-600 focus:border-gold-500/40 focus:outline-none"
                />
              </div>
            </div>
          );
        })}
      </div>

      {msg && <p className="mt-2 text-xs text-gold-300">{msg}</p>}
    </div>
  );
}
