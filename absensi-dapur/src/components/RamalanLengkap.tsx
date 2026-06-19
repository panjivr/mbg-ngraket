"use client";

import { useMemo } from "react";
import { hitungRamalan, type BioCycle, type RamalanInfo } from "@/lib/weton";

const WARNA_HEX: Record<string, string> = {
  Putih: "#e2e8f0",
  Merah: "#ef4444",
  Kuning: "#eab308",
  Hitam: "#0f172a",
  "Campuran (Manca)": "#a78bfa",
};

function Bintang({ n }: { n: number }) {
  return (
    <span className="ml-1 select-none text-[10px] tracking-tight text-emas-400">
      {"★".repeat(n)}
      <span className="text-slate-600">{"★".repeat(Math.max(0, 3 - n))}</span>
    </span>
  );
}

function Baris({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1 text-sm">
      <span className="w-32 shrink-0 text-slate-400">{k}</span>
      <span className="font-medium text-slate-100">{v}</span>
    </div>
  );
}

function BioBar({ c }: { c: BioCycle }) {
  const v = c.nilai;
  const kritis = Math.abs(v) <= 15;
  const warna = kritis ? "#f59e0b" : v >= 0 ? "#22c55e" : "#ef4444";
  const lebar = Math.min(50, (Math.abs(v) / 100) * 50); // 0..50% dari setengah track
  return (
    <div className="rounded-lg border border-white/10 bg-ink-900/60 p-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold text-slate-100">
          {c.nama === "Fisik" ? "💪 Fisik" : c.nama === "Emosi" ? "❤️ Emosi" : "🧠 Intelektual"}
        </p>
        <p className="text-sm font-bold" style={{ color: warna }}>
          {v > 0 ? "+" : ""}
          {v}%
        </p>
      </div>
      {/* track -100 .. 0 .. +100 */}
      <div className="relative mt-2 h-2 w-full rounded-full bg-ink-700">
        <span className="absolute left-1/2 top-0 h-2 w-px -translate-x-1/2 bg-white/30" />
        <span
          className="absolute top-0 h-2 rounded-full"
          style={{
            background: warna,
            width: `${lebar}%`,
            left: v >= 0 ? "50%" : `${50 - lebar}%`,
          }}
        />
      </div>
      <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: warna }}>
        {c.fase}
      </p>
      <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-slate-300">
        {c.rincian.map((r, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="text-slate-500">•</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RamalanLengkap({
  tgl,
  nama,
}: {
  tgl: string | null | undefined;
  nama?: string | null;
}) {
  const r = useMemo<RamalanInfo | null>(() => hitungRamalan(tgl), [tgl]);

  if (!r) {
    return (
      <div className="card p-4 text-sm text-slate-400">
        🔮 Ramalan belum tersedia. Tanggal lahir belum diisi/valid.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      {/* Header */}
      <div className="border-b border-emas-500/20 bg-gradient-to-r from-emas-500/10 to-gold-500/5 px-5 py-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-emas-400">
          ✦ Ramalan Kepribadian · Primbon Jawa
        </p>
        {nama && <p className="mt-0.5 text-lg font-extrabold text-slate-100">{nama}</p>}
        <p className="mt-1 text-2xl font-extrabold text-emas-300">{r.weton}</p>
        <p className="text-xs text-slate-400">
          {r.tanggalIndo} · Neptu <b className="text-slate-200">{r.neptu}</b> ({r.hari_neptu} +{" "}
          {r.pasaran_neptu})
        </p>
      </div>

      {/* Rincian identitas */}
      <div className="grid gap-x-6 gap-y-0 px-5 py-4 sm:grid-cols-2">
        <Baris
          k="Lahir"
          v={
            <>
              {r.weton}, {r.tanggalIndo}
            </>
          }
        />
        <Baris
          k="Kalender Jawa"
          v={
            <>
              {r.kalender.jawa}
              <span className="text-slate-400">
                {" "}
                · Tahun {r.kalender.jawaTaun} Windu {r.kalender.jawaWindu}
              </span>
            </>
          }
        />
        <Baris k="Kalender Hijriah" v={r.kalender.hijri} />
        <Baris k="Wuku" v={<span className="text-emas-300">{r.wuku}</span>} />
        <Baris k="Pangarasan" v={r.pangarasan} />
        <Baris k="Pancasuda" v={r.pancasuda} />
        <Baris
          k="Pranata Mangsa"
          v={
            <>
              {r.mongso.nama} <span className="text-slate-400">({r.mongso.rentang})</span>
            </>
          }
        />
        <Baris
          k="Bintang"
          v={
            <>
              {r.zodiak.nama} <span className="text-slate-400">({r.zodiak.rentang})</span>
            </>
          }
        />
        <Baris
          k="Aura / Warna"
          v={
            <span className="inline-flex items-center gap-2">
              <span
                className="h-3.5 w-3.5 rounded-full border border-white/20"
                style={{ background: WARNA_HEX[r.aura_warna] || "#64748b" }}
              />
              {r.aura_warna}
            </span>
          }
        />
        <Baris k="Arah" v={r.aura_arah} />
      </div>

      {/* Wuku + Pancasuda/Pangarasan makna */}
      <div className="space-y-2 px-5 pb-4">
        <p className="text-sm leading-relaxed text-slate-200">
          <b className="text-emas-300">Wuku {r.wuku}.</b> {r.wukuWatak}
        </p>
        <p className="text-sm leading-relaxed text-slate-300">
          <b className="text-slate-100">{r.pancasuda}.</b> {r.pancasudaMakna}
        </p>
        <p className="text-sm leading-relaxed text-slate-300">
          <b className="text-slate-100">{r.pangarasan}.</b> {r.pangarasanMakna}
        </p>
        <p className="text-sm leading-relaxed text-slate-300">
          <b className="text-slate-100">Mangsa {r.mongso.nama}.</b> {r.mongso.watak}
        </p>
      </div>

      {/* Sifat menonjol */}
      <Section judul="« Sifat-sifat yang Menonjol »">
        <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {r.sifat.map((s, i) => (
            <li key={i} className="flex items-start text-sm text-slate-200">
              <span className="mr-1.5 text-emas-500">•</span>
              <span>
                {s.teks}
                <Bintang n={s.bobot} />
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-slate-500">
          ★ = bobot sifat; makin banyak bintang makin menonjol.
        </p>
      </Section>

      {/* Asmara */}
      <Section judul="❤️ Asmara">
        <ul className="space-y-1.5">
          {r.asmara.map((a, i) => (
            <li key={i} className="flex gap-1.5 text-sm text-slate-200">
              <span className="text-rose-400">•</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Rejeki */}
      <Section judul="🌾 Rejeki">
        <ul className="space-y-1.5">
          {r.rejeki.map((a, i) => (
            <li key={i} className="flex gap-1.5 text-sm text-slate-200">
              <span className="text-emerald-400">•</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Bio rhythm */}
      <Section judul={`🌙 Kehidupan Anda Hari Ini (${r.bio.tanggal})`}>
        <p className="mb-3 text-sm leading-relaxed text-slate-200">{r.bio.ringkas}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <BioBar c={r.bio.fisik} />
          <BioBar c={r.bio.emosi} />
          <BioBar c={r.bio.intelek} />
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Bio-rhythm: siklus fisik 23 hari, emosi 28 hari, intelektual 33 hari sejak lahir
          (usia {r.bio.hari.toLocaleString("id-ID")} hari).
        </p>
      </Section>

      <p className="border-t border-white/10 px-5 py-3 text-[11px] leading-relaxed text-slate-500">
        Ramalan berbasis kaidah primbon Jawa (weton, neptu, wuku, pancasuda, pranata mangsa)
        & bio-rhythm. Bersifat tradisi/budaya untuk hiburan dan pelestarian warisan leluhur.
      </p>
    </div>
  );
}

function Section({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-white/10 px-5 py-4">
      <p className="mb-2.5 text-sm font-bold uppercase tracking-wide text-emas-300">{judul}</p>
      {children}
    </div>
  );
}
