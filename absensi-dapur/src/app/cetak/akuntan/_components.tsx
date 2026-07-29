"use client";

/**
 * Komponen bersama untuk semua template Berita Acara Akuntan.
 * Semua bagian yang bisa diubah memakai contentEditable (isi-lalu-cetak),
 * jadi tidak perlu form/DB terpisah. Cetak → Simpan sebagai PDF lewat browser.
 */
import { useState, useRef, type ReactNode } from "react";

const PAPERS: Record<string, { label: string; size: string }> = {
  A4: { label: "A4 (210×297)", size: "210mm 297mm" },
  F4: { label: "F4 / Folio (215×330)", size: "215mm 330mm" },
  Letter: { label: "Letter (216×279)", size: "216mm 279mm" },
  Legal: { label: "Legal (216×356)", size: "216mm 356mm" },
};

/** Bidang teks yang bisa diedit langsung di dokumen (disorot kuning di layar). */
export function Ed({
  children,
  className = "",
  block = false,
}: {
  children?: ReactNode;
  className?: string;
  block?: boolean;
}) {
  return (
    <span
      contentEditable
      suppressContentEditableWarning
      className={`fld rounded-[2px] px-0.5 ${block ? "block" : "inline-block"} ${className}`}
    >
      {children}
    </span>
  );
}

/** Kop surat dengan logo BGN + judul dokumen + nomor (mengikuti pola /cetak/laporan). */
export function Kop({ heading, nomor }: { heading: string; nomor: string }) {
  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/bgn-logo.webp"
        alt="Logo BGN"
        className="absolute left-0 top-1/2 h-16 w-16 -translate-y-1/2 object-contain"
      />
      <div className="px-20 text-center leading-snug">
        <p className="text-[15px] font-bold uppercase">
          <Ed>{heading}</Ed>
        </p>
        <p className="text-sm font-bold uppercase">
          <Ed>SPPG NGRAKET BALONG PONOROGO</Ed>
        </p>
        <p className="text-xs">
          Nomor : <Ed>{nomor || "…/BA-SPPG/…/2026"}</Ed>
        </p>
      </div>
      <div className="mt-2 border-b-4 border-black" />
    </div>
  );
}

/** Blok tanda tangan 2 kolom (peran + nama, keduanya bisa diedit). */
export function TTD({
  kiri,
  kanan,
}: {
  kiri: { peran: string; nama: string };
  kanan: { peran: string; nama: string };
}) {
  const Kolom = ({ peran, nama }: { peran: string; nama: string }) => (
    <td className="w-1/2 text-center align-top">
      <p className="whitespace-pre-line">
        <Ed>{peran}</Ed>
      </p>
      <div className="h-16" />
      <p className="font-bold underline">
        <Ed>{nama}</Ed>
      </p>
    </td>
  );
  return (
    <table className="mt-6 w-full text-sm">
      <tbody>
        <tr>
          <Kolom {...kiri} />
          <Kolom {...kanan} />
        </tr>
      </tbody>
    </table>
  );
}

/**
 * Tabel yang barisnya bisa ditambah/dihapus. Sel memakai contentEditable
 * (tak terkontrol) — keyed by id stabil supaya isi ketikan tidak hilang saat
 * baris lain ditambah/dihapus. Kolom "No" otomatis mengikuti urutan.
 */
export function TabelEditable({
  headers,
  baris = 3,
  autoNo = true,
  lastRowLabel,
}: {
  headers: string[];
  baris?: number;
  /** Kolom pertama jadi nomor urut otomatis (non-edit). */
  autoNo?: boolean;
  /** Bila diisi, tambahkan baris terakhir statis (mis. "TOTAL") yang tak ikut nomor. */
  lastRowLabel?: string;
}) {
  const [rows, setRows] = useState<number[]>(() =>
    Array.from({ length: baris }, (_, i) => i),
  );
  const nextId = useRef(baris);
  const dataCols = autoNo ? headers.length - 1 : headers.length;

  const cell = "border border-black px-2 py-1 align-top";
  const th = "border border-black px-2 py-1 text-center font-bold";

  return (
    <div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr style={{ backgroundColor: "#D9E1F2" }}>
            {headers.map((h, i) => (
              <th key={i} className={th}>
                {h}
              </th>
            ))}
            <th className="no-print border border-black px-1 text-center">·</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((id, idx) => (
            <tr key={id}>
              {autoNo && <td className={th + " w-10"}>{idx + 1}</td>}
              {Array.from({ length: dataCols }).map((_, c) => (
                <td key={c} className={cell}>
                  <Ed block />
                </td>
              ))}
              <td className="no-print border border-black text-center">
                <button
                  type="button"
                  onClick={() => setRows((r) => r.filter((x) => x !== id))}
                  className="px-1 text-red-600"
                  title="Hapus baris"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
          {lastRowLabel && (
            <tr className="font-bold" style={{ backgroundColor: "#F2F2F2" }}>
              <td className={th} colSpan={headers.length - 1}>
                {lastRowLabel}
              </td>
              <td className={cell}>
                <Ed block />
              </td>
              <td className="no-print border border-black" />
            </tr>
          )}
        </tbody>
      </table>
      <button
        type="button"
        onClick={() => {
          const id = nextId.current++;
          setRows((r) => [...r, id]);
        }}
        className="no-print mt-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
      >
        ＋ Tambah baris
      </button>
    </div>
  );
}

/** Kerangka halaman cetak: toolbar (pilih kertas + cetak) + kertas putih A4. */
export function PrintFrame({
  heading,
  nomor,
  children,
}: {
  heading: string;
  nomor: string;
  children: ReactNode;
}) {
  const [paper, setPaper] = useState("A4");
  return (
    <div className="min-h-screen bg-gray-200 py-6 text-black">
      <style>{`
        @media print {
          @page { size: ${PAPERS[paper]?.size || PAPERS.A4.size}; margin: 16mm; }
          .no-print { display: none !important; }
          .fld { background: transparent !important; }
          [contenteditable] { outline: none !important; }
          .sheet { box-shadow: none !important; margin: 0 !important; }
          body { background: #fff !important; }
        }
        .fld { background: #fff7cc; min-width: 1ch; }
        [contenteditable]:focus { outline: 1px dashed #9ca3af; background: #fff; }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-[820px] flex-wrap items-center justify-between gap-3 px-4">
        <p className="text-sm text-gray-700">
          Isi bidang kuning lalu klik cetak. Simpan sebagai PDF dari dialog cetak.
        </p>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Kertas</label>
          <select
            value={paper}
            onChange={(e) => setPaper(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          >
            {Object.entries(PAPERS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            🖨️ Cetak / Simpan PDF
          </button>
        </div>
      </div>

      <div className="sheet mx-auto max-w-[820px] bg-white p-10 font-serif text-[13px] leading-relaxed text-black shadow-lg">
        <Kop heading={heading} nomor={nomor} />
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
