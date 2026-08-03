"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { translate, type Lang, type MsgKey } from "@/lib/i18n";

export type Theme = "dark" | "light";

const THEME_KEY = "mbg-theme";
const LANG_KEY = "mbg-lang";

interface Ctx {
  theme: Theme;
  lang: Lang;
  setTheme: (t: Theme) => void;
  setLang: (l: Lang) => void;
  t: (key: MsgKey) => string;
}

const PrefContext = createContext<Ctx | null>(null);

// Terapkan preferensi ke <html> agar CSS ([data-theme]) & tools eksternal bisa
// membacanya. Dipisah supaya bisa dipakai skrip pra-render maupun React.
function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}
function applyLang(lang: Lang): void {
  document.documentElement.dataset.lang = lang;
  document.documentElement.lang = lang;
}

/**
 * Provider preferensi tampilan (tema gelap/terang + bahasa ID/EN). Nilai
 * disimpan di localStorage dan diterapkan sebagai atribut pada <html>. Default
 * = gelap + Indonesia, sehingga pengguna lama tidak berubah kecuali memilih.
 * Skrip pra-render di layout sudah menyetel data-theme sebelum paint (anti
 * flash); di sini kita hanya menyinkronkan state React setelah mount.
 */
export default function ThemeLangProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [lang, setLangState] = useState<Lang>("id");

  // Sinkronkan dari localStorage sekali saat mount (menghindari mismatch SSR).
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const savedLang = localStorage.getItem(LANG_KEY);
    if (savedTheme === "light" || savedTheme === "dark") setThemeState(savedTheme);
    if (savedLang === "en" || savedLang === "id") setLangState(savedLang);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
    applyTheme(t);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(LANG_KEY, l);
    applyLang(l);
  }, []);

  // Pastikan atribut <html> selaras dengan state (mis. setelah load localStorage).
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  useEffect(() => {
    applyLang(lang);
  }, [lang]);

  const t = useCallback((key: MsgKey) => translate(lang, key), [lang]);

  const value = useMemo<Ctx>(
    () => ({ theme, lang, setTheme, setLang, t }),
    [theme, lang, setTheme, setLang, t],
  );

  return <PrefContext.Provider value={value}>{children}</PrefContext.Provider>;
}

/** Hook preferensi tampilan. Wajib dipakai di dalam ThemeLangProvider. */
export function usePrefs(): Ctx {
  const ctx = useContext(PrefContext);
  if (!ctx) throw new Error("usePrefs harus dipakai di dalam ThemeLangProvider");
  return ctx;
}
