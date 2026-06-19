/**
 * Helper waktu yang sadar zona waktu (default Asia/Jakarta) tanpa dependensi
 * eksternal — memakai Intl.DateTimeFormat. Mendukung shift lintas hari.
 */

const DEFAULT_TZ = "Asia/Jakarta";

/** Tanggal lokal "YYYY-MM-DD" untuk zona waktu tertentu. */
export function localDate(tz = DEFAULT_TZ, at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** Jam lokal "HH:mm" (24 jam) untuk zona waktu tertentu. */
export function localTime(tz = DEFAULT_TZ, at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at);
}

/** "HH:mm" -> menit sejak tengah malam. */
export function minutesOfDay(hhmm: string): number {
  const [h, m] = (hhmm || "0:0").split(":").map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

/** Geser tanggal "YYYY-MM-DD" sebanyak n hari (UTC, aman dari pergeseran TZ). */
export function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Apakah shift melewati tengah malam (mis. 22:00 -> 08:00). */
export function isOvernight(jamMasuk: string, jamPulang: string): boolean {
  return minutesOfDay(jamPulang) <= minutesOfDay(jamMasuk);
}

/**
 * Tanggal kerja shift ("YYYY-MM-DD") untuk sebuah waktu absen masuk.
 * Untuk shift lintas hari, absen di dini hari (sebelum jam pulang) dianggap
 * milik shift yang dimulai pada hari sebelumnya.
 */
export function shiftDate(
  now: Date,
  jamMasuk: string,
  jamPulang: string,
  tz = DEFAULT_TZ,
): string {
  const d = localDate(tz, now);
  if (isOvernight(jamMasuk, jamPulang)) {
    const nowMin = minutesOfDay(localTime(tz, now));
    if (nowMin < minutesOfDay(jamPulang)) return addDays(d, -1);
  }
  return d;
}

/**
 * Status masuk berbasis shift: "Tepat Waktu" bila tidak melewati jam masuk
 * (+toleransi), selain itu "Terlambat". Sadar shift lintas hari.
 */
export function statusMasukShift(
  now: Date,
  jamMasuk: string,
  jamPulang: string,
  tz = DEFAULT_TZ,
  toleransiMenit = 0,
): "Tepat Waktu" | "Terlambat" {
  let nowMin = minutesOfDay(localTime(tz, now));
  const masukMin = minutesOfDay(jamMasuk);
  const pulangMin = minutesOfDay(jamPulang);
  // Porsi dini hari dari shift lintas hari -> tambah 24 jam agar dibanding benar.
  if (isOvernight(jamMasuk, jamPulang) && nowMin < pulangMin) {
    nowMin += 1440;
  }
  return nowMin > masukMin + toleransiMenit ? "Terlambat" : "Tepat Waktu";
}

/**
 * Status masuk (versi lama, non-shift) — dipertahankan untuk kompatibilitas.
 */
export function statusMasuk(
  now: Date,
  jamMasuk: string,
  tz = DEFAULT_TZ,
  toleransiMenit = 0,
): "Tepat Waktu" | "Terlambat" {
  const nowMin = minutesOfDay(localTime(tz, now));
  const batas = minutesOfDay(jamMasuk) + toleransiMenit;
  return nowMin > batas ? "Terlambat" : "Tepat Waktu";
}

/** Selisih menit kerja antara check-in & check-out (0 bila belum/ tak valid). */
export function durasiMenit(
  checkIn: string | Date | null | undefined,
  checkOut: string | Date | null | undefined,
): number {
  if (!checkIn || !checkOut) return 0;
  const a = typeof checkIn === "string" ? new Date(checkIn) : checkIn;
  const b = typeof checkOut === "string" ? new Date(checkOut) : checkOut;
  const ms = b.getTime() - a.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.floor(ms / 60000);
}

/** Format durasi menit -> "Xj Ym" (mis. 510 -> "8j 30m"). */
export function fmtDurasi(menit: number): string {
  if (!menit || menit <= 0) return "—";
  const h = Math.floor(menit / 60);
  const m = menit % 60;
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

/** Durasi kerja dari sepasang timestamp: { menit, label }. */
export function durasiKerja(
  checkIn: string | Date | null | undefined,
  checkOut: string | Date | null | undefined,
): { menit: number; label: string } {
  const menit = durasiMenit(checkIn, checkOut);
  return { menit, label: fmtDurasi(menit) };
}

/** Format tampilan jam lokal "HH:mm" dari timestamp ISO/Date, atau "-". */
export function fmtJam(value: string | Date | null | undefined, tz = DEFAULT_TZ): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "-";
  return localTime(tz, d);
}
