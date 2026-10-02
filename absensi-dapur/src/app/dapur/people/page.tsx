"use client";

/**
 * People & Culture — laman karyawan. Nilai rekan kerja 1-1 (feedback perilaku),
 * beri apresiasi, dan lapor masalah. Non-blocking (survei wajib tetap lewat popup).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { FREQ_LABEL, LIKERT_LABEL, type Pertanyaan } from "@/lib/people-culture";

interface Subjek { id: number; nama: string; divisi: string | null; selesai: boolean }
interface Cycle { id: number; judul: string; tipe: string; pertanyaan: Pertanyaan[]; subjek: Subjek[] }
interface Rekan { id: number; nama: string; divisi_nama: string | null }

const TONE = ["bg-red-500/20 text-red-200 ring-red-500/40", "bg-orange-500/20 text-orange-200 ring-orange-500/40", "bg-slate-500/20 text-slate-200 ring-slate-500/40", "bg-sky-500/20 text-sky-200 ring-sky-500/40", "bg-emerald-500/20 text-emerald-200 ring-emerald-500/40"];

export default function PeoplePage() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [rekan, setRekan] = useState<Rekan[]>([]);
  const [recKat, setRecKat] = useState<string[]>([]);
  const [diterima, setDiterima] = useState<{ kategori: string; catatan: string; created_at: string }[]>([]);
  const [incKat, setIncKat] = useState<string[]>([]);
  const [incUrg, setIncUrg] = useState<string[]>([]);
  const [laporan, setLaporan] = useState<{ id: number; kategori: string; status: string; urgensi: string; created_at: string }[]>([]);
  const [rating, setRating] = useState<{ cycle: Cycle; subjek: Subjek } | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    fetch("/api/dapur/pc-peer", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (!d.error) setCycles(d.cycles || []); });
    fetch("/api/dapur/recognition", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (!d.error) { setRekan(d.rekan || []); setRecKat(d.kategori || []); setDiterima(d.diterima || []); } });
    fetch("/api/dapur/incident", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (!d.error) { setIncKat(d.kategori || []); setIncUrg(d.urgensi || []); setLaporan(d.laporan || []); } });
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">People &amp; Culture</h1>
        <p className="text-sm text-slate-400">Ruang menyampaikan suara &amp; mendukung tim — menilai perilaku kerja, bukan menyalahkan orang.</p>
      </div>
      {msg && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-200">{msg}</p>}

      {/* Nilai rekan */}
      <div className="card p-4">
        <p className="mb-2 text-sm font-semibold text-slate-100">Nilai Rekan Kerja</p>
        {cycles.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada penilaian yang perlu diisi.</p>
        ) : cycles.map((c) => {
          const total = c.subjek.length, done = c.subjek.filter((s) => s.selesai).length;
          return (
            <div key={c.id} className="mb-2 rounded-xl border border-white/8 bg-white/[0.02] p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-100">{c.judul} <span className="text-[10px] text-slate-500">· {c.tipe === "leadership" ? "pimpinan" : "rekan"}</span></p>
                <span className="text-xs text-slate-400">{done}/{total} dinilai</span>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {c.subjek.map((s) => (
                  <button key={s.id} onClick={() => setRating({ cycle: c, subjek: s })}
                    className={"flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition " + (s.selesai ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-200" : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10")}>
                    <span className="min-w-0 truncate">{s.nama}{s.divisi && <span className="ml-1 text-[10px] text-slate-500">{s.divisi}</span>}</span>
                    <span className="shrink-0 text-xs">{s.selesai ? "✓ ubah" : "nilai →"}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Apresiasi */}
      <ApresiasiCard rekan={rekan} kategori={recKat} diterima={diterima} onDone={() => { setMsg("Apresiasi terkirim. Terima kasih!"); load(); }} />

      {/* Lapor masalah */}
      <LaporCard kategori={incKat} urgensi={incUrg} laporan={laporan} onDone={() => { setMsg("Laporan terkirim ke HR."); load(); }} />

      {rating && <RatingModal cycle={rating.cycle} subjek={rating.subjek} onClose={() => setRating(null)} onDone={() => { setRating(null); load(); }} />}
    </div>
  );
}

/* --------- modal nilai 1 rekan --------- */
function RatingModal({ cycle, subjek, onClose, onDone }: { cycle: Cycle; subjek: Subjek; onClose: () => void; onDone: () => void }) {
  const [jawab, setJawab] = useState<Record<string, number | string>>({});
  const [na, setNa] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const label = cycle.tipe === "leadership" ? LIKERT_LABEL : FREQ_LABEL;
  const likert = cycle.pertanyaan.filter((q) => q.tipe === "likert5");
  const wajib = likert.filter((q) => q.wajib);
  const lengkap = na || wajib.every((q) => Number(jawab[q.code]) >= 1);

  async function kirim() {
    if (!lengkap || busy) return; setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/dapur/pc-peer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycle_id: cycle.id, subjek_id: subjek.id, na, jawaban: na ? {} : jawab }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(d.error || "Gagal mengirim."); return; }
      onDone();
    } finally { setBusy(false); }
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-ink-900 sm:max-h-[90dvh] sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 bg-gradient-to-br from-sky-500/20 to-transparent p-4">
          <p className="text-[11px] uppercase tracking-wide text-sky-300/80">Nilai perilaku kerja</p>
          <h2 className="text-lg font-bold text-slate-100">{subjek.nama}</h2>
          <p className="text-xs text-slate-400">Skala: 1 = {label[1]} · 5 = {label[5]}. Jawab jujur berdasarkan pengalaman kerja nyata.</p>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
            <input type="checkbox" className="h-4 w-4 accent-gold-500" checked={na} onChange={(e) => setNa(e.target.checked)} />
            Tidak cukup berinteraksi untuk menilai (N/A)
          </label>
          {!na && cycle.pertanyaan.map((q, i) => (
            <div key={q.code} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
              <p className="mb-2 text-sm text-slate-100"><span className="mr-1 text-slate-500">{i + 1}.</span>{q.teks}{q.wajib && <span className="ml-1 text-red-400">*</span>}</p>
              {q.tipe === "likert5" ? (
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((v) => {
                    const on = Number(jawab[q.code]) === v;
                    return <button key={v} type="button" onClick={() => setJawab((s) => ({ ...s, [q.code]: v }))}
                      className={"flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-center ring-1 ring-inset transition " + (on ? TONE[v - 1] + " font-bold" : "bg-white/5 text-slate-400 ring-white/10 hover:bg-white/10")}>
                      <span className="text-sm">{v}</span><span className="text-[9px] leading-tight">{label[v].split(" ").slice(-1)}</span>
                    </button>;
                  })}
                </div>
              ) : (
                <textarea rows={2} className="input text-sm" placeholder="opsional…" value={String(jawab[q.code] ?? "")} onChange={(e) => setJawab((s) => ({ ...s, [q.code]: e.target.value }))} />
              )}
            </div>
          ))}
        </div>
        <div className="shrink-0 border-t border-white/10 p-4">
          {msg && <p className="mb-2 text-sm text-red-300">{msg}</p>}
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost flex-1">Batal</button>
            <button onClick={kirim} disabled={!lengkap || busy} className="btn-gold flex-1 disabled:opacity-40">{busy ? "Menyimpan…" : "Simpan penilaian"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------- apresiasi --------- */
function ApresiasiCard({ rekan, kategori, diterima, onDone }: { rekan: Rekan[]; kategori: string[]; diterima: { kategori: string; catatan: string; created_at: string }[]; onDone: () => void }) {
  const [ke, setKe] = useState(""); const [kat, setKat] = useState(""); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  async function kirim() {
    if (!ke || !kat) { setErr("Pilih rekan & kategori."); return; } setBusy(true); setErr("");
    try {
      const r = await fetch("/api/dapur/recognition", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ke_id: Number(ke), kategori: kat, catatan: note }) });
      const d = await r.json().catch(() => ({})); if (!r.ok) { setErr(d.error || "Gagal."); return; }
      setKe(""); setKat(""); setNote(""); onDone();
    } finally { setBusy(false); }
  }
  return (
    <div className="card p-4">
      <p className="mb-2 text-sm font-semibold text-slate-100">Beri Apresiasi</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <select className="input text-sm" value={ke} onChange={(e) => setKe(e.target.value)}><option value="">— pilih rekan —</option>{rekan.map((r) => <option key={r.id} value={r.id}>{r.nama}{r.divisi_nama ? ` · ${r.divisi_nama}` : ""}</option>)}</select>
        <select className="input text-sm" value={kat} onChange={(e) => setKat(e.target.value)}><option value="">— untuk perilaku —</option>{kategori.map((k) => <option key={k} value={k}>{k}</option>)}</select>
      </div>
      <input className="input mt-2 text-sm" placeholder="catatan singkat (opsional)" value={note} onChange={(e) => setNote(e.target.value)} />
      {err && <p className="mt-1 text-xs text-red-300">{err}</p>}
      <button onClick={kirim} disabled={busy} className="btn-gold mt-2">{busy ? "Mengirim…" : "Kirim Apresiasi"}</button>
      {diterima.length > 0 && (
        <div className="mt-3 border-t border-white/5 pt-2">
          <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Apresiasi untuk Anda ({diterima.length})</p>
          <div className="flex flex-wrap gap-1.5">{diterima.slice(0, 10).map((d, i) => <span key={i} className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-200">{d.kategori}</span>)}</div>
        </div>
      )}
    </div>
  );
}

/* --------- lapor masalah --------- */
function LaporCard({ kategori, urgensi, laporan, onDone }: { kategori: string[]; urgensi: string[]; laporan: { id: number; kategori: string; status: string; urgensi: string; created_at: string }[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ kategori: "", deskripsi: "", tanggal: "", lokasi: "", urgensi: "sedang", rahasia: true });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  async function kirim() {
    if (!f.kategori || f.deskripsi.trim().length < 5) { setErr("Kategori & deskripsi wajib."); return; } setBusy(true); setErr("");
    try {
      const r = await fetch("/api/dapur/incident", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const d = await r.json().catch(() => ({})); if (!r.ok) { setErr(d.error || "Gagal."); return; }
      setF({ kategori: "", deskripsi: "", tanggal: "", lokasi: "", urgensi: "sedang", rahasia: true }); setOpen(false); onDone();
    } finally { setBusy(false); }
  }
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-100">Lapor Masalah</p>
        <button onClick={() => setOpen((v) => !v)} className="btn-ghost text-xs">{open ? "Tutup" : "Buat laporan"}</button>
      </div>
      <p className="mt-1 text-xs text-slate-500">Terpisah dari penilaian. Laporan ditindaklanjuti HR; laporan bukan otomatis berarti pelanggaran.</p>
      {open && (
        <div className="mt-3 space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <select className="input text-sm" value={f.kategori} onChange={(e) => setF({ ...f, kategori: e.target.value })}><option value="">— kategori —</option>{kategori.map((k) => <option key={k} value={k}>{k}</option>)}</select>
            <select className="input text-sm" value={f.urgensi} onChange={(e) => setF({ ...f, urgensi: e.target.value })}>{urgensi.map((u) => <option key={u} value={u}>urgensi: {u}</option>)}</select>
          </div>
          <textarea rows={3} className="input text-sm" placeholder="Jelaskan kejadian (apa, kapan, di mana, siapa terlibat)…" value={f.deskripsi} onChange={(e) => setF({ ...f, deskripsi: e.target.value })} />
          <div className="grid gap-2 sm:grid-cols-2">
            <input type="date" className="input text-sm" value={f.tanggal} onChange={(e) => setF({ ...f, tanggal: e.target.value })} />
            <input className="input text-sm" placeholder="lokasi/area" value={f.lokasi} onChange={(e) => setF({ ...f, lokasi: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" className="h-4 w-4 accent-gold-500" checked={f.rahasia} onChange={(e) => setF({ ...f, rahasia: e.target.checked })} /> Rahasiakan identitas saya dari pihak yang dilaporkan</label>
          {err && <p className="text-xs text-red-300">{err}</p>}
          <button onClick={kirim} disabled={busy} className="btn-gold">{busy ? "Mengirim…" : "Kirim Laporan"}</button>
        </div>
      )}
      {laporan.length > 0 && (
        <div className="mt-3 border-t border-white/5 pt-2">
          <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Laporan Anda</p>
          {laporan.slice(0, 6).map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-2 text-xs text-slate-300"><span className="truncate">{l.kategori}</span><span className="shrink-0 text-slate-500">{l.status}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}
