"use client";

/**
 * Bagian interaktif halaman info gizi publik (client island).
 *
 * Dipisah dari page.tsx (server component) supaya sisa halaman tetap dirender
 * di server. Berisi fitur interaktif & informatif:
 *  - PorsiTabs   : tab per kelompok porsi + energi utama + cincin komposisi
 *                  kalori + bar gizi beranimasi dengan perkiraan % kebutuhan harian
 *  - ManfaatGizi : kartu edukasi "Tahukah kamu?" yang berganti otomatis
 *  - Countdown   : hitung mundur menuju batas akhir konsumsi (update tiap detik)
 *  - ShareButton : bagikan halaman via Web Share API, fallback salin ke clipboard
 */

import { useEffect, useState } from "react";
import {
  PORSI,
  GIZI_LABEL,
  AKG_HARIAN,
  KALORI_PER_GRAM,
  angkaId,
  type GiziSemua,
  type GiziPorsi,
  type PorsiKey,
} from "@/lib/info-gizi";

const adaIsi = (g: GiziPorsi): boolean =>
  g.energi > 0 || g.protein > 0 || g.lemak > 0 || g.karbo > 0 || g.serat > 0;

const bulat = (n: number): number => Math.round(n);
const persenDari = (bagian: number, total: number): number =>
  total > 0 ? Math.round((bagian / total) * 100) : 0;

/** Kalori dari tiap makronutrien (faktor Atwater) untuk cincin komposisi. */
function komposisiKalori(g: GiziPorsi) {
  const p = g.protein * KALORI_PER_GRAM.protein;
  const l = g.lemak * KALORI_PER_GRAM.lemak;
  const k = g.karbo * KALORI_PER_GRAM.karbo;
  const total = p + l + k;
  return {
    total,
    protein: { kkal: p, pct: persenDari(p, total) },
    lemak: { kkal: l, pct: persenDari(l, total) },
    karbo: { kkal: k, pct: persenDari(k, total) },
  };
}

const MAKRO = [
  { key: "karbo" as const, label: "Karbohidrat", warna: "#f59e0b" },
  { key: "protein" as const, label: "Protein", warna: "#0b6b3a" },
  { key: "lemak" as const, label: "Lemak", warna: "#dc2626" },
];

/** Cincin donat komposisi energi (conic-gradient, tanpa dependensi grafik). */
function CincinKalori({ g }: { g: GiziPorsi }) {
  const k = komposisiKalori(g);
  if (k.total <= 0) return null;

  const stop1 = k.karbo.pct;
  const stop2 = k.karbo.pct + k.protein.pct;
  const ring = `conic-gradient(${MAKRO[0].warna} 0% ${stop1}%, ${MAKRO[1].warna} ${stop1}% ${stop2}%, ${MAKRO[2].warna} ${stop2}% 100%)`;

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full"
        style={{ background: ring }}
        role="img"
        aria-label={`Komposisi energi: karbohidrat ${k.karbo.pct}%, protein ${k.protein.pct}%, lemak ${k.lemak.pct}%`}
      >
        <div className="grid h-16 w-16 place-items-center rounded-full bg-white text-center leading-none">
          <span className="text-[15px] font-black tabular-nums text-slate-900">
            {angkaId(bulat(g.energi))}
          </span>
          <span className="text-[8px] font-semibold tracking-wide text-slate-400">kkal</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-[10px] font-bold tracking-[0.12em] text-slate-400">
          SUMBER ENERGI
        </p>
        {MAKRO.map((m) => (
          <div key={m.key} className="flex items-center gap-2 text-[12px]">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: m.warna }}
            />
            <span className="flex-1 text-slate-600">{m.label}</span>
            <span className="font-bold tabular-nums text-slate-900">
              {k[m.key].pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PorsiTabs({ gizi }: { gizi: GiziSemua }) {
  // Hanya tampilkan kelompok yang sudah diisi; kalau semua kosong, tampilkan semua.
  const terisi = PORSI.filter((p) => adaIsi(gizi[p.key]));
  const daftar = terisi.length ? terisi : PORSI;
  const [aktif, setAktif] = useState<PorsiKey>(daftar[0].key);
  const meta = PORSI.find((p) => p.key === aktif) ?? PORSI[0];
  const g = gizi[aktif];
  const akg = AKG_HARIAN[aktif];

  return (
    <div>
      <div role="tablist" aria-label="Kelompok porsi" className="flex flex-wrap gap-1.5">
        {daftar.map((p) => {
          const on = p.key === aktif;
          return (
            <button
              key={p.key}
              role="tab"
              type="button"
              aria-selected={on}
              onClick={() => setAktif(p.key)}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold shadow-sm transition"
              style={{
                background: on ? meta.warna : "rgba(0,0,0,0.05)",
                color: on ? "#fff" : "#475569",
              }}
            >
              <span aria-hidden>{p.emoji}</span>
              {p.singkat}
            </button>
          );
        })}
      </div>

      {/* Cincin komposisi energi + energi utama */}
      <div className="mt-3.5 rounded-xl bg-slate-50 p-3 ring-1 ring-black/5">
        <CincinKalori g={g} />
      </div>

      {/* Rincian gizi + perkiraan % kebutuhan harian */}
      <div className="mt-3 space-y-2.5">
        {GIZI_LABEL.map(({ key, label, sat }) => {
          const val = g[key];
          const persen = akg[key] > 0 ? Math.round((val / akg[key]) * 100) : 0;
          const lebar = Math.max(2, Math.min(100, persen));
          return (
            <div key={key}>
              <div className="flex items-baseline justify-between text-[12px]">
                <span className="text-slate-600">{label}</span>
                <span className="font-semibold tabular-nums text-slate-900">
                  {angkaId(val)}{" "}
                  <span className="text-[10px] font-normal text-slate-500">{sat}</span>
                  {val > 0 && (
                    <span
                      className="ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                      style={{ background: `${meta.warna}1a`, color: meta.warna }}
                    >
                      ±{persen}%
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: val > 0 ? `${lebar}%` : 0, background: meta.warna }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[10px] leading-snug text-slate-400">
        Persentase adalah <b>perkiraan kontribusi terhadap kebutuhan harian</b> untuk
        kelompok {meta.label} (acuan AKG Permenkes 28/2019), bukan anjuran medis
        perorangan. Satu porsi MBG dirancang memenuhi sebagian kebutuhan sehari.
      </p>
    </div>
  );
}

/** Fakta gizi singkat yang berputar otomatis — edukatif & ringan. */
const TIPS = [
  { emoji: "💪", judul: "Protein", teks: "Membentuk otot serta memperbaiki jaringan tubuh yang rusak." },
  { emoji: "⚡", judul: "Karbohidrat", teks: "Sumber energi utama untuk belajar, bermain, dan beraktivitas." },
  { emoji: "🧠", judul: "Lemak sehat", teks: "Membantu penyerapan vitamin dan mendukung perkembangan otak." },
  { emoji: "🌾", judul: "Serat", teks: "Melancarkan pencernaan dan membuat kenyang lebih lama." },
  { emoji: "🥗", judul: "Gizi seimbang", teks: "Kombinasi nasi, lauk, sayur, dan buah sesuai anjuran Isi Piringku." },
  { emoji: "💧", judul: "Cukup minum", teks: "Lengkapi makanmu dengan air putih agar tubuh tetap segar." },
];

export function ManfaatGizi() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % TIPS.length), 5000);
    return () => clearInterval(id);
  }, []);

  const tip = TIPS[idx];
  return (
    <div>
      <div
        className="flex items-start gap-3 rounded-xl p-3"
        style={{ background: "linear-gradient(135deg,#ecfdf5 0%,#f0fdfa 100%)" }}
      >
        <span aria-hidden className="text-2xl leading-none">{tip.emoji}</span>
        <div className="min-w-0">
          <p className="text-[13px] font-black text-[#0b6b3a]">{tip.judul}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-slate-600">{tip.teks}</p>
        </div>
      </div>
      <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
        {TIPS.map((_, i) => (
          <span
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === idx ? 16 : 6,
              background: i === idx ? "#0b6b3a" : "rgba(0,0,0,0.15)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

const dua = (n: number): string => String(n).padStart(2, "0");

export function Countdown({ batas, zona }: { batas: string; zona: string }) {
  // now=null sampai komponen mount, supaya tidak ada mismatch hidrasi SSR.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const m = batas.match(/(\d{1,2})[.:](\d{2})/);
  if (!now || !m) return null;

  const target = new Date(now);
  target.setHours(Number(m[1]), Number(m[2]), 0, 0);
  const sisa = target.getTime() - now.getTime();

  if (sisa <= 0) {
    return (
      <p className="mt-1 text-[12px] font-bold text-[#7a1d1d]">
        Waktu makan telah berakhir hari ini
      </p>
    );
  }

  const totalDetik = Math.floor(sisa / 1000);
  const jam = Math.floor(totalDetik / 3600);
  const menit = Math.floor((totalDetik % 3600) / 60);
  const detik = totalDetik % 60;

  return (
    <p className="mt-1 text-[12px] font-bold text-[#4a3b00]">
      <span aria-hidden>⏳</span> Sisa waktu:{" "}
      <span className="tabular-nums">
        {jam > 0 ? `${dua(jam)}:` : ""}
        {dua(menit)}:{dua(detik)}
      </span>{" "}
      menuju {batas} {zona}
    </p>
  );
}

export function ShareButton({ judul }: { judul: string }) {
  const [pesan, setPesan] = useState("");

  const bagikan = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (!url) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: judul, url });
        return;
      } catch {
        // dibatalkan pengguna — abaikan, jangan fallback salin
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setPesan("Link disalin!");
    } catch {
      setPesan("Gagal menyalin link");
    }
    setTimeout(() => setPesan(""), 2200);
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={bagikan}
        className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-[12px] font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/20"
      >
        <span aria-hidden>🔗</span> Bagikan info ini
      </button>
      {pesan && <span className="text-[11px] font-semibold text-white/80">{pesan}</span>}
    </span>
  );
}
