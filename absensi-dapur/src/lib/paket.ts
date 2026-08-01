/**
 * Paket langganan per dapur (SPPG) untuk monetisasi berjenjang.
 * Bronze → Silver → Gold → Pro. Tiap paket membuka sekumpulan fitur; masa aktif
 * (paket_until) bila lewat → efektif turun ke Bronze sampai diperpanjang.
 * File ini bebas dependensi server (aman dipakai di klien maupun server).
 */
export type Paket = "bronze" | "silver" | "gold" | "pro";

export const PAKET_LIST: Paket[] = ["bronze", "silver", "gold", "pro"];

export const PAKET_LEVEL: Record<Paket, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  pro: 4,
};

export const PAKET_LABEL: Record<Paket, string> = {
  bronze: "🥉 Bronze",
  silver: "🥈 Silver",
  gold: "🥇 Gold",
  pro: "💎 Pro",
};

export const PAKET_DESKRIPSI: Record<Paket, string> = {
  bronze: "Absensi + Pegawai, Jadwal, Izin, Pengumuman",
  silver: "Bronze + Akuntan (Berita Acara)",
  gold: "Silver + Distribusi, Menu, Laporan Harian",
  pro: "Gold + HR/Gaji, Gudang, Ahli Gizi (semua fitur)",
};

export type Fitur = "pegawai" | "akuntan" | "distribusi" | "hr" | "gudang" | "ahli_gizi";

/** Paket minimum yang membuka tiap fitur. */
const FITUR_MIN: Record<Fitur, Paket> = {
  pegawai: "bronze",
  akuntan: "silver",
  distribusi: "gold",
  hr: "pro",
  gudang: "pro",
  ahli_gizi: "pro",
};

export const SEMUA_FITUR: Fitur[] = Object.keys(FITUR_MIN) as Fitur[];

/** Normalkan nilai paket; default "pro" agar dapur lama tetap penuh. */
export function normalizePaket(v: unknown): Paket {
  return typeof v === "string" && (PAKET_LIST as string[]).includes(v) ? (v as Paket) : "pro";
}

/** Hari ini (YYYY-MM-DD) zona Asia/Jakarta. */
function hariIni(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Apakah masa aktif sudah lewat (paket_until < hari ini). Null = tanpa batas. */
export function paketExpired(until: string | null | undefined): boolean {
  if (!until) return false;
  return String(until).slice(0, 10) < hariIni();
}

/** Paket efektif setelah memperhitungkan masa aktif (kedaluwarsa → bronze). */
export function paketEfektif(paket: unknown, until: string | null | undefined): Paket {
  return paketExpired(until) ? "bronze" : normalizePaket(paket);
}

/** Daftar fitur yang aktif untuk sebuah paket. */
export function fiturAktif(paket: Paket): Fitur[] {
  const lvl = PAKET_LEVEL[paket];
  return SEMUA_FITUR.filter((f) => PAKET_LEVEL[FITUR_MIN[f]] <= lvl);
}

/** Peta prefix rute admin → fitur yang dibutuhkan (untuk penjagaan halaman). */
export const RUTE_FITUR: { prefix: string; fitur: Fitur }[] = [
  { prefix: "/admin/akuntan", fitur: "akuntan" },
  { prefix: "/admin/distribusi", fitur: "distribusi" },
  { prefix: "/admin/menu", fitur: "distribusi" },
  { prefix: "/admin/jadwal-menu", fitur: "distribusi" },
  { prefix: "/admin/belanja", fitur: "distribusi" },
  { prefix: "/admin/laporan", fitur: "distribusi" },
  { prefix: "/admin/gudang", fitur: "gudang" },
  { prefix: "/admin/ahli-gizi", fitur: "ahli_gizi" },
  { prefix: "/admin/hr", fitur: "hr" },
  { prefix: "/admin/gaji", fitur: "hr" },
  { prefix: "/admin/slip", fitur: "hr" },
];
