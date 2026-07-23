"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import KilometerInput from "@/components/KilometerInput";
import { kmTerpakai, literTerpakai, type Kendaraan, type KilometerEntri } from "@/lib/kilometer";

function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
type Form = { id: number | null; nopol: string; nama: string; konsumsi: number; aktif: boolean };
const empty: Form = { id: null, nopol: "", nama: "", konsumsi: 0, aktif: true };

export default function AdminKilometerPage() {
  const [kendaraan, setKendaraan] = useState<Kendaraan[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  const [from, setFrom] = useState(jakartaToday());
  const [to, setTo] = useState(jakartaToday());
  const [rekapKid, setRekapKid] = useState<number | "all">("all");
  const [entri, setEntri] = useState<KilometerEntri[]>([]);
  const [rekapLoading, setRekapLoading] = useState(false);

  const loadKendaraan = useCallback(async () => {
    const res = await fetch("/api/admin/kendaraan", { cache: "no-store" });
    const d = await res.json();
    setKendaraan(d.kendaraan || []);
  }, []);
  useEffect(() => { loadKendaraan(); }, [loadKendaraan]);

  async function simpanKendaraan() {
    if (!form) return;
    setSaving(true);
    try {
      const isEdit = form.id !== null;
      const res = await fetch(isEdit ? `/api/admin/kendaraan/${form.id}` : "/api/admin/kendaraan", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { alert(d.error || "Gagal menyimpan."); return; }
      setForm(null);
      await loadKendaraan();
    } finally { setSaving(false); }
  }
  async function hapusKendaraan(k: Kendaraan) {
    if (!confirm(`Hapus kendaraan "${k.nama || k.nopol}"? Semua data KM-nya ikut terhapus.`)) return;
    const res = await fetch(`/api/admin/kendaraan/${k.id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error || "Gagal menghapus."); return; }
    await loadKendaraan();
  }

  const loadRekap = useCallback(async () => {
    setRekapLoading(true);
    try {
      const q = new URLSearchParams({ from, to });
      if (rekapKid !== "all") q.set("kendaraan_id", String(rekapKid));
      const res = await fetch(`/api/kilometer?${q.toString()}`, { cache: "no-store" });
      const d = await res.json();
      setEntri(d.entri || []);
    } finally { setRekapLoading(false); }
  }, [from, to, rekapKid]);
  useEffect(() => { loadRekap(); }, [loadRekap]);

  const namaKendaraan = (id: number) => {
    const k = kendaraan.find((x) => x.id === id);
    return k ? (k.nama || k.nopol || `Kendaraan ${id}`) : `#${id}`;
  };
  const totalKm = useMemo(() => entri.reduce((a, e) => a + kmTerpakai(e), 0), [entri]);

  const cetak = () => {
    const q = new URLSearchParams({ from, to });
    if (rekapKid !== "all") q.set("kendaraan_id", String(rekapKid));
    window.open(`/cetak/kilometer?${q.toString()}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">🚗 Data Kilometer Kendaraan</h1>
        <p className="text-sm text-slate-400">Kelola kendaraan, isi KM harian (foto + baca AI), dan cetak laporan.</p>
      </div>

      {/* Kelola kendaraan */}
      <div className="card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gold-400">Kendaraan</h2>
          <button onClick={() => setForm({ ...empty })} className="btn-ghost px-2.5 py-1 text-xs">+ Tambah Kendaraan</button>
        </div>
        {kendaraan.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada kendaraan.</p>
        ) : (
          <div className="scroll-x overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr className="border-b border-white/5"><th className="px-3 py-2">Nama</th><th className="px-3 py-2">Nopol</th><th className="px-3 py-2">Konsumsi (km/L)</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Aksi</th></tr>
              </thead>
              <tbody>
                {kendaraan.map((k) => (
                  <tr key={k.id} className="border-b border-white/5">
                    <td className="px-3 py-2 font-medium">{k.nama || "—"}</td>
                    <td className="px-3 py-2">{k.nopol || "—"}</td>
                    <td className="px-3 py-2">{k.konsumsi || "—"}</td>
                    <td className="px-3 py-2"><span className={"badge " + (k.aktif ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300")}>{k.aktif ? "Aktif" : "Nonaktif"}</span></td>
                    <td className="px-3 py-2"><div className="flex justify-end gap-2">
                      <button onClick={() => setForm({ id: k.id, nopol: k.nopol, nama: k.nama, konsumsi: k.konsumsi, aktif: k.aktif })} className="btn-ghost px-2.5 py-1 text-xs">Edit</button>
                      <button onClick={() => hapusKendaraan(k)} className="btn-danger px-2.5 py-1 text-xs">Hapus</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Input harian */}
      <div className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold text-gold-400">Isi KM Harian</h2>
        <KilometerInput />
      </div>

      {/* Rekap & cetak */}
      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-semibold text-gold-400">Rekap &amp; Cetak</h2>
          <button onClick={cetak} className="btn-gold" disabled={!entri.length}>🖨️ Cetak / PDF</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className="label">Dari</label><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label className="label">Sampai</label><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div><label className="label">Kendaraan</label>
            <select className="input" value={rekapKid} onChange={(e) => setRekapKid(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))}>
              <option value="all">Semua Kendaraan</option>
              {kendaraan.map((k) => <option key={k.id} value={k.id}>{k.nama || k.nopol}</option>)}
            </select>
          </div>
        </div>
        <p className="text-sm text-slate-400">Total KM terpakai: <b className="text-gold-400">{totalKm} km</b> ({entri.length} entri)</p>
        {rekapLoading ? <p className="text-sm text-slate-500">Memuat…</p> : entri.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada entri pada rentang ini.</p>
        ) : (
          <div className="scroll-x overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-400"><tr className="border-b border-white/5">
                <th className="px-3 py-2">Tanggal</th><th className="px-3 py-2">Kendaraan</th><th className="px-3 py-2">Berangkat</th><th className="px-3 py-2">Pulang</th><th className="px-3 py-2">Terpakai</th><th className="px-3 py-2">≈ Liter</th>
              </tr></thead>
              <tbody>
                {entri.map((e) => {
                  const veh = kendaraan.find((x) => x.id === e.kendaraan_id);
                  const used = kmTerpakai(e);
                  return (
                    <tr key={e.id} className="border-b border-white/5">
                      <td className="px-3 py-2">{e.tanggal}</td>
                      <td className="px-3 py-2">{namaKendaraan(e.kendaraan_id)}</td>
                      <td className="px-3 py-2">{e.km_berangkat || "—"}</td>
                      <td className="px-3 py-2">{e.km_pulang || "—"}</td>
                      <td className="px-3 py-2 font-medium text-gold-400">{used} km</td>
                      <td className="px-3 py-2">{veh?.konsumsi ? `${literTerpakai(used, veh.konsumsi)} L` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal kendaraan */}
      {form && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4" onClick={() => setForm(null)}>
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">{form.id ? "Edit" : "Tambah"} Kendaraan</h2>
            <div className="mt-4 space-y-3">
              <div><label className="label">Nama / Label (mis. Mobil 1)</label><input className="input" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></div>
              <div><label className="label">Nopol</label><input className="input" value={form.nopol} onChange={(e) => setForm({ ...form, nopol: e.target.value })} placeholder="AE 1234 XY" /></div>
              <div><label className="label">Konsumsi BBM (km/L) — opsional</label><input type="number" min={0} step="0.1" className="input" value={form.konsumsi} onChange={(e) => setForm({ ...form, konsumsi: Math.max(0, parseFloat(e.target.value) || 0) })} /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-gold-500" checked={form.aktif} onChange={(e) => setForm({ ...form, aktif: e.target.checked })} /> Aktif</label>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setForm(null)} className="btn-ghost flex-1">Batal</button>
                <button onClick={simpanKendaraan} className="btn-gold flex-1" disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
