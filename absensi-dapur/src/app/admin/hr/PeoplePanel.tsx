"use client";

/**
 * HR — People & Culture. HR menyusun survey penilaian kerja, mencentang
 * karyawan sasaran, lalu menekan "Tampilkan" → survey tampil sebagai popup
 * WAJIB di laman karyawan terpilih. Di sini pula HR memantau penyelesaian &
 * melihat hasil agregat (menjaga ambang anonimitas).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { BANK_PERTANYAAN, DEFAULT_CODES, MIN_RESPONDEN_DEFAULT, KATEGORI_URUT, type Pertanyaan } from "@/lib/people-culture";

interface SurveyRow {
  id: number; judul: string; deskripsi: string; anonim: boolean; min_responden: number;
  status: string; dibuat_oleh: string; created_at: string; jml_soal: number; target: number; selesai: number;
}
interface Pegawai { id: number; nama: string; divisi_nama: string | null }

export function SurveiPanel() {
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [hasilId, setHasilId] = useState<number | null>(null);

  // Form
  const [judul, setJudul] = useState("Survei Suara Tim");
  const [deskripsi, setDeskripsi] = useState("Masukan Anda membantu kami memperbaiki kondisi kerja. ±3 menit.");
  const [anonim, setAnonim] = useState(true);
  const [minResp, setMinResp] = useState(String(MIN_RESPONDEN_DEFAULT));
  const [pilih, setPilih] = useState<Set<string>>(new Set(DEFAULT_CODES));
  const [custom, setCustom] = useState<Pertanyaan[]>([]);
  const [cText, setCText] = useState("");
  const [cTipe, setCTipe] = useState<"likert5" | "teks">("likert5");
  const [sasaran, setSasaran] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/hr/pc-survey", { cache: "no-store" }).then((r) => r.json())
      .then((d) => { if (d.error) setMsg(d.error); else { setSurveys(d.surveys || []); setPegawai(d.pegawai || []); } })
      .catch(() => setMsg("Gagal memuat.")).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const pertanyaanTerpilih = useMemo<Pertanyaan[]>(
    () => [...BANK_PERTANYAAN.filter((q) => pilih.has(q.code)), ...custom],
    [pilih, custom],
  );
  const jmlLikert = pertanyaanTerpilih.filter((q) => q.tipe === "likert5").length;

  const byDivisi = useMemo(() => {
    const m = new Map<string, Pegawai[]>();
    for (const p of pegawai) { const k = p.divisi_nama || "Tanpa divisi"; if (!m.has(k)) m.set(k, []); m.get(k)!.push(p); }
    return [...m.entries()];
  }, [pegawai]);

  function toggleSoal(code: string) { setPilih((s) => { const n = new Set(s); n.has(code) ? n.delete(code) : n.add(code); return n; }); }
  function tambahCustom() {
    const t = cText.trim(); if (!t) return;
    setCustom((c) => [...c, { code: `CUS${c.length + 1}`, kategori: "Lainnya", teks: t.slice(0, 300), tipe: cTipe, wajib: cTipe === "likert5" }]);
    setCText("");
  }
  const togglePeg = (id: number) => setSasaran((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleDivisi = (list: Pegawai[]) => setSasaran((s) => {
    const n = new Set(s); const all = list.every((p) => n.has(p.id));
    for (const p of list) all ? n.delete(p.id) : n.add(p.id); return n;
  });

  async function tampilkan() {
    setMsg("");
    if (pertanyaanTerpilih.length === 0) { setMsg("Pilih minimal 1 pertanyaan."); return; }
    if (sasaran.size === 0) { setMsg("Centang minimal 1 karyawan."); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/hr/pc-survey", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judul, deskripsi, anonim, min_responden: minResp, pertanyaan: pertanyaanTerpilih, userIds: [...sasaran] }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(d.error || "Gagal menampilkan survey."); return; }
      setSasaran(new Set()); load();
    } finally { setBusy(false); }
  }
  async function ubahStatus(id: number, status: string) {
    await fetch("/api/hr/pc-survey", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    load();
  }
  async function hapus(id: number) {
    if (!confirm("Hapus survey ini beserta seluruh jawabannya?")) return;
    await fetch(`/api/hr/pc-survey?id=${id}`, { method: "DELETE" }); load();
  }

  return (
    <div className="space-y-6">
      {msg && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">{msg}</p>}
      <p className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-2.5 text-xs text-sky-200">
        Susun survey penilaian kerja, centang karyawan, lalu <b>Tampilkan</b> — survey akan muncul sebagai <b>popup wajib</b> di laman karyawan terpilih dan mereka hanya bisa lanjut setelah semua terisi. Hasil ditampilkan agregat (menjaga kerahasiaan).
      </p>

      {/* ====== Susun survey ====== */}
      <div className="card p-4">
        <p className="mb-3 text-sm font-semibold text-slate-100">1. Susun survey</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Judul</label><input className="input" value={judul} onChange={(e) => setJudul(e.target.value)} /></div>
          <div><label className="label">Minimum responden (ambang tampil hasil)</label><input type="number" min={1} className="input" value={minResp} onFocus={(e) => e.target.select()} onChange={(e) => setMinResp(e.target.value)} /></div>
        </div>
        <div className="mt-3"><label className="label">Deskripsi (ditampilkan ke karyawan)</label><textarea rows={2} className="input" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} /></div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" className="h-4 w-4 accent-gold-500" checked={anonim} onChange={(e) => setAnonim(e.target.checked)} />
          Rahasiakan identitas penjawab (hasil hanya agregat)
        </label>

        <p className="mb-2 mt-4 text-sm font-semibold text-slate-100">Pilih pertanyaan <span className="text-xs font-normal text-slate-500">({pertanyaanTerpilih.length} dipilih · {jmlLikert} skala)</span></p>
        <div className="space-y-2">
          {KATEGORI_URUT.map((kat) => {
            const qs = BANK_PERTANYAAN.filter((q) => q.kategori === kat);
            if (qs.length === 0) return null;
            return (
              <div key={kat} className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{kat}</p>
                <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                  {qs.map((q) => (
                    <label key={q.code} className="flex cursor-pointer items-start gap-2 text-xs text-slate-300">
                      <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 accent-gold-500" checked={pilih.has(q.code)} onChange={() => toggleSoal(q.code)} />
                      <span>{q.teks} {q.tipe === "teks" && <span className="text-slate-500">(isian)</span>}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {/* Custom */}
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1"><label className="label">Tambah pertanyaan sendiri</label><input className="input" value={cText} onChange={(e) => setCText(e.target.value)} placeholder="tulis pertanyaan…" /></div>
          <select className="input w-32" value={cTipe} onChange={(e) => setCTipe(e.target.value as "likert5" | "teks")}>
            <option value="likert5">Skala 1–5</option>
            <option value="teks">Isian teks</option>
          </select>
          <button onClick={tambahCustom} className="btn-ghost">+ Tambah</button>
        </div>
        {custom.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {custom.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">
                {c.teks.slice(0, 40)} <button onClick={() => setCustom((x) => x.filter((_, j) => j !== i))} className="text-red-300">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ====== Pilih karyawan ====== */}
      <div className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-100">2. Centang karyawan sasaran <span className="text-xs font-normal text-slate-500">({sasaran.size} dipilih)</span></p>
          <button onClick={() => setSasaran((s) => (s.size === pegawai.length ? new Set() : new Set(pegawai.map((p) => p.id))))} className="text-xs text-gold-300 hover:text-gold-200">
            {sasaran.size === pegawai.length ? "Kosongkan" : "Pilih semua"}
          </button>
        </div>
        {loading ? <p className="py-4 text-center text-sm text-slate-500">Memuat…</p> : (
          <div className="space-y-2">
            {byDivisi.map(([div, list]) => (
              <div key={div} className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                <button onClick={() => toggleDivisi(list)} className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-200">{div} ({list.length}) ·<span className="ml-1 text-gold-300">pilih grup</span></button>
                <div className="grid gap-x-4 gap-y-1 sm:grid-cols-3">
                  {list.map((p) => (
                    <label key={p.id} className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                      <input type="checkbox" className="h-3.5 w-3.5 accent-gold-500" checked={sasaran.has(p.id)} onChange={() => togglePeg(p.id)} />
                      <span className="truncate">{p.nama}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {pegawai.length === 0 && <p className="py-2 text-center text-sm text-slate-500">Belum ada karyawan.</p>}
          </div>
        )}
        <button onClick={tampilkan} disabled={busy} className="btn-gold mt-3 w-full sm:w-auto">{busy ? "Menampilkan…" : "Tampilkan ke karyawan terpilih"}</button>
      </div>

      {/* ====== Daftar survey ====== */}
      <div className="card overflow-hidden">
        <p className="border-b border-white/5 p-4 text-sm font-semibold text-slate-100">Survey</p>
        <div className="scroll-x overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs uppercase text-slate-400"><tr className="border-b border-white/5">
              <th className="px-4 py-2.5">Judul</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5 text-center">Soal</th>
              <th className="px-4 py-2.5 text-center">Terisi / Sasaran</th><th className="px-4 py-2.5 text-right">Aksi</th>
            </tr></thead>
            <tbody className="divide-y divide-white/5">
              {surveys.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2"><p className="font-medium text-slate-100">{s.judul}</p><p className="text-[11px] text-slate-500">{s.anonim ? "anonim" : "non-anonim"} · oleh {s.dibuat_oleh || "-"}</p></td>
                  <td className="px-4 py-2"><span className={"badge " + (s.status === "aktif" ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/15 text-slate-300")}>{s.status === "aktif" ? "Tampil" : "Selesai"}</span></td>
                  <td className="px-4 py-2 text-center tabular-nums text-slate-400">{s.jml_soal}</td>
                  <td className="px-4 py-2 text-center tabular-nums"><span className={s.selesai >= s.target ? "text-emerald-300" : "text-slate-200"}>{s.selesai}</span><span className="text-slate-500"> / {s.target}</span></td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button onClick={() => setHasilId(s.id)} className="btn-ghost px-2.5 py-1 text-xs">Hasil</button>
                      {s.status === "aktif"
                        ? <button onClick={() => ubahStatus(s.id, "selesai")} className="btn-ghost px-2.5 py-1 text-xs">Hentikan</button>
                        : <button onClick={() => ubahStatus(s.id, "aktif")} className="btn-ghost px-2.5 py-1 text-xs">Tampilkan lagi</button>}
                      <button onClick={() => hapus(s.id)} className="btn-ghost px-2 py-1 text-xs text-red-300">Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
              {surveys.length === 0 && !loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Belum ada survey.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {hasilId != null && <HasilModal id={hasilId} onClose={() => setHasilId(null)} />}
    </div>
  );
}

/* ---------------- Hasil agregat ---------------- */
interface Ringkas { code: string; kategori: string; teks: string; tipe: string; n: number; mean?: number | null; dist?: number[] | null; jawaban?: { nama: string | null; teks: string }[] }
interface Hasil {
  survey: { judul: string; anonim: boolean; min_responden: number; status: string };
  responden: number; target: number; cukup: boolean; overall: number | null;
  ringkas: Ringkas[];
  target_list: { nama: string; divisi: string | null; status: string }[];
}
function HasilModal({ id, onClose }: { id: number; onClose: () => void }) {
  const [h, setH] = useState<Hasil | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    fetch(`/api/hr/pc-survey/hasil?id=${id}`, { cache: "no-store" }).then((r) => r.json())
      .then((d) => { if (d.error) setErr(d.error); else setH(d); }).catch(() => setErr("Gagal memuat hasil."));
  }, [id]);
  const warnaBar = ["#ef4444", "#f97316", "#64748b", "#38bdf8", "#10b981"];
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="card flex max-h-[88dvh] w-full max-w-xl flex-col overflow-hidden p-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-white/5 p-4">
          <div>
            <h2 className="text-base font-bold text-slate-100">{h?.survey.judul || "Hasil survey"}</h2>
            {h && <p className="text-xs text-slate-400">{h.responden} dari {h.target} karyawan mengisi{h.overall != null ? ` · rata-rata iklim ${h.overall}/5` : ""}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-white/10">✕</button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {err && <p className="text-sm text-red-300">{err}</p>}
          {!h && !err && <p className="text-sm text-slate-500">Memuat…</p>}
          {h && !h.cukup && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Hasil belum dapat ditampilkan karena jumlah responden ({h.responden}) belum mencapai ambang ({h.survey.min_responden}) untuk menjaga kerahasiaan.
            </p>
          )}
          {h?.cukup && h.ringkas.map((r) => (
            <div key={r.code} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
              <p className="mb-1.5 text-sm text-slate-200">{r.teks} <span className="text-[10px] text-slate-500">· {r.kategori} · n={r.n}</span></p>
              {r.tipe === "likert5" ? (
                <div className="flex items-center gap-3">
                  <span className="w-12 shrink-0 text-lg font-bold text-gold-300">{r.mean ?? "–"}</span>
                  <div className="flex h-3 flex-1 overflow-hidden rounded-full bg-white/5">
                    {(r.dist || []).map((c, i) => { const tot = (r.dist || []).reduce((a, b) => a + b, 0) || 1; return <div key={i} style={{ width: `${(c / tot) * 100}%`, backgroundColor: warnaBar[i] }} title={`Skor ${i + 1}: ${c}`} />; })}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {(r.jawaban || []).length === 0 ? <p className="text-xs text-slate-500">Belum ada isian.</p> :
                    (r.jawaban || []).map((j, i) => <p key={i} className="rounded border border-white/5 bg-white/[0.02] px-2 py-1 text-xs text-slate-300">“{j.teks}”{j.nama ? <span className="text-slate-500"> — {j.nama}</span> : null}</p>)}
                </div>
              )}
            </div>
          ))}
          {/* Pemantauan penyelesaian (identitas, bukan isi jawaban) */}
          {h && (
            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Penyelesaian pengisian</p>
              <div className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
                {h.target_list.map((t, i) => (
                  <div key={i} className="flex justify-between gap-2 text-xs">
                    <span className="truncate text-slate-300">{t.nama} <span className="text-slate-600">{t.divisi || ""}</span></span>
                    <span className={t.status === "selesai" ? "text-emerald-300" : "text-amber-300"}>{t.status === "selesai" ? "✓ selesai" : "menunggu"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
