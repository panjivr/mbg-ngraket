"use client";

/**
 * Komponen bersama untuk semua template Berita Acara Akuntan.
 * Semua bagian yang bisa diubah memakai contentEditable (isi-lalu-cetak),
 * jadi tidak perlu form/DB terpisah. Cetak → Simpan sebagai PDF lewat browser.
 */
import {
  useState,
  useRef,
  useEffect,
  useContext,
  createContext,
  type ReactNode,
} from "react";

const PAPERS: Record<string, { label: string; size: string }> = {
  A4: { label: "A4 (210×297)", size: "210mm 297mm" },
  F4: { label: "F4 / Folio (215×330)", size: "215mm 330mm" },
  Letter: { label: "Letter (216×279)", size: "216mm 279mm" },
  Legal: { label: "Legal (216×356)", size: "216mm 356mm" },
};

const HARI = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];
const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export type TglMode = "hari" | "tanggal" | "tgl" | "bulan" | "tahun";

/** Format tanggal ISO "YYYY-MM-DD" ke bahasa Indonesia sesuai mode. */
export function formatTanggalID(iso: string, mode: TglMode): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return "";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  switch (mode) {
    case "hari":
      return HARI[dt.getUTCDay()];
    case "tanggal":
      return `${d} ${BULAN[mo - 1]} ${y}`;
    case "tgl":
      return String(d);
    case "bulan":
      return BULAN[mo - 1];
    case "tahun":
      return String(y);
  }
}

/** Tanggal dokumen aktif (YYYY-MM-DD). Kosong saat SSR → tak ada mismatch. */
const TanggalContext = createContext<string>("");

/** Tanggal "hari ini" zona Asia/Jakarta sebagai "YYYY-MM-DD". */
function todayJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Tanggal otomatis yang mengikuti tanggal dokumen (dipilih di toolbar,
 * default hari ini). Server merender kosong, klien mengisi setelah mount.
 */
export function Tgl({ mode = "tanggal" }: { mode?: TglMode }) {
  const iso = useContext(TanggalContext);
  return (
    <span className="fld inline-block rounded-[2px] px-0.5">
      {formatTanggalID(iso, mode)}
    </span>
  );
}

/** CSS cetak bersama untuk PrintFrame & SavedViewer. */
function printCss(paper: string): string {
  return `
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
  `;
}

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

/**
 * Kerangka halaman cetak: toolbar (kertas + tanggal + simpan + cetak) + kertas
 * putih. Tombol "Simpan" mengarsipkan HTML dokumen ke tabel berita_acara supaya
 * bisa dibuka/cetak ulang per tanggal. Tanggal default = hari ini (Asia/Jakarta)
 * dan semua komponen <Tgl/> di dalam dokumen mengikuti nilai ini.
 */
export function PrintFrame({
  heading,
  nomor,
  slug,
  judul,
  children,
}: {
  heading: string;
  nomor: string;
  slug: string;
  judul: string;
  children: ReactNode;
}) {
  const [paper, setPaper] = useState("A4");
  const [tanggal, setTanggal] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const sheetRef = useRef<HTMLDivElement>(null);

  // Isi tanggal hari ini setelah mount (hindari mismatch hidrasi server/klien).
  useEffect(() => {
    setTanggal(todayJakarta());
  }, []);

  const simpan = async () => {
    const node = sheetRef.current;
    if (!node || !tanggal || saving) return;
    setSaving(true);
    setMsg("");
    try {
      // Serialisasi isi dokumen tanpa elemen kontrol (.no-print).
      const clone = node.cloneNode(true) as HTMLElement;
      clone.querySelectorAll(".no-print").forEach((el) => el.remove());
      const res = await fetch("/api/admin/akuntan/ba", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          judul,
          nomor,
          tanggal,
          konten_html: clone.innerHTML,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan.");
      setMsg("✓ Tersimpan ke arsip.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-200 py-6 text-black">
      <style>{printCss(paper)}</style>

      <div className="no-print mx-auto mb-4 flex max-w-[820px] flex-wrap items-center justify-between gap-3 px-4">
        <p className="text-sm text-gray-700">
          Isi bidang kuning. Klik <b>Simpan</b> untuk arsip, atau <b>Cetak</b>{" "}
          untuk PDF.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-600">Tanggal</label>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          />
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
            type="button"
            onClick={simpan}
            disabled={saving || !tanggal}
            className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : "💾 Simpan"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            🖨️ Cetak / PDF
          </button>
        </div>
        {msg && (
          <p className="w-full text-right text-sm text-gray-700">{msg}</p>
        )}
      </div>

      <TanggalContext.Provider value={tanggal}>
        <div
          ref={sheetRef}
          className="sheet mx-auto max-w-[820px] bg-white p-10 font-serif text-[13px] leading-relaxed text-black shadow-lg"
        >
          <Kop heading={heading} nomor={nomor} />
          <div className="mt-5">{children}</div>
        </div>
      </TanggalContext.Provider>
    </div>
  );
}

/**
 * Penampil BA tersimpan: merender konten_html (sudah disanitasi saat disimpan)
 * di dalam kertas putih dengan toolbar cetak. Dipakai halaman
 * /cetak/akuntan/tersimpan/[id].
 */
export function SavedViewer({ html }: { html: string }) {
  const [paper, setPaper] = useState("A4");
  return (
    <div className="min-h-screen bg-gray-200 py-6 text-black">
      <style>{printCss(paper)}</style>

      <div className="no-print mx-auto mb-4 flex max-w-[820px] flex-wrap items-center justify-between gap-3 px-4">
        <a href="/admin/akuntan/arsip" className="text-sm text-gray-700 underline">
          ← Kembali ke arsip
        </a>
        <div className="flex items-center gap-2">
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
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            🖨️ Cetak / PDF
          </button>
        </div>
      </div>

      <div
        className="sheet mx-auto max-w-[820px] bg-white p-10 font-serif text-[13px] leading-relaxed text-black shadow-lg"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
