import { query } from "./db";
import { durasiMenit } from "./time";
import type { KartuPegawai } from "./types";

interface UserRow {
  id: number;
  nama: string;
  jabatan: string | null;
  nip: string | null;
  divisi_nama: string | null;
  jobdesk: string | null;
  jam_masuk: string | null;
  jam_pulang: string | null;
  foto_profil: string | null;
  bio: string | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  created_at: string;
}

interface AbsRow {
  check_in: string | null;
  check_out: string | null;
  status_masuk: string | null;
}

/** Peringkat bintang (1..5) berdasarkan ketepatan waktu. */
function bintangDari(ketepatan: number, jumlahShift: number): number {
  if (jumlahShift === 0) return 3;
  if (ketepatan >= 90) return 5;
  if (ketepatan >= 75) return 4;
  if (ketepatan >= 60) return 3;
  if (ketepatan >= 40) return 2;
  return 1;
}

/**
 * Rangkum data kartu pegawai (profil + statistik kerja) untuk satu user.
 * Mengembalikan null bila user tidak ada.
 */
export async function getKartuPegawai(userId: number): Promise<KartuPegawai | null> {
  const u = (
    await query<UserRow>(
      `SELECT u.id, u.nama, u.jabatan, u.nip, u.foto_profil, u.bio,
              u.tempat_lahir, u.tanggal_lahir, u.created_at,
              d.nama AS divisi_nama, d.jobdesk, d.jam_masuk, d.jam_pulang
         FROM users u
         LEFT JOIN divisi d ON d.id = u.divisi_id
        WHERE u.id = $1`,
      [userId],
    )
  )[0];
  if (!u) return null;

  const rows = await query<AbsRow>(
    `SELECT check_in, check_out, status_masuk FROM attendance WHERE user_id = $1`,
    [userId],
  );

  let totalMenit = 0;
  let jumlahShift = 0;
  let tepat = 0;
  let terlambat = 0;
  for (const r of rows) {
    if (r.check_in) jumlahShift += 1;
    if (r.status_masuk === "Terlambat") terlambat += 1;
    else if (r.status_masuk === "Tepat Waktu") tepat += 1;
    totalMenit += durasiMenit(r.check_in, r.check_out);
  }
  const dinilai = tepat + terlambat;
  const ketepatan = dinilai > 0 ? Math.round((tepat / dinilai) * 100) : 100;

  return {
    id: u.id,
    nama: u.nama,
    jabatan: u.jabatan,
    nip: u.nip,
    divisi_nama: u.divisi_nama,
    jobdesk: u.jobdesk,
    jam_masuk: u.jam_masuk,
    jam_pulang: u.jam_pulang,
    foto_profil: u.foto_profil,
    bio: u.bio,
    tempat_lahir: u.tempat_lahir,
    tanggal_lahir: u.tanggal_lahir,
    created_at: u.created_at,
    total_menit: totalMenit,
    jumlah_shift: jumlahShift,
    tepat,
    terlambat,
    ketepatan,
    bintang: bintangDari(ketepatan, jumlahShift),
  };
}
