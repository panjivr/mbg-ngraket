"use client";

import { Suspense, use, useEffect, useState } from "react";
import LoginCard, { type LoginBrand } from "@/components/LoginCard";
import JenisThemeSetter from "@/components/JenisThemeSetter";

/**
 * Halaman login berbranding per-unit: /masuk/<id-unit>. Mengambil nama, jenis,
 * & logo unit dari endpoint publik, lalu menampilkan kartu login bertema sesuai
 * unit. Untuk perusahaan → tema korporat (grafit/indigo) + logo perusahaan,
 * tanpa lambang BGN — link & tampilannya jelas berbeda dengan dapur.
 */
export default function MasukUnitPage({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = use(params);
  const [brand, setBrand] = useState<LoginBrand | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/public/unit/${encodeURIComponent(kode)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!alive) return;
        setBrand({ nama: d.unit?.nama, jenis: d.unit?.jenis, logoUrl: d.unit?.logo_url });
      })
      .catch(() => alive && setNotFound(true));
    return () => {
      alive = false;
    };
  }, [kode]);

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      {brand?.jenis && <JenisThemeSetter jenis={brand.jenis} />}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-1 bg-gradient-to-r from-emas-500 via-gold-500 to-emas-500" />
      {notFound ? (
        <div className="card w-full max-w-sm p-7 text-center text-slate-400">
          Unit tidak ditemukan. <a href="/login" className="text-gold-400">Masuk di portal umum →</a>
        </div>
      ) : !brand ? (
        <div className="card w-full max-w-sm p-7 text-center text-slate-400">Memuat…</div>
      ) : (
        <Suspense fallback={<div className="card w-full max-w-sm p-7 text-center text-slate-400">Memuat…</div>}>
          <LoginCard brand={brand} />
        </Suspense>
      )}
    </main>
  );
}
