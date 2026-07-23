"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface DokData {
  tanggal: string;
  kegiatan: string;
  foto: string[];
}

const PAPERS: Record<string, { label: string; size: string }> = {
  A4: { label: "A4 (210×297)", size: "210mm 297mm" },
  F4: { label: "F4 / Folio (215×330)", size: "215mm 330mm" },
  Letter: { label: "Letter (216×279)", size: "216mm 279mm" },
  Legal: { label: "Legal (216×356)", size: "216mm 356mm" },
};

function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
const tglUpper = (t: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(t + "T00:00:00")).toUpperCase();

function Inner() {
  const sp = useSearchParams();
  const tanggal = /^\d{4}-\d{2}-\d{2}$/.test(sp.get("tanggal") || "") ? sp.get("tanggal")! : jakartaToday();
  const kegiatan = sp.get("kegiatan") || "";
  const [data, setData] = useState<DokData | null>(null);
  const [err, setErr] = useState(false);
  const [paper, setPaper] = useState("A4");

  useEffect(() => {
    fetch(`/api/admin/dokumentasi?tanggal=${tanggal}&kegiatan=${encodeURIComponent(kegiatan)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: DokData) => setData(d))
      .catch(() => setErr(true));
  }, [tanggal, kegiatan]);

  if (err) return <p className="p-8 text-center">Gagal memuat dokumentasi.</p>;
  if (!data) return <p className="p-8 text-center">Memuat…</p>;

  const foto = data.foto || [];
  // 12 foto per halaman (grid 4 kolom × 3 baris) — aman untuk A4 & F4.
  const pages: string[][] = [];
  for (let i = 0; i < foto.length; i += 12) pages.push(foto.slice(i, i + 12));
  if (pages.length === 0) pages.push([]);

  return (
    <div className="min-h-screen bg-white py-6 text-black">
      <style>{`@media print{@page{size:${PAPERS[paper]?.size || PAPERS.A4.size};margin:12mm}.no-print{display:none}.doc{page-break-after:always}}.doc:last-child{page-break-after:auto}`}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[800px] flex-wrap items-center justify-between gap-3 px-4">
        <p className="text-sm text-gray-600">{foto.length} foto · {pages.length} halaman · {kegiatan || "—"}</p>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Ukuran kertas</label>
          <select value={paper} onChange={(e) => setPaper(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
            {Object.entries(PAPERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={() => window.print()} className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">🖨️ Cetak / Simpan PDF</button>
        </div>
      </div>

      {pages.map((pageFotos, pi) => (
        <div key={pi} className="doc mx-auto mb-6 max-w-[760px] bg-white p-8 font-serif text-black">
          <h1 className="text-center text-xl font-bold">DOKUMENTASI FOTO KEGIATAN</h1>
          <p className="mt-3 text-center text-sm italic">Kegiatan: {kegiatan || "________________"}</p>
          <p className="text-center text-sm italic">Tanggal: {tglUpper(tanggal)}</p>
          <div className="mt-4 py-2 text-center text-sm font-bold text-white" style={{ backgroundColor: "#5b7a99" }}>
            Foto / Dokumentasi{pages.length > 1 ? ` (Halaman ${pi + 1}/${pages.length})` : ""}
          </div>
          {foto.length === 0 ? (
            <p className="py-10 text-center text-gray-500">Belum ada foto. Unggah di halaman Dokumentasi Foto Kegiatan.</p>
          ) : (
            <GridRightLast fotos={pageFotos} />
          )}
        </div>
      ))}
    </div>
  );
}

/** Grid 4 kolom; baris terakhir yang belum penuh dibuat rata kanan. */
function GridRightLast({ fotos }: { fotos: string[] }) {
  const rem = fotos.length % 4;
  const fullCount = fotos.length - rem;
  const full = fotos.slice(0, fullCount);
  const last = rem ? fotos.slice(fullCount) : [];
  const pad = rem ? 4 - rem : 0;
  const cls = "aspect-[3/4] w-full border border-gray-300 object-cover";
  return (
    <div className="mt-3 grid grid-cols-4 gap-2">
      {/* eslint-disable @next/next/no-img-element */}
      {full.map((src, i) => <img key={i} src={src} alt={`Foto ${i + 1}`} className={cls} />)}
      {Array.from({ length: pad }).map((_, i) => <div key={"pad" + i} />)}
      {last.map((src, i) => <img key={"l" + i} src={src} alt={`Foto ${fullCount + i + 1}`} className={cls} />)}
      {/* eslint-enable @next/next/no-img-element */}
    </div>
  );
}

export default function CetakDokumentasiPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center">Memuat…</p>}>
      <Inner />
    </Suspense>
  );
}
