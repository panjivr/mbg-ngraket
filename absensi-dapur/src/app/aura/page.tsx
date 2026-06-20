"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import BgnLogo from "@/components/BgnLogo";
import RamalanLengkap from "@/components/RamalanLengkap";
import ShioFengshuiLengkap from "@/components/ShioFengshuiLengkap";
import ChaldeanLengkap from "@/components/ChaldeanLengkap";
import { hitungWeton, hitungJodoh } from "@/lib/weton";

function KalkulatorWeton() {
  const [nama, setNama] = useState("");
  const [tgl, setTgl] = useState("");
  const [kelamin, setKelamin] = useState("");
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h2 className="text-lg font-bold">🔮 Ramalan Kepribadian (Weton + Shio &amp; Fengshui)</h2>
        <p className="mt-1 text-sm text-slate-400">
          Masukkan data untuk membaca ramalan lengkap: weton Jawa (neptu, wuku, pancasuda,
          pranata mangsa, bintang, sifat, asmara, rejeki, bio-rhythm) dilanjutkan ilmu
          Tionghoa (shio, elemen, jodoh shio, Angka Kua Fengshui, &amp; numerologi).
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nama Lengkap (untuk numerologi)</label>
            <input
              className="input"
              value={nama}
              placeholder="mis. Panji Vatorrohman"
              onChange={(e) => setNama(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Tanggal Lahir</label>
            <input
              type="date"
              className="input"
              value={tgl}
              max="2099-12-31"
              onChange={(e) => setTgl(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Jenis Kelamin (untuk Kua)</label>
            <select className="input" value={kelamin} onChange={(e) => setKelamin(e.target.value)}>
              <option value="">— Pilih —</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
        </div>
        {!tgl && <p className="mt-4 text-sm text-slate-500">Pilih tanggal lahir di atas.</p>}
      </div>
      {tgl && <RamalanLengkap tgl={tgl} nama={nama || undefined} />}
      {tgl && <ShioFengshuiLengkap nama={nama} tgl={tgl} jenisKelamin={kelamin} />}
      {tgl && nama.trim() && <ChaldeanLengkap nama={nama} tgl={tgl} />}
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
