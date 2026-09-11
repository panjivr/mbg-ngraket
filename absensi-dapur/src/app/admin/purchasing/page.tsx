"use client";

/**
 * Generator Purchase (Kebutuhan Bahan) — pilih paket menu (bank resep dari RAB
 * nyata 6 bulan), masukkan jumlah porsi + cadangan, dapatkan daftar belanja
 * bahan terskala + estimasi biaya. Admin bisa mengoreksi qty/nama/harga bahan
 * (disimpan sebagai override per dapur) atau menyembunyikan baris yang salah.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

interface PaketRingkas { id: string; tanggal: string | null; menu: string; porsi: number; jml: number }
interface Bahan { bahan: string; nama: string; satuan: string; per_porsi: number; harga: number; flag: number; diedit: boolean }
interface PaketDetail { id: string; tanggal: string | null; menu: string; porsi: number; besar: number; kecil: number; balita: number; bumil: number }

const rupiah = (n: number) => "Rp " + Math.round(n || 0).toLocaleString("id-ID");
const fmtQ = (n: number) => (Number.isInteger(n) ? String(n) : (Math.round(n * 1000) / 1000).toString());

export default function PurchasingPage() {
  const [pakets, setPakets] = useState<PaketRingkas[]>([]);
  const [q, setQ] = useState("");
  const [selId, setSelId] = useState("");
  const [paket, setPaket] = useState<PaketDetail | null>(null);
  const [bahan, setBahan] = useState<Bahan[]>([]);
  const [porsi, setPorsi] = useState("");
  const [cadangan, setCadangan] = useState("0");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [edit, setEdit] = useState<string | null>(null);
  const [ef, setEf] = useState<{ nama: string; satuan: string; per_porsi: string; harga: string }>({ nama: "", satuan: "", per_porsi: "", harga: "" });

  useEffect(() => {
    fetch("/api/admin/bank-menu", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setPakets(d.pakets || []))
      .catch(() => setMsg("Gagal memuat daftar paket."));
  }, []);

  const loadPaket = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true); setMsg(null); setEdit(null);
    try {
      const r = await fetch(`/api/admin/bank-menu?paket=${encodeURIComponent(id)}`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) { setMsg(d.error || "Gagal memuat paket."); return; }
      setPaket(d.paket); setBahan(d.bahan || []);
      setPorsi(String(d.paket?.porsi || ""));
    } finally { setLoading(false); }
  }, []);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? pakets.filter((p) => p.menu.toLowerCase().includes(s) || (p.tanggal || "").includes(s)) : pakets;
    return list.slice(0, 300);
  }, [pakets, q]);

  const targetPorsi = Math.max(0, parseInt(porsi, 10) || 0);
  const cad = Math.max(0, parseFloat(cadangan.replace(",", ".")) || 0) / 100;

  const rows = useMemo(
    () => bahan.map((b) => {
      const qtyBeli = b.per_porsi * targetPorsi * (1 + cad);
      return { ...b, qtyBeli, biaya: qtyBeli * b.harga };
    }),
    [bahan, targetPorsi, cad],
  );
  const totalBiaya = rows.reduce((a, r) => a + r.biaya, 0);
  const flagged = rows.filter((r) => r.flag).length;

  async function simpanOverride(patch: Record<string, unknown>) {
    const r = await fetch("/api/admin/bank-menu", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paket_id: selId, ...patch }),
    });
    if (r.status === 403) { setMsg("Koreksi hanya bisa oleh Admin penuh."); return false; }
    if (!r.ok) { const d = await r.json().catch(() => ({})); setMsg(d.error || "Gagal menyimpan."); return false; }
    await loadPaket(selId);
    return true;
  }
  function mulaiEdit(b: Bahan) {
    setEdit(b.bahan);
    setEf({ nama: b.nama, satuan: b.satuan, per_porsi: String(b.per_porsi), harga: String(b.harga) });
  }
  async function simpanEdit(b: Bahan) {
    const ok = await simpanOverride({ bahan: b.bahan, nama: ef.nama, satuan: ef.satuan, per_porsi: ef.per_porsi, harga: ef.harga });
    if (ok) setEdit(null);
  }

  function unduhCSV() {
    if (rows.length === 0) return;
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const head = ["Bahan", "Satuan", "Per porsi", "Qty beli", "Harga satuan", "Estimasi biaya"];
    const body = rows.map((r) => [r.nama, r.satuan, fmtQ(r.per_porsi), fmtQ(r.qtyBeli), Math.round(r.harga), Math.round(r.biaya)].map(esc).join(","));
    const csv = "﻿" + [head.map(esc).join(","), ...body].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url;
    a.download = `purchase-${selId}-${targetPorsi}porsi.csv`; a.click(); URL.revokeObjectURL(url);
  }
  const waText = useMemo(() => {
    if (rows.length === 0) return "";
    const baris = rows.map((r) => `• ${r.nama}: ${fmtQ(r.qtyBeli)} ${r.satuan}`);
    return `🛒 Kebutuhan Bahan — ${paket?.menu ?? selId}\nPorsi: ${targetPorsi}${cad ? ` (+${cadangan}% cadangan)` : ""}\n\n${baris.join("\n")}\n\nEstimasi biaya: ${rupiah(totalBiaya)}`;
  }, [rows, paket, selId, targetPorsi, cad, cadangan, totalBiaya]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Generator Purchase — Kebutuhan Bahan</h1>
        <p className="text-sm text-slate-400">Pilih paket menu, masukkan porsi &amp; cadangan → daftar belanja bahan terskala dari resep RAB nyata.</p>
      </div>

      {msg && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">{msg}</p>}

      {/* Pemilih paket */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <label className="label">Cari menu / tanggal</label>
            <input className="input" placeholder="mis. ayam goreng, 2026-03…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="min-w-[260px] flex-[2]">
            <label className="label">Paket menu ({shown.length})</label>
            <select className="input" value={selId} onChange={(e) => { setSelId(e.target.value); loadPaket(e.target.value); }}>
              <option value="">— pilih paket —</option>
              {shown.map((p) => (
                <option key={p.id} value={p.id}>{(p.tanggal || p.id)} · {p.menu.slice(0, 70)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-400">Memuat…</div>
      ) : paket ? (
        <>
          <div className="card p-4">
            <p className="text-sm font-semibold text-slate-100">{paket.menu}</p>
            <p className="mt-0.5 text-xs text-slate-400">{paket.tanggal} · basis {paket.porsi} porsi · Besar {paket.besar} · Kecil {paket.kecil} · Balita {paket.balita} · Bumil/Busui {paket.bumil}</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="label">Jumlah porsi target</label>
                <input type="number" min={0} inputMode="numeric" className="input w-36" value={porsi} onFocus={(e) => e.target.select()} onChange={(e) => setPorsi(e.target.value)} />
              </div>
              <div>
                <label className="label">Cadangan (%)</label>
                <input type="number" min={0} step="0.5" inputMode="decimal" className="input w-28" value={cadangan} onFocus={(e) => e.target.select()} onChange={(e) => setCadangan(e.target.value)} />
              </div>
              <button onClick={unduhCSV} disabled={rows.length === 0} className="btn-ghost">Unduh CSV</button>
              <a href={`https://wa.me/?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer" className="btn-gold">Bagikan WhatsApp</a>
            </div>
          </div>

          {flagged > 0 && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
              ⚠ {flagged} bahan bertanda <b>perlu koreksi</b> (nilai per porsi tampak tak wajar dari data sumber). Klik <b>Edit</b> pada barisnya untuk memperbaiki, atau sembunyikan.
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="scroll-x overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="text-left text-xs uppercase text-slate-400">
                  <tr className="border-b border-white/5">
                    <th className="px-3 py-2.5">Bahan</th>
                    <th className="px-3 py-2.5">Satuan</th>
                    <th className="px-3 py-2.5 text-right">Per porsi</th>
                    <th className="px-3 py-2.5 text-right">Qty beli</th>
                    <th className="px-3 py-2.5 text-right">Harga</th>
                    <th className="px-3 py-2.5 text-right">Estimasi</th>
                    <th className="px-3 py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map((r) => edit === r.bahan ? (
                    <tr key={r.bahan} className="bg-white/5">
                      <td className="px-3 py-1.5"><input className="input py-1" value={ef.nama} onChange={(e) => setEf({ ...ef, nama: e.target.value })} /></td>
                      <td className="px-3 py-1.5"><input className="input w-20 py-1" value={ef.satuan} onChange={(e) => setEf({ ...ef, satuan: e.target.value })} /></td>
                      <td className="px-3 py-1.5"><input className="input w-24 py-1 text-right" value={ef.per_porsi} onFocus={(e) => e.target.select()} onChange={(e) => setEf({ ...ef, per_porsi: e.target.value })} /></td>
                      <td className="px-3 py-1.5 text-right text-slate-500">auto</td>
                      <td className="px-3 py-1.5"><input className="input w-24 py-1 text-right" value={ef.harga} onFocus={(e) => e.target.select()} onChange={(e) => setEf({ ...ef, harga: e.target.value })} /></td>
                      <td className="px-3 py-1.5" />
                      <td className="px-3 py-1.5">
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => simpanEdit(r)} className="btn-gold px-2.5 py-1 text-xs">Simpan</button>
                          <button onClick={() => setEdit(null)} className="btn-ghost px-2.5 py-1 text-xs">Batal</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={r.bahan} className={r.flag ? "bg-red-500/[0.06]" : undefined}>
                      <td className="px-3 py-1.5 font-medium">
                        {r.nama}
                        {r.flag ? <span className="badge ml-1.5 bg-red-500/15 text-red-300">perlu koreksi</span> : null}
                        {r.diedit ? <span className="badge ml-1.5 bg-sky-500/15 text-sky-300">diedit</span> : null}
                      </td>
                      <td className="px-3 py-1.5 text-slate-400">{r.satuan}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-slate-400">{fmtQ(r.per_porsi)}</td>
                      <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{fmtQ(r.qtyBeli)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-slate-400">{rupiah(r.harga)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-emerald-300">{rupiah(r.biaya)}</td>
                      <td className="px-3 py-1.5">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button onClick={() => mulaiEdit(r)} className="btn-ghost px-2 py-0.5 text-xs">Edit</button>
                          <button onClick={() => simpanOverride({ bahan: r.bahan, hidden: true })} className="btn-ghost px-2 py-0.5 text-xs" title="Sembunyikan baris">Sembunyikan</button>
                          {r.diedit && <button onClick={() => fetch(`/api/admin/bank-menu?paket=${encodeURIComponent(selId)}&bahan=${encodeURIComponent(r.bahan)}`, { method: "DELETE" }).then(() => loadPaket(selId))} className="btn-ghost px-2 py-0.5 text-xs" title="Kembalikan ke data asli">Reset</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">Tidak ada bahan.</td></tr>}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-white/10 font-bold">
                      <td className="px-3 py-2.5" colSpan={5}>Total estimasi biaya · {targetPorsi} porsi</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-emerald-300">{rupiah(totalBiaya)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Qty beli = per porsi × porsi × (1 + cadangan). Nilai &amp; harga = rangkuman RAB historis (estimasi perencanaan, bukan patokan mutlak).
            Koreksi admin disimpan per dapur tanpa mengubah data sumber.
          </p>
        </>
      ) : (
        <div className="card p-8 text-center text-sm text-slate-500">Pilih paket menu di atas untuk mulai menghitung kebutuhan bahan.</div>
      )}
    </div>
  );
}
