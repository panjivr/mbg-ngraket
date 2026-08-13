"use client";

/**
 * Panel Timeline proses — auditor mencatat jam mulai/selesai tiap tahap produksi.
 * Durasi & status (normal / over_time / lebih_awal) dihitung server-side; di sini
 * kita tampilkan hasilnya. Simpan sekaligus lewat PUT /api/audit/timeline (replace-all).
 */
import { useEffect, useState } from "react";
import { AUDIT_AREA_SEED, type AreaKey } from "@/lib/audit-seed";
import { getTimeline, simpanTimeline } from "@/lib/audit-client";
import type { TimelineStatus } from "@/lib/audit-types";

interface Baris {
  proses: string;
  mulai: string;
  selesai: string;
  catatan: string;
  status?: TimelineStatus;
  durasi_menit?: number | null;
}

const STATUS_META: Record<TimelineStatus, { label: string; cls: string }> = {
  normal: { label: "Normal", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
  over_time: { label: "Over Time", cls: "bg-red-500/15 text-red-300 ring-red-500/30" },
  lebih_awal: { label: "Lebih Awal", cls: "bg-sky-500/15 text-sky-300 ring-sky-500/30" },
};

/** Baris default: satu proses per area utama produksi. */
function seedBaris(): Baris[] {
  const inti: AreaKey[] = ["penerimaan", "persiapan", "pengolahan", "pemorsian", "distribusi"];
  return inti.map((a) => ({ proses: AUDIT_AREA_SEED[a].label, mulai: "", selesai: "", catatan: "" }));
}

function fromApi(t: { proses: string; mulai: string | null; selesai: string | null; catatan: string; status: TimelineStatus; durasi_menit: number | null }): Baris {
  return {
    proses: t.proses,
    mulai: (t.mulai ?? "").slice(0, 5),
    selesai: (t.selesai ?? "").slice(0, 5),
    catatan: t.catatan ?? "",
    status: t.status,
    durasi_menit: t.durasi_menit,
  };
}

export default function TimelinePanel({ sesiId }: { sesiId: number }) {
  const [rows, setRows] = useState<Baris[]>(seedBaris());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getTimeline(sesiId)
      .then((r) => {
        if (!alive) return;
        if (r.timeline.length) setRows(r.timeline.map(fromApi));
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
  function tambahBaris() {
    setRows((prev) => [...prev, { proses: "", mulai: "", selesai: "", catatan: "" }]);
  }
  function hapusBaris(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function simpan() {
    setSaving(true);
    setMsg(null);
    try {
      const baris = rows
        .filter((r) => r.proses.trim())
        .map((r) => ({
          proses: r.proses.trim(),
          mulai: r.mulai || undefined,
          selesai: r.selesai || undefined,
          catatan: r.catatan || undefined,
        }));
      const res = await simpanTimeline({ sesi_id: sesiId, baris });
      setRows(res.timeline.map(fromApi));
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
          <h3 className="text-base font-semibold">Timeline Proses</h3>
          <p className="text-xs text-slate-500">Catat jam mulai & selesai tiap tahap. Status dihitung otomatis.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={tambahBaris}
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
            {saving ? "Menyimpan…" : "Simpan timeline"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((r, idx) => (
          <div key={idx} className="rounded-xl border border-ink-700 bg-ink-900/50 p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
              <input
                value={r.proses}
                onChange={(e) => setField(idx, "proses", e.target.value)}
                placeholder="Nama proses"
                className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-gold-500/40 focus:outline-none"
              />
              <input
                type="time"
                value={r.mulai}
                onChange={(e) => setField(idx, "mulai", e.target.value)}
                className="rounded-lg border border-ink-700 bg-ink-900 px-2 py-1.5 text-sm text-slate-100 focus:border-gold-500/40 focus:outline-none"
              />
              <input
                type="time"
                value={r.selesai}
                onChange={(e) => setField(idx, "selesai", e.target.value)}
                className="rounded-lg border border-ink-700 bg-ink-900 px-2 py-1.5 text-sm text-slate-100 focus:border-gold-500/40 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => hapusBaris(idx)}
                className="rounded-lg px-2 py-1.5 text-sm text-slate-500 transition hover:text-red-300"
                aria-label="Hapus baris"
              >
                Hapus
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {r.status && (
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${STATUS_META[r.status].cls}`}>
                  {STATUS_META[r.status].label}
                </span>
              )}
              {r.durasi_menit != null && (
                <span className="text-[11px] tabular-nums text-slate-500">{r.durasi_menit} menit</span>
              )}
              <input
                value={r.catatan}
                onChange={(e) => setField(idx, "catatan", e.target.value)}
                placeholder="Catatan (opsional)…"
                className="flex-1 rounded-lg border border-ink-700 bg-ink-900 px-3 py-1 text-sm text-slate-100 placeholder:text-slate-600 focus:border-gold-500/40 focus:outline-none"
              />
            </div>
          </div>
        ))}
      </div>

      {msg && <p className="mt-2 text-xs text-gold-300">{msg}</p>}
    </div>
  );
}
