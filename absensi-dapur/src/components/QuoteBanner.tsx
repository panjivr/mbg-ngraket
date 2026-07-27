"use client";

import { useEffect, useState } from "react";
import { quoteAcak, type Quote } from "@/lib/quotes";

// Banner kutipan yang di-mix acak dari kolam kutipan (ratusan kutipan kerja
// keras & sukses). Berganti otomatis tiap beberapa detik + bisa diklik untuk
// mengganti manual. Render null di server agar tidak ada mismatch hidrasi.
export default function QuoteBanner({ intervalMs = 14000 }: { intervalMs?: number }) {
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    setQuote(quoteAcak());
    const t = setInterval(() => setQuote(quoteAcak()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);

  if (!quote) return null;

  return (
    <button
      type="button"
      onClick={() => setQuote(quoteAcak())}
      title="Klik untuk kutipan lain"
      className="card w-full border-emas-500/25 bg-emas-500/5 p-4 text-left transition hover:bg-emas-500/10"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-emas-300">✨ Semangat Hari Ini</p>
      <p className="mt-2 text-sm italic leading-relaxed text-slate-100">“{quote.teks}”</p>
      <p className="mt-1 text-xs text-slate-400">
        — {quote.sumber}
        {quote.kategori ? ` · ${quote.kategori}` : ""}
      </p>
    </button>
  );
}
