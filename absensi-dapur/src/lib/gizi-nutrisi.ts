/**
 * Basis data gizi bahan pangan untuk Generator Kandungan Gizi Ahli Gizi SPPG.
 * Nilai per 100 gram bagian yang dapat dimakan (BDD) — dikurasi dari Tabel
 * Komposisi Pangan Indonesia (TKPI/Kemenkes) & AKG Permenkes 28/2019.
 * Bebas dependensi server → aman dipakai di klien maupun server.
 *
 * Catatan: nilai adalah rata-rata acuan (bukan hasil uji lab per batch) dan
 * dibulatkan wajar untuk perencanaan menu, bukan klaim label pangan.
 */

export type KategoriBahan =
  | "pokok"
  | "hewani"
  | "nabati"
  | "sayur"
  | "buah"
  | "lainnya";

export const KATEGORI_LABEL: Record<KategoriBahan, string> = {
  pokok: "Makanan Pokok",
  hewani: "Lauk Hewani",
  nabati: "Lauk Nabati",
  sayur: "Sayuran",
  buah: "Buah",
  lainnya: "Bumbu & Lainnya",
};

/** Kandungan gizi per 100 g bagian dapat dimakan. */
export interface BahanGizi {
  id: string;
  nama: string;
  kategori: KategoriBahan;
  /** Energi (kkal). */
  energi: number;
  /** Protein (g). */
  protein: number;
  /** Lemak (g). */
  lemak: number;
  /** Karbohidrat (g). */
  karbo: number;
  /** Serat (g). */
  serat: number;
}

export const BAHAN_GIZI: BahanGizi[] = [
  // — Makanan Pokok —
  { id: "beras-putih", nama: "Beras putih (mentah)", kategori: "pokok", energi: 360, protein: 6.8, lemak: 0.7, karbo: 78.9, serat: 0.2 },
  { id: "nasi-putih", nama: "Nasi putih", kategori: "pokok", energi: 130, protein: 2.7, lemak: 0.3, karbo: 28, serat: 0.4 },
  { id: "beras-merah", nama: "Beras merah (mentah)", kategori: "pokok", energi: 352, protein: 7.5, lemak: 0.9, karbo: 76, serat: 0.8 },
  { id: "nasi-merah", nama: "Nasi merah", kategori: "pokok", energi: 110, protein: 2.3, lemak: 0.9, karbo: 23, serat: 1.1 },
  { id: "jagung-pipil", nama: "Jagung kuning pipil", kategori: "pokok", energi: 366, protein: 9.8, lemak: 7.3, karbo: 69, serat: 2.9 },
  { id: "jagung-rebus", nama: "Jagung manis rebus", kategori: "pokok", energi: 142, protein: 5.4, lemak: 1.3, karbo: 27, serat: 2.4 },
  { id: "ubi-jalar", nama: "Ubi jalar kuning", kategori: "pokok", energi: 119, protein: 1.8, lemak: 0.7, karbo: 27.9, serat: 3 },
  { id: "ubi-ungu", nama: "Ubi jalar ungu", kategori: "pokok", energi: 123, protein: 0.8, lemak: 0.9, karbo: 27, serat: 3 },
  { id: "singkong", nama: "Singkong", kategori: "pokok", energi: 154, protein: 1, lemak: 0.3, karbo: 36.8, serat: 1.8 },
  { id: "kentang", nama: "Kentang", kategori: "pokok", energi: 83, protein: 2, lemak: 0.1, karbo: 19.1, serat: 1.6 },
  { id: "talas", nama: "Talas", kategori: "pokok", energi: 98, protein: 1.9, lemak: 0.2, karbo: 23.7, serat: 2.5 },
  { id: "mie-basah", nama: "Mie basah", kategori: "pokok", energi: 138, protein: 4.5, lemak: 3.3, karbo: 21, serat: 1 },
  { id: "bihun", nama: "Bihun (kering)", kategori: "pokok", energi: 360, protein: 4.7, lemak: 0.1, karbo: 82, serat: 1 },
  { id: "roti-tawar", nama: "Roti tawar", kategori: "pokok", energi: 265, protein: 9, lemak: 3.2, karbo: 50, serat: 2.7 },
  { id: "terigu", nama: "Tepung terigu", kategori: "pokok", energi: 365, protein: 8.9, lemak: 1.3, karbo: 77.3, serat: 2.7 },
  { id: "oat", nama: "Havermut / oat", kategori: "pokok", energi: 389, protein: 16.9, lemak: 6.9, karbo: 66, serat: 10 },
  { id: "sagu", nama: "Tepung sagu", kategori: "pokok", energi: 355, protein: 0.7, lemak: 0.2, karbo: 84, serat: 0.5 },
  { id: "tapioka", nama: "Tepung tapioka", kategori: "pokok", energi: 358, protein: 0.5, lemak: 0.3, karbo: 88, serat: 0.4 },

  // — Lauk Hewani —
  { id: "ayam-daging", nama: "Ayam (daging + kulit)", kategori: "hewani", energi: 298, protein: 18.2, lemak: 25, karbo: 0, serat: 0 },
  { id: "dada-ayam", nama: "Dada ayam tanpa kulit", kategori: "hewani", energi: 165, protein: 31, lemak: 3.6, karbo: 0, serat: 0 },
  { id: "telur-ayam", nama: "Telur ayam", kategori: "hewani", energi: 154, protein: 12.4, lemak: 10.8, karbo: 0.7, serat: 0 },
  { id: "telur-bebek", nama: "Telur bebek", kategori: "hewani", energi: 185, protein: 13, lemak: 14, karbo: 1, serat: 0 },
  { id: "daging-sapi", nama: "Daging sapi", kategori: "hewani", energi: 250, protein: 26, lemak: 15, karbo: 0, serat: 0 },
  { id: "daging-kambing", nama: "Daging kambing", kategori: "hewani", energi: 154, protein: 16.6, lemak: 9.2, karbo: 0, serat: 0 },
  { id: "hati-ayam", nama: "Hati ayam", kategori: "hewani", energi: 261, protein: 27, lemak: 14, karbo: 1.4, serat: 0 },
  { id: "ati-ampela", nama: "Ati ampela ayam", kategori: "hewani", energi: 200, protein: 25, lemak: 10, karbo: 1, serat: 0 },
  { id: "ikan-lele", nama: "Ikan lele", kategori: "hewani", energi: 105, protein: 17, lemak: 4.5, karbo: 0, serat: 0 },
  { id: "ikan-tongkol", nama: "Ikan tongkol", kategori: "hewani", energi: 111, protein: 24, lemak: 1, karbo: 0, serat: 0 },
  { id: "ikan-kembung", nama: "Ikan kembung", kategori: "hewani", energi: 112, protein: 21.3, lemak: 2.2, karbo: 0, serat: 0 },
  { id: "ikan-bandeng", nama: "Ikan bandeng", kategori: "hewani", energi: 129, protein: 20, lemak: 4.8, karbo: 0, serat: 0 },
  { id: "ikan-nila", nama: "Ikan nila", kategori: "hewani", energi: 96, protein: 20, lemak: 1.7, karbo: 0, serat: 0 },
  { id: "ikan-tuna", nama: "Ikan tuna", kategori: "hewani", energi: 108, protein: 23, lemak: 1, karbo: 0, serat: 0 },
  { id: "ikan-tenggiri", nama: "Ikan tenggiri", kategori: "hewani", energi: 106, protein: 21.4, lemak: 1.4, karbo: 0, serat: 0 },
  { id: "ikan-teri", nama: "Ikan teri kering", kategori: "hewani", energi: 170, protein: 33, lemak: 3, karbo: 0, serat: 0 },
  { id: "udang", nama: "Udang segar", kategori: "hewani", energi: 91, protein: 21, lemak: 0.2, karbo: 0.1, serat: 0 },
  { id: "cumi", nama: "Cumi-cumi", kategori: "hewani", energi: 92, protein: 16, lemak: 1.4, karbo: 3, serat: 0 },
  { id: "bakso-sapi", nama: "Bakso sapi", kategori: "hewani", energi: 260, protein: 12, lemak: 20, karbo: 8, serat: 0 },
  { id: "sosis", nama: "Sosis", kategori: "hewani", energi: 250, protein: 13, lemak: 20, karbo: 5, serat: 0 },
  { id: "nugget", nama: "Nugget ayam", kategori: "hewani", energi: 245, protein: 14, lemak: 15, karbo: 14, serat: 1 },
  { id: "susu-sapi", nama: "Susu sapi segar", kategori: "hewani", energi: 61, protein: 3.2, lemak: 3.5, karbo: 4.3, serat: 0 },
  { id: "susu-bubuk", nama: "Susu bubuk full cream", kategori: "hewani", energi: 496, protein: 24, lemak: 30, karbo: 36, serat: 0 },
  { id: "keju", nama: "Keju", kategori: "hewani", energi: 326, protein: 22.8, lemak: 20.3, karbo: 13.1, serat: 0 },
  { id: "yogurt", nama: "Yogurt plain", kategori: "hewani", energi: 52, protein: 3.3, lemak: 2.5, karbo: 4, serat: 0 },

  // — Lauk Nabati —
  { id: "tahu", nama: "Tahu", kategori: "nabati", energi: 80, protein: 10.9, lemak: 4.7, karbo: 0.8, serat: 0.4 },
  { id: "tempe", nama: "Tempe kedelai", kategori: "nabati", energi: 201, protein: 20.8, lemak: 8.8, karbo: 13.5, serat: 1.4 },
  { id: "oncom", nama: "Oncom", kategori: "nabati", energi: 187, protein: 13, lemak: 6, karbo: 22, serat: 0 },
  { id: "kacang-tanah", nama: "Kacang tanah", kategori: "nabati", energi: 525, protein: 27.9, lemak: 42.8, karbo: 17.4, serat: 8.5 },
  { id: "kacang-hijau", nama: "Kacang hijau", kategori: "nabati", energi: 323, protein: 22.2, lemak: 1.5, karbo: 62.9, serat: 7.5 },
  { id: "kacang-merah", nama: "Kacang merah", kategori: "nabati", energi: 336, protein: 23.1, lemak: 1.7, karbo: 60, serat: 4 },
  { id: "kedelai", nama: "Kacang kedelai", kategori: "nabati", energi: 381, protein: 40.4, lemak: 16.7, karbo: 24.9, serat: 9 },
  { id: "kacang-polong", nama: "Kacang polong", kategori: "nabati", energi: 81, protein: 5, lemak: 0.4, karbo: 14, serat: 5 },
  { id: "kacang-mete", nama: "Kacang mete", kategori: "nabati", energi: 553, protein: 18, lemak: 44, karbo: 30, serat: 3.3 },
  { id: "susu-kedelai", nama: "Susu kedelai", kategori: "nabati", energi: 41, protein: 3.5, lemak: 2.5, karbo: 5, serat: 0 },
  { id: "emping", nama: "Emping melinjo", kategori: "nabati", energi: 360, protein: 12, lemak: 2, karbo: 72, serat: 0 },

  // — Sayuran —
  { id: "bayam", nama: "Bayam", kategori: "sayur", energi: 37, protein: 3.5, lemak: 0.5, karbo: 6.5, serat: 2.2 },
  { id: "kangkung", nama: "Kangkung", kategori: "sayur", energi: 29, protein: 3, lemak: 0.3, karbo: 5.4, serat: 2 },
  { id: "wortel", nama: "Wortel", kategori: "sayur", energi: 42, protein: 1.2, lemak: 0.3, karbo: 9.3, serat: 2.8 },
  { id: "brokoli", nama: "Brokoli", kategori: "sayur", energi: 34, protein: 2.8, lemak: 0.4, karbo: 7, serat: 2.6 },
  { id: "buncis", nama: "Buncis", kategori: "sayur", energi: 35, protein: 2.4, lemak: 0.2, karbo: 7.8, serat: 3.2 },
  { id: "kacang-panjang", nama: "Kacang panjang", kategori: "sayur", energi: 44, protein: 2.7, lemak: 0.3, karbo: 7.8, serat: 3 },
  { id: "kol", nama: "Kol / kubis", kategori: "sayur", energi: 25, protein: 1.4, lemak: 0.2, karbo: 5.8, serat: 2.5 },
  { id: "sawi-hijau", nama: "Sawi hijau", kategori: "sayur", energi: 22, protein: 2.3, lemak: 0.3, karbo: 4, serat: 2 },
  { id: "sawi-putih", nama: "Sawi putih", kategori: "sayur", energi: 15, protein: 1.2, lemak: 0.2, karbo: 2.2, serat: 1 },
  { id: "bunga-kol", nama: "Bunga kol", kategori: "sayur", energi: 25, protein: 2, lemak: 0.2, karbo: 5, serat: 2 },
  { id: "tomat", nama: "Tomat", kategori: "sayur", energi: 20, protein: 1, lemak: 0.3, karbo: 4.2, serat: 1.2 },
  { id: "terong", nama: "Terong", kategori: "sayur", energi: 24, protein: 1.1, lemak: 0.2, karbo: 5.5, serat: 3 },
  { id: "labu-siam", nama: "Labu siam", kategori: "sayur", energi: 26, protein: 0.6, lemak: 0.1, karbo: 6.7, serat: 1.7 },
  { id: "tauge", nama: "Tauge / kecambah", kategori: "sayur", energi: 50, protein: 5.7, lemak: 1.4, karbo: 6, serat: 1.8 },
  { id: "timun", nama: "Timun", kategori: "sayur", energi: 15, protein: 0.7, lemak: 0.1, karbo: 3.6, serat: 0.5 },
  { id: "daun-singkong", nama: "Daun singkong", kategori: "sayur", energi: 73, protein: 6.8, lemak: 1.2, karbo: 13, serat: 2.5 },
  { id: "daun-katuk", nama: "Daun katuk", kategori: "sayur", energi: 59, protein: 4.8, lemak: 1, karbo: 11, serat: 1.5 },
  { id: "jamur-tiram", nama: "Jamur tiram", kategori: "sayur", energi: 33, protein: 3.3, lemak: 0.4, karbo: 5, serat: 2.3 },
  { id: "pare", nama: "Pare", kategori: "sayur", energi: 29, protein: 1.1, lemak: 0.3, karbo: 6.6, serat: 2.8 },
  { id: "gambas", nama: "Gambas / oyong", kategori: "sayur", energi: 20, protein: 0.8, lemak: 0.2, karbo: 4.3, serat: 1.1 },
  { id: "nangka-muda", nama: "Nangka muda", kategori: "sayur", energi: 51, protein: 2, lemak: 0.4, karbo: 11.3, serat: 1.5 },

  // — Buah —
  { id: "pisang", nama: "Pisang", kategori: "buah", energi: 89, protein: 1.1, lemak: 0.3, karbo: 22.8, serat: 2.6 },
  { id: "pepaya", nama: "Pepaya", kategori: "buah", energi: 43, protein: 0.5, lemak: 0.1, karbo: 11, serat: 1.7 },
  { id: "jeruk", nama: "Jeruk", kategori: "buah", energi: 47, protein: 0.9, lemak: 0.1, karbo: 11.8, serat: 2.4 },
  { id: "apel", nama: "Apel", kategori: "buah", energi: 52, protein: 0.3, lemak: 0.2, karbo: 13.8, serat: 2.4 },
  { id: "mangga", nama: "Mangga", kategori: "buah", energi: 60, protein: 0.8, lemak: 0.4, karbo: 15, serat: 1.6 },
  { id: "semangka", nama: "Semangka", kategori: "buah", energi: 30, protein: 0.6, lemak: 0.2, karbo: 7.6, serat: 0.4 },
  { id: "melon", nama: "Melon", kategori: "buah", energi: 34, protein: 0.8, lemak: 0.2, karbo: 8.2, serat: 0.9 },
  { id: "nanas", nama: "Nanas", kategori: "buah", energi: 50, protein: 0.5, lemak: 0.1, karbo: 13.1, serat: 1.4 },
  { id: "salak", nama: "Salak", kategori: "buah", energi: 82, protein: 0.4, lemak: 0.4, karbo: 21, serat: 1.5 },
  { id: "jambu-biji", nama: "Jambu biji", kategori: "buah", energi: 68, protein: 2.6, lemak: 0.9, karbo: 14, serat: 5.4 },
  { id: "alpukat", nama: "Alpukat", kategori: "buah", energi: 160, protein: 2, lemak: 14.7, karbo: 8.5, serat: 6.7 },
  { id: "anggur", nama: "Anggur", kategori: "buah", energi: 67, protein: 0.6, lemak: 0.4, karbo: 17, serat: 0.9 },
  { id: "naga", nama: "Buah naga merah", kategori: "buah", energi: 60, protein: 1.1, lemak: 0.4, karbo: 13, serat: 3 },
  { id: "belimbing", nama: "Belimbing", kategori: "buah", energi: 31, protein: 1, lemak: 0.3, karbo: 6.7, serat: 2.8 },
  { id: "kelengkeng", nama: "Kelengkeng", kategori: "buah", energi: 60, protein: 1.3, lemak: 0.1, karbo: 15, serat: 1.1 },
  { id: "sawo", nama: "Sawo", kategori: "buah", energi: 92, protein: 0.5, lemak: 1.1, karbo: 20, serat: 5.3 },

  // — Bumbu & Lainnya —
  { id: "minyak-goreng", nama: "Minyak goreng", kategori: "lainnya", energi: 884, protein: 0, lemak: 100, karbo: 0, serat: 0 },
  { id: "margarin", nama: "Margarin", kategori: "lainnya", energi: 720, protein: 0.6, lemak: 81, karbo: 0.4, serat: 0 },
  { id: "santan", nama: "Santan kental", kategori: "lainnya", energi: 230, protein: 2.3, lemak: 24, karbo: 5.6, serat: 0 },
  { id: "kelapa-parut", nama: "Kelapa parut", kategori: "lainnya", energi: 354, protein: 3.3, lemak: 34.7, karbo: 10, serat: 9 },
  { id: "gula-pasir", nama: "Gula pasir", kategori: "lainnya", energi: 394, protein: 0, lemak: 0, karbo: 94, serat: 0 },
  { id: "gula-merah", nama: "Gula merah / aren", kategori: "lainnya", energi: 386, protein: 0, lemak: 0, karbo: 96, serat: 0 },
  { id: "madu", nama: "Madu", kategori: "lainnya", energi: 304, protein: 0.3, lemak: 0, karbo: 82, serat: 0.2 },
  { id: "kecap-manis", nama: "Kecap manis", kategori: "lainnya", energi: 60, protein: 5.7, lemak: 1.3, karbo: 9, serat: 0 },
  { id: "bawang-merah", nama: "Bawang merah", kategori: "lainnya", energi: 46, protein: 1.5, lemak: 0.3, karbo: 9.2, serat: 1.7 },
  { id: "bawang-putih", nama: "Bawang putih", kategori: "lainnya", energi: 112, protein: 4.5, lemak: 0.2, karbo: 23, serat: 2 },
];

export function getBahanGizi(id: string): BahanGizi | undefined {
  return BAHAN_GIZI.find((b) => b.id === id);
}

/**
 * Angka Kecukupan Gizi (AKG) harian per kelompok sasaran — acuan Permenkes
 * 28/2019. Nilai dipilih mewakili tiap kelompok sasaran program SPPG.
 */
export interface Sasaran {
  key: string;
  label: string;
  /** Energi (kkal/hari). */
  energi: number;
  /** Protein (g/hari). */
  protein: number;
  /** Lemak (g/hari). */
  lemak: number;
  /** Karbohidrat (g/hari). */
  karbo: number;
  /** Serat (g/hari). */
  serat: number;
}

export const SASARAN: Sasaran[] = [
  { key: "balita", label: "Balita (1–5 th)", energi: 1350, protein: 25, lemak: 45, karbo: 215, serat: 19 },
  { key: "sd13", label: "SD Kelas 1–3 (7–9 th)", energi: 1650, protein: 40, lemak: 55, karbo: 250, serat: 23 },
  { key: "sd46", label: "SD Kelas 4–6 (10–12 th)", energi: 2000, protein: 50, lemak: 65, karbo: 300, serat: 28 },
  { key: "smp", label: "SMP (13–15 th)", energi: 2400, protein: 70, lemak: 80, karbo: 350, serat: 34 },
  { key: "sma", label: "SMA (16–18 th)", energi: 2650, protein: 75, lemak: 85, karbo: 400, serat: 37 },
  { key: "bumil", label: "Ibu Hamil & Menyusui", energi: 2400, protein: 70, lemak: 75, karbo: 385, serat: 35 },
  { key: "dewasa", label: "Dewasa (19–29 th)", energi: 2650, protein: 65, lemak: 75, karbo: 430, serat: 37 },
];

export function getSasaran(key: string): Sasaran | undefined {
  return SASARAN.find((s) => s.key === key);
}

/**
 * Porsi satu kali makan pada program makan bergizi umumnya menargetkan sekitar
 * 30% dari AKG harian (satu waktu makan utama).
 */
export const MEAL_FRACTION = 0.3;
