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

  // ————————————————————————————————————————————————————————————
  // Tambahan bahan pangan (perluasan basis data) — nilai per 100 g BDD
  // ————————————————————————————————————————————————————————————

  // — Makanan Pokok (tambahan) —
  { id: "beras-ketan", nama: "Beras ketan putih", kategori: "pokok", energi: 362, protein: 6.7, lemak: 0.7, karbo: 79.4, serat: 0.4 },
  { id: "beras-ketan-hitam", nama: "Beras ketan hitam", kategori: "pokok", energi: 356, protein: 8, lemak: 1.3, karbo: 74.5, serat: 1.5 },
  { id: "sorgum", nama: "Sorgum / cantel", kategori: "pokok", energi: 366, protein: 11, lemak: 3.3, karbo: 73, serat: 6.7 },
  { id: "sukun", nama: "Sukun", kategori: "pokok", energi: 108, protein: 1.3, lemak: 0.3, karbo: 28.2, serat: 2 },
  { id: "gembili", nama: "Gembili", kategori: "pokok", energi: 95, protein: 1.5, lemak: 0.1, karbo: 22.4, serat: 1 },
  { id: "ganyong", nama: "Ganyong", kategori: "pokok", energi: 95, protein: 1, lemak: 0.1, karbo: 22.6, serat: 1 },
  { id: "kimpul", nama: "Kimpul", kategori: "pokok", energi: 145, protein: 1.2, lemak: 0.4, karbo: 34.2, serat: 1.5 },
  { id: "gadung", nama: "Gadung", kategori: "pokok", energi: 101, protein: 2.1, lemak: 0.2, karbo: 23, serat: 1 },
  { id: "kentang-kukus", nama: "Kentang rebus/kukus", kategori: "pokok", energi: 87, protein: 1.9, lemak: 0.1, karbo: 20.1, serat: 1.8 },
  { id: "ubi-jalar-putih", nama: "Ubi jalar putih", kategori: "pokok", energi: 123, protein: 1.5, lemak: 0.3, karbo: 28.8, serat: 3 },
  { id: "makaroni", nama: "Makaroni (kering)", kategori: "pokok", energi: 353, protein: 8.7, lemak: 0.4, karbo: 78.7, serat: 3 },
  { id: "spageti", nama: "Spageti (kering)", kategori: "pokok", energi: 352, protein: 12, lemak: 1.5, karbo: 71, serat: 3 },
  { id: "kwetiau", nama: "Kwetiau basah", kategori: "pokok", energi: 108, protein: 1.9, lemak: 0.2, karbo: 24.9, serat: 0.9 },
  { id: "mie-kering", nama: "Mie telur kering", kategori: "pokok", energi: 348, protein: 11, lemak: 5, karbo: 65, serat: 2.5 },
  { id: "mie-instan", nama: "Mie instan (kering)", kategori: "pokok", energi: 448, protein: 10, lemak: 18, karbo: 62, serat: 2 },
  { id: "roti-gandum", nama: "Roti gandum utuh", kategori: "pokok", energi: 247, protein: 13, lemak: 3.4, karbo: 41, serat: 7 },
  { id: "tepung-beras", nama: "Tepung beras", kategori: "pokok", energi: 364, protein: 7, lemak: 0.5, karbo: 80, serat: 2.4 },
  { id: "tepung-ketan", nama: "Tepung ketan", kategori: "pokok", energi: 361, protein: 6.7, lemak: 0.6, karbo: 79.7, serat: 0.9 },
  { id: "tepung-jagung", nama: "Tepung jagung / maizena", kategori: "pokok", energi: 343, protein: 0.3, lemak: 0, karbo: 85, serat: 0.9 },
  { id: "havermut-instan", nama: "Oat instan (matang)", kategori: "pokok", energi: 71, protein: 2.5, lemak: 1.5, karbo: 12, serat: 1.7 },
  { id: "bubur-nasi", nama: "Bubur nasi", kategori: "pokok", energi: 44, protein: 0.9, lemak: 0.1, karbo: 9.5, serat: 0.1 },
  { id: "lontong", nama: "Lontong / ketupat", kategori: "pokok", energi: 92, protein: 1.7, lemak: 0.2, karbo: 20.5, serat: 0.3 },
  { id: "biskuit", nama: "Biskuit gandum", kategori: "pokok", energi: 458, protein: 6.9, lemak: 14.4, karbo: 75.1, serat: 2.7 },
  { id: "kentang-goreng", nama: "Kentang goreng", kategori: "pokok", energi: 274, protein: 3.4, lemak: 14, karbo: 34, serat: 3.2 },

  // — Lauk Hewani (tambahan) —
  { id: "paha-ayam", nama: "Paha ayam tanpa kulit", kategori: "hewani", energi: 172, protein: 20, lemak: 9.4, karbo: 0, serat: 0 },
  { id: "sayap-ayam", nama: "Sayap ayam", kategori: "hewani", energi: 222, protein: 18, lemak: 16, karbo: 0, serat: 0 },
  { id: "ceker-ayam", nama: "Ceker ayam", kategori: "hewani", energi: 215, protein: 19.4, lemak: 14.6, karbo: 0.2, serat: 0 },
  { id: "daging-ayam-giling", nama: "Ayam giling", kategori: "hewani", energi: 143, protein: 17.4, lemak: 8.1, karbo: 0, serat: 0 },
  { id: "daging-sapi-giling", nama: "Daging sapi giling", kategori: "hewani", energi: 254, protein: 26, lemak: 16, karbo: 0, serat: 0 },
  { id: "daging-sapi-has", nama: "Daging sapi has dalam", kategori: "hewani", energi: 143, protein: 22, lemak: 5.5, karbo: 0, serat: 0 },
  { id: "hati-sapi", nama: "Hati sapi", kategori: "hewani", energi: 136, protein: 20, lemak: 3.8, karbo: 3.9, serat: 0 },
  { id: "babat-sapi", nama: "Babat sapi", kategori: "hewani", energi: 94, protein: 15, lemak: 4, karbo: 0, serat: 0 },
  { id: "iga-sapi", nama: "Iga sapi", kategori: "hewani", energi: 278, protein: 19, lemak: 22, karbo: 0, serat: 0 },
  { id: "daging-domba", nama: "Daging domba", kategori: "hewani", energi: 206, protein: 17, lemak: 15, karbo: 0, serat: 0 },
  { id: "telur-puyuh", nama: "Telur puyuh", kategori: "hewani", energi: 158, protein: 13, lemak: 11, karbo: 1, serat: 0 },
  { id: "putih-telur", nama: "Putih telur ayam", kategori: "hewani", energi: 50, protein: 10.8, lemak: 0.2, karbo: 0.7, serat: 0 },
  { id: "kuning-telur", nama: "Kuning telur ayam", kategori: "hewani", energi: 355, protein: 16.3, lemak: 31.9, karbo: 0.7, serat: 0 },
  { id: "ikan-mujair", nama: "Ikan mujair", kategori: "hewani", energi: 89, protein: 18.7, lemak: 1, karbo: 0, serat: 0 },
  { id: "ikan-gurame", nama: "Ikan gurame", kategori: "hewani", energi: 100, protein: 18, lemak: 3, karbo: 0, serat: 0 },
  { id: "ikan-patin", nama: "Ikan patin", kategori: "hewani", energi: 132, protein: 17, lemak: 6.6, karbo: 0, serat: 0 },
  { id: "ikan-kakap", nama: "Ikan kakap", kategori: "hewani", energi: 92, protein: 20, lemak: 0.7, karbo: 0, serat: 0 },
  { id: "ikan-salmon", nama: "Ikan salmon", kategori: "hewani", energi: 208, protein: 20, lemak: 13, karbo: 0, serat: 0 },
  { id: "ikan-sarden", nama: "Ikan sarden (kaleng)", kategori: "hewani", energi: 208, protein: 25, lemak: 11, karbo: 0, serat: 0 },
  { id: "ikan-asin", nama: "Ikan asin kering", kategori: "hewani", energi: 193, protein: 42, lemak: 1.5, karbo: 0, serat: 0 },
  { id: "ikan-pindang", nama: "Ikan pindang", kategori: "hewani", energi: 157, protein: 28, lemak: 4.5, karbo: 0, serat: 0 },
  { id: "kerang", nama: "Kerang", kategori: "hewani", energi: 74, protein: 12.8, lemak: 1, karbo: 3.6, serat: 0 },
  { id: "kepiting", nama: "Kepiting", kategori: "hewani", energi: 97, protein: 19, lemak: 1.5, karbo: 0, serat: 0 },
  { id: "udang-rebon", nama: "Udang rebon kering", kategori: "hewani", energi: 299, protein: 59.4, lemak: 3.6, karbo: 3.2, serat: 0 },
  { id: "belut", nama: "Belut", kategori: "hewani", energi: 303, protein: 14, lemak: 27, karbo: 0, serat: 0 },
  { id: "kornet-sapi", nama: "Kornet sapi", kategori: "hewani", energi: 250, protein: 16, lemak: 20, karbo: 1, serat: 0 },
  { id: "abon-sapi", nama: "Abon sapi", kategori: "hewani", energi: 212, protein: 18, lemak: 12, karbo: 8, serat: 1 },
  { id: "susu-kental-manis", nama: "Susu kental manis", kategori: "hewani", energi: 336, protein: 8.2, lemak: 10, karbo: 55, serat: 0 },
  { id: "susu-uht", nama: "Susu UHT full cream", kategori: "hewani", energi: 63, protein: 3.2, lemak: 3.6, karbo: 4.7, serat: 0 },
  { id: "es-krim", nama: "Es krim susu", kategori: "hewani", energi: 207, protein: 3.5, lemak: 11, karbo: 24, serat: 0 },

  // — Lauk Nabati (tambahan) —
  { id: "tahu-goreng", nama: "Tahu goreng", kategori: "nabati", energi: 271, protein: 17, lemak: 20, karbo: 6, serat: 1 },
  { id: "tempe-goreng", nama: "Tempe goreng", kategori: "nabati", energi: 225, protein: 18, lemak: 13, karbo: 12, serat: 1.4 },
  { id: "kacang-kedelai-rebus", nama: "Kedelai rebus", kategori: "nabati", energi: 141, protein: 12.4, lemak: 6.4, karbo: 9.9, serat: 4 },
  { id: "kacang-tanah-rebus", nama: "Kacang tanah rebus", kategori: "nabati", energi: 318, protein: 13.5, lemak: 22, karbo: 21, serat: 8 },
  { id: "kacang-almond", nama: "Kacang almond", kategori: "nabati", energi: 579, protein: 21, lemak: 50, karbo: 22, serat: 12.5 },
  { id: "kacang-kenari", nama: "Kacang kenari / walnut", kategori: "nabati", energi: 654, protein: 15, lemak: 65, karbo: 14, serat: 6.7 },
  { id: "kacang-bogor", nama: "Kacang bogor", kategori: "nabati", energi: 370, protein: 16, lemak: 6, karbo: 65, serat: 5 },
  { id: "kacang-koro", nama: "Kacang koro", kategori: "nabati", energi: 342, protein: 24, lemak: 1.5, karbo: 60, serat: 8 },
  { id: "biji-wijen", nama: "Biji wijen", kategori: "nabati", energi: 573, protein: 18, lemak: 50, karbo: 23, serat: 12 },
  { id: "biji-bunga-matahari", nama: "Biji bunga matahari (kuaci)", kategori: "nabati", energi: 584, protein: 21, lemak: 51, karbo: 20, serat: 8.6 },
  { id: "kacang-tolo", nama: "Kacang tolo / tunggak", kategori: "nabati", energi: 343, protein: 22, lemak: 1.4, karbo: 61, serat: 10 },
  { id: "tempe-gembus", nama: "Tempe gembus", kategori: "nabati", energi: 73, protein: 4.4, lemak: 2.2, karbo: 9.6, serat: 1.5 },
  { id: "kembang-tahu", nama: "Kembang tahu (kering)", kategori: "nabati", energi: 387, protein: 45, lemak: 20, karbo: 8, serat: 1 },

  // — Sayuran (tambahan) —
  { id: "daun-pepaya", nama: "Daun pepaya", kategori: "sayur", energi: 79, protein: 8, lemak: 2, karbo: 11.9, serat: 2 },
  { id: "daun-kelor", nama: "Daun kelor", kategori: "sayur", energi: 82, protein: 6.7, lemak: 1.7, karbo: 12.5, serat: 4.8 },
  { id: "daun-melinjo", nama: "Daun melinjo", kategori: "sayur", energi: 99, protein: 5, lemak: 1.3, karbo: 21, serat: 4 },
  { id: "selada", nama: "Selada", kategori: "sayur", energi: 15, protein: 1.2, lemak: 0.2, karbo: 2.9, serat: 1.3 },
  { id: "seledri", nama: "Seledri", kategori: "sayur", energi: 20, protein: 1, lemak: 0.1, karbo: 4.6, serat: 1.6 },
  { id: "daun-bawang", nama: "Daun bawang", kategori: "sayur", energi: 32, protein: 1.8, lemak: 0.3, karbo: 7, serat: 2.6 },
  { id: "kembang-kol", nama: "Kembang kol", kategori: "sayur", energi: 25, protein: 2, lemak: 0.3, karbo: 4.9, serat: 2 },
  { id: "kol-merah", nama: "Kol merah / ungu", kategori: "sayur", energi: 31, protein: 1.4, lemak: 0.2, karbo: 7.4, serat: 2.1 },
  { id: "paprika", nama: "Paprika", kategori: "sayur", energi: 31, protein: 1, lemak: 0.3, karbo: 6, serat: 2.1 },
  { id: "labu-kuning", nama: "Labu kuning", kategori: "sayur", energi: 26, protein: 1.1, lemak: 0.1, karbo: 6.6, serat: 0.5 },
  { id: "jagung-muda", nama: "Jagung muda / putren", kategori: "sayur", energi: 26, protein: 2.5, lemak: 0.2, karbo: 5, serat: 2 },
  { id: "kacang-kapri", nama: "Kacang kapri (polong muda)", kategori: "sayur", energi: 42, protein: 3, lemak: 0.2, karbo: 7.5, serat: 2.6 },
  { id: "rebung", nama: "Rebung", kategori: "sayur", energi: 27, protein: 2.6, lemak: 0.3, karbo: 5.2, serat: 2.2 },
  { id: "jamur-kancing", nama: "Jamur kancing", kategori: "sayur", energi: 22, protein: 3.1, lemak: 0.3, karbo: 3.3, serat: 1 },
  { id: "jamur-merang", nama: "Jamur merang", kategori: "sayur", energi: 34, protein: 3.8, lemak: 0.6, karbo: 4.5, serat: 2.5 },
  { id: "jamur-kuping", nama: "Jamur kuping", kategori: "sayur", energi: 25, protein: 1.5, lemak: 0.2, karbo: 6.7, serat: 5 },
  { id: "bit", nama: "Buah bit", kategori: "sayur", energi: 43, protein: 1.6, lemak: 0.2, karbo: 10, serat: 2.8 },
  { id: "lobak", nama: "Lobak", kategori: "sayur", energi: 16, protein: 0.7, lemak: 0.1, karbo: 3.4, serat: 1.6 },
  { id: "okra", nama: "Okra", kategori: "sayur", energi: 33, protein: 1.9, lemak: 0.2, karbo: 7.5, serat: 3.2 },
  { id: "leunca", nama: "Leunca", kategori: "sayur", energi: 45, protein: 4.7, lemak: 0.5, karbo: 8.1, serat: 2 },
  { id: "kecipir", nama: "Kecipir (polong)", kategori: "sayur", energi: 49, protein: 4, lemak: 0.9, karbo: 7.8, serat: 2.6 },
  { id: "genjer", nama: "Genjer", kategori: "sayur", energi: 39, protein: 1.7, lemak: 0.2, karbo: 7.7, serat: 2.5 },
  { id: "kubis-brussel", nama: "Kubis brussel", kategori: "sayur", energi: 43, protein: 3.4, lemak: 0.3, karbo: 9, serat: 3.8 },

  // — Buah (tambahan) —
  { id: "jambu-air", nama: "Jambu air", kategori: "buah", energi: 46, protein: 0.6, lemak: 0.2, karbo: 11.8, serat: 1.5 },
  { id: "jeruk-bali", nama: "Jeruk bali", kategori: "buah", energi: 48, protein: 0.6, lemak: 0.1, karbo: 12.4, serat: 1.5 },
  { id: "duku", nama: "Duku", kategori: "buah", energi: 63, protein: 1, lemak: 0.2, karbo: 16, serat: 4.3 },
  { id: "rambutan", nama: "Rambutan", kategori: "buah", energi: 69, protein: 0.9, lemak: 0.1, karbo: 18, serat: 0.9 },
  { id: "manggis", nama: "Manggis", kategori: "buah", energi: 63, protein: 0.6, lemak: 0.6, karbo: 15.6, serat: 1.5 },
  { id: "durian", nama: "Durian", kategori: "buah", energi: 147, protein: 1.5, lemak: 5.3, karbo: 27.1, serat: 3.8 },
  { id: "nangka-masak", nama: "Nangka masak", kategori: "buah", energi: 95, protein: 1.7, lemak: 0.6, karbo: 23.5, serat: 1.5 },
  { id: "sirsak", nama: "Sirsak", kategori: "buah", energi: 65, protein: 1, lemak: 0.3, karbo: 16.3, serat: 3.3 },
  { id: "srikaya", nama: "Srikaya", kategori: "buah", energi: 94, protein: 2.1, lemak: 0.3, karbo: 24, serat: 4.4 },
  { id: "markisa", nama: "Markisa", kategori: "buah", energi: 97, protein: 2.2, lemak: 0.7, karbo: 23, serat: 10.4 },
  { id: "stroberi", nama: "Stroberi", kategori: "buah", energi: 32, protein: 0.7, lemak: 0.3, karbo: 7.7, serat: 2 },
  { id: "kiwi", nama: "Kiwi", kategori: "buah", energi: 61, protein: 1.1, lemak: 0.5, karbo: 15, serat: 3 },
  { id: "pir", nama: "Pir", kategori: "buah", energi: 57, protein: 0.4, lemak: 0.1, karbo: 15.2, serat: 3.1 },
  { id: "buah-naga-putih", nama: "Buah naga putih", kategori: "buah", energi: 45, protein: 0.5, lemak: 0.1, karbo: 11, serat: 2 },
  { id: "kurma", nama: "Kurma", kategori: "buah", energi: 277, protein: 1.8, lemak: 0.2, karbo: 75, serat: 6.7 },
  { id: "kelapa-muda", nama: "Daging kelapa muda", kategori: "buah", energi: 68, protein: 1, lemak: 4.7, karbo: 6.7, serat: 2.5 },
  { id: "delima", nama: "Delima", kategori: "buah", energi: 83, protein: 1.7, lemak: 1.2, karbo: 19, serat: 4 },
  { id: "cempedak", nama: "Cempedak", kategori: "buah", energi: 116, protein: 3, lemak: 0.4, karbo: 28.2, serat: 3.4 },
  { id: "kesemek", nama: "Kesemek", kategori: "buah", energi: 78, protein: 0.6, lemak: 0.4, karbo: 20, serat: 3.6 },
  { id: "matoa", nama: "Matoa", kategori: "buah", energi: 62, protein: 1.2, lemak: 0.3, karbo: 15, serat: 1.2 },

  // — Bumbu & Lainnya (tambahan) —
  { id: "minyak-kelapa", nama: "Minyak kelapa", kategori: "lainnya", energi: 862, protein: 0, lemak: 100, karbo: 0, serat: 0 },
  { id: "minyak-zaitun", nama: "Minyak zaitun", kategori: "lainnya", energi: 884, protein: 0, lemak: 100, karbo: 0, serat: 0 },
  { id: "mentega", nama: "Mentega (butter)", kategori: "lainnya", energi: 717, protein: 0.9, lemak: 81, karbo: 0.1, serat: 0 },
  { id: "santan-encer", nama: "Santan encer", kategori: "lainnya", energi: 122, protein: 1.2, lemak: 10, karbo: 7.6, serat: 0 },
  { id: "cabai-merah", nama: "Cabai merah", kategori: "lainnya", energi: 40, protein: 2, lemak: 0.3, karbo: 8.8, serat: 1.5 },
  { id: "cabai-rawit", nama: "Cabai rawit", kategori: "lainnya", energi: 103, protein: 4.7, lemak: 2.4, karbo: 19.9, serat: 6.8 },
  { id: "jahe", nama: "Jahe", kategori: "lainnya", energi: 51, protein: 1.5, lemak: 1, karbo: 10.1, serat: 2 },
  { id: "kunyit", nama: "Kunyit", kategori: "lainnya", energi: 63, protein: 2, lemak: 2.7, karbo: 9.1, serat: 2.6 },
  { id: "lengkuas", nama: "Lengkuas", kategori: "lainnya", energi: 45, protein: 1.1, lemak: 0.3, karbo: 9.8, serat: 2 },
  { id: "kemiri", nama: "Kemiri", kategori: "lainnya", energi: 636, protein: 19, lemak: 63, karbo: 8, serat: 3 },
  { id: "kecap-asin", nama: "Kecap asin", kategori: "lainnya", energi: 53, protein: 8, lemak: 0.6, karbo: 4.9, serat: 0.8 },
  { id: "saus-tomat", nama: "Saus tomat", kategori: "lainnya", energi: 92, protein: 1.6, lemak: 0.2, karbo: 22, serat: 1 },
  { id: "saus-sambal", nama: "Saus sambal", kategori: "lainnya", energi: 93, protein: 1.3, lemak: 0.5, karbo: 22, serat: 1.5 },
  { id: "terasi", nama: "Terasi udang", kategori: "lainnya", energi: 155, protein: 30, lemak: 3.5, karbo: 3.5, serat: 0 },
  { id: "garam", nama: "Garam", kategori: "lainnya", energi: 0, protein: 0, lemak: 0, karbo: 0, serat: 0 },
  { id: "tepung-roti", nama: "Tepung roti / panir", kategori: "lainnya", energi: 395, protein: 13, lemak: 5, karbo: 72, serat: 4 },
  { id: "cokelat-bubuk", nama: "Cokelat bubuk", kategori: "lainnya", energi: 228, protein: 20, lemak: 14, karbo: 58, serat: 33 },
  { id: "selai-kacang", nama: "Selai kacang", kategori: "lainnya", energi: 588, protein: 25, lemak: 50, karbo: 20, serat: 6 },
  { id: "asam-jawa", nama: "Asam jawa", kategori: "lainnya", energi: 239, protein: 2.8, lemak: 0.6, karbo: 62.5, serat: 5.1 },
  { id: "gula-jagung", nama: "Sirup / gula jagung", kategori: "lainnya", energi: 281, protein: 0, lemak: 0, karbo: 76, serat: 0 },

  // ————————————————————————————————————————————————————————————
  // Perluasan lanjutan — melengkapi bahan menu MBG (per 100 g BDD)
  // ————————————————————————————————————————————————————————————

  // — Makanan Pokok (lanjutan) —
  { id: "nasi-goreng", nama: "Nasi goreng", kategori: "pokok", energi: 168, protein: 3, lemak: 6, karbo: 25, serat: 0.7 },
  { id: "nasi-uduk", nama: "Nasi uduk", kategori: "pokok", energi: 189, protein: 3, lemak: 7, karbo: 28, serat: 0.6 },
  { id: "nasi-jagung", nama: "Nasi jagung", kategori: "pokok", energi: 120, protein: 3, lemak: 1, karbo: 24, serat: 2 },
  { id: "beras-jagung", nama: "Beras jagung (mentah)", kategori: "pokok", energi: 345, protein: 8, lemak: 3.9, karbo: 72, serat: 4 },
  { id: "jali", nama: "Jali / hanjeli", kategori: "pokok", energi: 356, protein: 12, lemak: 6, karbo: 70, serat: 1 },
  { id: "soun", nama: "Soun (kering)", kategori: "pokok", energi: 351, protein: 0.1, lemak: 0.1, karbo: 86, serat: 0.5 },
  { id: "misoa", nama: "Misoa (kering)", kategori: "pokok", energi: 348, protein: 9, lemak: 1, karbo: 72, serat: 2 },
  { id: "lasagna", nama: "Lasagna / pasta lembar (kering)", kategori: "pokok", energi: 352, protein: 12, lemak: 1.5, karbo: 71, serat: 3 },
  { id: "roti-manis", nama: "Roti manis", kategori: "pokok", energi: 280, protein: 8, lemak: 6, karbo: 50, serat: 2 },
  { id: "bakpao", nama: "Bakpao (kulit)", kategori: "pokok", energi: 230, protein: 6, lemak: 3, karbo: 44, serat: 1.5 },
  { id: "donat", nama: "Donat", kategori: "pokok", energi: 434, protein: 6, lemak: 25, karbo: 45, serat: 2 },
  { id: "kerupuk-udang", nama: "Kerupuk udang (mentah)", kategori: "pokok", energi: 350, protein: 6, lemak: 0.5, karbo: 78, serat: 0.5 },
  { id: "kerupuk-aci", nama: "Kerupuk aci / putih (mentah)", kategori: "pokok", energi: 360, protein: 1, lemak: 0.3, karbo: 85, serat: 0.3 },
  { id: "gaplek", nama: "Gaplek singkong", kategori: "pokok", energi: 338, protein: 1.5, lemak: 0.7, karbo: 81, serat: 3 },
  { id: "tiwul", nama: "Tiwul", kategori: "pokok", energi: 165, protein: 1, lemak: 0.5, karbo: 38, serat: 2 },
  { id: "ubi-cilembu", nama: "Ubi cilembu", kategori: "pokok", energi: 130, protein: 1.6, lemak: 0.3, karbo: 31, serat: 3 },
  { id: "kentang-tumbuk", nama: "Kentang tumbuk (mashed)", kategori: "pokok", energi: 88, protein: 2, lemak: 0.1, karbo: 20, serat: 1.5 },

  // — Lauk Hewani (lanjutan) —
  { id: "ayam-kampung", nama: "Ayam kampung", kategori: "hewani", energi: 246, protein: 27, lemak: 15, karbo: 0, serat: 0 },
  { id: "daging-bebek", nama: "Daging bebek", kategori: "hewani", energi: 337, protein: 19, lemak: 28, karbo: 0, serat: 0 },
  { id: "daging-kalkun", nama: "Daging kalkun", kategori: "hewani", energi: 189, protein: 29, lemak: 7, karbo: 0, serat: 0 },
  { id: "usus-ayam", nama: "Usus ayam", kategori: "hewani", energi: 170, protein: 14, lemak: 12, karbo: 0, serat: 0 },
  { id: "lidah-sapi", nama: "Lidah sapi", kategori: "hewani", energi: 224, protein: 15, lemak: 19, karbo: 0, serat: 0 },
  { id: "paru-sapi", nama: "Paru sapi", kategori: "hewani", energi: 92, protein: 16.5, lemak: 2.5, karbo: 0, serat: 0 },
  { id: "jantung-sapi", nama: "Jantung sapi", kategori: "hewani", energi: 112, protein: 17, lemak: 3.9, karbo: 0.1, serat: 0 },
  { id: "otak-sapi", nama: "Otak sapi", kategori: "hewani", energi: 143, protein: 10, lemak: 11, karbo: 1, serat: 0 },
  { id: "kikil", nama: "Kikil (kulit sapi)", kategori: "hewani", energi: 224, protein: 25, lemak: 13, karbo: 0, serat: 0 },
  { id: "dendeng-sapi", nama: "Dendeng sapi", kategori: "hewani", energi: 340, protein: 40, lemak: 18, karbo: 2, serat: 0 },
  { id: "smoked-beef", nama: "Daging asap (smoked beef)", kategori: "hewani", energi: 250, protein: 18, lemak: 18, karbo: 1, serat: 0 },
  { id: "ikan-mas", nama: "Ikan mas", kategori: "hewani", energi: 130, protein: 16, lemak: 6, karbo: 0, serat: 0 },
  { id: "ikan-gabus", nama: "Ikan gabus", kategori: "hewani", energi: 74, protein: 16, lemak: 0.7, karbo: 0, serat: 0 },
  { id: "ikan-dori", nama: "Ikan dori (fillet)", kategori: "hewani", energi: 82, protein: 17, lemak: 1.5, karbo: 0, serat: 0 },
  { id: "ikan-cakalang", nama: "Ikan cakalang", kategori: "hewani", energi: 109, protein: 24, lemak: 0.5, karbo: 0, serat: 0 },
  { id: "ikan-layang", nama: "Ikan layang", kategori: "hewani", energi: 109, protein: 22, lemak: 1.7, karbo: 0, serat: 0 },
  { id: "ikan-selar", nama: "Ikan selar", kategori: "hewani", energi: 122, protein: 20, lemak: 4, karbo: 0, serat: 0 },
  { id: "ikan-kakap-merah", nama: "Ikan kakap merah", kategori: "hewani", energi: 100, protein: 20, lemak: 1, karbo: 0, serat: 0 },
  { id: "ikan-baronang", nama: "Ikan baronang", kategori: "hewani", energi: 105, protein: 19, lemak: 2.5, karbo: 0, serat: 0 },
  { id: "ikan-marlin", nama: "Ikan marlin", kategori: "hewani", energi: 110, protein: 23, lemak: 1.5, karbo: 0, serat: 0 },
  { id: "bandeng-presto", nama: "Bandeng presto", kategori: "hewani", energi: 133, protein: 17, lemak: 6, karbo: 0, serat: 0 },
  { id: "teri-medan", nama: "Teri medan (kering)", kategori: "hewani", energi: 170, protein: 33, lemak: 3, karbo: 0, serat: 0 },
  { id: "ebi", nama: "Ebi (udang kering)", kategori: "hewani", energi: 299, protein: 62, lemak: 2, karbo: 0, serat: 0 },
  { id: "rajungan", nama: "Rajungan", kategori: "hewani", energi: 84, protein: 18, lemak: 0.7, karbo: 0, serat: 0 },
  { id: "lobster", nama: "Lobster", kategori: "hewani", energi: 90, protein: 19, lemak: 0.9, karbo: 0, serat: 0 },
  { id: "tiram", nama: "Tiram", kategori: "hewani", energi: 68, protein: 7, lemak: 2, karbo: 4, serat: 0 },
  { id: "telur-asin", nama: "Telur asin (bebek)", kategori: "hewani", energi: 195, protein: 13.6, lemak: 13.6, karbo: 1.4, serat: 0 },

  // — Lauk Nabati (lanjutan) —
  { id: "tahu-sutra", nama: "Tahu sutra", kategori: "nabati", energi: 55, protein: 5, lemak: 3, karbo: 2, serat: 0.2 },
  { id: "petai", nama: "Petai", kategori: "nabati", energi: 142, protein: 10, lemak: 2, karbo: 22, serat: 2 },
  { id: "jengkol", nama: "Jengkol", kategori: "nabati", energi: 165, protein: 14, lemak: 1.5, karbo: 28, serat: 1 },
  { id: "edamame", nama: "Edamame (kedelai muda)", kategori: "nabati", energi: 122, protein: 11, lemak: 5, karbo: 9, serat: 5 },
  { id: "kacang-gude", nama: "Kacang gude", kategori: "nabati", energi: 336, protein: 20, lemak: 1.4, karbo: 62, serat: 8 },
  { id: "kacang-koro-benguk", nama: "Kara benguk", kategori: "nabati", energi: 330, protein: 24, lemak: 2, karbo: 58, serat: 7 },
  { id: "kacang-fava", nama: "Kacang babi / fava", kategori: "nabati", energi: 341, protein: 26, lemak: 1.5, karbo: 58, serat: 25 },
  { id: "lentil", nama: "Kacang lentil", kategori: "nabati", energi: 116, protein: 9, lemak: 0.4, karbo: 20, serat: 8 },
  { id: "tepung-kedelai", nama: "Tepung kedelai", kategori: "nabati", energi: 436, protein: 35, lemak: 20, karbo: 35, serat: 9 },
  { id: "susu-almond", nama: "Susu almond", kategori: "nabati", energi: 15, protein: 0.6, lemak: 1.2, karbo: 0.6, serat: 0.3 },

  // — Sayuran (lanjutan) —
  { id: "pakcoy", nama: "Pakcoy / bok choy", kategori: "sayur", energi: 13, protein: 1.5, lemak: 0.2, karbo: 2.2, serat: 1 },
  { id: "kailan", nama: "Kailan", kategori: "sayur", energi: 30, protein: 2.5, lemak: 0.4, karbo: 5, serat: 2.5 },
  { id: "asparagus", nama: "Asparagus", kategori: "sayur", energi: 20, protein: 2.2, lemak: 0.1, karbo: 3.9, serat: 2.1 },
  { id: "zukini", nama: "Zukini", kategori: "sayur", energi: 17, protein: 1.2, lemak: 0.3, karbo: 3.1, serat: 1 },
  { id: "kale", nama: "Kale", kategori: "sayur", energi: 49, protein: 4.3, lemak: 0.9, karbo: 9, serat: 3.6 },
  { id: "bunga-pepaya", nama: "Bunga pepaya", kategori: "sayur", energi: 45, protein: 4, lemak: 1, karbo: 8, serat: 2 },
  { id: "jantung-pisang", nama: "Jantung pisang", kategori: "sayur", energi: 56, protein: 1.6, lemak: 0.3, karbo: 12, serat: 3 },
  { id: "kluwih", nama: "Kluwih (muda)", kategori: "sayur", energi: 111, protein: 1.5, lemak: 0.3, karbo: 27, serat: 2 },
  { id: "kenikir", nama: "Daun kenikir", kategori: "sayur", energi: 40, protein: 3, lemak: 0.5, karbo: 7, serat: 2.5 },
  { id: "kemangi", nama: "Daun kemangi", kategori: "sayur", energi: 45, protein: 3.2, lemak: 0.6, karbo: 8, serat: 4 },
  { id: "takokak", nama: "Takokak / rimbang", kategori: "sayur", energi: 45, protein: 2, lemak: 0.5, karbo: 8, serat: 3 },
  { id: "kecombrang", nama: "Kecombrang", kategori: "sayur", energi: 34, protein: 1.6, lemak: 0.4, karbo: 7, serat: 2 },
  { id: "daun-labu", nama: "Daun / pucuk labu", kategori: "sayur", energi: 19, protein: 3, lemak: 0.4, karbo: 2.3, serat: 2 },
  { id: "bunga-turi", nama: "Bunga turi", kategori: "sayur", energi: 27, protein: 1.4, lemak: 0.4, karbo: 6, serat: 3 },
  { id: "sawi-asin", nama: "Sawi asin", kategori: "sayur", energi: 20, protein: 1.7, lemak: 0.3, karbo: 3.5, serat: 2 },

  // — Buah (lanjutan) —
  { id: "kedondong", nama: "Kedondong", kategori: "buah", energi: 60, protein: 0.9, lemak: 0.1, karbo: 15, serat: 2 },
  { id: "jambu-bol", nama: "Jambu bol", kategori: "buah", energi: 56, protein: 0.6, lemak: 0.3, karbo: 14, serat: 1.5 },
  { id: "kolang-kaling", nama: "Kolang-kaling", kategori: "buah", energi: 27, protein: 0.4, lemak: 0.2, karbo: 6, serat: 2 },
  { id: "blewah", nama: "Blewah", kategori: "buah", energi: 34, protein: 0.8, lemak: 0.2, karbo: 8, serat: 0.9 },
  { id: "terong-belanda", nama: "Terong belanda (tamarillo)", kategori: "buah", energi: 50, protein: 2, lemak: 0.4, karbo: 9, serat: 3.3 },
  { id: "kismis", nama: "Kismis", kategori: "buah", energi: 299, protein: 3, lemak: 0.5, karbo: 79, serat: 3.7 },
  { id: "buah-tin", nama: "Buah tin (fig)", kategori: "buah", energi: 74, protein: 0.8, lemak: 0.3, karbo: 19, serat: 2.9 },
  { id: "ceri", nama: "Ceri", kategori: "buah", energi: 63, protein: 1, lemak: 0.2, karbo: 16, serat: 2.1 },
  { id: "blueberry", nama: "Blueberry", kategori: "buah", energi: 57, protein: 0.7, lemak: 0.3, karbo: 14, serat: 2.4 },
  { id: "plum", nama: "Plum", kategori: "buah", energi: 46, protein: 0.7, lemak: 0.3, karbo: 11, serat: 1.4 },
  { id: "aprikot", nama: "Aprikot", kategori: "buah", energi: 48, protein: 1.4, lemak: 0.4, karbo: 11, serat: 2 },
  { id: "pisang-kepok", nama: "Pisang kepok", kategori: "buah", energi: 115, protein: 1.2, lemak: 0.4, karbo: 31, serat: 2.3 },
  { id: "lemon", nama: "Lemon", kategori: "buah", energi: 29, protein: 1.1, lemak: 0.3, karbo: 9, serat: 2.8 },

  // — Bumbu & Lainnya (lanjutan) —
  { id: "bawang-bombay", nama: "Bawang bombay", kategori: "lainnya", energi: 40, protein: 1.1, lemak: 0.1, karbo: 9.3, serat: 1.7 },
  { id: "cabai-hijau", nama: "Cabai hijau besar", kategori: "lainnya", energi: 23, protein: 1, lemak: 0.3, karbo: 5, serat: 1.5 },
  { id: "cabai-bubuk", nama: "Cabai bubuk", kategori: "lainnya", energi: 282, protein: 13, lemak: 14, karbo: 50, serat: 35 },
  { id: "ketumbar", nama: "Ketumbar (biji)", kategori: "lainnya", energi: 298, protein: 12, lemak: 17, karbo: 55, serat: 42 },
  { id: "merica", nama: "Merica / lada", kategori: "lainnya", energi: 251, protein: 10, lemak: 3.3, karbo: 64, serat: 25 },
  { id: "pala", nama: "Pala", kategori: "lainnya", energi: 525, protein: 6, lemak: 36, karbo: 49, serat: 21 },
  { id: "kayu-manis", nama: "Kayu manis", kategori: "lainnya", energi: 247, protein: 4, lemak: 1.2, karbo: 81, serat: 53 },
  { id: "cengkeh", nama: "Cengkeh", kategori: "lainnya", energi: 274, protein: 6, lemak: 13, karbo: 65, serat: 34 },
  { id: "kapulaga", nama: "Kapulaga", kategori: "lainnya", energi: 311, protein: 11, lemak: 7, karbo: 68, serat: 28 },
  { id: "jintan", nama: "Jintan", kategori: "lainnya", energi: 375, protein: 18, lemak: 22, karbo: 44, serat: 11 },
  { id: "daun-salam", nama: "Daun salam", kategori: "lainnya", energi: 313, protein: 8, lemak: 8, karbo: 75, serat: 26 },
  { id: "daun-jeruk", nama: "Daun jeruk", kategori: "lainnya", energi: 100, protein: 5, lemak: 2, karbo: 18, serat: 10 },
  { id: "serai", nama: "Serai / sereh", kategori: "lainnya", energi: 99, protein: 1.8, lemak: 0.5, karbo: 25, serat: 0 },
  { id: "kencur", nama: "Kencur", kategori: "lainnya", energi: 80, protein: 1.7, lemak: 0.5, karbo: 18, serat: 2 },
  { id: "daun-pandan", nama: "Daun pandan", kategori: "lainnya", energi: 84, protein: 2, lemak: 0.5, karbo: 18, serat: 4 },
  { id: "tauco", nama: "Tauco", kategori: "lainnya", energi: 150, protein: 9, lemak: 5, karbo: 16, serat: 3 },
  { id: "petis", nama: "Petis udang", kategori: "lainnya", energi: 200, protein: 8, lemak: 1, karbo: 40, serat: 1 },
  { id: "cuka", nama: "Cuka makan", kategori: "lainnya", energi: 18, protein: 0, lemak: 0, karbo: 0.9, serat: 0 },
  { id: "saus-tiram", nama: "Saus tiram", kategori: "lainnya", energi: 51, protein: 2, lemak: 0.3, karbo: 11, serat: 0.3 },
  { id: "saus-inggris", nama: "Saus inggris (worcester)", kategori: "lainnya", energi: 78, protein: 0, lemak: 0, karbo: 19, serat: 0 },
  { id: "mayones", nama: "Mayones", kategori: "lainnya", energi: 680, protein: 1, lemak: 75, karbo: 2, serat: 0 },
  { id: "mustard", nama: "Mustard", kategori: "lainnya", energi: 66, protein: 4, lemak: 3, karbo: 5, serat: 3 },
  { id: "kaldu-bubuk", nama: "Kaldu bubuk", kategori: "lainnya", energi: 200, protein: 12, lemak: 8, karbo: 22, serat: 1 },
  { id: "minyak-wijen", nama: "Minyak wijen", kategori: "lainnya", energi: 884, protein: 0, lemak: 100, karbo: 0, serat: 0 },
  { id: "santan-bubuk", nama: "Santan bubuk (instan)", kategori: "lainnya", energi: 600, protein: 6, lemak: 62, karbo: 22, serat: 2 },
  { id: "krimer", nama: "Krimer nabati (creamer)", kategori: "lainnya", energi: 545, protein: 2, lemak: 33, karbo: 58, serat: 0 },
  { id: "meses", nama: "Meses cokelat", kategori: "lainnya", energi: 480, protein: 4, lemak: 25, karbo: 62, serat: 3 },
  { id: "selai-buah", nama: "Selai buah (jam)", kategori: "lainnya", energi: 250, protein: 0.4, lemak: 0.1, karbo: 65, serat: 1 },
  { id: "agar-agar", nama: "Agar-agar bubuk", kategori: "lainnya", energi: 26, protein: 0.5, lemak: 0, karbo: 6.8, serat: 6 },
  { id: "ragi", nama: "Ragi instan", kategori: "lainnya", energi: 325, protein: 40, lemak: 7.6, karbo: 41, serat: 27 },
  { id: "baking-powder", nama: "Baking powder", kategori: "lainnya", energi: 53, protein: 0, lemak: 0, karbo: 28, serat: 0.2 },
  { id: "vanili", nama: "Vanili bubuk", kategori: "lainnya", energi: 288, protein: 0.1, lemak: 0.1, karbo: 13, serat: 0 },
  { id: "kopi-bubuk", nama: "Kopi bubuk", kategori: "lainnya", energi: 129, protein: 12, lemak: 4, karbo: 40, serat: 0 },
  { id: "gula-halus", nama: "Gula halus", kategori: "lainnya", energi: 389, protein: 0, lemak: 0, karbo: 99.8, serat: 0 },
  { id: "air-kelapa", nama: "Air kelapa", kategori: "lainnya", energi: 19, protein: 0.7, lemak: 0.2, karbo: 3.7, serat: 1.1 },
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

// ————————————————————————————————————————————————————————————————
// Estimasi gizi dari daftar bahan menu (dipakai kalkulator "hitung gizi").
// Bebas server; hasilnya estimasi perencanaan, bukan uji lab.
// ————————————————————————————————————————————————————————————————

/**
 * Konversi jumlah bahan (pada satuan tertentu) menjadi gram.
 * Mengembalikan null bila satuan tak bisa diperkirakan (mis. "buah", "ikat")
 * — bahan itu dilewati agar total gizi tak salah.
 */
const GRAM_PER_SATUAN: Record<string, number> = {
  kg: 1000,
  kilogram: 1000,
  kilo: 1000,
  g: 1,
  gr: 1,
  gram: 1,
  ons: 100,
  hg: 100,
  liter: 1000, // asumsi kerapatan ~1 g/ml
  ltr: 1000,
  l: 1000,
  ml: 1,
  cc: 1,
  butir: 55, // rata-rata telur ayam
};
export function jumlahKeGram(jumlah: number, satuan: string): number | null {
  const s = satuan.trim().toLowerCase();
  const f = GRAM_PER_SATUAN[s];
  if (f === undefined || !(jumlah >= 0)) return null;
  return jumlah * f;
}

/**
 * Cari data gizi TKPI yang paling cocok dari nama bahan (heuristik token).
 * `kategori` opsional mempersempit kandidat agar pencocokan lebih tepat.
 * Mengembalikan null bila tak ada yang cukup mirip.
 */
export function cariGiziByNama(nama: string, kategori?: KategoriBahan): BahanGizi | null {
  const n = nama.trim().toLowerCase();
  if (!n) return null;
  const pool = kategori ? BAHAN_GIZI.filter((b) => b.kategori === kategori) : BAHAN_GIZI;
  const cand = pool.length > 0 ? pool : BAHAN_GIZI;
  const exact = cand.find((b) => b.nama.toLowerCase() === n);
  if (exact) return exact;
  const kata = n.split(/\s+/).filter((w) => w.length >= 3);
  let best: BahanGizi | null = null;
  let bestScore = 0;
  for (const b of cand) {
    const bn = b.nama.toLowerCase();
    let score = 0;
    for (const w of kata) if (bn.includes(w)) score += w.length;
    const first = bn.split(/[\s(]/)[0];
    if (first.length >= 3 && n.includes(first)) score += first.length;
    if (score > bestScore) {
      bestScore = score;
      best = b;
    }
  }
  return bestScore >= 3 ? best : null;
}
