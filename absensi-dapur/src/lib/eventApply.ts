/**
 * Terapkan / batalkan pengaruh sebuah Event Absensi ke catatan absensi pada
 * tanggalnya. Saat event dibuat/diaktifkan, SEMUA absensi pada tanggal itu
 * disetel mengikuti jam event (dan status terlambat dihitung ulang) sehingga
 * karyawan tidak terhitung terlambat selama masuk dalam jam event — meskipun
 * mereka sudah absen sebelum event dibuat.
 */
import { query } from "./db";
import { statusMasukShift } from "./time";
import type { Settings } from "./types";

interface EventRow {
  id: number;
  tanggal: string;
  jam_masuk: string;
  jam_pulang: string;
  toleransi_menit: number;
}
interface AttRow {
  id: number;
  check_in: string | null;
  divisi_id: number | null;
  divisi_shift_id: number | null;
}
interface JadwalRow {
  jam_masuk: string;
  jam_pulang: string;
  toleransi_menit: number;
}

async function getTz(): Promise<string> {
  const s = (await query<{ tz: string }>(`SELECT tz FROM settings WHERE id = 1`))[0];
  return s?.tz || "Asia/Jakarta";
}

/**
 * Setel semua absensi pada tanggal event agar mengikuti jam event & hitung
 * ulang status masuk. Mengembalikan jumlah baris yang diperbarui.
 */
export async function applyEventToDate(eventId: number): Promise<number> {
  const ev = (
    await query<EventRow>(
      `SELECT id, tanggal, jam_masuk, jam_pulang, toleransi_menit
         FROM event_absensi WHERE id = $1`,
      [eventId],
    )
  )[0];
  if (!ev) return 0;
  const tz = await getTz();
  const rows = await query<AttRow>(
    `SELECT id, check_in FROM attendance
      WHERE tanggal = $1 AND check_in IS NOT NULL`,
    [ev.tanggal],
  );
  let n = 0;
  for (const r of rows) {
    const status = statusMasukShift(
      new Date(r.check_in as string),
      ev.jam_masuk,
      ev.jam_pulang,
      tz,
      ev.toleransi_menit,
    );
    await query(
      `UPDATE attendance
          SET shift_masuk = $1, shift_pulang = $2, event_id = $3, status_masuk = $4
        WHERE id = $5`,
      [ev.jam_masuk, ev.jam_pulang, ev.id, status, r.id],
    );
    n += 1;
  }
  return n;
}

/**
 * Kembalikan absensi yang terlanjur memakai event ini ke jadwal aslinya
 * (sub-shift bila ada, lalu divisi, lalu jam global) & hitung ulang status.
 */
export async function revertEventFromDate(eventId: number): Promise<number> {
  const tz = await getTz();
  const settings = (await query<Settings>(`SELECT * FROM settings WHERE id = 1`))[0];
  const rows = await query<AttRow>(
    `SELECT id, check_in, divisi_id, divisi_shift_id
       FROM attendance WHERE event_id = $1 AND check_in IS NOT NULL`,
    [eventId],
  );
  let n = 0;
  for (const r of rows) {
    let jm = settings.jam_masuk;
    let jp = settings.jam_pulang;
    let tol = 0;
    if (r.divisi_shift_id) {
      const sh = (
        await query<JadwalRow>(
          `SELECT jam_masuk, jam_pulang, toleransi_menit FROM divisi_shift WHERE id = $1`,
          [r.divisi_shift_id],
        )
      )[0];
      if (sh) {
        jm = sh.jam_masuk;
        jp = sh.jam_pulang;
        tol = sh.toleransi_menit;
      }
    } else if (r.divisi_id) {
      const d = (
        await query<JadwalRow>(
          `SELECT jam_masuk, jam_pulang, toleransi_menit FROM divisi WHERE id = $1`,
          [r.divisi_id],
        )
      )[0];
      if (d) {
        jm = d.jam_masuk;
        jp = d.jam_pulang;
        tol = d.toleransi_menit;
      }
    }
    const status = statusMasukShift(new Date(r.check_in as string), jm, jp, tz, tol);
    await query(
      `UPDATE attendance
          SET shift_masuk = $1, shift_pulang = $2, event_id = NULL, status_masuk = $3
        WHERE id = $4`,
      [jm, jp, status, r.id],
    );
    n += 1;
  }
  return n;
}
