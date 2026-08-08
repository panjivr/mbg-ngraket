"use client";

import { useEffect, useState } from "react";

/**
 * Pengingat penggunaan APD (Alat Pelindung Diri) sebelum bertugas. Karena
 * dapur MBG memproduksi pangan untuk Badan Gizi Nasional, higienitas &
 * keselamatan pangan wajib — pegawai diingatkan mengenakan APD tiap hari.
 *
 * Tenang & profesional (bukan alarm): kartu dengan aksen hijau di sisi kiri,
 * ikon SVG (bukan emoji), teks memakai token slate yang otomatis menyesuaikan
 * tema gelap/terang. Bisa ditutup untuk hari ini (disimpan per-tanggal).
 */

const APD = ["Masker", "Penutup Kepala", "Celemek", "Sarung Tangan"];

function todayKey(): string {
  return "apd-dismiss-" + new Date().toLocaleDateString("en-CA");
}

export default function PengingatAPD() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      setShow(localStorage.getItem(todayKey()) !== "1");
    } catch {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(todayKey(), "1");
    } catch {}
    setShow(false);
  };

  return (
    <div className="card flex items-start gap-3 border-l-4 border-l-emerald-500 p-4">
      <span className="mt-0.5 shrink-0 text-emerald-500">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-100">Gunakan APD sebelum bertugas</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
          Demi higienitas &amp; keselamatan pangan Badan Gizi Nasional, pastikan APD lengkap dipakai.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {APD.map((a) => (
            <span
              key={a}
              className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400"
            >
              {a}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Tutup pengingat APD untuk hari ini"
        className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
