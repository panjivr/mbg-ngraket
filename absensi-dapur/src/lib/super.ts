/** Helper bersama untuk fitur lintas dapur (super admin). */

/** Baris rekap absensi lintas dapur. */
export interface SuperRekapRow {
  user_id: number;
  tanggal: string;
  check_in: string | null;
  check_out: string | null;
  nama: string;
  jabatan: string | null;
  nip: string | null;
  sppg_id: number;
  sppg_nama: string;
  divisi_nama: string | null;
}

/** Ubah CSV "1,2,3" menjadi array id unik yang valid (>0). */
export function parseSppgIds(raw: string | null): number[] {
  if (!raw) return [];
  const out = new Set<number>();
  for (const part of raw.split(",")) {
    const n = parseInt(part.trim(), 10);
    if (Number.isInteger(n) && n > 0) out.add(n);
  }
  return [...out];
}
