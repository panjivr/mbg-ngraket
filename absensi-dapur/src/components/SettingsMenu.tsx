"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefs, type Theme } from "@/components/ThemeLangProvider";
import type { Lang } from "@/lib/i18n";

// Panel pengaturan ringkas di header: alih tema (gelap/terang) & bahasa (ID/EN).
// Ikon-only trigger diberi aria-label agar aksesibel.
export default function SettingsMenu() {
  const { theme, lang, setTheme, setLang, t } = usePrefs();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Tutup saat klik di luar / tekan Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const themeOpts: { val: Theme; label: string; icon: string }[] = [
    { val: "dark", label: t("settings.theme.dark"), icon: "🌙" },
    { val: "light", label: t("settings.theme.light"), icon: "☀️" },
  ];
  const langOpts: { val: Lang; label: string }[] = [
    { val: "id", label: "Indonesia" },
    { val: "en", label: "English" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("settings.open")}
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-base transition-colors hover:bg-white/10"
      >
        {theme === "light" ? "☀️" : "🌙"}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-white/10 bg-ink-850 p-3 shadow-soft"
        >
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t("settings.theme")}
          </p>
          <div className="mb-3 grid grid-cols-2 gap-1.5">
            {themeOpts.map((o) => (
              <button
                key={o.val}
                onClick={() => setTheme(o.val)}
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
                  theme === o.val
                    ? "border-gold-400/60 bg-gold-400/10 text-gold-300"
                    : "border-white/10 text-slate-300 hover:bg-white/5"
                }`}
              >
                <span>{o.icon}</span>
                {o.label}
              </button>
            ))}
          </div>

          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t("settings.language")}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {langOpts.map((o) => (
              <button
                key={o.val}
                onClick={() => setLang(o.val)}
                className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
                  lang === o.val
                    ? "border-gold-400/60 bg-gold-400/10 text-gold-300"
                    : "border-white/10 text-slate-300 hover:bg-white/5"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
