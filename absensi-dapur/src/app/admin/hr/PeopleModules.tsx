"use client";

/** HR — modul People & Culture: Dashboard, Feedback Rekan/Pimpinan, Lapor
 *  Masalah, Action Plan, One-on-One. Prinsip: agregat berambang, pisah jenis
 *  data (persepsi/laporan/verified), tanpa skor tunggal atau ranking. */
import { useCallback, useEffect, useState } from "react";
import { BANK_PEER, BANK_LEADERSHIP, INSIDEN_STATUS, ACTION_STATUS, PRIORITAS } from "@/lib/people-culture";

const jakToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

/* ============================ DASHBOARD ============================ */
interface Dash {
  karyawan: number;
  perception: { totalResponden: number; cukup: boolean; perKategori: { kategori: string; mean: number | null; n: number }[] };
  teamHealth: { divisi: string; responden: number; cukup: boolean; kategori: { kategori: string; mean: number | null }[] }[];
  recognition: { kategori: string; c: number }[];
  incident: { open: number; high: number; verified: number; recurring: { kategori: string; c: number }[] };
  action: { open: number; overdue: number };
  alerts: { tipe: string; pesan: string; level: string }[];
}
export function DashboardPanel() {
  const [d, setD] = useState<Dash | null>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { fetch("/api/hr/pc-dashboard", { cache: "no-store" }).then((r) => r.json()).then((x) => x.error ? setMsg(x.error) : setD(x)).catch(() => setMsg("Gagal memuat.")); }, []);
  if (msg) return <p className="text-sm text-amber-300">{msg}</p>;
  if (!d) return <p className="text-sm text-slate-500">Memuat dashboard…</p>;
  const meanTone = (m: number | null) => m == null ? "text-slate-500" : m >= 4 ? "text-emerald-300" : m >= 3 ? "text-slate-200" : "text-red-300";
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[["Karyawan", d.karyawan], ["Responden survei", d.perception.totalResponden], ["Laporan terbuka", d.incident.open], ["Urgensi tinggi", d.incident.high], ["Action terbuka", d.action.open], ["Action lewat tenggat", d.action.overdue]].map(([l, v]) => (
          <div key={l as string} className="stat-card"><p className="stat-label">{l}</p><p className="stat-value text-xl">{v as number}</p></div>
        ))}
      </div>

      {d.alerts.length > 0 && (
        <div className="card p-4">
          <p className="mb-2 text-sm font-semibold text-slate-100">Perlu perhatian (trigger review manusia)</p>
          <div className="space-y-1.5">
            {d.alerts.map((a, i) => (
              <div key={i} className={"flex items-start gap-2 rounded-lg border px-3 py-2 text-sm " + (a.level === "danger" ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-amber-500/25 bg-amber-500/10 text-amber-200")}>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide opacity-80">{a.tipe}</span><span>{a.pesan}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <p className="mb-2 text-sm font-semibold text-slate-100">Persepsi (survei) per kategori</p>
          {!d.perception.cukup ? <p className="text-sm text-slate-500">Responden belum mencukupi untuk ditampilkan.</p> :
            d.perception.perKategori.map((k) => (
              <div key={k.kategori} className="flex items-center justify-between gap-2 py-0.5 text-sm">
                <span className="text-slate-300">{k.kategori}</span><span className={"font-bold tabular-nums " + meanTone(k.mean)}>{k.mean ?? "–"}<span className="text-xs font-normal text-slate-500">/5</span></span>
              </div>
            ))}
          <p className="mt-2 text-[10px] text-slate-500">Data persepsi — bukan fakta terverifikasi.</p>
        </div>
        <div className="card p-4">
          <p className="mb-2 text-sm font-semibold text-slate-100">Perilaku paling diapresiasi (90 hari)</p>
          {d.recognition.length === 0 ? <p className="text-sm text-slate-500">Belum ada apresiasi.</p> :
            d.recognition.map((r) => (
              <div key={r.kategori} className="flex items-center justify-between gap-2 py-0.5 text-sm"><span className="text-slate-300">{r.kategori}</span><span className="font-bold tabular-nums text-gold-300">{r.c}</span></div>
            ))}
        </div>
      </div>

      <div className="card p-4">
        <p className="mb-2 text-sm font-semibold text-slate-100">Team Health per divisi</p>
        <div className="scroll-x overflow-x-auto">
          <div className="space-y-2">
            {d.teamHealth.map((t) => (
              <div key={t.divisi} className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                <p className="mb-1 text-xs font-semibold text-slate-200">{t.divisi} <span className="font-normal text-slate-500">· {t.responden} responden</span></p>
                {!t.cukup ? <p className="text-xs text-slate-500">Responden belum mencukupi (dijaga agar identitas tak tertebak).</p> :
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5">{t.kategori.map((k) => <span key={k.kategori} className="text-xs"><span className="text-slate-400">{k.kategori}</span> <b className={meanTone(k.mean)}>{k.mean ?? "–"}</b></span>)}</div>}
              </div>
            ))}
            {d.teamHealth.length === 0 && <p className="text-sm text-slate-500">Belum ada data.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ====================== FEEDBACK REKAN / PIMPINAN ====================== */
interface Pegawai { id: number; nama: string; divisi_nama: string | null }
interface Cycle { id: number; judul: string; tipe: string; status: string; jml_soal: number; respons: number; raterCount: number; subjekCount: number }
export function PeerPanel() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [leaders, setLeaders] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState("");
  const [tipe, setTipe] = useState<"peer" | "leadership">("peer");
  const [judul, setJudul] = useState("Feedback Rekan Kerja");
  const [minResp, setMinResp] = useState("3");
  const [peserta, setPeserta] = useState<Set<number>>(new Set());
  const [raters, setRaters] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [hasilId, setHasilId] = useState<number | null>(null);
  const [kelolaLeader, setKelolaLeader] = useState(false);

  const load = useCallback(() => {
    fetch("/api/hr/pc-peer", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      if (d.error) { setMsg(d.error); return; }
      setCycles(d.cycles || []); setPegawai(d.pegawai || []); setLeaders(new Set(d.leaders || []));
    });
  }, []);
  useEffect(() => { load(); }, [load]);

  const tgl = (s: Set<number>, id: number, set: (x: Set<number>) => void) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); set(n); };
  async function simpanLeader() { await fetch("/api/hr/pc-peer", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leaderIds: [...leaders] }) }); setKelolaLeader(false); load(); }
  async function buat() {
    setMsg("");
    const pertanyaan = tipe === "leadership" ? BANK_LEADERSHIP : BANK_PEER;
    const raterIds = tipe === "peer" ? [...peserta] : [...raters];
    const subjekIds = tipe === "peer" ? [...peserta] : [...leaders];
    if (raterIds.length === 0) { setMsg("Pilih penilai."); return; }
    if (subjekIds.length === 0) { setMsg(tipe === "peer" ? "Pilih peserta." : "Tetapkan pimpinan dulu."); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/hr/pc-peer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ judul, tipe, pertanyaan, raterIds, subjekIds, min_responden: minResp }) });
      const d = await r.json().catch(() => ({})); if (!r.ok) { setMsg(d.error || "Gagal."); return; }
      setPeserta(new Set()); setRaters(new Set()); load();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      {msg && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">{msg}</p>}
      <p className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-2 text-xs text-sky-200">Karyawan menilai perilaku rekan <b>satu per satu</b> (skala frekuensi) atau menilai pimpinan. Hasil agregat per orang (≥ ambang), <b>bukan ranking</b>. N/A tidak menurunkan skor.</p>

      <div className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-100">Pimpinan ditunjuk <span className="text-xs font-normal text-slate-500">({leaders.size})</span></p>
          <button onClick={() => setKelolaLeader((v) => !v)} className="btn-ghost text-xs">{kelolaLeader ? "Tutup" : "Kelola"}</button>
        </div>
        {kelolaLeader && (
          <>
            <div className="grid gap-x-4 gap-y-1 sm:grid-cols-3">
              {pegawai.map((p) => <label key={p.id} className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" className="h-3.5 w-3.5 accent-gold-500" checked={leaders.has(p.id)} onChange={() => tgl(leaders, p.id, setLeaders)} />{p.nama}</label>)}
            </div>
            <button onClick={simpanLeader} className="btn-gold mt-2 text-sm">Simpan pimpinan</button>
          </>
        )}
      </div>

      <div className="card p-4">
        <p className="mb-2 text-sm font-semibold text-slate-100">Buat siklus feedback</p>
        <div className="flex flex-wrap items-end gap-3">
          <div><label className="label">Jenis</label><select className="input" value={tipe} onChange={(e) => { const t = e.target.value as "peer" | "leadership"; setTipe(t); setJudul(t === "leadership" ? "Feedback Pimpinan" : "Feedback Rekan Kerja"); }}><option value="peer">Rekan (nilai semua teman)</option><option value="leadership">Pimpinan</option></select></div>
          <div className="min-w-[200px] flex-1"><label className="label">Judul</label><input className="input" value={judul} onChange={(e) => setJudul(e.target.value)} /></div>
          <div><label className="label">Min. responden</label><input type="number" min={1} className="input w-24" value={minResp} onChange={(e) => setMinResp(e.target.value)} /></div>
        </div>
        <p className="mt-2 text-xs text-slate-400">Pertanyaan: {tipe === "leadership" ? `${BANK_LEADERSHIP.length} butir (kepemimpinan)` : `${BANK_PEER.length} butir (perilaku rekan)`}.</p>
        <p className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{tipe === "peer" ? "Peserta (saling menilai)" : "Penilai (karyawan)"}</p>
        <div className="grid max-h-56 gap-x-4 gap-y-1 overflow-auto sm:grid-cols-3">
          {pegawai.map((p) => { const s = tipe === "peer" ? peserta : raters; const set = tipe === "peer" ? setPeserta : setRaters; return <label key={p.id} className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" className="h-3.5 w-3.5 accent-gold-500" checked={s.has(p.id)} onChange={() => tgl(s, p.id, set)} />{p.nama}</label>; })}
        </div>
        {tipe === "leadership" && <p className="mt-1 text-xs text-slate-500">Subjek = {leaders.size} pimpinan yang ditunjuk di atas.</p>}
        <button onClick={buat} disabled={busy} className="btn-gold mt-3">{busy ? "Membuat…" : "Tampilkan siklus"}</button>
      </div>

      <div className="card overflow-hidden">
        <p className="border-b border-white/5 p-4 text-sm font-semibold text-slate-100">Siklus</p>
        <div className="scroll-x overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs uppercase text-slate-400"><tr className="border-b border-white/5"><th className="px-4 py-2">Judul</th><th className="px-4 py-2">Jenis</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-center">Jawaban</th><th className="px-4 py-2 text-right">Aksi</th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {cycles.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2 font-medium text-slate-100">{c.judul}</td>
                  <td className="px-4 py-2 text-slate-400">{c.tipe === "leadership" ? "Pimpinan" : "Rekan"}</td>
                  <td className="px-4 py-2"><span className={"badge " + (c.status === "aktif" ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/15 text-slate-300")}>{c.status === "aktif" ? "Aktif" : "Selesai"}</span></td>
                  <td className="px-4 py-2 text-center tabular-nums text-slate-300">{c.respons}</td>
                  <td className="px-4 py-2"><div className="flex flex-wrap justify-end gap-1.5">
                    <button onClick={() => setHasilId(c.id)} className="btn-ghost px-2 py-1 text-xs">Hasil</button>
                    <button onClick={() => fetch("/api/hr/pc-peer", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, status: c.status === "aktif" ? "selesai" : "aktif" }) }).then(load)} className="btn-ghost px-2 py-1 text-xs">{c.status === "aktif" ? "Hentikan" : "Aktifkan"}</button>
                    <button onClick={() => { if (confirm("Hapus siklus?")) fetch(`/api/hr/pc-peer?id=${c.id}`, { method: "DELETE" }).then(load); }} className="btn-ghost px-2 py-1 text-xs text-red-300">Hapus</button>
                  </div></td>
                </tr>
              ))}
              {cycles.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Belum ada siklus.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {hasilId != null && <PeerHasilModal id={hasilId} onClose={() => setHasilId(null)} />}
    </div>
  );
}
interface PeerHasil { cycle: { judul: string; tipe: string; min_responden: number }; perSubjek: { subjek_id: number; nama: string; n: number; naCount: number; cukup: boolean; overall: number | null; dimensi: { kategori: string; teks: string; mean: number | null }[]; teks: { q: string; t: string }[] }[] }
function PeerHasilModal({ id, onClose }: { id: number; onClose: () => void }) {
  const [h, setH] = useState<PeerHasil | null>(null); const [err, setErr] = useState("");
  useEffect(() => { fetch(`/api/hr/pc-peer/hasil?id=${id}`, { cache: "no-store" }).then((r) => r.json()).then((d) => d.error ? setErr(d.error) : setH(d)).catch(() => setErr("Gagal.")); }, [id]);
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="card flex max-h-[88dvh] w-full max-w-xl flex-col overflow-hidden p-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/5 p-4"><h2 className="text-base font-bold text-slate-100">{h?.cycle.judul || "Hasil"}</h2><button onClick={onClose} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-white/10">✕</button></div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {err && <p className="text-sm text-red-300">{err}</p>}
          {!h && !err && <p className="text-sm text-slate-500">Memuat…</p>}
          {h?.perSubjek.map((s) => (
            <div key={s.subjek_id} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-100">{s.nama}</p>{s.cukup && s.overall != null ? <span className="text-sm font-bold text-gold-300">{s.overall}/5</span> : <span className="text-xs text-slate-500">belum cukup responden</span>}</div>
              <p className="text-[11px] text-slate-500">{s.n} penilai valid{s.naCount ? ` · ${s.naCount} N/A` : ""}</p>
              {s.cukup && <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">{s.dimensi.map((d) => <span key={d.kategori} className="text-xs"><span className="text-slate-400">{d.kategori}</span> <b className={d.mean != null && d.mean < 3 ? "text-red-300" : "text-slate-200"}>{d.mean ?? "–"}</b></span>)}</div>}
              {s.teks.length > 0 && <div className="mt-1.5 space-y-1">{s.teks.slice(0, 6).map((t, i) => <p key={i} className="rounded border border-white/5 bg-white/[0.02] px-2 py-1 text-xs text-slate-300">“{t.t}”</p>)}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ====================== LAPOR MASALAH (TRIAGE) ====================== */
interface Laporan { id: number; kategori: string; deskripsi: string; tanggal: string | null; lokasi: string; pihak: string; saksi: string; berulang: boolean; dampak: string; urgensi: string; rahasia: boolean; status: string; created_at: string; pelapor: string | null }
export function IncidentPanel() {
  const [rows, setRows] = useState<Laporan[]>([]);
  const [updates, setUpdates] = useState<{ incident_id: number; status: string; catatan: string; oleh: string; created_at: string }[]>([]);
  const [statusList, setStatusList] = useState<string[]>(INSIDEN_STATUS);
  const [openId, setOpenId] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ status: string; catatan: string }>({ status: "", catatan: "" });
  const load = useCallback(() => { fetch("/api/hr/incident", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (!d.error) { setRows(d.laporan || []); setUpdates(d.updates || []); setStatusList(d.status_list || INSIDEN_STATUS); } }); }, []);
  useEffect(() => { load(); }, [load]);
  async function simpan(id: number) { if (!draft.status) return; await fetch("/api/hr/incident", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: draft.status, catatan: draft.catatan }) }); setOpenId(null); setDraft({ status: "", catatan: "" }); load(); }
  return (
    <div className="space-y-3">
      <p className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-2 text-xs text-sky-200">Laporan ≠ pelanggaran terbukti. Tindak lanjuti bertanggung jawab; identitas pelapor disembunyikan bila ia memilih rahasia.</p>
      {rows.map((l) => (
        <div key={l.id} className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="text-sm font-semibold text-slate-100">{l.kategori} <span className={"badge ml-1 " + (l.urgensi === "darurat" || l.urgensi === "tinggi" ? "bg-red-500/15 text-red-300" : "bg-slate-500/15 text-slate-300")}>{l.urgensi}</span></p>
              <p className="text-[11px] text-slate-500">{l.created_at?.slice(0, 10)} · {l.pelapor ? `oleh ${l.pelapor}` : "pelapor dirahasiakan"}{l.lokasi ? ` · ${l.lokasi}` : ""}{l.berulang ? " · berulang" : ""}</p></div>
            <span className="badge bg-sky-500/15 text-sky-300">{l.status}</span>
          </div>
          <p className="mt-2 whitespace-pre-line rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-slate-300">{l.deskripsi}</p>
          {l.pihak && <p className="mt-1 text-xs text-slate-500">Pihak: {l.pihak}{l.saksi ? ` · Saksi: ${l.saksi}` : ""}</p>}
          {updates.filter((u) => u.incident_id === l.id).map((u, i) => <p key={i} className="mt-1 text-xs text-slate-400">→ {u.status}{u.catatan ? `: ${u.catatan}` : ""} <span className="text-slate-600">({u.oleh})</span></p>)}
          {openId === l.id ? (
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <select className="input w-44 text-sm" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}><option value="">— ubah status —</option>{statusList.map((s) => <option key={s} value={s}>{s}</option>)}</select>
              <input className="input min-w-[180px] flex-1 text-sm" placeholder="catatan tindak lanjut" value={draft.catatan} onChange={(e) => setDraft({ ...draft, catatan: e.target.value })} />
              <button onClick={() => simpan(l.id)} className="btn-gold text-sm">Simpan</button>
              <button onClick={() => setOpenId(null)} className="btn-ghost text-sm">Batal</button>
            </div>
          ) : <button onClick={() => { setOpenId(l.id); setDraft({ status: l.status, catatan: "" }); }} className="btn-ghost mt-2 text-xs">Tindak lanjut</button>}
        </div>
      ))}
      {rows.length === 0 && <div className="card p-6 text-center text-sm text-slate-500">Belum ada laporan.</div>}
    </div>
  );
}

/* ====================== ACTION PLAN ====================== */
interface Action { id: number; judul: string; sumber: string; masalah: string; akar: string; tindakan: string; pic_nama: string | null; prioritas: string; deadline: string | null; status: string; hasil: string; review_date: string | null }
export function ActionPanel() {
  const [rows, setRows] = useState<Action[]>([]);
  const [pegawai, setPegawai] = useState<{ id: number; nama: string }[]>([]);
  const [f, setF] = useState({ judul: "", sumber: "", masalah: "", akar: "", tindakan: "", pic_user_id: "", prioritas: "sedang", deadline: "", review_date: "", expected_outcome: "" });
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const load = useCallback(() => { fetch("/api/hr/pc-action", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (!d.error) { setRows(d.actions || []); setPegawai(d.pegawai || []); } }); }, []);
  useEffect(() => { load(); }, [load]);
  async function buat() { if (!f.judul.trim()) { setErr("Judul wajib."); return; } setBusy(true); setErr(""); try { const r = await fetch("/api/hr/pc-action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) }); const d = await r.json().catch(() => ({})); if (!r.ok) { setErr(d.error || "Gagal."); return; } setF({ judul: "", sumber: "", masalah: "", akar: "", tindakan: "", pic_user_id: "", prioritas: "sedang", deadline: "", review_date: "", expected_outcome: "" }); setOpen(false); load(); } finally { setBusy(false); } }
  async function ubah(id: number, status: string) { await fetch("/api/hr/pc-action", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }); load(); }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-100">Action Plan</p><button onClick={() => setOpen((v) => !v)} className="btn-gold text-sm">{open ? "Tutup" : "+ Buat"}</button></div>
      {open && (
        <div className="card space-y-2 p-4">
          <div className="grid gap-2 sm:grid-cols-2"><input className="input text-sm" placeholder="Judul masalah/aksi" value={f.judul} onChange={(e) => setF({ ...f, judul: e.target.value })} /><input className="input text-sm" placeholder="Sumber (mis. survei Equipment)" value={f.sumber} onChange={(e) => setF({ ...f, sumber: e.target.value })} /></div>
          <textarea rows={2} className="input text-sm" placeholder="Masalah" value={f.masalah} onChange={(e) => setF({ ...f, masalah: e.target.value })} />
          <textarea rows={2} className="input text-sm" placeholder="Akar penyebab" value={f.akar} onChange={(e) => setF({ ...f, akar: e.target.value })} />
          <textarea rows={2} className="input text-sm" placeholder="Tindakan" value={f.tindakan} onChange={(e) => setF({ ...f, tindakan: e.target.value })} />
          <div className="grid gap-2 sm:grid-cols-4">
            <select className="input text-sm" value={f.pic_user_id} onChange={(e) => setF({ ...f, pic_user_id: e.target.value })}><option value="">— PIC —</option>{pegawai.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}</select>
            <select className="input text-sm" value={f.prioritas} onChange={(e) => setF({ ...f, prioritas: e.target.value })}>{PRIORITAS.map((p) => <option key={p} value={p}>prioritas: {p}</option>)}</select>
            <input type="date" className="input text-sm" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} title="deadline" />
            <input type="date" className="input text-sm" value={f.review_date} onChange={(e) => setF({ ...f, review_date: e.target.value })} title="review" />
          </div>
          {err && <p className="text-xs text-red-300">{err}</p>}
          <button onClick={buat} disabled={busy} className="btn-gold text-sm">{busy ? "Menyimpan…" : "Simpan"}</button>
        </div>
      )}
      {rows.map((a) => (
        <div key={a.id} className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-100">{a.judul} <span className={"badge ml-1 " + (a.prioritas === "tinggi" ? "bg-red-500/15 text-red-300" : "bg-slate-500/15 text-slate-300")}>{a.prioritas}</span></p>
            <select className="input w-40 py-1 text-xs" value={a.status} onChange={(e) => ubah(a.id, e.target.value)}>{ACTION_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          </div>
          <p className="text-[11px] text-slate-500">{a.sumber ? `sumber: ${a.sumber} · ` : ""}PIC: {a.pic_nama || "-"}{a.deadline ? ` · tenggat ${a.deadline}` : ""}{a.review_date ? ` · review ${a.review_date}` : ""}</p>
          {a.masalah && <p className="mt-1 text-xs text-slate-400"><b>Masalah:</b> {a.masalah}</p>}
          {a.akar && <p className="text-xs text-slate-400"><b>Akar:</b> {a.akar}</p>}
          {a.tindakan && <p className="text-xs text-slate-400"><b>Tindakan:</b> {a.tindakan}</p>}
          <button onClick={() => { if (confirm("Hapus action plan?")) fetch(`/api/hr/pc-action?id=${a.id}`, { method: "DELETE" }).then(load); }} className="btn-ghost mt-1 px-2 py-0.5 text-xs text-red-300">Hapus</button>
        </div>
      ))}
      {rows.length === 0 && <div className="card p-6 text-center text-sm text-slate-500">Belum ada action plan.</div>}
    </div>
  );
}

/* ====================== ONE-ON-ONE ====================== */
export function OneOnOnePanel() {
  const [pegawai, setPegawai] = useState<{ id: number; nama: string; divisi_nama: string | null; jml: number }[]>([]);
  const [sel, setSel] = useState<{ id: number; nama: string } | null>(null);
  const [catatan, setCatatan] = useState<{ id: number; tanggal: string; catatan: string; tindak_lanjut: string; oleh: string }[]>([]);
  const [f, setF] = useState({ tanggal: jakToday(), catatan: "", tindak_lanjut: "" });
  const loadList = useCallback(() => { fetch("/api/hr/pc-oneonone", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (!d.error) setPegawai(d.pegawai || []); }); }, []);
  useEffect(() => { loadList(); }, [loadList]);
  const openUser = useCallback((u: { id: number; nama: string }) => { setSel(u); fetch(`/api/hr/pc-oneonone?user=${u.id}`, { cache: "no-store" }).then((r) => r.json()).then((d) => { if (!d.error) setCatatan(d.catatan || []); }); }, []);
  async function simpan() { if (!sel || !f.catatan.trim()) return; await fetch("/api/hr/pc-oneonone", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: sel.id, ...f }) }); setF({ tanggal: jakToday(), catatan: "", tindak_lanjut: "" }); openUser(sel); loadList(); }
  return (
    <div className="space-y-3">
      <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">Catatan 1-on-1 bersifat rahasia (akses HR). Dokumentasikan kondisi kerja, hambatan, kebutuhan &amp; tindak lanjut.</p>
      {!sel ? (
        <div className="card p-4">
          <p className="mb-2 text-sm font-semibold text-slate-100">Pilih karyawan</p>
          <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {pegawai.map((p) => <button key={p.id} onClick={() => openUser(p)} className="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-1.5 text-left text-sm text-slate-200 hover:bg-white/5"><span className="truncate">{p.nama} <span className="text-[10px] text-slate-500">{p.divisi_nama || ""}</span></span>{p.jml > 0 && <span className="shrink-0 text-xs text-gold-300">{p.jml} catatan</span>}</button>)}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <button onClick={() => setSel(null)} className="btn-ghost text-xs">← Daftar karyawan</button>
          <div className="card space-y-2 p-4">
            <p className="text-sm font-semibold text-slate-100">Catatan baru — {sel.nama}</p>
            <input type="date" className="input text-sm" value={f.tanggal} onChange={(e) => setF({ ...f, tanggal: e.target.value })} />
            <textarea rows={3} className="input text-sm" placeholder="Catatan 1-on-1 (kondisi kerja, hambatan, masukan)…" value={f.catatan} onChange={(e) => setF({ ...f, catatan: e.target.value })} />
            <textarea rows={2} className="input text-sm" placeholder="Tindak lanjut" value={f.tindak_lanjut} onChange={(e) => setF({ ...f, tindak_lanjut: e.target.value })} />
            <button onClick={simpan} className="btn-gold text-sm">Simpan catatan</button>
          </div>
          {catatan.map((c) => (
            <div key={c.id} className="card p-3">
              <p className="text-xs font-semibold text-slate-300">{c.tanggal} <span className="font-normal text-slate-500">· {c.oleh}</span></p>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-300">{c.catatan}</p>
              {c.tindak_lanjut && <p className="mt-1 text-xs text-amber-300/90"><b>Tindak lanjut:</b> {c.tindak_lanjut}</p>}
            </div>
          ))}
          {catatan.length === 0 && <p className="text-center text-sm text-slate-500">Belum ada catatan.</p>}
        </div>
      )}
    </div>
  );
}
