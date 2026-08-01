import type { MetadataRoute } from "next";

/**
 * Web App Manifest (PWA) — Next.js otomatis menyajikan di /manifest.webmanifest
 * dan menyisipkan <link rel="manifest"> ke setiap halaman.
 * Membuat aplikasi bisa di-"Add to Home Screen" pada HP staf dapur,
 * berjalan mode standalone (tanpa address bar) dengan ikon & warna tema BGN.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Absensi Dapur MBG",
    short_name: "Absensi MBG",
    description:
      "Absensi digital dapur MBG — clock in/out dengan selfie & GPS, rekap dan ekspor untuk admin.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#070f29",
    theme_color: "#070f29",
    lang: "id",
    categories: ["business", "productivity"],
    icons: [
      { src: "/bgn-logo.webp", sizes: "192x192", type: "image/webp", purpose: "any" },
      { src: "/bgn-logo.webp", sizes: "512x512", type: "image/webp", purpose: "any" },
      { src: "/bgn-logo.webp", sizes: "512x512", type: "image/webp", purpose: "maskable" },
    ],
  };
}
