"use client";

import { useEffect, useState } from "react";

/**
 * Footer branding seragam untuk semua dokumen cetak/PDF.
 * Menampilkan sumber dokumen + waktu cetak (WIB). Waktu di-render di client
 * (setelah mount) agar tidak memicu hydration mismatch.
 */
export default function CetakFooter({ dapur }: { dapur?: string }) {
  const [saat, setSaat] = useState("");
  useEffect(() => {
    setSaat(
      new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date()),
    );
  }, []);

  return (
    <div className="mt-8 flex items-center justify-between border-t border-gray-300 pt-2 text-[10px] text-gray-500">
      <span>
        Dokumen resmi{dapur ? ` SPPG ${dapur}` : ""} · Bismillah Software MBG
      </span>
      <span>{saat && `Dicetak ${saat} WIB`}</span>
    </div>
  );
}
