"use client";

/**
 * Banner "Pasang Aplikasi" untuk karyawan. Menangkap event beforeinstallprompt
 * (Chrome/Android) agar aplikasi bisa dipasang 1-tap, dengan panduan untuk iOS
 * (Safari: Bagikan → Tambah ke Layar Utama). Sembunyi otomatis bila sudah
 * terpasang (mode standalone) atau sudah ditutup pengguna.
 */
import { useEffect, useState } from "react";

interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const DISMISS_KEY = "mbg-install-dismiss";

export default function InstallAppButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    // Sudah terpasang (standalone) → jangan tampilkan.
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    try { if (localStorage.getItem(DISMISS_KEY) === "1") return; } catch {}

    const onBIP = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent); setShow(true); };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", () => setShow(false));

    // iOS/Safari tak mendukung beforeinstallprompt → tampilkan panduan.
    const ua = navigator.userAgent || "";
    const isIOS = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua);
    if (isIOS) { setIosHint(true); setShow(true); }

    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  if (!show) return null;

  const tutup = () => { setShow(false); try { localStorage.setItem(DISMISS_KEY, "1"); } catch {} };
  const pasang = async () => {
    if (!deferred) return;
    await deferred.prompt();
    try { await deferred.userChoice; } catch {}
    setDeferred(null); setShow(false);
  };

  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-gold-500/30 bg-gradient-to-br from-gold-500/15 to-transparent px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-100">Pasang Aplikasi Karyawan</p>
        <p className="text-xs text-slate-400">
          {iosHint
            ? "Di Safari: ketuk ikon Bagikan → “Tambah ke Layar Utama”."
            : "Akses semua fitur lebih cepat, tampil seperti aplikasi tanpa address bar."}
        </p>
      </div>
      {!iosHint && deferred && (
        <button onClick={pasang} className="btn-gold shrink-0 px-4 text-sm">Pasang</button>
      )}
      <button onClick={tutup} aria-label="Tutup" className="shrink-0 rounded-lg px-2 py-1 text-slate-400 hover:bg-white/10">✕</button>
    </div>
  );
}
