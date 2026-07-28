"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fmtJumlah } from "@/lib/menu";
import { SASARAN_LABEL, type Sasaran } from "@/lib/jadwal";

const rupiah = (n: number) => "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(n));

interface Porsi {
  besar: number;
  kecil: number;
  b3: number;
}
interface Baris {
  key: string;
  barang_id: number | null;
  nama: string;
  satuan: string;
  jumlah: number;
  harga: number;
  subtotal: number;
  harga_ak?: number;
  subtotal_ak?: number;
}
interface HariB {
  tanggal: string;
  porsi: Porsi;
  menus: { nama: string; sasaran: Sasaran }[];
  baris: Baris[];
  total: number;
}
interface Data {
  mulai: string;
  selesai: string;
  hari: number;
  porsiDefault: Porsi;
  hariList: HariB[];
  periode: { baris: Baris[]; total: number; totalAk: number };
}

const fmtTgl = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function BelanjaPage() {
  const [mulai, setMulai] = useState("");
  const [hari, setHari] = useState(14);
  const [tampil, setTampil] = useState<"periode" | "harian">("periode");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async (m?: string, h?: number) => {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      if (m) params.set("mulai", m);
      if (h) params.set("hari", String(h));
      const res = await fetch(`/api/admin/belanja?${params.toString()}`, { cache: "no-store" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setData(d);
        setMulai(d.mulai);
        setHari(d.hari);
      } else {
        setErr(d?.error || `Gagal memuat (kode ${res.status}).`);
      }
    } catch {
      setErr("Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, []);

  const saveAk = useCallback(
    async (key: string, val: number) => {
      if (!data) return;
      await fetch("/api/admin/belanja", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mulai: data.mulai, hari: data.hari, bahan_key: key, harga_ak: val }),
      });
      setData((prev) => {
        if (!prev) return prev;
        const baris = prev.periode.baris.map((b) =>
          b.key === key ? { ...b, harga_ak: val, subtotal_ak: Math.round(b.jumlah * val) } : b,
        );
        const totalAk = baris.reduce((a, b) => a + (b.subtotal_ak || 0), 0);
        return { ...prev, periode: { ...prev.periode, baris, totalAk } };
      });
    },
    [data],
  );

  // Ambil parameter awal dari URL (dikirim dari halaman jadwal).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    load(sp.get("mulai") || undefined, Number(sp.get("hari")) || undefined);
  }, [load]);

  const exportCsv = useCallback(() => {
    if (!data) return;
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines: string[] = [];
    lines.push(esc(`Belanja ${data.mulai} s/d ${data.selesai}`));
    lines.push("");
    lines.push(
      ["BAHAN", "JUMLAH", "SATUAN", "HARGA SP", "SUBTOTAL", "HARGA AK", "SUBTOTAL AK"].map(esc).join(","),
    );
    for (const b of data.periode.baris) {
      lines.push(
        [
          b.nama,
          fmtJumlah(b.jumlah),
          b.satuan,
          b.harga || "",
          b.subtotal || "",
          b.harga_ak || "",
          b.subtotal_ak || "",
        ]
          .map(esc)
          .join(","),
      );
    }
    lines.push(["TOTAL", "", "", "", data.periode.total, "", ""].map(esc).join(","));
    lines.push(["TOTAL AK", "", "", "", "", "", data.periode.totalAk].map(esc).join(","));
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `belanja-${data.mulai}_${data.selesai}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">🛒 Daftar Belanja Periode</h1>
          <p className="text-xs text-slate-400">
            Kebutuhan bahan otomatis dari jadwal menu × porsi. Harga = patokan (SP).
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/jadwal-menu" className="btn-ghost px-3 py-1.5 text-sm">
            ← Jadwal menu
          </Link>
          <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => window.print()}>
            🖨️ Cetak
          </button>
          <button className="btn-gold px-3 py-1.5 text-sm" onClick={exportCsv} disabled={!data}>
            ⬇️ CSV
          </button>
        </div>
      </div>

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <label className="label">
          Mulai
          <input type="date" className="input mt-1" value={mulai} onChange={(e) => setMulai(e.target.value)} />
        </label>
        <label className="label">
          Jumlah hari
          <input
            type="number"
            min={1}
            max={31}
            className="input mt-1 w-24"
            value={hari}
            onChange={(e) => setHari(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
          />
        </label>
        <button className="btn-primary px-4 py-2" onClick={() => load(mulai, hari)} disabled={loading}>
          Hitung
        </button>
        <div className="ml-auto flex rounded-lg border border-white/10 p-0.5 text-sm">
          <button
            className={`rounded-md px-3 py-1 ${tampil === "periode" ? "bg-white/10 font-semibold" : "text-slate-400"}`}
            onClick={() => setTampil("periode")}
          >
            Rekap periode
          </button>
          <button
            className={`rounded-md px-3 py-1 ${tampil === "harian" ? "bg-white/10 font-semibold" : "text-slate-400"}`}
            onClick={() => setTampil("harian")}
          >
            Per hari
          </button>
        </div>
      </div>

      {err && <div className="card border-red-500/30 p-3 text-sm text-red-300">{err}</div>}
      {loading && <div className="card p-4 text-sm text-slate-400">Memuat…</div>}

      {data && !loading && (
        <>
          <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-xs text-slate-400">Total anggaran belanja (patokan / SP)</p>
                <p className="text-2xl font-bold text-gold-400">{rupiah(data.periode.total)}</p>
              </div>
              {data.periode.totalAk > 0 && (
                <>
                  <div>
                    <p className="text-xs text-slate-400">Total harga beli aktual (AK)</p>
                    <p className="text-2xl font-bold text-gold-300">{rupiah(data.periode.totalAk)}</p>
                  </div>
                  {(() => {
                    const selisih = data.periode.total - data.periode.totalAk;
                    const hemat = selisih >= 0;
                    return (
                      <div>
                        <p className="text-xs text-slate-400">Selisih SP − AK</p>
                        <p className={`text-2xl font-bold ${hemat ? "text-emerald-400" : "text-red-400"}`}>
                          {hemat ? "Hemat" : "Boros"} {rupiah(Math.abs(selisih))}
                        </p>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {fmtTgl(data.mulai)} — {fmtTgl(data.selesai)} · {data.periode.baris.length} jenis bahan
            </p>
          </div>

          {tampil === "periode" ? (
            <BelanjaTabel baris={data.periode.baris} total={data.periode.total} editableAk onSaveAk={saveAk} />
          ) : (
            <div className="space-y-4">
              {data.hariList
                .filter((h) => h.menus.length > 0)
                .map((h) => (
                  <div key={h.tanggal} className="card space-y-2 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold capitalize">{fmtTgl(h.tanggal)}</h3>
                      <span className="text-[11px] text-slate-400">
                        Reguler {h.porsi.besar + h.porsi.kecil} · B3 {h.porsi.b3} · Total{" "}
                        <b className="text-gold-300">{rupiah(h.total)}</b>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {h.menus.map((m) => `${m.nama} (${SASARAN_LABEL[m.sasaran].split(" ")[0]})`).join(" · ")}
                    </p>
                    <BelanjaTabel baris={h.baris} total={h.total} />
                  </div>
                ))}
              {data.hariList.every((h) => h.menus.length === 0) && (
                <div className="card p-4 text-sm text-slate-400">
                  Belum ada menu terjadwal di periode ini. Isi dulu di{" "}
                  <Link href="/admin/jadwal-menu" className="text-gold-300 underline">
                    Jadwal Menu
                  </Link>
                  .
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BelanjaTabel({
  baris,
  total,
  editableAk,
  onSaveAk,
}: {
  baris: Baris[];
  total: number;
  editableAk?: boolean;
  onSaveAk?: (key: string, val: number) => void;
}) {
  if (baris.length === 0)
    return <p className="text-sm text-slate-500">Tidak ada bahan (menu belum punya resep bahan).</p>;
  const totalAk = baris.reduce((a, b) => a + (b.subtotal_ak || 0), 0);
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-sm ${editableAk ? "min-w-[720px]" : "min-w-[520px]"}`}>
        <thead>
          <tr className="border-b border-white/10 text-left text-[11px] uppercase text-slate-400">
            <th className="px-2 py-2">Bahan</th>
            <th className="px-2 py-2 text-right">Jumlah</th>
            <th className="px-2 py-2">Satuan</th>
            <th className="px-2 py-2 text-right">Harga SP</th>
            <th className="px-2 py-2 text-right">Subtotal</th>
            {editableAk && (
              <>
                <th className="px-2 py-2 text-right">Harga AK</th>
                <th className="px-2 py-2 text-right">Subtotal AK</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {baris.map((b) => (
            <tr key={b.key} className="border-b border-white/5">
              <td className="px-2 py-1.5">{b.nama}</td>
              <td className="px-2 py-1.5 text-right">{fmtJumlah(b.jumlah)}</td>
              <td className="px-2 py-1.5 text-slate-400">{b.satuan}</td>
              <td className="px-2 py-1.5 text-right text-slate-300">
                {b.harga > 0 ? rupiah(b.harga) : "—"}
              </td>
              <td className="px-2 py-1.5 text-right">{b.subtotal > 0 ? rupiah(b.subtotal) : "—"}</td>
              {editableAk && (
                <>
                  <td className="px-2 py-1.5 text-right">
                    <input
                      type="number"
                      min={0}
                      className="input py-1 text-right w-28 text-sm"
                      defaultValue={b.harga_ak || ""}
                      onBlur={(e) => onSaveAk?.(b.key, Math.max(0, Number(e.target.value) || 0))}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right text-gold-300">
                    {b.subtotal_ak && b.subtotal_ak > 0 ? rupiah(b.subtotal_ak) : "—"}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold">
            <td className="px-2 py-2" colSpan={4}>
              TOTAL
            </td>
            <td className="px-2 py-2 text-right text-gold-400">{rupiah(total)}</td>
            {editableAk && (
              <>
                <td className="px-2 py-2" />
                <td className="px-2 py-2 text-right text-gold-300">{rupiah(totalAk)}</td>
              </>
            )}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
