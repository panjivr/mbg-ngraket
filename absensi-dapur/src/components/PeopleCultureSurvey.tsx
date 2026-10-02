"use client";

/**
 * Popup WAJIB People & Culture untuk karyawan. Muncul bila HR mengaktifkan
 * survey ("Tampilkan") dan karyawan ini termasuk sasaran yang belum mengisi.
 * Tidak bisa ditutup sebelum semua pertanyaan wajib terjawab & terkirim.
 */
import { useEffect, useMemo, useState } from "react";
import { LIKERT_LABEL, type Pertanyaan } from "@/lib/people-culture";

interface Survey { id: number; judul: string; deskripsi: string; anonim: boolean; pertanyaan: Pertanyaan[] }

const LIKERT_WARNA = ["bg-red-500/20 text-red-200 ring-red-500/40", "bg-orange-500/20 text-orange-200 ring-orange-500/40", "bg-slate-500/20 text-slate-200 ring-slate-500/40", "bg-sky-500/20 text-sky-200 ring-sky-500/40", "bg-emerald-500/20 text-emerald-200 ring-emerald-500/40"];

export default function PeopleCultureSurvey() {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [jawab, setJawab] = useState<Record<string, number | string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/dapur/pc-survey", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (alive && d?.survey) setSurvey(d.survey as Survey); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const wajib = useMemo(() => (survey?.pertanyaan || []).filter((q) => q.wajib), [survey]);
  const terisi = useMemo(
    () => wajib.filter((q) => (q.tipe === "likert5" ? Number(jawab[q.code]) >= 1 : String(jawab[q.code] ?? "").trim() !== "")).length,
    [wajib, jawab],
  );
  const lengkap = terisi === wajib.length;

  // Kunci scroll body selama popup aktif.
  useEffect(() => {
    if (!survey) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [survey]);

  if (!survey) return null;

  async function kirim() {
    if (!survey || !lengkap || busy) return;
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/dapur/pc-survey", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ survey_id: survey.id, jawaban: jawab }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(d.error || "Gagal mengirim. Coba lagi."); return; }
      setSurvey(null); // selesai → popup hilang
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-ink-900 shadow-2xl sm:max-h-[92dvh] sm:rounded-2xl">
        {/* Header */}
        <div className="shrink-0 bg-gradient-to-br from-gold-500/20 to-transparent p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gold-300/80">People &amp; Culture · wajib diisi</p>
          <h2 className="mt-0.5 text-lg font-bold text-slate-100">{survey.judul}</h2>
          {survey.deskripsi && <p className="mt-1 text-sm text-slate-300">{survey.deskripsi}</p>}
          <p className="mt-2 text-xs text-slate-400">
            {survey.anonim ? "Jawaban Anda bersifat rahasia — hasil hanya ditampilkan sebagai rata-rata." : "Jawaban Anda tercatat untuk HR."} Jawab apa adanya; nilai perilaku &amp; kondisi kerja, bukan menyalahkan orang.
          </p>
        </div>

        {/* Pertanyaan */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {survey.pertanyaan.map((q, i) => {
            const belum = q.wajib && (q.tipe === "likert5" ? !(Number(jawab[q.code]) >= 1) : String(jawab[q.code] ?? "").trim() === "");
            return (
              <div key={q.code} className={"rounded-xl border p-3 " + (belum ? "border-amber-500/25 bg-amber-500/[0.04]" : "border-white/8 bg-white/[0.02]")}>
                <p className="mb-2 text-sm text-slate-100">
                  <span className="mr-1 text-slate-500">{i + 1}.</span>{q.teks}
                  {q.wajib && <span className="ml-1 text-red-400">*</span>}
                  <span className="ml-1.5 text-[10px] text-slate-500">· {q.kategori}</span>
                </p>
                {q.tipe === "likert5" ? (
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5].map((v) => {
                      const on = Number(jawab[q.code]) === v;
                      return (
                        <button key={v} type="button" onClick={() => setJawab((s) => ({ ...s, [q.code]: v }))}
                          className={"flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-center ring-1 ring-inset transition " + (on ? LIKERT_WARNA[v - 1] + " font-bold" : "bg-white/5 text-slate-400 ring-white/10 hover:bg-white/10")}>
                          <span className="text-sm">{v}</span>
                          <span className="text-[9px] leading-tight">{LIKERT_LABEL[v].split(" ").slice(-1)}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <textarea rows={2} className="input text-sm" placeholder="Tulis jawaban Anda (opsional)…"
                    value={String(jawab[q.code] ?? "")} onChange={(e) => setJawab((s) => ({ ...s, [q.code]: e.target.value }))} />
                )}
              </div>
            );
          })}
          <p className="pb-1 text-center text-[11px] text-slate-500">Skala: 1 = Sangat Tidak Setuju · 5 = Sangat Setuju</p>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/10 bg-ink-900 p-4">
          {msg && <p className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{msg}</p>}
          <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-gold-500 transition-all" style={{ width: `${wajib.length ? (terisi / wajib.length) * 100 : 100}%` }} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">{terisi}/{wajib.length} wajib terjawab</span>
            <button onClick={kirim} disabled={!lengkap || busy}
              className="btn-gold px-5 disabled:cursor-not-allowed disabled:opacity-40">
              {busy ? "Mengirim…" : lengkap ? "Kirim & Lanjut" : "Lengkapi dulu"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
