/**
 * Pembentukan matriks "Rekap Gaji": satu baris per pegawai, satu kolom per
 * tanggal dalam periode, dikelompokkan & diurutkan per divisi. Dipakai bersama
 * oleh halaman preview (client) dan endpoint ekspor Excel (server) agar logika
 * grouping & penanda lembur konsisten.
 */

import { addDays, durasiMenit } from "./time";

/** Kolom biaya yang sengaja dikosongkan agar diisi manual oleh admin. */
export const KOLOM_BIAYA = ["GAJI", "LEMBUR", "UANG", "TOTAL"] as const;

/** Ambang lembur default: 10 jam = 600 menit. */
export const AMBANG_LEMBUR_DEFAULT_MENIT = 10 * 60;

/** Baris absensi mentah yang dibutuhkan untuk membangun matriks. */
export interface BarisAbsensi {
  user_id: number;
  nama: string;
  jabatan: string | null;
  nip: string | null;
  divisi_nama?: string | null;
  tanggal: string; // YYYY-MM-DD (sudah COALESCE shift_tanggal/tanggal)
  check_in: string | null;
  check_out: string | null;
}

export interface SelHari {
  hadir: boolean;
  menit: number;
  /** True bila menit hari itu melewati ambang lembur. */
  lembur: boolean;
}

export interface BarisPegawai {
  user_id: number;
  nama: string;
  jabatan: string | null;
  nip: string | null;
  /** Kunci = tanggal "YYYY-MM-DD". */
  sel: Map<string, SelHari>;
  jumlahHadir: number;
}

export interface GrupDivisi {
  nama: string;
  pegawai: BarisPegawai[];
}

export interface Matriks {
  tanggal: string[];
  divisiList: GrupDivisi[];
}

const LABEL_TANPA_DIVISI = "Tanpa Divisi";

/** Enumerasi tanggal "YYYY-MM-DD" dari `from` s/d `to` (inklusif). */
export function daftarTanggal(from: string, to: string): string[] {
  const out: string[] = [];
  let d = from;
  // Batas aman agar tidak loop tak hingga bila input keliru.
  for (let i = 0; i < 400 && d <= to; i++) {
    out.push(d);
    d = addDays(d, 1);
  }
  return out;
}

export interface OpsiMatriks {
  from: string;
  to: string;
  ambangMenit?: number;
}

/**
 * Bangun matriks dari baris absensi. Bila satu pegawai punya >1 catatan pada
 * tanggal yang sama, ambil durasi terbesar dan tandai hadir.
 */
export function buildMatrix(rows: BarisAbsensi[], opsi: OpsiMatriks): Matriks {
  const ambang = opsi.ambangMenit ?? AMBANG_LEMBUR_DEFAULT_MENIT;
  const tanggal = daftarTanggal(opsi.from, opsi.to);

  // Kelompokkan per divisi -> per pegawai.
  const divisiMap = new Map<string, Map<number, BarisPegawai>>();

  for (const r of rows) {
    const divisi = (r.divisi_nama || "").trim() || LABEL_TANPA_DIVISI;
    let pegMap = divisiMap.get(divisi);
    if (!pegMap) {
      pegMap = new Map();
      divisiMap.set(divisi, pegMap);
    }
    let peg = pegMap.get(r.user_id);
    if (!peg) {
      peg = {
        user_id: r.user_id,
        nama: r.nama,
        jabatan: r.jabatan,
        nip: r.nip,
        sel: new Map(),
        jumlahHadir: 0,
      };
      pegMap.set(r.user_id, peg);
    }

    const menit = durasiMenit(r.check_in, r.check_out);
    const sebelumnya = peg.sel.get(r.tanggal);
    const menitFinal = Math.max(menit, sebelumnya?.menit ?? 0);
    peg.sel.set(r.tanggal, {
      hadir: true,
      menit: menitFinal,
      lembur: menitFinal > ambang,
    });
  }

  // Hitung jumlah hadir & urutkan.
  const divisiList: GrupDivisi[] = [...divisiMap.entries()]
    .map(([nama, pegMap]) => {
      const pegawai = [...pegMap.values()];
      for (const p of pegawai) p.jumlahHadir = p.sel.size;
      pegawai.sort((a, b) => a.nama.localeCompare(b.nama, "id"));
      return { nama, pegawai };
    })
    .sort((a, b) => {
      // "Tanpa Divisi" selalu di akhir, sisanya urut abjad.
      if (a.nama === LABEL_TANPA_DIVISI) return 1;
      if (b.nama === LABEL_TANPA_DIVISI) return -1;
      return a.nama.localeCompare(b.nama, "id");
    });

  return { tanggal, divisiList };
}

/** Ambil angka hari (1..31) dari "YYYY-MM-DD" untuk header kolom ringkas. */
export function hariDariTanggal(tgl: string): string {
  return String(parseInt(tgl.slice(8, 10), 10));
}
