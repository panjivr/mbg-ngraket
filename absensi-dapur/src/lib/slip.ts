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

// Status kehadiran efektif per hari (bisa ditimpa HR).
export type StatusHari = "penuh" | "setengah" | "sakit" | "izin" | "alpha" | "libur";

export interface HariSlip {
  tanggal: string;
  masuk: boolean; // dari absensi asli (info, sebelum override)
  status: StatusHari; // status efektif hari itu
  upah: number; // nominal upah efektif hari itu (Rp)
  lembur: boolean; // hari lembur efektif
  override: boolean; // true bila ada penyesuaian manual HR
  catatan: string;
}

export interface KasbonItem {
  id: number;
  tanggal: string;
  jumlah: number;
  keterangan: string;
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
  kasbon: number; // total potongan kasbon (0 = tidak ada)
  kasbon_items: KasbonItem[];
  total: number;
  hari: HariSlip[];
  confirmed_at: string | null;
  /** Catatan (NB) tingkat dapur — tampil di bawah slip. */
  nb: string;
}

interface AbsRow {
  d: string;
  check_in: Date | string | null;
  check_out: Date | string | null;
  status_masuk: string | null;
}

interface AdjustRow {
  tanggal: string;
  status: StatusHari;
  upah: string | number;
  lembur: boolean;
  catatan: string;
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
 * - Kehadiran & durasi diambil dari CHECK-IN/CHECK-OUT sebagai NILAI AWAL.
 * - HR dapat menimpa per hari lewat tabel `slip_adjust` (status, upah, lembur):
 *   mis. sakit, izin, atau kegiatan dengan honor 50%.
 * - Kasbon (hutang gaji) yang belum lunas dipotong dari total; hanya tampil bila ada.
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

  // Rangkum absensi per tanggal (masuk, lembur, telat/tepat).
  const absHari = new Map<string, { masuk: boolean; lembur: boolean }>();
  let tepat = 0;
  let telat = 0;
  for (const r of rows) {
    const prev = absHari.get(r.d) || { masuk: false, lembur: false };
    if (r.check_in) prev.masuk = true;
    if (r.status_masuk === "Tepat Waktu") tepat += 1;
    else if (r.status_masuk === "Terlambat") telat += 1;
    if (r.check_in && r.check_out) {
      const menit = (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 60000;
      if (menit > ambangMenit) prev.lembur = true;
    }
    absHari.set(r.d, prev);
  }

  // Penyesuaian manual HR per hari.
  const adjRows = await query<AdjustRow>(
    `SELECT tanggal::text AS tanggal, status, upah, lembur, catatan
       FROM slip_adjust
      WHERE user_id = $1 AND tanggal BETWEEN $2 AND $3`,
    [userId, from, to],
  );
  const adjMap = new Map<string, AdjustRow>();
  for (const a of adjRows) adjMap.set(a.tanggal, a);

  // Hari khusus tingkat DAPUR (libur/kegiatan) — berlaku ke semua pegawai.
  const hkRows = await query<{ tanggal: string; keterangan: string; digaji: boolean }>(
    `SELECT tanggal::text AS tanggal, keterangan, digaji
       FROM hari_khusus WHERE sppg_id = $1 AND tanggal BETWEEN $2 AND $3`,
    [sppgId, from, to],
  );
  const hkMap = new Map<string, { keterangan: string; digaji: boolean }>();
  for (const h of hkRows) hkMap.set(h.tanggal, { keterangan: h.keterangan, digaji: h.digaji });

  const hari: HariSlip[] = eachDate(from, to).map((tanggal) => {
    const abs = absHari.get(tanggal);
    const masuk = !!abs?.masuk;
    // Nilai awal dari absensi.
    let status: StatusHari = masuk ? "penuh" : "alpha";
    let upah = masuk ? u.gaji_harian : 0;
    let lembur = !!abs?.lembur;
    let catatan = "";
    let override = false;
    // Hari khusus dapur diterapkan lebih dulu (di bawah bisa ditimpa slip_adjust
    // per-pegawai untuk pengecualian individual).
    const hk = hkMap.get(tanggal);
    if (hk) {
      override = true;
      catatan = hk.keterangan || (hk.digaji ? "Hari khusus" : "Hari kegiatan (tidak digaji)");
      if (!hk.digaji) {
        status = "libur";
        upah = 0;
        lembur = false;
      }
    }
    const adj = adjMap.get(tanggal);
    if (adj) {
      override = true;
      status = adj.status;
      upah = Math.max(0, Number(adj.upah) || 0);
      lembur = !!adj.lembur;
      catatan = adj.catatan || "";
    }
    return { tanggal, masuk, status, upah, lembur, override, catatan };
  });

  const hadir = hari.filter((h) => h.status === "penuh" || h.status === "setengah").length;
  const lemburHari = hari.filter((h) => h.lembur).length;
  const upahKehadiran = hari.reduce((a, h) => a + h.upah, 0);
  const upahLembur = lemburHari * u.lembur_per_hari;
  const potongan = telat * u.potongan_per_telat;

  // Kasbon belum lunas.
  const kasbonRows = await query<{ id: number; tanggal: string; jumlah: string | number; keterangan: string }>(
    `SELECT id, tanggal::text AS tanggal, jumlah, keterangan
       FROM kasbon
      WHERE user_id = $1 AND sppg_id = $2 AND lunas = FALSE
      ORDER BY tanggal ASC, id ASC`,
    [userId, sppgId],
  );
  const kasbonItems: KasbonItem[] = kasbonRows.map((k) => ({
    id: k.id,
    tanggal: k.tanggal,
    jumlah: Math.max(0, Number(k.jumlah) || 0),
    keterangan: k.keterangan || "",
  }));
  const kasbon = kasbonItems.reduce((a, k) => a + k.jumlah, 0);

  const total = upahKehadiran + upahLembur - potongan - kasbon;

  const konf = (
    await query<{ confirmed_at: string }>(
      `SELECT confirmed_at::text FROM slip_konfirmasi
        WHERE user_id = $1 AND periode_from = $2 AND periode_to = $3`,
      [userId, from, to],
    )
  )[0];

  // Catatan (NB) tingkat dapur — sama untuk semua slip karyawan.
  const nbRow = (await query<{ slip_nb: string }>(`SELECT slip_nb FROM sppg WHERE id = $1`, [sppgId]))[0];

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
    kasbon,
    kasbon_items: kasbonItems,
    total,
    hari,
    confirmed_at: konf?.confirmed_at || null,
    nb: nbRow?.slip_nb || "",
  };
}
