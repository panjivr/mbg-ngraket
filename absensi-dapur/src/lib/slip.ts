import { query } from "./db";
import { AMBANG_LEMBUR_DEFAULT_MENIT } from "./gaji";

export interface SlipUser {
  id: number;
  nama: string;
  jabatan: string | null;
  nip: string | null;
  divisi_nama: string | null;
  gaji_harian: number;
  tunjangan: number;
  lembur_per_jam: number;
  potongan_per_telat: number;
}

export interface Slip {
  user: SlipUser;
  periode: { from: string; to: string };
  hadir: number;
  tepat: number;
  telat: number;
  total_menit: number;
  lembur_jam: number;
  upah_kehadiran: number;
  upah_lembur: number;
  tunjangan: number;
  potongan: number;
  total: number;
}

interface AbsRow {
  check_in: Date | string | null;
  check_out: Date | string | null;
  status_masuk: string | null;
}

/**
 * Hitung slip gaji satu karyawan pada rentang tanggal dari data presensi &
 * komponen gaji yang tersimpan. Lembur = akumulasi jam kerja harian di atas
 * ambang (default 10 jam). Mengembalikan null bila karyawan tak ada di dapur.
 */
export async function computeSlip(
  sppgId: number,
  userId: number,
  from: string,
  to: string,
  ambangMenit = AMBANG_LEMBUR_DEFAULT_MENIT,
): Promise<Slip | null> {
  const u = (
    await query<SlipUser>(
      `SELECT u.id, u.nama, u.jabatan, u.nip, d.nama AS divisi_nama,
              u.gaji_harian, u.tunjangan, u.lembur_per_jam, u.potongan_per_telat
         FROM users u LEFT JOIN divisi d ON d.id = u.divisi_id
        WHERE u.id = $1 AND u.sppg_id = $2`,
      [userId, sppgId],
    )
  )[0];
  if (!u) return null;

  const rows = await query<AbsRow>(
    `SELECT check_in, check_out, status_masuk
       FROM attendance
      WHERE user_id = $1 AND COALESCE(shift_tanggal, tanggal) BETWEEN $2 AND $3`,
    [userId, from, to],
  );

  let hadir = 0;
  let tepat = 0;
  let telat = 0;
  let totalMenit = 0;
  let lemburMenit = 0;
  for (const r of rows) {
    if (r.check_in) hadir += 1;
    if (r.status_masuk === "Tepat Waktu") tepat += 1;
    else if (r.status_masuk === "Terlambat") telat += 1;
    if (r.check_in && r.check_out) {
      const menit = (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 60000;
      if (menit > 0) {
        totalMenit += menit;
        if (menit > ambangMenit) lemburMenit += menit - ambangMenit;
      }
    }
  }

  const lemburJam = Math.round((lemburMenit / 60) * 10) / 10;
  const upahKehadiran = u.gaji_harian * hadir;
  const upahLembur = Math.round(lemburJam) * u.lembur_per_jam;
  const potongan = telat * u.potongan_per_telat;
  const total = upahKehadiran + upahLembur + u.tunjangan - potongan;

  return {
    user: u,
    periode: { from, to },
    hadir,
    tepat,
    telat,
    total_menit: Math.round(totalMenit),
    lembur_jam: lemburJam,
    upah_kehadiran: upahKehadiran,
    upah_lembur: upahLembur,
    tunjangan: u.tunjangan,
    potongan,
    total,
  };
}
