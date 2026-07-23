"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  KATEGORI_LABEL, TIPE_LABEL, statusStok,
  type Barang, type Kategori, type Mutasi, type TipeMutasi,
} from "@/lib/gudang";

function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ""));

type BForm = { id: number | null; nama: string; kategori: Kategori; satuan: string; stok_min: number; catatan: string; aktif: boolean };
const emptyB: BForm = { id: null, nama: "", kategori: "operasional", satuan: "pcs", stok_min: 0, catatan: "", aktif: true };
type MForm = { barang: Barang; tipe: TipeMutasi; jumlah: number; keterangan: string; tanggal: string };

const STATUS_BADGE: Record<string, string> = {
  habis: "bg-red-500/15 text-red-300",
  menipis: "bg-amber-500/15 text-amber-300",
  aman: "bg-emerald-500/15 text-emerald-300",
};
const STATUS_LABEL: Record<string, string> = { habis: "Habis", menipis: "Menipis", aman: "Aman" };

export default function GudangPage() {
  const [list, setList] = useState<Barang[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Kategori>("all");
  const [bForm, setBForm] = useState<BForm | null>(null);
  const [mForm, setMForm] = useState<MForm | null>(null);
  const [riwayat, setRiwayat] = useState<{ barang: Barang; rows: Mutasi[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/gudang/barang", { cache: "no-store" });
      const d = await res.json();
      setList(d.barang || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => list.filter((b) => filter === "all" || b.kategori === filter), [list, filter]);
  const grup = useMemo(() => {
    const m = new Map<Kategori, Barang[]>();
    for (const b of shown) { if (!m.has(b.kategori)) m.set(b.kategori, []); m.get(b.kategori)!.push(b); }
    return [...m.entries()];
  }, [shown]);
  const stat = useMemo(() => {
    let habis = 0, menipis = 0;
    for (const b of list) { const s = statusStok(b); if (s === "habis") habis++; else if (s === "menipis") menipis++; }
    return { total: list.length, habis, menipis };
  }, [list]);

  async function simpanBarang() {
    if (!bForm) return;
    if (!bForm.nama.trim()) { setMsg("Nama barang wajib diisi."); return; }
    setBusy(true); setMsg(null);
    try {
      const isEdit = bForm.id !== null;
      const res = await fetch(isEdit ? `/api/admin/gudang/barang/${bForm.id}` : "/api/admin/gudang/barang", {
        method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bForm),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(d.error || "Gagal menyimpan."); return; }
      setBForm(null); await load();
    } finally { setBusy(false); }
  }
  async function hapusBarang(b: Barang) {
    if (!confirm(`Hapus barang "${b.nama}"? Semua riwayat mutasinya ikut terhapus.`)) return;
    const res = await fetch(`/api/admin/gudang/barang/${b.id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error || "Gagal menghapus."); return; }
    await load();
  }
  async function simpanMutasi() {
    if (!mForm) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/admin/gudang/mutasi", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barang_id: mForm.barang.id, tipe: mForm.tipe, jumlah: mForm.jumlah, keterangan: mForm.keterangan, tanggal: mForm.tanggal }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(d.error || "Gagal menyimpan mutasi."); return; }
      setMForm(null); await load();
    } finally { setBusy(false); }
  }
  async function bukaRiwayat(b: Barang) {
    const res = await fetch(`/api/admin/gudang/mutasi?barang_id=${b.id}`, { cache: "no-store" });
    const d = await res.json();
    setRiwayat({ barang: b, rows: d.mutasi || [] });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">📦 Gudang / Stok Opname</h1>
          <p className="text-sm text-slate-400">Kelola stok operasional &amp; bahan baku. Catat barang masuk, pemakaian, &amp; opname agar tidak salah beli.</p>
        </div>
        <button onClick={() => { setMsg(null); setBForm({ ...emptyB }); }} className="btn-gold">+ Tambah Barang</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3"><p className="text-xs text-slate-400">Total Barang</p><p className="mt-0.5 text-2xl font-bold">{stat.total}</p></div>
        <div className="card p-3"><p className="text-xs text-slate-400">Menipis</p><p className="mt-0.5 text-2xl font-bold text-amber-300">{stat.menipis}</p></div>
        <div className="card p-3"><p className="text-xs text-slate-400">Habis</p><p className="mt-0.5 text-2xl font-bold text-red-300">{stat.habis}</p></div>
      </div>

      {msg && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{msg}</p>}

      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-400">Kategori:</span>
        {(["all", "operasional", "bahan_baku"] as const).map((k) => (
          <button key={k} onClick={() => setFilter(k)}
            className={"rounded-lg px-3 py-1.5 " + (filter === k ? "bg-gold-500/20 text-gold-300" : "text-slate-400 hover:bg-white/5")}>
            {k === "all" ? "Semua" : KATEGORI_LABEL[k]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-6 text-center text-slate-400">Memuat…</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="scroll-x overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr className="border-b border-white/5">
                  <th className="px-3 py-2.5">Nama</th><th className="px-3 py-2.5">Satuan</th>
                  <th className="px-3 py-2.5">Stok</th><th className="px-3 py-2.5">Min</th>
                  <th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {grup.map(([kat, rows]) => (
                  <Fragment key={kat}>
                    <tr className="bg-white/5"><td colSpan={6} className="px-3 py-1.5 text-xs font-semibold text-gold-400">{KATEGORI_LABEL[kat]}</td></tr>
                    {rows.map((b) => {
                      const st = statusStok(b);
                      return (
                        <tr key={b.id} className="border-b border-white/5">
                          <td className="px-3 py-1.5 font-medium">{b.nama}{b.catatan && <span className="ml-1 text-xs text-slate-500">· {b.catatan}</span>}</td>
                          <td className="px-3 py-1.5 text-slate-400">{b.satuan}</td>
                          <td className="px-3 py-1.5 font-semibold">{fmtNum(b.stok)}</td>
                          <td className="px-3 py-1.5 text-slate-400">{fmtNum(b.stok_min)}</td>
                          <td className="px-3 py-1.5"><span className={"badge " + STATUS_BADGE[st]}>{STATUS_LABEL[st]}</span></td>
                          <td className="px-3 py-1.5">
                            <div className="flex flex-wrap justify-end gap-1.5">
                              <button onClick={() => setMForm({ barang: b, tipe: "masuk", jumlah: 0, keterangan: "", tanggal: jakartaToday() })} className="btn-ghost px-2 py-0.5 text-xs text-emerald-300">+ Masuk</button>
                              <button onClick={() => setMForm({ barang: b, tipe: "keluar", jumlah: 0, keterangan: "", tanggal: jakartaToday() })} className="btn-ghost px-2 py-0.5 text-xs text-sky-300">− Keluar</button>
                              <button onClick={() => setMForm({ barang: b, tipe: "opname", jumlah: b.stok, keterangan: "", tanggal: jakartaToday() })} className="btn-ghost px-2 py-0.5 text-xs text-amber-300">✓ Opname</button>
                              <button onClick={() => bukaRiwayat(b)} className="btn-ghost px-2 py-0.5 text-xs">Riwayat</button>
                              <button onClick={() => setBForm({ id: b.id, nama: b.nama, kategori: b.kategori, satuan: b.satuan, stok_min: b.stok_min, catatan: b.catatan, aktif: b.aktif })} className="btn-ghost px-2 py-0.5 text-xs">Edit</button>
                              <button onClick={() => hapusBarang(b)} className="btn-danger px-2 py-0.5 text-xs">Hapus</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
                {shown.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Belum ada barang.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal tambah/edit barang */}
      {bForm && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4" onClick={() => setBForm(null)}>
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">{bForm.id ? "Edit" : "Tambah"} Barang</h2>
            <div className="mt-4 space-y-3">
              <div><label className="label">Nama Barang</label><input className="input" value={bForm.nama} onChange={(e) => setBForm({ ...bForm, nama: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Kategori</label>
                  <select className="input" value={bForm.kategori} onChange={(e) => setBForm({ ...bForm, kategori: e.target.value === "bahan_baku" ? "bahan_baku" : "operasional" })}>
                    <option value="operasional">Operasional</option><option value="bahan_baku">Bahan Baku</option>
                  </select>
                </div>
                <div><label className="label">Satuan</label><input className="input" value={bForm.satuan} onChange={(e) => setBForm({ ...bForm, satuan: e.target.value })} placeholder="pcs, kg, liter, pack" /></div>
              </div>
              <div><label className="label">Stok Minimum (peringatan menipis)</label><input type="number" min={0} step="0.01" className="input" value={bForm.stok_min} onChange={(e) => setBForm({ ...bForm, stok_min: Math.max(0, parseFloat(e.target.value) || 0) })} /></div>
              <div><label className="label">Catatan (opsional)</label><input className="input" value={bForm.catatan} onChange={(e) => setBForm({ ...bForm, catatan: e.target.value })} /></div>
              {bForm.id && <p className="text-xs text-slate-500">Stok saat ini diubah lewat tombol Masuk/Keluar/Opname, bukan di sini.</p>}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setBForm(null)} className="btn-ghost flex-1">Batal</button>
                <button onClick={simpanBarang} className="btn-gold flex-1" disabled={busy}>{busy ? "Menyimpan…" : "Simpan"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal mutasi (masuk/keluar/opname) */}
      {mForm && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4" onClick={() => setMForm(null)}>
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">{TIPE_LABEL[mForm.tipe]}</h2>
            <p className="mt-1 text-sm text-slate-400">{mForm.barang.nama} · stok sekarang <b>{fmtNum(mForm.barang.stok)} {mForm.barang.satuan}</b></p>
            <div className="mt-4 space-y-3">
              <div><label className="label">Tanggal</label><input type="date" className="input" value={mForm.tanggal} onChange={(e) => setMForm({ ...mForm, tanggal: e.target.value })} /></div>
              <div>
                <label className="label">{mForm.tipe === "opname" ? "Jumlah fisik hasil hitung" : `Jumlah ${mForm.tipe === "masuk" ? "masuk" : "keluar"}`} ({mForm.barang.satuan})</label>
                <input type="number" min={0} step="0.01" className="input" value={mForm.jumlah} onChange={(e) => setMForm({ ...mForm, jumlah: Math.max(0, parseFloat(e.target.value) || 0) })} />
                {mForm.tipe === "opname" && <p className="mt-1 text-xs text-slate-500">Selisih vs sistem: {fmtNum(mForm.jumlah - mForm.barang.stok)}</p>}
              </div>
              <div><label className="label">Keterangan (opsional)</label><input className="input" value={mForm.keterangan} onChange={(e) => setMForm({ ...mForm, keterangan: e.target.value })} placeholder={mForm.tipe === "masuk" ? "mis. beli dari supplier X" : mForm.tipe === "keluar" ? "mis. dipakai produksi" : "mis. koreksi stok"} /></div>
              {msg && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{msg}</p>}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setMForm(null)} className="btn-ghost flex-1">Batal</button>
                <button onClick={simpanMutasi} className="btn-gold flex-1" disabled={busy}>{busy ? "Menyimpan…" : "Simpan"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal riwayat */}
      {riwayat && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4" onClick={() => setRiwayat(null)}>
          <div className="card max-h-[85dvh] w-full max-w-lg overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Riwayat · {riwayat.barang.nama}</h2>
            {riwayat.rows.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Belum ada mutasi.</p>
            ) : (
              <table className="mt-3 w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-400"><tr className="border-b border-white/5"><th className="py-1.5">Tanggal</th><th className="py-1.5">Tipe</th><th className="py-1.5">Jumlah</th><th className="py-1.5">Sisa</th><th className="py-1.5">Ket.</th></tr></thead>
                <tbody>
                  {riwayat.rows.map((m) => (
                    <tr key={m.id} className="border-b border-white/5 align-top">
                      <td className="py-1.5 pr-2">{m.tanggal}</td>
                      <td className="py-1.5 pr-2"><span className={m.tipe === "masuk" ? "text-emerald-300" : m.tipe === "keluar" ? "text-sky-300" : "text-amber-300"}>{m.tipe}</span></td>
                      <td className="py-1.5 pr-2">{fmtNum(m.jumlah)}</td>
                      <td className="py-1.5 pr-2">{fmtNum(m.stok_sesudah)}</td>
                      <td className="py-1.5 text-xs text-slate-400">{m.keterangan}<div className="text-slate-600">{m.oleh}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="mt-4"><button onClick={() => setRiwayat(null)} className="btn-ghost w-full">Tutup</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
