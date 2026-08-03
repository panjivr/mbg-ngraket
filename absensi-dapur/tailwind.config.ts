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
        // Latar navy BGN — kini berbasis CSS variable (kanal RGB) supaya tema
        // terang bisa menimpa lewat [data-theme="light"] tanpa mengubah kelas di
        // ratusan halaman. Format `rgb(var(--ink-N) / <alpha-value>)` menjaga
        // modifier opasitas Tailwind (mis. `bg-ink-900/40`) tetap berfungsi.
        ink: {
          950: "rgb(var(--ink-950) / <alpha-value>)",
          900: "rgb(var(--ink-900) / <alpha-value>)",
          850: "rgb(var(--ink-850) / <alpha-value>)",
          800: "rgb(var(--ink-800) / <alpha-value>)",
          700: "rgb(var(--ink-700) / <alpha-value>)",
          600: "rgb(var(--ink-600) / <alpha-value>)",
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
