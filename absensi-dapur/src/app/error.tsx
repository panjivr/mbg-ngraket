"use client";

import { useEffect } from "react";

/**
 * Error boundary per-segmen: bila sebuah halaman gagal dirender (mis. gangguan
 * sementara koneksi/DB), tampilkan pesan ramah + tombol coba lagi — bukan layar
 * mati/putih. Membuat situs terasa lebih tahan banting saat ada hambatan.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[page-error]", error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="card w-full max-w-md p-7 text-center">
        <p className="text-4xl">⚠️</p>
        <h1 className="mt-3 text-lg font-bold">Terjadi gangguan sementara</h1>
        <p className="mt-1 text-sm text-slate-400">
          Halaman gagal dimuat. Biasanya karena koneksi atau sistem sedang sibuk sesaat. Coba muat ulang.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button onClick={reset} className="btn-gold w-full py-2.5">Muat Ulang Halaman</button>
          <a href="/dapur" className="btn-ghost w-full py-2.5 text-sm">Kembali ke Beranda</a>
        </div>
      </div>
    </div>
  );
}
