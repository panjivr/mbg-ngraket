"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Lapisan penekan kebocoran slip gaji (deterrent, BUKAN blokir mutlak).
 *
 * Penting — jujur soal batasan: di web murni (browser HP) TIDAK ADA API yang
 * bisa memblokir screenshot seperti Netflix (itu pakai DRM/FLAG_SECURE native),
 * dan TIDAK ADA cara mencegah foto pakai HP lain. Komponen ini menekan &
 * menelusuri kebocoran:
 *   1. Watermark nama + waktu melintang → pembocor ketahuan bila disebar.
 *   2. Tirai gelap otomatis saat halaman kehilangan fokus / pindah aplikasi.
 *   3. Matikan klik-kanan, seret gambar, dan seleksi teks.
 *
 * Aktif hanya untuk tampilan karyawan; mode cetak admin melewati komponen ini.
 */

const XML_ESC: Record<string, string> = {
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  "'": "&apos;",
  '"': "&quot;",
};
const escXml = (s: string) => s.replace(/[<>&'"]/g, (c) => XML_ESC[c]);

function buildWatermark(text: string): string {
  const t = escXml(text);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='170'>` +
    `<text x='0' y='95' transform='rotate(-28 150 85)' ` +
    `font-family='sans-serif' font-size='15' font-weight='600' fill='%230f172a'>${t}</text>` +
    `</svg>`;
  return `url("data:image/svg+xml,${svg.replace(/#/g, "%23")}")`;
}

export default function SlipShield({
  nama,
  nip,
  active = true,
  children,
}: {
  nama: string;
  nip?: string | null;
  active?: boolean;
  children: ReactNode;
}) {
  const [tertutup, setTertutup] = useState(false); // pindah aplikasi / blur
  // Cap waktu buka (ketertelusuran) — dihitung sekali saat mount.
  const [dibuka] = useState(() =>
    new Date().toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  );

  // Tirai gelap saat halaman kehilangan fokus / pindah aplikasi.
  useEffect(() => {
    if (!active) return;
    const sembunyi = () => setTertutup(true);
    const tampil = () => setTertutup(false);
    const onVis = () => (document.hidden ? sembunyi() : tampil());
    window.addEventListener("blur", sembunyi);
    window.addEventListener("focus", tampil);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("blur", sembunyi);
      window.removeEventListener("focus", tampil);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [active]);

  if (!active) return <>{children}</>;

  const mark = `${nama}${nip ? " · " + nip : ""} · RAHASIA · ${dibuka}`;
  const gelap = tertutup;

  return (
    <div
      className="relative select-none"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" }}
    >
      {/* Area slip yang dilindungi */}
      <div className="relative">
        {children}

        {/* Watermark melintang — tampak di layar & ikut terbawa saat di-screenshot/foto */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.10]"
          style={{ backgroundImage: buildWatermark(mark), backgroundRepeat: "repeat" }}
        />

        {/* Tirai gelap saat pindah aplikasi */}
        {gelap && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black px-6 text-center text-white">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-9 w-9 opacity-90"
            >
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V8a5 5 0 0 1 10 0v3" />
            </svg>
            <p className="text-sm font-semibold">
              Slip disembunyikan
            </p>
            <p className="max-w-xs text-xs leading-relaxed text-white/70">
              Kembali ke aplikasi untuk melihat slip. Dokumen ini rahasia dan tidak untuk dibagikan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
