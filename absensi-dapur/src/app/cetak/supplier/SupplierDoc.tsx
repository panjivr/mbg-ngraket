"use client";

/**
 * Dokumen Supplier (Nota PO / Invoice) — isi-lalu-cetak, tanpa DB.
 * Fitur: upload logo, kop perusahaan editable, rincian item dengan total
 * terhitung otomatis (qty × harga), pajak & diskon, info rekening (norek),
 * dan blok catatan kecil (syarat & ketentuan) di bawah.
 * Parameter `mode` membedakan PURCHASE ORDER vs INVOICE.
 */
import { useMemo, useRef, useState } from "react";
import type { SupplierMode } from "@/lib/supplier";

const PAPERS: Record<string, { label: string; size: string }> = {
  A4: { label: "A4 (210×297)", size: "210mm 297mm" },
  F4: { label: "F4 / Folio (215×330)", size: "215mm 330mm" },
  Letter: { label: "Letter (216×279)", size: "216mm 279mm" },
  Legal: { label: "Legal (216×356)", size: "216mm 356mm" },
};

const rupiah = (n: number) =>
  "Rp " + (Number.isFinite(n) ? n : 0).toLocaleString("id-ID");

/** Parse angka dari input teks bebas (buang pemisah ribuan). */
const parseNum = (s: string): number => {
  const cleaned = (s || "").replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

interface Baris {
  id: number;
  nama: string;
  qty: string;
  satuan: string;
  harga: string;
}

function printCss(paper: string): string {
  const dim = PAPERS[paper]?.size || PAPERS.A4.size;
  return `
    @media print {
      @page { size: ${dim}; margin: 14mm; }
      .no-print { display: none !important; }
      .sheet { box-shadow: none !important; margin: 0 !important; }
      [contenteditable] { outline: none !important; }
      .fld { background: transparent !important; }
      body { background: #fff !important; }
    }
    .fld { background: #fff7cc; border-radius: 2px; }
    [contenteditable]:focus { outline: 1px dashed #9ca3af; background: #fff; }
  `;
}

/** Bidang teks editable (contentEditable), disorot kuning di layar. */
function Ed({ children, className = "", block = false }: { children?: React.ReactNode; className?: string; block?: boolean }) {
  return (
    <span
      contentEditable
      suppressContentEditableWarning
      className={`fld px-0.5 ${block ? "block" : "inline-block"} ${className}`}
    >
      {children}
    </span>
  );
}

export default function SupplierDoc({ mode, heading }: { mode: SupplierMode; heading: string }) {
  const [paper, setPaper] = useState("A4");
  const [logo, setLogo] = useState<string | null>(null);
  const [rows, setRows] = useState<Baris[]>([
    { id: 0, nama: "", qty: "", satuan: "", harga: "" },
    { id: 1, nama: "", qty: "", satuan: "", harga: "" },
    { id: 2, nama: "", qty: "", satuan: "", harga: "" },
  ]);
  const [pajakPersen, setPajakPersen] = useState("0");
  const [diskon, setDiskon] = useState("0");
  const nextId = useRef(3);
  const isInvoice = mode === "invoice";

  const setCell = (id: number, key: keyof Baris, val: string) =>
    setRows((r) => r.map((b) => (b.id === id ? { ...b, [key]: val } : b)));

  const subtotal = useMemo(
    () => rows.reduce((a, b) => a + parseNum(b.qty) * parseNum(b.harga), 0),
    [rows],
  );
  const nDiskon = parseNum(diskon);
  const dasar = Math.max(0, subtotal - nDiskon);
  const nPajak = Math.round((dasar * parseNum(pajakPersen)) / 100);
  const total = dasar + nPajak;

  const th = "border border-black px-2 py-1 text-center font-bold text-[12px]";
  const cell = "border border-black px-2 py-1 align-top text-[12px]";
  const input = "w-full bg-[#fff7cc] px-1 py-0.5 text-[12px] focus:bg-white focus:outline-1 focus:outline-dashed focus:outline-gray-400";

  return (
    <div className="min-h-screen bg-gray-200 py-6 text-black">
      <style>{printCss(paper)}</style>

      {/* Toolbar */}
      <div className="no-print mx-auto mb-4 flex max-w-[820px] flex-wrap items-center justify-between gap-3 px-4">
        <p className="text-sm text-gray-700">
          Isi bidang, unggah logo, lalu <b>Cetak</b> untuk simpan PDF. Total dihitung otomatis.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            📷 Logo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = () => setLogo(String(reader.result));
                reader.readAsDataURL(f);
              }}
            />
          </label>
          {logo && (
            <button
              type="button"
              onClick={() => setLogo(null)}
              className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-500 hover:bg-gray-50"
              title="Hapus logo"
            >
              ✕ Logo
            </button>
          )}
          <select
            value={paper}
            onChange={(e) => setPaper(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          >
            {Object.entries(PAPERS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
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

      {/* Kertas */}
      <div className="sheet mx-auto max-w-[820px] bg-white p-10 font-sans text-[13px] leading-relaxed text-black shadow-lg">
        {/* Kop perusahaan supplier */}
        <div className="flex items-start justify-between gap-4 border-b-4 border-black pb-4">
          <div className="flex items-start gap-3">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="Logo perusahaan" className="h-20 w-20 object-contain" />
            ) : (
              <div className="no-print flex h-20 w-20 items-center justify-center rounded border border-dashed border-gray-400 text-center text-[10px] text-gray-400">
                Logo
              </div>
            )}
            <div className="leading-tight">
              <p className="text-lg font-extrabold uppercase">
                <Ed>CV. NAMA SUPPLIER</Ed>
              </p>
              <p className="text-[12px]">
                <Ed block>Alamat lengkap perusahaan, Kota, Kode Pos</Ed>
              </p>
              <p className="text-[12px]">
                Telp/WA: <Ed>0812-xxxx-xxxx</Ed> · Email: <Ed>email@supplier.com</Ed>
              </p>
              <p className="text-[12px]">
                NPWP: <Ed>00.000.000.0-000.000</Ed>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold tracking-wide">{heading}</p>
            <table className="ml-auto mt-2 text-[12px]">
              <tbody>
                <tr>
                  <td className="pr-2 text-right text-gray-600">No.</td>
                  <td className="text-left">
                    <Ed>{isInvoice ? "INV/2026/001" : "PO/2026/001"}</Ed>
                  </td>
                </tr>
                <tr>
                  <td className="pr-2 text-right text-gray-600">Tanggal</td>
                  <td className="text-left"><Ed>… … 2026</Ed></td>
                </tr>
                <tr>
                  <td className="pr-2 text-right text-gray-600">
                    {isInvoice ? "Jatuh Tempo" : "Tgl Kirim"}
                  </td>
                  <td className="text-left"><Ed>… … 2026</Ed></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Ditujukan kepada */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase text-gray-500">
              {isInvoice ? "Tagihan Kepada" : "Kepada Yth."}
            </p>
            <p className="font-bold"><Ed>SPPG Ngraket Balong Ponorogo</Ed></p>
            <p className="text-[12px]"><Ed block>Alamat dapur / penerima</Ed></p>
            <p className="text-[12px]">Telp: <Ed>………</Ed></p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-gray-500">
              {isInvoice ? "Referensi" : "Metode Pengiriman"}
            </p>
            <p className="text-[12px]">
              {isInvoice ? "No. PO: " : "Ekspedisi: "}<Ed>………</Ed>
            </p>
            <p className="text-[12px]">Termin: <Ed>Tunai / Tempo 14 hari</Ed></p>
          </div>
        </div>

        {/* Rincian item */}
        <table className="mt-4 w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: "#D9E1F2" }}>
              <th className={th + " w-8"}>No</th>
              <th className={th + " text-left"}>Deskripsi Barang / Jasa</th>
              <th className={th + " w-16"}>Qty</th>
              <th className={th + " w-20"}>Satuan</th>
              <th className={th + " w-32"}>Harga</th>
              <th className={th + " w-32"}>Jumlah</th>
              <th className="no-print border border-black px-1 text-center">·</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b, idx) => {
              const jml = parseNum(b.qty) * parseNum(b.harga);
              return (
                <tr key={b.id}>
                  <td className={th + " w-8"}>{idx + 1}</td>
                  <td className={cell}>
                    <input className={input} value={b.nama} onChange={(e) => setCell(b.id, "nama", e.target.value)} placeholder="Nama barang" />
                  </td>
                  <td className={cell}>
                    <input className={input + " text-right"} value={b.qty} onChange={(e) => setCell(b.id, "qty", e.target.value)} inputMode="decimal" />
                  </td>
                  <td className={cell}>
                    <input className={input} value={b.satuan} onChange={(e) => setCell(b.id, "satuan", e.target.value)} placeholder="kg / pcs" />
                  </td>
                  <td className={cell}>
                    <input className={input + " text-right"} value={b.harga} onChange={(e) => setCell(b.id, "harga", e.target.value)} inputMode="decimal" />
                  </td>
                  <td className={cell + " text-right font-medium tabular-nums"}>{rupiah(jml)}</td>
                  <td className="no-print border border-black text-center">
                    <button type="button" onClick={() => setRows((r) => r.filter((x) => x.id !== b.id))} className="px-1 text-red-600" title="Hapus baris">×</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() => setRows((r) => [...r, { id: nextId.current++, nama: "", qty: "", satuan: "", harga: "" }])}
          className="no-print mt-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
        >
          ＋ Tambah baris
        </button>

        {/* Ringkasan total */}
        <div className="mt-3 flex justify-end">
          <table className="w-72 text-[13px]">
            <tbody>
              <tr>
                <td className="py-0.5 text-gray-600">Subtotal</td>
                <td className="py-0.5 text-right font-medium tabular-nums">{rupiah(subtotal)}</td>
              </tr>
              <tr>
                <td className="py-0.5 text-gray-600">
                  Diskon (Rp)
                  <input className="no-print ml-1 w-24 rounded border border-gray-300 px-1 text-right text-xs" value={diskon} onChange={(e) => setDiskon(e.target.value)} inputMode="decimal" />
                </td>
                <td className="py-0.5 text-right tabular-nums">− {rupiah(nDiskon)}</td>
              </tr>
              <tr>
                <td className="py-0.5 text-gray-600">
                  Pajak
                  <input className="no-print mx-1 w-12 rounded border border-gray-300 px-1 text-right text-xs" value={pajakPersen} onChange={(e) => setPajakPersen(e.target.value)} inputMode="decimal" />%
                </td>
                <td className="py-0.5 text-right tabular-nums">{rupiah(nPajak)}</td>
              </tr>
              <tr className="border-t-2 border-black">
                <td className="py-1 text-base font-extrabold">TOTAL</td>
                <td className="py-1 text-right text-base font-extrabold tabular-nums">{rupiah(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Info rekening (norek) + tanda tangan */}
        <div className="mt-5 grid grid-cols-2 gap-6">
          <div className="rounded border border-gray-300 p-3">
            <p className="text-[11px] font-bold uppercase text-gray-500">
              {isInvoice ? "Pembayaran ke Rekening" : "Informasi Rekening"}
            </p>
            <p className="mt-1 text-[12px]">Bank: <Ed>Bank …</Ed></p>
            <p className="text-[12px]">No. Rekening: <Ed>0000-0000-0000</Ed></p>
            <p className="text-[12px]">Atas Nama: <Ed>CV. Nama Supplier</Ed></p>
            <p className="mt-1 text-[12px]">Cap &amp; tanda tangan diperlukan untuk keabsahan.</p>
          </div>
          <div className="text-center text-[12px]">
            <p><Ed>Hormat kami,</Ed></p>
            <div className="h-16" />
            <p className="font-bold underline"><Ed>( Nama &amp; Jabatan )</Ed></p>
          </div>
        </div>

        {/* Catatan kecil / syarat & ketentuan */}
        <div className="mt-5 border-t border-gray-300 pt-2 text-[9px] leading-snug text-gray-600">
          <p className="mb-0.5 font-bold uppercase tracking-wide text-gray-500">Syarat &amp; Ketentuan</p>
          <Ed block className="text-[9px]">
            1. {isInvoice ? "Pembayaran dianggap sah setelah dana diterima di rekening tercantum." : "Barang dikirim sesuai spesifikasi dan jumlah pada nota ini."}
            {" "}2. Komplain atas kualitas/jumlah barang maksimal 1×24 jam sejak barang diterima.
            {" "}3. Harga sudah termasuk/belum termasuk PPN sesuai kesepakatan.
            {" "}4. {isInvoice ? "Keterlambatan pembayaran dapat dikenakan denda sesuai perjanjian." : "Perubahan pesanan harus dikonfirmasi tertulis sebelum pengiriman."}
            {" "}5. Dokumen ini sah tanpa tanda tangan basah bila dikirim secara elektronik.
            {" "}6. Barang yang sudah dibeli/dikirim sesuai pesanan tidak dapat dikembalikan kecuali cacat produksi.
          </Ed>
          <p className="mt-1 text-center text-[9px] text-gray-400">
            Dokumen dibuat dengan Bismillah Software MBG · terima kasih atas kerja samanya.
          </p>
        </div>
      </div>
    </div>
  );
}
