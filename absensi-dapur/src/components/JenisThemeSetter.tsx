"use client";

import { useEffect } from "react";

/**
 * Menyetel atribut `data-jenis` pada <html> sesuai jenis unit pengguna
 * ('dapur' | 'perusahaan'). Untuk unit perusahaan, globals.css menimpa palet
 * ink (grafit) & gold (indigo) sehingga seluruh tampilan admin + karyawan
 * tampak "kantoran" tanpa menduplikasi komponen. Dibersihkan saat keluar dari
 * area yang memasangnya agar halaman lain (mis. login) kembali ke tema dapur.
 */
export default function JenisThemeSetter({ jenis }: { jenis: string }) {
  useEffect(() => {
    const el = document.documentElement;
    const prev = el.dataset.jenis;
    if (jenis === "perusahaan") el.dataset.jenis = "perusahaan";
    else delete el.dataset.jenis;
    return () => {
      if (prev) el.dataset.jenis = prev;
      else delete el.dataset.jenis;
    };
  }, [jenis]);
  return null;
}
