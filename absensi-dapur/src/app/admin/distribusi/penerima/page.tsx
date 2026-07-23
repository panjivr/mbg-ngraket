"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface Penerima {
  id: number;
  jenis: "serdik" | "b3";
  nama: string;
  jenjang: string;
  besar: number;
  kecil: number;
  b3: number;
  pj: number;
  jam_kirim: string;
  aktif: boolean;
}
type Form = Omit<Penerima, "id"> & { id: number | null };

const empty: Form = {
  id: null, jenis: "serdik", nama: "", jenjang: "SD/MI",
  besar: 0, kecil: 0, b3: 0, pj: 0, jam_kirim: "07:00", aktif: true,
};

export default function PenerimaPage() {
  const [list, setList] = useState<Penerima[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/penerima", { cache: "no-store" });
      const d = await res.json();
      setList(d.penerima || []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!form) return;
    if (!form.nama.trim()) { setError("Nama wajib diisi."); return; }
    setSaving(true); setError(null);
    try {
      const isEdit = form.id !== null;
      const res = await fetch(isEdit ? `/api/admin/penerima/${form.id}` : "/api/admin/penerima", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || "Gagal menyimpan."); return; }
      setForm(null);
      await load();
    } catch { setError("Tidak dapat terhubung ke server."); }
    finally { setSaving(false); }
  }
  async function hapus(p: Penerima) {
    if (!confirm(`Hapus penerima "${p.nama}"?`)) return;
    const res = await fetch(`/api/admin/penerima/${p.id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error || "Gagal menghapus."); return; }
    await load();
  }

  const grup = useMemo(() => {
    const m = new Map<string, Penerima[]>();
    for (const p of list) {
      const k = p.jenjang || "Lainnya";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(p);
    }
    return [...m.entries()];
  }, [list]);
  const tot = useMemo(() => {
    let besar = 0, kecil = 0, b3 = 0;
    for (const p of list) if (p.aktif) { besar += p.besar; kecil += p.kecil; b3 += p.b3; }
    return { besar, kecil, b3 };
  }, [list]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">🏫 Data Penerima (Sekolah &amp; B3)</h1>
          <Link href="/admin/distribusi" className="text-sm text-gold-400 hover:underline">← Distribusi Harian</Link>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.open("/cetak/penerima", "_blank")} className="btn-ghost">🖨️ Cetak</button>
          <button onClick={() => { setError(null); setForm({ ...empty }); }} className="btn-gold">+ Tambah Penerima</button>
        </div>
      </div>
      <p className="text-sm text-slate-400">
        Master jumlah porsi Besar/Kecil/B3 per penerima — jadi nilai default saat mengatur distribusi harian.
        Total aktif: <b className="text-emerald-300">{tot.besar}</b> besar,{" "}
        <b className="text-sky-300">{tot.kecil}</b> kecil, <b className="text-amber-300">{tot.b3}</b> B3.
      </p>

      {loading ? (
        <div className="card p-6 text-center text-slate-400">Memuat…</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="scroll-x overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr className="border-b border-white/5">
                  <th className="px-3 py-2.5">Nama</th>
                  <th className="px-3 py-2.5">Jam</th>
                  <th className="px-3 py-2.5">Besar</th>
                  <th className="px-3 py-2.5">Kecil</th>
                  <th className="px-3 py-2.5">B3</th>
                  <th className="px-3 py-2.5">PJ</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {grup.map(([jenjang, rows]) => (
                  <Fragment key={jenjang}>
                    <tr className="bg-white/5"><td colSpan={8} className="px-3 py-1.5 text-xs font-semibold text-gold-400">{jenjang}</td></tr>
                    {rows.map((p) => (
                      <tr key={p.id} className="border-b border-white/5">
                        <td className="px-3 py-1.5 font-medium">{p.nama}</td>
                        <td className="px-3 py-1.5 text-slate-400">{p.jam_kirim}</td>
                        <td className="px-3 py-1.5">{p.besar}</td>
                        <td className="px-3 py-1.5">{p.kecil}</td>
                        <td className="px-3 py-1.5">{p.b3}</td>
                        <td className="px-3 py-1.5 text-slate-400">{p.pj}</td>
                        <td className="px-3 py-1.5">
                          <span className={"badge " + (p.aktif ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300")}>
                            {p.aktif ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => { setError(null); setForm({ ...p }); }} className="btn-ghost px-2.5 py-1 text-xs">Edit</button>
                            <button onClick={() => hapus(p)} className="btn-danger px-2.5 py-1 text-xs">Hapus</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4" onClick={() => setForm(null)}>
          <div className="card max-h-[90dvh] w-full max-w-md overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">{form.id ? "Edit" : "Tambah"} Penerima</h2>
            <div className="mt-4 space-y-3">
              <div><label className="label">Nama</label><input className="input" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Jenis</label>
                  <select className="input" value={form.jenis} onChange={(e) => setForm({ ...form, jenis: e.target.value === "b3" ? "b3" : "serdik" })}>
                    <option value="serdik">SERDIK (Sekolah)</option>
                    <option value="b3">B3 (Posyandu)</option>
                  </select>
                </div>
                <div><label className="label">Jenjang</label><input className="input" value={form.jenjang} onChange={(e) => setForm({ ...form, jenjang: e.target.value })} placeholder="SD/MI, POSYANDU…" /></div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div><label className="label">Besar</label><input type="number" min={0} className="input" value={form.besar} onChange={(e) => setForm({ ...form, besar: Math.max(0, parseInt(e.target.value) || 0) })} /></div>
                <div><label className="label">Kecil</label><input type="number" min={0} className="input" value={form.kecil} onChange={(e) => setForm({ ...form, kecil: Math.max(0, parseInt(e.target.value) || 0) })} /></div>
                <div><label className="label">B3</label><input type="number" min={0} className="input" value={form.b3} onChange={(e) => setForm({ ...form, b3: Math.max(0, parseInt(e.target.value) || 0) })} /></div>
                <div><label className="label">PJ</label><input type="number" min={0} className="input" value={form.pj} onChange={(e) => setForm({ ...form, pj: Math.max(0, parseInt(e.target.value) || 0) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Jam Kirim</label><input type="time" className="input" value={form.jam_kirim} onChange={(e) => setForm({ ...form, jam_kirim: e.target.value })} /></div>
                <label className="flex items-end gap-2 pb-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-gold-500" checked={form.aktif} onChange={(e) => setForm({ ...form, aktif: e.target.checked })} /> Aktif
                </label>
              </div>
              {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setForm(null)} className="btn-ghost flex-1">Batal</button>
                <button onClick={save} className="btn-gold flex-1" disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
