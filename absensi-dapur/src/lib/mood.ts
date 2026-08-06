/**
 * Suasana hati (mood) yang dilaporkan karyawan saat absen masuk.
 * Dipakai bersama oleh pemilih mood (AbsenPanel) dan grafik emosi (Statistik).
 * Bebas dependensi server → aman diimpor di klien maupun server.
 *
 * Urutan sengaja dari paling positif → paling berat (bersifat gradasi), sehingga
 * warnanya membentuk skala hijau→merah yang intuitif pada grafik.
 */
export interface MoodDef {
  key: string;
  emoji: string;
  label: string;
  /** Warna aksen (sama di tema terang & gelap). */
  color: string;
}

export const MOODS: MoodDef[] = [
  { key: "senang", emoji: "😄", label: "Senang", color: "#34d399" }, // emerald-400
  { key: "baik", emoji: "🙂", label: "Baik", color: "#38bdf8" }, // sky-400
  { key: "biasa", emoji: "😐", label: "Biasa", color: "#94a3b8" }, // slate-400
  { key: "lelah", emoji: "😔", label: "Lelah", color: "#fbbf24" }, // amber-400
  { key: "stres", emoji: "😣", label: "Stres", color: "#fb7185" }, // rose-400
];

export const MOOD_KEYS: string[] = MOODS.map((m) => m.key);

export function moodDef(key: string | null | undefined): MoodDef | null {
  if (!key) return null;
  return MOODS.find((m) => m.key === key) ?? null;
}
