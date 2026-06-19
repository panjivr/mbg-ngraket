"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import BgnLogo from "@/components/BgnLogo";
import {
  hitungWeton,
  hitungJodoh,
  formatTanggalIndo,
  type WetonInfo,
} from "@/lib/weton";

const WARNA_HEX: Record<string, string> = {
  Putih: "#e2e8f0",
  Merah: "#ef4444",
  Kuning: "#eab308",
  Hitam: "#0f172a",
  "Campuran (Manca)": "#a78bfa",
};

function WetonResult({ w }: { w: WetonInfo }) {
  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-xl border border-emas-500/30 bg-emas-500/5 p-4 text-center">
        <p className="text-xs uppercase tracking-wide text-slate-400">Weton Anda</p>
        <p className="mt-1 text-3xl font-extrabold text-emas-300">{w.weton}</p>
        <p className="mt-1 text-sm text-slate-400">
          {formatTanggalIndo(w.tanggal)} · Neptu{" "}
          <span className="font-bold text-slate-200">{w.neptu}</span> ({w.hari_neptu} +{" "}
          {w.pasaran_neptu})
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card flex items-center gap-3 p-4">
          <span
            className="h-9 w-9 shrink-0 rounded-full border border-white/20"
            style={{ background: WARNA_HEX[w.aura_warna] || "#64748b" }}
          />
          <div>
            <p className="text-xs text-slate-400">Aura / Warna</p>
            <p className="font-semibold">{w.aura_warna}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-500/15 text-lg">
            🧭
          </span>
          <div>
            <p className="text-xs text-slate-400">Arah</p>
            <p className="font-semibold">{w.aura_arah}</p>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-emas-300">
          ✨ Watak & Aura
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-200">{w.watak}</p>
      </div>
    </div>
  );
}

function KalkulatorWeton() {
  const [tgl, setTgl] = useState("");
  const w = useMemo(() => hitungWeton(tgl), [tgl]);
  return (
    <div className="card p-5">
      <h2 className="text-lg font-bold">🔮 Hitung Aura Weton</h2>
      <p className="mt-1 text-sm text-slate-400">
        Masukkan tanggal lahir untuk mengetahui weton, neptu, dan auramu.
      </p>
      <div className="mt-4">
        <label className="label">Tanggal Lahir</label>
        <input
          type="date"
          className="input"
          value={tgl}
          max="2099-12-31"
          onChange={(e) => setTgl(e.target.value)}
        />
      </div>
      {w ? (
        <WetonResult w={w} />
      ) : (
        <p className="mt-4 text-sm text-slate-500">Pilih tanggal lahir di atas.</p>
      )}
    </div>
  );
}

function KalkulatorJodoh() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const wa = useMemo(() => hitungWeton(a), [a]);
  const wb = useMemo(() => hitungWeton(b), [b]);
  const jodoh = wa && wb ? hitungJodoh(wa.neptu, wb.neptu) : null;

  return (
    <div className="card p-5">
      <h2 className="text-lg font-bold">💞 Hitung Jodoh (Weton)</h2>
      <p className="mt-1 text-sm text-slate-400">
        Masukkan dua tanggal lahir untuk melihat ramalan kecocokan menurut primbon.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Tanggal Lahir 1</label>
          <input type="date" className="input" value={a} onChange={(e) => setA(e.target.value)} />
          {wa && (
            <p className="mt-1 text-xs text-slate-400">
              {wa.weton} · neptu {wa.neptu}
            </p>
          )}
        </div>
        <div>
          <label className="label">Tanggal Lahir 2</label>
          <input type="date" className="input" value={b} onChange={(e) => setB(e.target.value)} />
          {wb && (
            <p className="mt-1 text-xs text-slate-400">
              {wb.weton} · neptu {wb.neptu}
            </p>
          )}
        </div>
      </div>

      {jodoh ? (
        <div className="mt-4 rounded-xl border border-gold-500/30 bg-gold-500/5 p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-extrabold text-gold-300">{jodoh.kategori}</p>
            <span className="badge bg-gold-500/15 text-gold-300">{jodoh.ringkas}</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-200">{jodoh.deskripsi}</p>
          <p className="mt-2 text-xs text-slate-500">
            Total neptu {jodoh.total_neptu} · hasil ke-{jodoh.sisa} dari 7 (Pegat, Ratu, Jodoh,
            Topo, Tinari, Padu, Sujanan).
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Isi kedua tanggal lahir di atas.</p>
      )}
    </div>
  );
}

export default function AuraPage() {
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-3xl flex-col px-5 py-7">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-1 bg-gradient-to-r from-emas-500 via-gold-500 to-emas-500" />

      <header className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <BgnLogo size={44} />
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-wide">AURA WETON</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              Primbon Jawa · MBG
            </p>
          </div>
        </Link>
        <Link href="/" className="btn-ghost px-4">
          ← Beranda
        </Link>
      </header>

      <section className="mt-10">
        <span className="badge border border-emas-500/30 bg-emas-500/10 text-emas-400">
          ✦ Warisan Budaya Jawa
        </span>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">
          Hitung{" "}
          <span className="bg-gradient-to-r from-emas-300 to-gold-400 bg-clip-text text-transparent">
            Aura Weton
          </span>{" "}
          & Jodoh
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          Berdasarkan perhitungan hari & pasaran (neptu) primbon Jawa. Hasil bersifat
          tradisi/budaya untuk hiburan dan pengenalan warisan leluhur.
        </p>
      </section>

      <div className="mt-6 space-y-5">
        <KalkulatorWeton />
        <KalkulatorJodoh />
      </div>

      <footer className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-slate-500">
        Perhitungan weton berbasis kaidah primbon Jawa (hari, pasaran, neptu). Hanya untuk
        pelestarian budaya & hiburan.
      </footer>
    </main>
  );
}
