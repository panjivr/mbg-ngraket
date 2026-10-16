// Kumpulan kutipan penyemangat untuk staf dapur MBG — ditampilkan acak setiap
// kali staf melakukan absen. Diambil dari tokoh besar & filsuf, Al-Qur'an &
// hadis, para pengusaha/tokoh sukses, serta tokoh & peribahasa Nusantara.
import type { Quote } from "./quotes/_type";
import { FILSUF } from "./quotes/filsuf";
import { ISLAM } from "./quotes/islam";
import { PENGUSAHA } from "./quotes/pengusaha";
import { NUSANTARA } from "./quotes/nusantara";
import { KERJA } from "./quotes/kerja";
import { SUKSES } from "./quotes/sukses";
import { ETOS } from "./quotes/etos";
import { PETUAH } from "./quotes/petuah";

export type { Quote };

export const QUOTES: Quote[] = [
  ...FILSUF,
  ...ISLAM,
  ...PENGUSAHA,
  ...NUSANTARA,
  ...KERJA,
  ...SUKSES,
  ...ETOS,
  ...PETUAH,
];

// Kolam kutipan "membumi" — petuah kyai/orang tua desa, etos sederhana,
// peribahasa Nusantara, & nasihat agama. Bahasa ringan, cocok untuk kartu absen
// agar menyemangati semua kalangan (bukan kutipan filsuf/korporat yang berat).
export const QUOTES_DESA: Quote[] = [...PETUAH, ...ETOS, ...NUSANTARA, ...ISLAM];

/** Ambil satu kutipan acak (seluruh kolam). */
export function quoteAcak(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

/** Ambil satu kutipan acak bergaya "desa" (sederhana & membumi). */
export function quoteAcakDesa(): Quote {
  return QUOTES_DESA[Math.floor(Math.random() * QUOTES_DESA.length)];
}
