"use client";

/**
 * Panel Observasi — 10 area audit (dari AUDIT_AREA_SEED). Tiap area punya
 * checklist ya/tidak/na + catatan. Disimpan per-area lewat PUT /api/audit/observasi
 * (replace-all per area). Auditor bisa jawab cepat dengan tombol tiga-state.
 */
import { useEffect, useState } from "react";
import { AUDIT_AREA_SEED, AREA_KEYS, type AreaKey } from "@/lib/audit-seed";
import { getObservasi, simpanObservasi } from "@/lib/audit-client";
import type { ChecklistItem, JawabanChecklist, AuditObservasi } from "@/lib/audit-types";

const JAWAB: { key: JawabanChecklist; label: string; on: string }[] = [
  { key: "ya", label: "Ya", on: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40" },
  { key: "tidak", label: "Tidak", on: "bg-red-500/20 text-red-300 ring-red-500/40" },
  { key: "na", label: "N/A", on: "bg-slate-500/20 text-slate-300 ring-slate-500/40" },
];

function seedChecklist(area: AreaKey): ChecklistItem[] {
  return AUDIT_AREA_SEED[area].pertanyaan.map((pertanyaan) => ({
    pertanyaan,
    jawaban: "na" as JawabanChecklist,
    catatan: "",
  }));
}

function seedFrom(observasi: AuditObservasi[]): { map: Record<string, ChecklistItem[]>; cat: Record<string, string> } {
  const map: Record<string, ChecklistItem[]> = {};
  const cat: Record<string, string> = {};
  for (const o of observasi) {
    map[o.area] = o.checklist?.length ? o.checklist : seedChecklist(o.area as AreaKey);
    cat[o.area] = o.catatan ?? "";
  }
  return { map, cat };
}

export default function ObservasiPanel({ sesiId, initial }: { sesiId: number; initial?: AuditObservasi[] }) {
  const [active, setActive] = useState<AreaKey>(AREA_KEYS[0]);
  const seeded = initial ? seedFrom(initial) : null;
  const [data, setData] = useState<Record<string, ChecklistItem[]>>(seeded?.map ?? {});
  const [catatan, setCatatan] = useState<Record<string, string>>(seeded?.cat ?? {});
  // Bila data awal sudah dibawa dari bootstrap sesi, jangan tampilkan loading /
  // fetch ulang — tampilan langsung terisi (hemat 1 round-trip).
  const [loading, setLoading] = useState(!initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initial) return; // sudah punya data awal
    let alive = true;
    setLoading(true);
    getObservasi(sesiId)
      .then((r) => {
        if (!alive) return;
        const { map, cat } = seedFrom(r.observasi);
        setData(map);
        setCatatan(cat);
      })
      .catch((e) => alive && setMsg(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesiId]);

  const list = data[active] ?? seedChecklist(active);
  const answered = list.filter((i) => i.jawaban !== "na").length;

  function setJawaban(idx: number, jawaban: JawabanChecklist) {
    setData((prev) => {
      const cur = prev[active] ?? seedChecklist(active);
      const next = cur.map((it, i) => (i === idx ? { ...it, jawaban } : it));
      return { ...prev, [active]: next };
    });
  }
  function setItemCatatan(idx: number, val: string) {
    setData((prev) => {
      const cur = prev[active] ?? seedChecklist(active);
      const next = cur.map((it, i) => (i === idx ? { ...it, catatan: val } : it));
      return { ...prev, [active]: next };
    });
  }

  async function simpan() {
    setSaving(true);
    setMsg(null);
    try {
      await simpanObservasi({
        sesi_id: sesiId,
        area: active,
        checklist: data[active] ?? seedChecklist(active),
        catatan: catatan[active] ?? "",
      });
      setMsg("Tersimpan.");
      setTimeout(() => setMsg(null), 2000);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      {/* Daftar area — kartu dengan bar progres */}
      <nav className="flex flex-row flex-wrap gap-1.5 lg:flex-col">
        {AREA_KEYS.map((area) => {
          const filled = (data[area] ?? []).filter((i) => i.jawaban !== "na").length;
          const total = AUDIT_AREA_SEED[area].pertanyaan.length;
          const done = total > 0 && filled >= total;
          const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
          const on = area === active;
          return (
            <button
              key={area}
              type="button"
              onClick={() => setActive(area)}
              className={
                "group w-full min-w-[9rem] rounded-xl border px-3 py-2 text-left transition " +
                (on
                  ? "border-gold-500/40 bg-gold-500/10 ring-1 ring-inset ring-gold-500/20"
                  : "border-ink-700 bg-ink-900/40 hover:border-white/15 hover:bg-white/5")
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className={"truncate text-sm font-medium " + (on ? "text-gold-300" : "text-slate-200")}>
                  {AUDIT_AREA_SEED[area].label}
                </span>
                {done ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                ) : (
                  <span className="shrink-0 text-[10px] tabular-nums text-slate-500">{filled}/{total}</span>
                )}
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                <div className={"h-full rounded-full transition-all " + (done ? "bg-emerald-400" : "bg-gold-400")} style={{ width: `${pct}%` }} />
              </div>
            </button>
          );
        })}
      </nav>

      {/* Checklist area aktif */}
      <div className="rounded-2xl border border-ink-700 bg-ink-850 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold">{AUDIT_AREA_SEED[active].label}</h3>
            <p className="text-xs text-slate-500">
              {answered} dari {list.length} pertanyaan terjawab
            </p>
            <div className="mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-white/10">
              <div
                className={"h-full rounded-full transition-all " + (answered >= list.length && list.length > 0 ? "bg-emerald-400" : "bg-gold-400")}
                style={{ width: `${list.length > 0 ? Math.round((answered / list.length) * 100) : 0}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={simpan}
            disabled={saving}
            className="shrink-0 rounded-lg bg-gold-500/15 px-3 py-1.5 text-sm font-semibold text-gold-300 ring-1 ring-gold-500/30 transition hover:bg-gold-500/25 disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : "Simpan area ini"}
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Memuat…</p>
        ) : (
          <ul className="space-y-2.5">
            {list.map((it, idx) => (
              <li key={idx} className="rounded-xl border border-ink-700 bg-ink-900/50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="flex-1 text-sm text-slate-200">{it.pertanyaan}</p>
                  <div className="flex shrink-0 gap-1">
                    {JAWAB.map((j) => (
                      <button
                        key={j.key}
                        type="button"
                        onClick={() => setJawaban(idx, j.key)}
                        className={
                          "rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition " +
                          (it.jawaban === j.key ? j.on : "text-slate-400 ring-white/10 hover:bg-white/5")
                        }
                      >
                        {j.label}
                      </button>
                    ))}
                  </div>
                </div>
                {it.jawaban === "tidak" && (
                  <input
                    value={it.catatan}
                    onChange={(e) => setItemCatatan(idx, e.target.value)}
                    placeholder="Catatan temuan (opsional)…"
                    className="mt-2 w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-gold-500/40 focus:outline-none"
                  />
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-slate-400">Catatan area</label>
          <textarea
            value={catatan[active] ?? ""}
            onChange={(e) => setCatatan((p) => ({ ...p, [active]: e.target.value }))}
            rows={2}
            placeholder="Ringkasan kondisi area ini…"
            className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-gold-500/40 focus:outline-none"
          />
        </div>

        {msg && <p className="mt-2 text-xs text-gold-300">{msg}</p>}
      </div>
    </div>
  );
}
