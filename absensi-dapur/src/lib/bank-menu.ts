import raw from "@/data/bank-menu.json";

/**
 * Bank Menu — resep kebutuhan bahan per paket menu harian, hasil rangkuman RAB
 * nyata 6 bulan (lihat src/data/bank-menu.json). Dipakai Generator Purchase:
 * pilih paket + porsi target → daftar belanja bahan terskala.
 *
 * `pp` = kuantitas per porsi (dalam `s`/satuan). qty beli = pp × porsi × (1+cadangan).
 * `f` = 1 menandai baris yang nilainya tak wajar (perlu koreksi admin).
 */
export interface BankBahan {
  n: string; // nama bahan
  s: string; // satuan
  q: number; // kuantitas RAB agregat (basis)
  pp: number; // per porsi
  h: number; // harga historis tertimbang (Rp)
  f?: number; // 1 = flag perlu koreksi
}
export interface BankPaket {
  id: string;
  file: string;
  tanggal: string | null;
  menu: string;
  porsi: number; // porsi distribusi basis
  besar: number;
  kecil: number;
  balita: number;
  bumil: number;
  bahan: BankBahan[];
}
interface BankData {
  _meta: { generated: string; sumber: string; pakets: number; bahanRows: number; flagged: number };
  pakets: BankPaket[];
}

const BANK = raw as unknown as BankData;

export const BANK_META = BANK._meta;

/** Daftar ringkas paket untuk pemilih (tanpa detail bahan). */
export function listPakets() {
  return BANK.pakets.map((p) => ({
    id: p.id,
    tanggal: p.tanggal,
    menu: p.menu,
    porsi: p.porsi,
    jml: p.bahan.length,
  }));
}

export function getPaket(id: string): BankPaket | undefined {
  return BANK.pakets.find((p) => p.id === id);
}
