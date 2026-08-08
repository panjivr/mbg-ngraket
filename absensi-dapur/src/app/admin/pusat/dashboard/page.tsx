"use client";

/**
 * Dashboard lintas dapur (super admin): pilih tanggal & dapur (A–Z), lihat
 * ringkasan pagu, kehadiran, jumlah karyawan, porsi distribusi, dan menu per
 * dapur beserta total gabungan.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

interface Sppg { id: number; nama: string }
interface Row {
  sppg_id: number; nama: string; karyawan: number; hadir: number;
  besar: number; kecil: number; b3: number; porsi: number; penerima: number; pagu: number; menu: string;
}
interface Total { dapur: number; karyawan: number; hadir: number; porsi: number; penerima: number; pagu: number }

function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
const fmtRp = (n: number) => "Rp " + Math.round(n || 0).toLocaleString("id-ID");
const fmtN = (n: number) => (n || 0).toLocaleString("id-ID");

export default function DashboardPusatPage() {
  const [kitchens, setKitchens] = useState<Sppg[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [tanggal, setTanggal] = useState(jakartaToday());
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState<Total | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Daftar dapur (A–Z) untuk pemilih.
  useEffect(() => {
    fetch("/api/admin/sppg", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Khusus super admin."))))
      .then((d) => {
        const list: Sppg[] = (d.sppg || []).map((s: Sppg) => ({ id: s.id, nama: s.nama }))
          .sort((a: Sppg, b: Sppg) => a.nama.localeCompare(b.nama, "id"));
        setKitchens(list);
        setSelected(new Set(list.map((s) => s.id)));
      })
      .catch((e) => setErr(e.message || "Gagal memuat dapur."));
  }, []);

  const load = useCallback(async () => {
    if (selected.size === 0) { setRows([]); setTotal(null); setLoading(false); return; }
    setLoading(true); setErr("");
    try {
      const ids = [...selected].join(",");
      const r = await fetch(`/api/admin/super/dashboard?tanggal=${tanggal}&sppg_ids=${ids}`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal memuat data.");
      setRows(d.dapur || []); setTotal(d.total || null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memuat.");
    } finally { setLoading(false); }
  }, [selected, tanggal]);
  useEffect(() => { load(); }, [load]);

  const allOn = kitchens.length > 0 && selected.size === kitchens.length;
  const toggle = (id: number) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(allOn ? new Set() : new Set(kitchens.map((k) => k.id)));

  const cards = useMemo(() => total ? [
    { label: "Dapur", value: fmtN(total.dapur), cls: "text-slate-100" },
    { label: "Total Pagu", value: fmtRp(total.pagu), cls: "text-emerald-300" },
    { label: "Karyawan", value: fmtN(total.karyawan), cls: "text-slate-100" },
    { label: "Hadir Hari Ini", value: fmtN(total.hadir), cls: "text-sky-300" },
    { label: "Total Porsi", value: fmtN(total.porsi), cls: "text-gold-300" },
  ] : [], [total]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Dashboard Semua Dapur</h1>
          <p className="text-sm text-slate-400">Ringkasan pagu, kehadiran, karyawan, porsi &amp; menu — pilih tanggal &amp; dapur.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">Tanggal</label>
          <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="input w-auto" />
        </div>
      </div>

      {err && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{err}</p>}

      {/* Pemilih dapur */}
      <div className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-300">Pilih Dapur ({selected.size}/{kitchens.length})</p>
          <button onClick={toggleAll} className="text-xs font-medium text-gold-400 hover:underline">
            {allOn ? "Kosongkan" : "Pilih semua"}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {kitchens.map((k) => {
            const on = selected.has(k.id);
            return (
              <button key={k.id} onClick={() => toggle(k.id)}
                className={"rounded-lg px-3 py-1.5 text-sm transition " + (on ? "bg-gold-500/20 text-gold-300 ring-1 ring-gold-500/30" : "bg-white/5 text-slate-400 hover:bg-white/10")}>
                {k.nama}
              </button>
            );
          })}
          {kitchens.length === 0 && !err && <p className="text-sm text-slate-500">Memuat dapur…</p>}
        </div>
      </div>

      {/* Kartu ringkasan */}
      {cards.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {cards.map((c) => (
            <div key={c.label} className="stat-card">
              <p className="stat-label">{c.label}</p>
              <p className={"stat-value !text-xl " + c.cls}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabel per dapur */}
      <div className="card overflow-hidden">
        <div className="scroll-x overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr className="border-b border-white/5">
                <th className="px-3 py-2.5">Dapur</th>
                <th className="px-3 py-2.5 text-right">Karyawan</th>
                <th className="px-3 py-2.5 text-right">Hadir</th>
                <th className="px-3 py-2.5 text-right">Porsi</th>
                <th className="px-3 py-2.5 text-right">Penerima</th>
                <th className="px-3 py-2.5 text-right">Pagu</th>
                <th className="px-3 py-2.5">Menu</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">Memuat…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">Pilih minimal satu dapur.</td></tr>
              ) : (
                rows.map((d) => (
                  <tr key={d.sppg_id} className="border-b border-white/5">
                    <td className="px-3 py-2 font-medium">{d.nama}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtN(d.karyawan)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <span className={d.hadir > 0 ? "text-sky-300" : "text-slate-500"}>{fmtN(d.hadir)}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums" title={`Besar ${fmtN(d.besar)} · Kecil ${fmtN(d.kecil)} · B3 ${fmtN(d.b3)}`}>{fmtN(d.porsi)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtN(d.penerima)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-300">{fmtRp(d.pagu)}</td>
                    <td className="px-3 py-2 text-slate-400"><span className="block max-w-[280px] truncate">{d.menu || "—"}</span></td>
                  </tr>
                ))
              )}
            </tbody>
            {total && rows.length > 0 && (
              <tfoot>
                <tr className="border-t border-white/10 font-bold">
                  <td className="px-3 py-2.5">Total</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmtN(total.karyawan)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-sky-300">{fmtN(total.hadir)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gold-300">{fmtN(total.porsi)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmtN(total.penerima)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-emerald-300">{fmtRp(total.pagu)}</td>
                  <td className="px-3 py-2.5" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
