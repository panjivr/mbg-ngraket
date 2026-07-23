// Kumpulan kutipan penyemangat untuk staf dapur MBG — ditampilkan acak setiap
// kali staf melakukan absen. Diambil dari tokoh besar & filsuf, Al-Qur'an &
// hadis, para pengusaha/tokoh sukses, serta tokoh & peribahasa Nusantara.
import type { Quote } from "./quotes/_type";
import { FILSUF } from "./quotes/filsuf";
import { ISLAM } from "./quotes/islam";
import { PENGUSAHA } from "./quotes/pengusaha";
import { NUSANTARA } from "./quotes/nusantara";
import { KERJA } from "./quotes/kerja";

export type { Quote };

export const QUOTES: Quote[] = [
  ...FILSUF,
  ...ISLAM,
  ...PENGUSAHA,
  ...NUSANTARA,
  ...KERJA,
];

/** Ambil satu kutipan acak. */
export function quoteAcak(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}
