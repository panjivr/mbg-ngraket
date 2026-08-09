"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Angka statistik dengan animasi count-up (0 → nilai) memakai easeOutCubic.
 * Menghormati prefers-reduced-motion: langsung tampil tanpa animasi. Saat nilai
 * berubah (mis. setelah "Segarkan"), animasi berjalan dari nilai lama ke baru.
 *
 * format() dipakai untuk durasi/rupiah — dipanggil pada nilai antara sehingga
 * angka ikut "berjalan". Bila value null → tampil placeholder "–".
 */
function reduced(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

export default function AnimatedNumber({
  value,
  duration = 900,
  format,
  className,
  placeholder = "–",
}: {
  value: number | null;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
  placeholder?: string;
}) {
  const [shown, setShown] = useState<number>(value ?? 0);
  const fromRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (value == null) return;
    const to = value;
    const from = fromRef.current;

    if (reduced() || from === to) {
      setShown(to);
      fromRef.current = to;
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setShown(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  if (value == null) return <span className={className}>{placeholder}</span>;
  const text = format ? format(shown) : Math.round(shown).toLocaleString("id-ID");
  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {text}
    </span>
  );
}
