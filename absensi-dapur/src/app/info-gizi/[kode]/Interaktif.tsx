"use client";

/**
 * Bagian interaktif halaman info gizi publik (client island).
 *
 * Dipisah dari page.tsx (server component) supaya sisa halaman tetap dirender
 * di server. Berisi tiga fitur "seru":
 *  - PorsiTabs : tab per kelompok porsi + bar gizi beranimasi
 *  - Countdown : hitung mundur menuju batas akhir konsumsi (update tiap detik)
 *  - ShareButton: bagikan halaman via Web Share API, fallback salin ke clipboard
 */

import { useEffect, useState } from "react";
import {
  PORSI,
  GIZI_LABEL,
  angkaId,
  type GiziSemua,
  type GiziPorsi,
  type PorsiKey,
} from "@/lib/info-gizi";

/** Nilai acuan untuk skala bar (perkiraan porsi MBG, bukan AKG resmi). */
const GIZI_MAKS: Record<keyof GiziPorsi, number> = {
  energi: 800,
  protein: 40,
  lemak: 40,
  karbo: 120,
  serat: 15,
};

const adaIsi = (g: GiziPorsi): boolean =>
  g.energi > 0 || g.protein > 0 || g.lemak > 0 || g.karbo > 0 || g.serat > 0;

export function PorsiTabs({ gizi }: { gizi: GiziSemua }) {
  // Hanya tampilkan kelompok yang sudah diisi; kalau semua kosong, tampilkan semua.
  const terisi = PORSI.filter((p) => adaIsi(gizi[p.key]));
  const daftar = terisi.length ? terisi : PORSI;
  const [aktif, setAktif] = useState<PorsiKey>(daftar[0].key);
  const meta = PORSI.find((p) => p.key === aktif) ?? PORSI[0];
  const g = gizi[aktif];

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

      <div className="mt-3 space-y-2">
        {GIZI_LABEL.map(({ key, label, sat }) => {
          const val = g[key];
          const pct = Math.max(2, Math.min(100, (val / GIZI_MAKS[key]) * 100));
          return (
            <div key={key}>
              <div className="flex items-baseline justify-between text-[12px]">
                <span className="text-slate-600">{label}</span>
                <span className="font-semibold tabular-nums text-slate-900">
                  {angkaId(val)}{" "}
                  <span className="text-[10px] font-normal text-slate-500">{sat}</span>
                </span>
              </div>
              <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: val > 0 ? `${pct}%` : 0, background: meta.warna }}
                />
              </div>
            </div>
          );
        })}
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
