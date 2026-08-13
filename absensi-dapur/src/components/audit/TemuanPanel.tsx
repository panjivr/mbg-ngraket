"use client";

/**
 * Panel Temuan — auditor mencatat temuan (finding) per sesi. Form memakai
 * kemungkinan × dampak → risk score & tingkat (hitungRisk/hitungTingkat),
 * plus peringatan halus bila teks mengandung kata subjektif (audit proses, bukan orang).
 * Data via POST /api/audit/temuan (buat) & GET ?sesi_id= (daftar), DELETE per id.
 */
import { useEffect, useState } from "react";
import { AREA_KEYS, AUDIT_AREA_SEED, areaLabel } from "@/lib/audit-seed";
import {
  KATEGORI_TEMUAN,
  KATEGORI_LABEL,
  hitungRisk,
  hitungTingkat,
  deteksiKataSubjektif,
} from "@/lib/audit-risk";
import { getTemuan, buatTemuan, hapusTemuan } from "@/lib/audit-client";
import type { AuditTemuan } from "@/lib/audit-types";
import RiskBadge from "./RiskBadge";

interface FormState {
  area: string;
  kategori: string;
  observasi: string;
  standar_sop: string;
  gap: string;
  kemungkinan: number;
  dampak: number;
  rekomendasi: string;
}

const KOSONG: FormState = {
  area: AREA_KEYS[0],
  kategori: KATEGORI_TEMUAN[0],
  observasi: "",
  standar_sop: "",
  gap: "",
  kemungkinan: 3,
  dampak: 3,
  rekomendasi: "",
};

const SKALA = [1, 2, 3, 4, 5];

export default function TemuanPanel({ sesiId }: { sesiId: number }) {
  const [form, setForm] = useState<FormState>(KOSONG);
  const [daftar, setDaftar] = useState<AuditTemuan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const risk = hitungRisk(form.kemungkinan, form.dampak);
  const tingkat = hitungTingkat(risk);
  const kataSubjektif = deteksiKataSubjektif(`${form.observasi} ${form.gap} ${form.rekomendasi}`);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getTemuan({ sesi_id: sesiId })
      .then((r) => alive && setDaftar(r.temuan))
      .catch((e) => alive && setMsg(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [sesiId]);

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function simpan() {
    if (!form.observasi.trim()) {
      setMsg("Observasi wajib diisi.");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const r = await buatTemuan({
        sesi_id: sesiId,
        area: form.area,
        kategori: form.kategori,
        observasi: form.observasi.trim(),
        standar_sop: form.standar_sop.trim(),
        gap: form.gap.trim(),
        kemungkinan: form.kemungkinan,
        dampak: form.dampak,
        rekomendasi: form.rekomendasi.trim(),
      });
      setDaftar((prev) => [r.temuan, ...prev]);
      setForm(KOSONG);
      setMsg("Temuan tersimpan.");
      setTimeout(() => setMsg(null), 2000);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function hapus(id: number) {
    const sebelum = daftar;
    setDaftar((prev) => prev.filter((t) => t.id !== id));
    try {
      await hapusTemuan(id);
    } catch (e) {
      setDaftar(sebelum);
      setMsg((e as Error).message);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Form temuan */}
      <div className="rounded-2xl border border-ink-700 bg-ink-850 p-4 sm:p-5">
        <h3 className="mb-3 text-base font-semibold">Temuan Baru</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">Area</span>
            <select
              value={form.area}
              onChange={(e) => set("area", e.target.value)}
              className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-slate-100 focus:border-gold-500/40 focus:outline-none"
            >
              {AREA_KEYS.map((a) => (
                <option key={a} value={a}>
                  {AUDIT_AREA_SEED[a].label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">Kategori</span>
            <select
              value={form.kategori}
              onChange={(e) => set("kategori", e.target.value)}
              className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-slate-100 focus:border-gold-500/40 focus:outline-none"
            >
              {KATEGORI_TEMUAN.map((k) => (
                <option key={k} value={k}>
                  {KATEGORI_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium text-slate-400">Observasi (fakta yang terlihat)</span>
          <textarea
            value={form.observasi}
            onChange={(e) => set("observasi", e.target.value)}
            rows={2}
            placeholder="Apa yang terjadi, terukur & objektif…"
            className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-gold-500/40 focus:outline-none"
          />
        </label>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">Standar / SOP</span>
            <textarea
              value={form.standar_sop}
              onChange={(e) => set("standar_sop", e.target.value)}
              rows={2}
              placeholder="Acuan yang seharusnya…"
              className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-gold-500/40 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">Gap (selisih kondisi)</span>
            <textarea
              value={form.gap}
              onChange={(e) => set("gap", e.target.value)}
              rows={2}
              placeholder="Beda antara kondisi & standar…"
              className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-gold-500/40 focus:outline-none"
            />
          </label>
        </div>

        {/* Skoring risiko */}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">Kemungkinan (1–5)</span>
            <div className="flex gap-1">
              {SKALA.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set("kemungkinan", n)}
                  className={
                    "flex-1 rounded-md py-1.5 text-sm font-medium ring-1 ring-inset transition " +
                    (form.kemungkinan === n
                      ? "bg-gold-500/20 text-gold-300 ring-gold-500/40"
                      : "text-slate-400 ring-white/10 hover:bg-white/5")
                  }
                >
                  {n}
                </button>
              ))}
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">Dampak (1–5)</span>
            <div className="flex gap-1">
              {SKALA.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set("dampak", n)}
                  className={
                    "flex-1 rounded-md py-1.5 text-sm font-medium ring-1 ring-inset transition " +
                    (form.dampak === n
                      ? "bg-gold-500/20 text-gold-300 ring-gold-500/40"
                      : "text-slate-400 ring-white/10 hover:bg-white/5")
                  }
                >
                  {n}
                </button>
              ))}
            </div>
          </label>
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-lg border border-ink-700 bg-ink-900/50 px-3 py-2">
          <span className="text-xs text-slate-400">Risk score</span>
          <span className="text-lg font-bold tabular-nums text-slate-100">{risk}</span>
          <RiskBadge tingkat={tingkat} />
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium text-slate-400">Rekomendasi</span>
          <textarea
            value={form.rekomendasi}
            onChange={(e) => set("rekomendasi", e.target.value)}
            rows={2}
            placeholder="Tindakan perbaikan yang disarankan…"
            className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-gold-500/40 focus:outline-none"
          />
        </label>

        {kataSubjektif.length > 0 && (
          <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            Audit menilai <strong>proses</strong>, bukan orang. Hindari kata subjektif: {kataSubjektif.join(", ")}.
          </p>
        )}

        <button
          type="button"
          onClick={simpan}
          disabled={saving}
          className="mt-3 w-full rounded-lg bg-gold-500/15 py-2 text-sm font-semibold text-gold-300 ring-1 ring-gold-500/30 transition hover:bg-gold-500/25 disabled:opacity-50"
        >
          {saving ? "Menyimpan…" : "Simpan temuan"}
        </button>
        {msg && <p className="mt-2 text-xs text-gold-300">{msg}</p>}
      </div>

      {/* Daftar temuan sesi ini */}
      <div className="rounded-2xl border border-ink-700 bg-ink-850 p-4 sm:p-5">
        <h3 className="mb-3 text-base font-semibold">Temuan Sesi Ini ({daftar.length})</h3>
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Memuat…</p>
        ) : daftar.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Belum ada temuan.</p>
        ) : (
          <ul className="space-y-2">
            {daftar.map((t) => (
              <li key={t.id} className="rounded-xl border border-ink-700 bg-ink-900/50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <RiskBadge tingkat={t.tingkat} score={t.risk_score} />
                      <span className="text-[11px] text-slate-500">
                        {areaLabel(t.area)} · {KATEGORI_LABEL[t.kategori as keyof typeof KATEGORI_LABEL] ?? t.kategori}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-200">{t.observasi}</p>
                    {t.rekomendasi && <p className="mt-1 text-xs text-slate-400">↳ {t.rekomendasi}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => hapus(t.id)}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:text-red-300"
                  >
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
