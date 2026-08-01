"use client";

import { useEffect } from "react";

/**
 * Mendaftarkan service worker PWA (/sw.js) setelah halaman dimuat.
 * Hanya aktif di produksi (HTTPS) agar tidak mengganggu dev/HMR.
 * Tidak merender apa pun.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* abaikan kegagalan registrasi — aplikasi tetap jalan normal */
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
