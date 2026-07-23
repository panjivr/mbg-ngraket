"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { KATEGORI_LABEL, statusStok, type Barang, type Kategori } from "@/lib/gudang";

function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ""));
const BADGE: Record<string, string> = { habis: "bg-red-500/15 text-red-300", menipis: "bg-amber-500/15 text-amber-300", aman: "bg-emerald-500/15 text-emerald-300" };
const LBL: Record<string, string> = { habis: "Habis", menipis: "Menipis", aman: "Aman" };

export default function KartuStokPage() {
  const [list, setList] = useState<Barang[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<{ barang: Barang; jumlah: number; keterangan: string; tanggal: string } | null>(null);
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

  const grup = useMemo(() => {
    const f = list.filter((b) => b.aktif && b.nama.toLowerCase().includes(q.toLowerCase()));
    const m = new Map<Kategori, Barang[]>();
    for (const b of f) { if (!m.has(b.kategori)) m.set(b.kategori, []); m.get(b.kategori)!.push(b); }
    return [...m.entries()];
  }, [list, q]);

  async function keluar() {
    if (!form) return;
    if (form.jumlah <= 0) { setMsg("Jumlah harus lebih dari 0."); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/admin/gudang/mutasi", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barang_id: form.barang.id, tipe: "keluar", jumlah: form.jumlah, keterangan: form.keterangan, tanggal: form.tanggal }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(d.error || "Gagal menyimpan."); return; }
      setForm(null); await load();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">🗄️ Kartu Stok — Barang Keluar</h1>
        <p className="text-sm text-slate-400">Catat pemakaian barang dari gudang (barang keluar) agar stok selalu ter-update.</p>
      </div>

      <input className="input" placeholder="Cari barang…" value={q} onChange={(e) => setQ(e.target.value)} />
      {msg && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{msg}</p>}

      {loading ? (
        <div className="card p-6 text-center text-slate-400">Memuat…</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="scroll-x overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-400"><tr className="border-b border-white/5">
                <th className="px-3 py-2.5">Barang</th><th className="px-3 py-2.5">Stok</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5 text-right">Aksi</th>
              </tr></thead>
              <tbody>
                {grup.map(([kat, rows]) => (
                  <Fragment key={kat}>
                    <tr className="bg-white/5"><td colSpan={4} className="px-3 py-1.5 text-xs font-semibold text-gold-400">{KATEGORI_LABEL[kat]}</td></tr>
                    {rows.map((b) => {
                      const st = statusStok(b);
                      return (
                        <tr key={b.id} className="border-b border-white/5">
                          <td className="px-3 py-2 font-medium">{b.nama} <span className="text-xs text-slate-500">/ {b.satuan}</span></td>
                          <td className="px-3 py-2 font-semibold">{fmtNum(b.stok)}</td>
                          <td className="px-3 py-2"><span className={"badge " + BADGE[st]}>{LBL[st]}</span></td>
                          <td className="px-3 py-2 text-right">
                            <button onClick={() => setForm({ barang: b, jumlah: 0, keterangan: "", tanggal: jakartaToday() })}
                              className="btn-ghost px-3 py-1 text-xs text-sky-300" disabled={b.stok <= 0}>− Keluar</button>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
                {grup.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">Tidak ada barang.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4" onClick={() => setForm(null)}>
          <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Barang Keluar</h2>
            <p className="mt-1 text-sm text-slate-400">{form.barang.nama} · stok <b>{fmtNum(form.barang.stok)} {form.barang.satuan}</b></p>
            <div className="mt-4 space-y-3">
              <div><label className="label">Tanggal</label><input type="date" className="input" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /></div>
              <div><label className="label">Jumlah keluar ({form.barang.satuan})</label><input type="number" min={0} step="0.01" className="input" value={form.jumlah} onChange={(e) => setForm({ ...form, jumlah: Math.max(0, parseFloat(e.target.value) || 0) })} /></div>
              <div><label className="label">Keperluan (opsional)</label><input className="input" value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} placeholder="mis. persiapan / pengolahan / pemorsian" /></div>
              {msg && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{msg}</p>}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setForm(null)} className="btn-ghost flex-1">Batal</button>
                <button onClick={keluar} className="btn-gold flex-1" disabled={busy}>{busy ? "Menyimpan…" : "Simpan"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
