// Kamus i18n ringan (Indonesia ⇄ Inggris) untuk elemen UI klien bersama.
// Sengaja kecil & client-side: sebagian besar halaman di-render di server, jadi
// terjemahan penuh lintas server-component adalah fase lanjutan (butuh locale
// via cookie). Untuk sekarang kita terjemahkan chrome bersama (header, nav,
// tombol umum, panel pengaturan) sebagai fondasi yang bisa diperluas bertahap.

export type Lang = "id" | "en";

export const LANGS: Lang[] = ["id", "en"];

// Setiap kunci memetakan ke pasangan {id, en}. Tambah kunci baru di sini saat
// memperluas cakupan terjemahan ke komponen klien lain.
const DICT = {
  // Pengaturan
  "settings.title": { id: "Pengaturan", en: "Settings" },
  "settings.theme": { id: "Tema", en: "Theme" },
  "settings.theme.dark": { id: "Gelap", en: "Dark" },
  "settings.theme.light": { id: "Terang", en: "Light" },
  "settings.language": { id: "Bahasa", en: "Language" },
  "settings.open": { id: "Buka pengaturan", en: "Open settings" },

  // Navigasi staf dapur
  "nav.absen": { id: "Absen", en: "Attendance" },
  "nav.peringkat": { id: "Peringkat", en: "Ranking" },
  "nav.jadwal": { id: "Jadwal", en: "Schedule" },
  "nav.izin": { id: "Izin", en: "Leave" },
  "nav.aspirasi": { id: "Aspirasi", en: "Feedback" },
  "nav.slip": { id: "Slip Gaji", en: "Payslip" },
  "nav.riwayat": { id: "Riwayat Saya", en: "My History" },
  "nav.sop": { id: "SOP", en: "SOP" },
  "nav.kartu": { id: "Kartu Saya", en: "My Card" },
  "nav.kilometer": { id: "Kilometer", en: "Mileage" },
  "nav.gudang": { id: "Gudang", en: "Warehouse" },
  "nav.panelAdmin": { id: "Panel Admin", en: "Admin Panel" },
  "nav.distribusi": { id: "Distribusi", en: "Distribution" },
  "nav.laporan": { id: "Laporan", en: "Reports" },

  // Header
  "header.appName": { id: "Absensi Dapur", en: "Kitchen Attendance" },
  "header.greeting": { id: "Halo", en: "Hello" },
  "header.logout": { id: "Keluar", en: "Log out" },
} as const;

export type MsgKey = keyof typeof DICT;

/** Ambil terjemahan sebuah kunci pada bahasa tertentu (fallback ke Indonesia). */
export function translate(lang: Lang, key: MsgKey): string {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[lang] ?? entry.id;
}
