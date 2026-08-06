"use client";

/**
 * Kartu ucapan hari besar (nasional & dunia) + pengingat weton kelahiran.
 * - Hari besar: bila tanggal hari ini cocok daftar → tampil ucapan (HUT RI
 *   otomatis hitung usianya). Bisa ditutup (disimpan per tanggal).
 * - Weton: dari tanggal lahir (weton = hari + pasaran Jawa). Bila weton
 *   kelahiran jatuh hari ini / besok → pengingat (mis. untuk puasa weton).
 * Semua di sisi klien; aman bila data tak lengkap (kartu disembunyikan).
 */
import { useEffect, useState } from "react";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const PASARAN = ["Legi", "Pahing", "Pon", "Wage", "Kliwon"]; // acuan 17 Agu 1945 = Jumat Legi

function isoJakarta(offsetHari = 0): string {
  const base = new Date(Date.now() + offsetHari * 86400000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
}

function weton(iso: string): { hari: string; pasaran: string; full: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!m) return null;
  const d = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const anchor = Date.UTC(1945, 7, 17); // Jumat Legi
  const diff = Math.round((d - anchor) / 86400000);
  const pasaran = PASARAN[((diff % 5) + 5) % 5];
  const hari = HARI[new Date(d).getUTCDay()];
  return { hari, pasaran, full: `${hari} ${pasaran}` };
}

/** Hari besar (MM-DD). teks bisa fungsi tahun untuk yang dinamis (mis. HUT RI). */
const HARI_BESAR: { md: string; emoji: string; teks: (y: number) => string }[] = [
  { md: "01-01", emoji: "🎆", teks: () => "Selamat Tahun Baru! Semoga tahun ini penuh rezeki & kesehatan." },
  { md: "01-25", emoji: "🥗", teks: () => "Selamat Hari Gizi Nasional! Terima kasih para pejuang gizi anak bangsa 💪" },
  { md: "03-08", emoji: "🌷", teks: () => "Selamat Hari Perempuan Internasional! Hebatnya perempuan-perempuan hebat." },
  { md: "04-21", emoji: "👩", teks: () => "Selamat Hari Kartini! Habis gelap terbitlah terang." },
  { md: "04-22", emoji: "🌍", teks: () => "Selamat Hari Bumi! Yuk jaga lingkungan mulai dari dapur." },
  { md: "05-01", emoji: "👷", teks: () => "Selamat Hari Buruh! Salut untuk kerja keras kalian semua." },
  { md: "05-02", emoji: "📚", teks: () => "Selamat Hari Pendidikan Nasional! Belajar tak kenal usia." },
  { md: "05-20", emoji: "🇮🇩", teks: () => "Selamat Hari Kebangkitan Nasional!" },
  { md: "06-01", emoji: "🇮🇩", teks: () => "Selamat Hari Lahir Pancasila!" },
  { md: "06-05", emoji: "🌱", teks: () => "Selamat Hari Lingkungan Hidup Sedunia!" },
  { md: "07-23", emoji: "🧒", teks: () => "Selamat Hari Anak Nasional! Anak sehat, Indonesia kuat." },
  { md: "08-17", emoji: "🇮🇩", teks: (y) => `Dirgahayu Republik Indonesia ke-${y - 1945}! Merdeka! 🎉` },
  { md: "10-01", emoji: "🇮🇩", teks: () => "Selamat Hari Kesaktian Pancasila!" },
  { md: "10-02", emoji: "🎽", teks: () => "Selamat Hari Batik Nasional! Bangga berbatik." },
  { md: "10-16", emoji: "🍚", teks: () => "Selamat Hari Pangan Sedunia! Pangan cukup, gizi tercukupi." },
  { md: "10-28", emoji: "🔥", teks: () => "Selamat Hari Sumpah Pemuda! Satu nusa, satu bangsa." },
  { md: "11-10", emoji: "🎖️", teks: () => "Selamat Hari Pahlawan! Merawat semangat para pahlawan." },
  { md: "11-25", emoji: "🧑‍🏫", teks: () => "Selamat Hari Guru Nasional! Terima kasih para guru." },
  { md: "12-10", emoji: "🤝", teks: () => "Selamat Hari HAM Sedunia!" },
  { md: "12-22", emoji: "🌸", teks: () => "Selamat Hari Ibu! Terima kasih, Ibu 💗" },
  { md: "12-25", emoji: "🎄", teks: () => "Selamat Hari Natal bagi yang merayakan 🎄" },
];

export default function HariIstimewa() {
  const [holi, setHoli] = useState<string | null>(null);
  const [wetonMsg, setWetonMsg] = useState<string | null>(null);

  useEffect(() => {
    const today = isoJakarta(0);
    // Hari besar
    const md = today.slice(5);
    const y = Number(today.slice(0, 4));
    const hb = HARI_BESAR.find((x) => x.md === md);
    if (hb && localStorage.getItem("hi-h-" + today) !== "1") setHoli(`${hb.emoji} ${hb.teks(y)}`);

    // Weton
    if (localStorage.getItem("hi-w-" + today) === "1") return;
    fetch("/api/me/card", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const tl: string | undefined = d?.kartu?.tanggal_lahir;
        const lahir = tl ? weton(tl) : null;
        if (!lahir) return;
        const hariIni = weton(today);
        const besok = weton(isoJakarta(1));
        if (hariIni && lahir.full === hariIni.full) {
          setWetonMsg(`🌙 Hari ini weton kelahiranmu — ${lahir.full}. Cocok untuk puasa weton / introspeksi diri.`);
        } else if (besok && lahir.full === besok.full) {
          setWetonMsg(`🌙 Besok weton kelahiranmu — ${lahir.full}. Siap-siap ya, kalau mau puasa weton atau ada kegiatan.`);
        }
      })
      .catch(() => {});
  }, []);

  const tutup = (jenis: "h" | "w") => {
    localStorage.setItem("hi-" + jenis + "-" + isoJakarta(0), "1");
    if (jenis === "h") setHoli(null);
    else setWetonMsg(null);
  };

  if (!holi && !wetonMsg) return null;

  return (
    <div className="space-y-2">
      {holi && (
        <Banner
          onClose={() => tutup("h")}
          cls="border-gold-500/40 bg-gradient-to-r from-gold-500/15 to-emas-500/5 text-gold-100"
          text={holi}
        />
      )}
      {wetonMsg && (
        <Banner
          onClose={() => tutup("w")}
          cls="border-violet-500/40 bg-violet-500/10 text-violet-100"
          text={wetonMsg}
        />
      )}
    </div>
  );
}

function Banner({ text, cls, onClose }: { text: string; cls: string; onClose: () => void }) {
  return (
    <div className={"flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm " + cls}>
      <p className="min-w-0">{text}</p>
      <button
        onClick={onClose}
        aria-label="Tutup"
        className="shrink-0 rounded-md px-1.5 text-lg leading-none text-slate-300 hover:bg-white/10"
      >
        ×
      </button>
    </div>
  );
}
