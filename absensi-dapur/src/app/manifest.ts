import type { MetadataRoute } from "next";

/**
 * Web App Manifest (PWA) — Next.js menyajikan di /manifest.webmanifest dan
 * menyisipkan <link rel="manifest"> ke setiap halaman. Dengan manifest + service
 * worker + ikon maskable, aplikasi karyawan bisa di-INSTALL di Android (Chrome:
 * "Instal aplikasi") & berjalan standalone seperti aplikasi native. start_url
 * mengarah ke beranda karyawan (/dapur); database tetap satu dengan web utama.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dapur",
    name: "Karyawan Dapur MBG",
    short_name: "Dapur MBG",
    description:
      "Aplikasi karyawan dapur MBG — absensi selfie & GPS, jadwal, slip gaji, izin, SOP, gudang, People & Culture, dan lainnya dalam satu aplikasi.",
    start_url: "/dapur",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#070f29",
    theme_color: "#070f29",
    lang: "id",
    dir: "ltr",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Absen", short_name: "Absen", url: "/dapur", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Jadwal", short_name: "Jadwal", url: "/dapur/jadwal" },
      { name: "Slip Gaji", short_name: "Slip", url: "/dapur/slip" },
      { name: "People & Culture", short_name: "People", url: "/dapur/people" },
    ],
  };
}
