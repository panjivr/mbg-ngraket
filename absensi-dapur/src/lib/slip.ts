import { query } from "./db";

export interface SlipUser {
  id: number;
  nama: string;
  jabatan: string | null;
  nip: string | null;
  divisi_nama: string | null;
  gaji_harian: number;
  lembur_per_hari: number;
  potongan_per_telat: number;
  bpjs_tk: boolean;
  slip_show: boolean;
  lembur_min_jam: number; // ambang jam kerja harian untuk mulai dihitung lembur
}

export interface HariMasuk {
  tanggal: string;
  masuk: boolean;
}

export interface Slip {
  user: SlipUser;
  periode: { from: string; to: string };
  hadir: number;
  tepat: number;
  telat: number;
  lembur_hari: number;
  upah_kehadiran: number;
  upah_lembur: number;
  potongan: number;
  total: number;
  hari: HariMasuk[];
  confirmed_at: string | null;
}

interface AbsRow {
  d: string;
  check_in: Date | string | null;
  check_out: Date | string | null;
  status_masuk: string | null;
}

function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const cur = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  let guard = 0;
  while (cur <= end && guard < 400) {
    out.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`,
    );
    cur.setDate(cur.getDate() + 1);
    guard += 1;
  }
  return out;
}

/**
 * Hitung slip gaji satu karyawan pada rentang tanggal.
 * - Kehadiran dihitung dari CHECK-IN (bukan check-out).
 * - Lembur dihitung per HARI: setiap hari yang durasinya melewati ambang
 *   (default 10 jam) dihitung 1 hari lembur × tarif lembur/hari.
 * - Tunjangan BPJS Ketenagakerjaan berupa status "Terbayar", bukan nominal.
 */
export async function computeSlip(
  sppgId: number,
  userId: number,
  from: string,
  to: string,
): Promise<Slip | null> {
  const u = (
    await query<SlipUser>(
      `SELECT u.id, u.nama, u.jabatan, u.nip, d.nama AS divisi_nama,
              u.gaji_harian, u.lembur_per_hari, u.potongan_per_telat, u.bpjs_tk, u.slip_show,
              COALESCE(d.lembur_min_jam, 10) AS lembur_min_jam
         FROM users u LEFT JOIN divisi d ON d.id = u.divisi_id
        WHERE u.id = $1 AND u.sppg_id = $2`,
      [userId, sppgId],
    )
  )[0];
  if (!u) return null;
  // Ambang lembur mengikuti divisi (mis. 10 atau 12 jam).
  const ambangMenit = Math.max(1, (u.lembur_min_jam || 10) * 60);

  const rows = await query<AbsRow>(
    `SELECT COALESCE(shift_tanggal, tanggal)::text AS d, check_in, check_out, status_masuk
       FROM attendance
      WHERE user_id = $1 AND COALESCE(shift_tanggal, tanggal) BETWEEN $2 AND $3`,
    [userId, from, to],
  );

  const masukSet = new Set<string>();
  let tepat = 0;
  let telat = 0;
  let lemburHari = 0;
  for (const r of rows) {
    if (r.check_in) masukSet.add(r.d);
    if (r.status_masuk === "Tepat Waktu") tepat += 1;
    else if (r.status_masuk === "Terlambat") telat += 1;
    if (r.check_in && r.check_out) {
      const menit = (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 60000;
      if (menit > ambangMenit) lemburHari += 1;
    }
  }

  const hadir = masukSet.size;
  const upahKehadiran = u.gaji_harian * hadir;
  const upahLembur = lemburHari * u.lembur_per_hari;
  const potongan = telat * u.potongan_per_telat;
  const total = upahKehadiran + upahLembur - potongan;

  const hari: HariMasuk[] = eachDate(from, to).map((tanggal) => ({
    tanggal,
    masuk: masukSet.has(tanggal),
  }));

  const konf = (
    await query<{ confirmed_at: string }>(
      `SELECT confirmed_at::text FROM slip_konfirmasi
        WHERE user_id = $1 AND periode_from = $2 AND periode_to = $3`,
      [userId, from, to],
    )
  )[0];

  return {
    user: u,
    periode: { from, to },
    hadir,
    tepat,
    telat,
    lembur_hari: lemburHari,
    upah_kehadiran: upahKehadiran,
    upah_lembur: upahLembur,
    potongan,
    total,
    hari,
    confirmed_at: konf?.confirmed_at || null,
  };
}
