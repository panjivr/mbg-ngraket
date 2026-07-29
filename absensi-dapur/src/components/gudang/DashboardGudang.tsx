"use client";

/**
 * Dashboard Gudang (untuk admin): ringkasan nilai persediaan, jumlah barang,
 * status menipis/habis, rincian per kategori, daftar stok kritis, dan mutasi
 * terbaru. Membaca /api/admin/gudang/barang + /mutasi (read-only).
 */
import { useEffect, useMemo, useState } from "react";
import {
  KATEGORI_LABEL, KATEGORI_LIST, TIPE_LABEL, statusStok,
  type Barang, type Kategori, type Mutasi,
} from "@/lib/gudang";

const fmtNum = (n: number) => (Number.isInteger(n) ? n.toLocaleString("id-ID") : n.toLocaleString("id-ID", { maximumFractionDigits: 2 }));
const fmtRp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");

export default function DashboardGudang() {
  const [list, setList] = useState<Barang[]>([]);
  const [mutasi, setMutasi] = useState<Mutasi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/gudang/barang", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/gudang/mutasi", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
    ]).then(([b, m]) => {
      setList(b.barang || []);
      setMutasi(m.mutasi || []);
    }).finally(() => setLoading(false));
  }, []);

  const stat = useMemo(() => {
    let habis = 0, menipis = 0, nilai = 0;
    for (const b of list) {
      const s = statusStok(b);
      if (s === "habis") habis++; else if (s === "menipis") menipis++;
      nilai += (b.stok || 0) * (b.harga || 0);
    }
    return { total: list.length, habis, menipis, nilai };
  }, [list]);

  const perKategori = useMemo(() => {
    const m = new Map<Kategori, { jumlah: number; nilai: number }>();
    for (const b of list) {
      const e = m.get(b.kategori) || { jumlah: 0, nilai: 0 };
      e.jumlah += 1; e.nilai += (b.stok || 0) * (b.harga || 0);
      m.set(b.kategori, e);
    }
    return KATEGORI_LIST.map((k) => ({ k, ...(m.get(k) || { jumlah: 0, nilai: 0 }) })).filter((x) => x.jumlah > 0);
  }, [list]);

  const kritis = useMemo(
    () => list.filter((b) => statusStok(b) !== "aman").sort((a, b) => a.stok - b.stok),
    [list],
  );
  const namaById = useMemo(() => new Map(list.map((b) => [b.id, b.nama])), [list]);
  const maxNilai = Math.max(1, ...perKategori.map((x) => x.nilai));

  if (loading) return <div className="card p-6 text-center text-slate-400">Memuat…</div>;

  return (
    <div className="space-y-5">
      {/* Kartu ringkasan */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-slate-400">Total Nilai Persediaan</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">{fmtRp(stat.nilai)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400">Jumlah Barang</p>
          <p className="mt-1 text-2xl font-bold">{stat.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400">Stok Menipis</p>
          <p className="mt-1 text-2xl font-bold text-amber-300">{stat.menipis}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400">Stok Habis</p>
          <p className="mt-1 text-2xl font-bold text-red-300">{stat.habis}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Nilai per kategori */}
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-bold">Nilai Persediaan per Kategori</h3>
          {perKategori.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada data.</p>
          ) : (
            <div className="space-y-2.5">
              {perKategori.map((x) => (
                <div key={x.k}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{KATEGORI_LABEL[x.k]} <span className="text-slate-500">· {x.jumlah}</span></span>
                    <span className="tabular-nums text-slate-400">{fmtRp(x.nilai)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-gold-500/70" style={{ width: `${(x.nilai / maxNilai) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stok kritis */}
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-bold">Perlu Perhatian (menipis / habis)</h3>
          {kritis.length === 0 ? (
            <p className="text-sm text-emerald-300">Semua stok aman ✓</p>
          ) : (
            <div className="scroll-x max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <tbody>
                  {kritis.map((b) => {
                    const s = statusStok(b);
                    return (
                      <tr key={b.id} className="border-b border-white/5">
                        <td className="py-1.5 pr-2 font-medium">{b.nama}</td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">{fmtNum(b.stok)} {b.satuan}</td>
                        <td className="py-1.5 text-right">
                          <span className={"badge " + (s === "habis" ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300")}>
                            {s === "habis" ? "Habis" : "Menipis"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Mutasi terbaru */}
      <div className="card p-4">
        <h3 className="mb-3 text-sm font-bold">Mutasi Terbaru</h3>
        {mutasi.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada mutasi.</p>
        ) : (
          <div className="scroll-x max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr className="border-b border-white/5">
                  <th className="py-1.5 pr-2">Tanggal</th><th className="py-1.5 pr-2">Barang</th>
                  <th className="py-1.5 pr-2">Tipe</th><th className="py-1.5 pr-2 text-right">Jumlah</th>
                  <th className="py-1.5 pr-2 text-right">Sisa</th><th className="py-1.5">Oleh</th>
                </tr>
              </thead>
              <tbody>
                {mutasi.slice(0, 20).map((m) => (
                  <tr key={m.id} className="border-b border-white/5">
                    <td className="py-1.5 pr-2 whitespace-nowrap">{m.tanggal}</td>
                    <td className="py-1.5 pr-2">{namaById.get(m.barang_id) || "-"}</td>
                    <td className="py-1.5 pr-2">
                      <span className={m.tipe === "masuk" ? "text-emerald-300" : m.tipe === "keluar" ? "text-sky-300" : "text-amber-300"}>
                        {TIPE_LABEL[m.tipe].split(" ")[0]}
                      </span>
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{fmtNum(m.jumlah)}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{fmtNum(m.stok_sesudah)}</td>
                    <td className="py-1.5 text-xs text-slate-500">{m.oleh}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
