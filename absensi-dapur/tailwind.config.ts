import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0b0f14",
          900: "#0f141b",
          850: "#141b24",
          800: "#1a2330",
          700: "#243040",
          600: "#33425a",
        },
        gold: {
          400: "#f5c451",
          500: "#e0a92e",
          600: "#c08e1e",
        },
        ember: {
          400: "#ff8a4c",
          500: "#f4702b",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgba(0,0,0,0.45)",
        glow: "0 0 0 1px rgba(245,196,81,0.25), 0 12px 30px -10px rgba(245,196,81,0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
