/**
 * Helper waktu yang sadar zona waktu (default Asia/Jakarta) tanpa dependensi
 * eksternal — memakai Intl.DateTimeFormat.
 */

const DEFAULT_TZ = "Asia/Jakarta";

/** Tanggal lokal "YYYY-MM-DD" untuk zona waktu tertentu. */
export function localDate(tz = DEFAULT_TZ, at: Date = new Date()): string {
  // en-CA menghasilkan format YYYY-MM-DD.
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
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

/**
 * Status masuk: "Tepat Waktu" jika tidak melewati jam masuk (+toleransi),
 * selain itu "Terlambat".
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

/** Format tampilan jam lokal "HH:mm" dari timestamp ISO/Date, atau "-". */
export function fmtJam(value: string | Date | null | undefined, tz = DEFAULT_TZ): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "-";
  return localTime(tz, d);
}
