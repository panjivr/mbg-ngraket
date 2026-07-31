"use client";

/**
 * Kartu "Beban Hari Ini" untuk staf dapur (di halaman absensi): rincian porsi
 * hari ini dari distribusi — serdik besar/kecil, balita, bumil, busui, total
 * porsi (= jumlah ompreng yang dicuci), dan menu. Agar tiap tim tahu bebannya.
 */
import { useEffect, useState } from "react";

interface Beban {
  tanggal: string;
  menu: string;
  besar: number;
  kecil: number;
  balita: number;
  bumil: number;
  busui: number;
  total: number;
}

const n = (v: number) => (v || 0).toLocaleString("id-ID");
function tglID(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const bln = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${d} ${bln[m - 1]} ${y}`;
}

export default function BebanHariIni() {
  const [d, setD] = useState<Beban | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch("/api/beban", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((v: Beban) => setD(v))
      .catch(() => setErr(true));
  }, []);

  if (err || !d) return null;

  const kosong = d.total === 0 && !d.menu;
  const Stat = ({ label, value, hi = false }: { label: string; value: number; hi?: boolean }) => (
    <div className={"rounded-xl border border-white/10 px-3 py-2 text-center " + (hi ? "bg-gold-500/10" : "bg-ink-900/50")}>
      <p className={"tabular-nums font-bold " + (hi ? "text-2xl text-gold-300" : "text-lg")}>{n(value)}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold">📦 Beban Hari Ini</h2>
        <span className="text-xs text-slate-400">{tglID(d.tanggal)}</span>
      </div>

      {kosong ? (
        <p className="mt-2 text-sm text-slate-400">Belum ada data distribusi untuk hari ini.</p>
      ) : (
        <>
          {d.menu && (
            <p className="mt-1 text-sm text-slate-300">
              <span className="text-slate-500">Menu:</span> {d.menu}
            </p>
          )}
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            <Stat label="Total Porsi / Ompreng" value={d.total} hi />
            <Stat label="Serdik Besar" value={d.besar} />
            <Stat label="Serdik Kecil" value={d.kecil} />
            <Stat label="Balita" value={d.balita} />
            <Stat label="Bumil" value={d.bumil} />
            <Stat label="Busui" value={d.busui} />
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Cuci ompreng: jumlah ompreng dicuci = total porsi. Persiapan/Pengolahan/Pemorsian: lihat
            rincian sasaran &amp; menu di atas.
          </p>
        </>
      )}
    </div>
  );
}
