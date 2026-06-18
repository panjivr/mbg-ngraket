import type { Config } from "tailwindcss";

/**
 * Tema BGN (Badan Gizi Nasional) — biru navy & royal blue, aksen emas.
 * Catatan: nama palet `ink` (latar navy), `gold` (aksen biru utama) dan
 * `ember` (biru langit) dipertahankan agar kelas yang sudah ada di seluruh
 * halaman otomatis ikut berubah ke skema biru BGN. `emas` dipakai khusus
 * untuk aksen emas pada lambang/branding.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Latar navy BGN
        ink: {
          950: "#070f29",
          900: "#0a1740",
          850: "#0e1f55",
          800: "#16306e",
          700: "#1f3f8a",
          600: "#2b53ab",
        },
        // Aksen biru utama BGN (tombol, tautan, sorotan)
        gold: {
          400: "#5b8bff",
          500: "#3464e6",
          600: "#2450c8",
        },
        // Biru langit / info
        ember: {
          400: "#38bdf8",
          500: "#0ea5e9",
        },
        // Emas asli untuk lambang/branding BGN
        emas: {
          400: "#f3c349",
          500: "#e0a92e",
          600: "#c08e1e",
        },
        // Alias semantik
        bgn: {
          navy: "#0e1f55",
          blue: "#3464e6",
          sky: "#5b8bff",
          gold: "#e0a92e",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgba(2,8,40,0.55)",
        glow: "0 0 0 1px rgba(52,100,230,0.30), 0 12px 30px -10px rgba(52,100,230,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
