"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FOTO_SLOTS, type LaporanIsi, type LaporanFoto } from "@/lib/laporan";

interface LaporanData {
  tanggal: string;
  sppg: { nama: string; alamat: string; kepala_sppg: string };
  isi: LaporanIsi;
  foto: LaporanFoto;
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
const D = (t: string) => new Date(t + "T00:00:00");
const hari = (t: string) => new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(D(t));
const tglLong = (t: string) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(D(t));

/** Satu foto dengan rasio seragam (4:3) apapun ukuran aslinya. */
function FotoImg({ src, alt, ratio = "4/3" }: { src: string; alt: string; ratio?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="w-full rounded-sm border border-gray-300 object-cover" style={{ aspectRatio: ratio }} />;
}
/** Deret foto (semua rasio sama); kolom tetap agar rapi walau jumlah foto berbeda. */
function FotoRow({ srcs, cols, alt, ratio = "4/3" }: { srcs: string[]; cols: number; alt: string; ratio?: string }) {
  if (!srcs.length) return <div className="flex h-24 items-center justify-center text-xs text-gray-400">(belum ada foto)</div>;
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {srcs.map((s, i) => <FotoImg key={i} src={s} alt={`${alt} ${i + 1}`} ratio={ratio} />)}
    </div>
  );
}

function Inner() {
  const sp = useSearchParams();
  const tanggal = /^\d{4}-\d{2}-\d{2}$/.test(sp.get("tanggal") || "") ? sp.get("tanggal")! : jakartaToday();
  const [data, setData] = useState<LaporanData | null>(null);
  const [err, setErr] = useState(false);
  const [paper, setPaper] = useState("A4");

  useEffect(() => {
    fetch(`/api/admin/laporan?tanggal=${tanggal}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: LaporanData) => setData(d))
      .catch(() => setErr(true));
  }, [tanggal]);

  if (err) return <p className="p-8 text-center">Gagal memuat laporan.</p>;
  if (!data) return <p className="p-8 text-center">Memuat…</p>;

  const { isi, foto, sppg } = data;
  const namaSppg = (sppg.nama || "").replace(/^SPPG\s+/i, "");
  const alamat = sppg.alamat || "Jl. Raya Balong - Ngumpul, Desa Ngraket, Kecamatan Balong, Kabupaten Ponorogo";
  const mt = isi.menu_tabel;
  const menuRows = Math.max(mt.besar.length, mt.kecil.length, mt.busui_bumil.length, mt.balita.length);
  const totalPersonel = isi.personel.reduce((a, p) => a + (p.jumlah || 0), 0);
  const half = Math.ceil(isi.personel.length / 2);
  const kiri = isi.personel.slice(0, half);
  const kanan = isi.personel.slice(half);
  const cell = "border border-black px-2 py-1 align-top";
  const th = "border border-black px-2 py-1 text-center";
  const blue = { backgroundColor: "#8EAADB" };

  return (
    <div className="min-h-screen bg-white py-6 text-black">
      <style>{`@media print{@page{size:${PAPERS[paper]?.size || PAPERS.A4.size};margin:14mm}.no-print{display:none}}`}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[800px] flex-wrap items-center justify-between gap-3 px-4">
        <p className="text-sm text-gray-600">Laporan Kegiatan Harian · {hari(tanggal)}, {tglLong(tanggal)}</p>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Ukuran kertas</label>
          <select value={paper} onChange={(e) => setPaper(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
            {Object.entries(PAPERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={() => window.print()} className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">🖨️ Cetak / Simpan PDF</button>
        </div>
      </div>

      <div className="mx-auto max-w-[800px] bg-white p-8 font-serif text-black">
        {/* Kop */}
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bgn-logo.webp" alt="Logo BGN" className="absolute left-0 top-1/2 h-16 w-16 -translate-y-1/2 object-contain" />
          <div className="px-20 text-center leading-snug">
            <p className="text-base font-bold">LAPORAN KEGIATAN HARIAN</p>
            <p className="text-sm font-bold">SPPG {namaSppg.toUpperCase()}</p>
            <p className="text-xs">{alamat}</p>
          </div>
          <div className="mt-2 border-b-4 border-black" />
        </div>

        {/* Info */}
        <table className="mt-4 text-sm">
          <tbody>
            <tr><td className="w-36 align-top">Hari/Tanggal</td><td className="align-top">: {hari(tanggal)}, {tglLong(tanggal)}</td></tr>
            <tr><td className="align-top">Menu Hari Ini</td><td className="align-top">: {isi.menu_teks || "-"}</td></tr>
          </tbody>
        </table>

        {/* Foto menu (2 foto) — di atas rincian menu */}
        {foto.menu.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-sm font-bold">Foto Menu</p>
            <FotoRow srcs={foto.menu} cols={2} alt="Foto Menu" ratio="4/5" />
          </div>
        )}

        {/* Menu tabel per penerima */}
        <table className="mt-3 w-full border-collapse text-sm">
          <thead>
            <tr style={blue} className="font-bold">
              <th className={th}>No</th>
              <th className={th}>Serdik Besar</th>
              <th className={th}>Serdik Kecil</th>
              <th className={th}>Busui &amp; Bumil</th>
              <th className={th}>Balita</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: menuRows }).map((_, i) => (
              <tr key={i}>
                <td className={th}>{i + 1}</td>
                <td className={cell}>{mt.besar[i] || ""}</td>
                <td className={cell}>{mt.kecil[i] || ""}</td>
                <td className={cell}>{mt.busui_bumil[i] || ""}</td>
                <td className={cell}>{mt.balita[i] || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Kehadiran personel */}
        <p className="mt-5 text-sm font-bold">Kehadiran Personel:</p>
        <table className="mt-1 w-full border-collapse text-sm">
          <thead>
            <tr style={blue} className="font-bold">
              <th className={th}>No.</th><th className={th}>Personil</th><th className={th}>Jumlah</th>
              <th className={th}>No.</th><th className={th}>Personil</th><th className={th}>Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {kiri.map((p, i) => {
              const r = kanan[i];
              return (
                <tr key={i}>
                  <td className={th}>{i + 1}</td>
                  <td className={cell}>{p.label}</td>
                  <td className={cell}>{p.jumlah} Orang</td>
                  {r ? (
                    <>
                      <td className={th}>{half + i + 1}</td>
                      <td className={cell}>{r.label}</td>
                      <td className={cell}>{r.jumlah} Orang</td>
                    </>
                  ) : (
                    <><td className={cell}></td><td className={cell}></td><td className={cell}></td></>
                  )}
                </tr>
              );
            })}
            <tr className="font-bold" style={blue}>
              <td className={th} colSpan={5}>Jumlah</td>
              <td className={cell}>{totalPersonel} Orang</td>
            </tr>
          </tbody>
        </table>

        {/* Rangkaian kegiatan */}
        <p className="mt-5 text-sm font-bold">Rangkaian Kegiatan:</p>
        <ol className="ml-6 list-decimal text-sm">
          {isi.kegiatan.map((k, i) => <li key={i} className="py-0.5">{k}</li>)}
        </ol>

        {/* Kendala & solusi */}
        <p className="mt-4 text-sm font-bold">Kendala:</p>
        <p className="text-justify text-sm">{isi.kendala}</p>
        <p className="mt-3 text-sm font-bold">Solusi:</p>
        <p className="text-justify text-sm">{isi.solusi}</p>

        {/* Dokumentasi foto */}
        <p className="mt-5 text-sm font-bold">Dokumentasi Kegiatan:</p>
        <table className="mt-1 w-full border-collapse text-sm">
          <tbody>
            {FOTO_SLOTS.filter((s) => s.key !== "menu").map((s) => (
              <tr key={s.key}>
                <td className={cell + " w-40 font-bold"}>{s.label}</td>
                <td className={cell}><FotoRow srcs={foto[s.key]} cols={3} alt={s.label} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs italic">*Foto kegiatan dikirim dari Koordinator masing-masing divisi beserta kendala dan solusi.</p>
      </div>
    </div>
  );
}

export default function CetakLaporanPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center">Memuat…</p>}>
      <Inner />
    </Suspense>
  );
}
