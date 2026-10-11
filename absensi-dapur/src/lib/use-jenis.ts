"use client";

import { createContext, createElement, useContext, useEffect, type ReactNode } from "react";

/**
 * Konteks jenis unit ('dapur' | 'perusahaan') yang disediakan server layout.
 * Dipakai komponen klien (dasbor, SOP, dll.) untuk menyesuaikan istilah/komponen
 * khas dapur — nilainya tersedia sinkron sejak render pertama (tanpa balapan
 * efek). JenisProvider juga menyetel atribut <html data-jenis> untuk tema CSS.
 */
const JenisContext = createContext<string>("dapur");

export function JenisProvider({ jenis, children }: { jenis: string; children: ReactNode }) {
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
  return createElement(JenisContext.Provider, { value: jenis || "dapur" }, children);
}

/** True bila unit yang sedang aktif = perusahaan/kantor. */
export function usePerusahaan(): boolean {
  return useContext(JenisContext) === "perusahaan";
}
