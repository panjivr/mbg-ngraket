"use client";

import { Fragment, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { MenuGrup } from "@/lib/distribusi-types";

interface Baris {
  penerima_id: number;
  jenis: "serdik" | "b3";
  nama: string;
  jenjang: string;
  jam_kirim: string;
  besar: number;
  kecil: number;
  b3: number;
  pj: number;
  ikut: boolean;
}
interface DistData {
  tanggal: string;
  sppg: { nama: string; kepala_sppg: string; alamat: string; ahli_gizi: string; koordinator: string };
  distribusi: { driver: string; menu: string; catatan: string; menu_sekolah: MenuGrup[]; menu_posyandu: MenuGrup[] };
  baris: Baris[];
}

const PAPERS: Record<string, { label: string; size: string }> = {
  A4: { label: "A4 (210×297)", size: "210mm 297mm" },
  F4: { label: "F4 / Folio (215×330)", size: "215mm 330mm" },
  Letter: { label: "Letter (216×279)", size: "216mm 279mm" },
  Legal: { label: "Legal (216×356)", size: "216mm 356mm" },
};

function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}
const D = (t: string) => new Date(t + "T00:00:00");
const hari = (t: string) => new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(D(t));
const tglLong = (t: string) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(D(t));
const tglSlash = (t: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).format(D(t)).replace(/\//g, "/");

/** Rincian "Kelas" pada Surat Jalan: Besar/Kecil/Guru untuk sekolah, B3 untuk posyandu. */
function kelasRows(s: Baris): { kelas: string; porsi: number }[] {
  if (s.jenis === "b3") return s.b3 > 0 ? [{ kelas: "B3", porsi: s.b3 }] : [];
  const r: { kelas: string; porsi: number }[] = [];
  if (s.besar > 0) r.push({ kelas: "Besar", porsi: s.besar });
  if (s.kecil > 0) r.push({ kelas: "Kecil", porsi: s.kecil });
  if (s.pj > 0) r.push({ kelas: "Guru", porsi: s.pj });
  return r;
}

function Ttd({ kiri, kanan }: { kiri: React.ReactNode; kanan: React.ReactNode }) {
  return (
    <div className="mt-6 flex justify-between text-sm">
      <div className="w-1/2 pr-4">{kiri}</div>
      <div className="w-1/2 pl-4 text-center">{kanan}</div>
    </div>
  );
}

/** Kop surat resmi Badan Gizi Nasional (logo + 3 baris + garis tebal). */
function KopBGN() {
  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/bgn-logo.webp" alt="Logo BGN" className="absolute left-0 top-1/2 h-16 w-16 -translate-y-1/2 object-contain" />
      <div className="px-20 text-center leading-snug">
        <p className="text-sm font-bold">BADAN GIZI NASIONAL (<span className="italic">NATIONAL NUTRITION AGENCY</span>)</p>
        <p className="text-sm font-bold">SATUAN PELAYANAN PEMENUHAN GIZI</p>
        <p className="text-sm font-bold">KABUPATEN PONOROGO BALONG NGRAKET</p>
      </div>
      <div className="mt-2 border-b-4 border-black" />
    </div>
  );
}

/** Isi tabel Uji Organoleptik: grup menu + item bernomor (indikator kosong untuk dicentang). */
function OrgTableBody({ grup }: { grup: MenuGrup[] }) {
  const pakai = grup.filter((g) => (g.judul && g.judul.trim()) || g.items.some((i) => i.trim()));
  const cell = "border border-black px-2 py-1";
  if (pakai.length === 0) {
    // Template kosong: 6 baris untuk diisi tangan.
    return (
      <tbody>
        {Array.from({ length: 6 }).map((_, i) => (
          <tr key={i}>
            <td className={cell + " text-center"}>{i + 1}</td>
            <td className={cell}></td>
            {Array.from({ length: 8 }).map((_, j) => <td key={j} className={cell}></td>)}
          </tr>
        ))}
      </tbody>
    );
  }
  return (
    <tbody>
      {pakai.map((g, gi) => (
        <Fragment key={gi}>
          <tr>
            <td className={cell}></td>
            <td className={cell + " text-left font-bold"}>{g.judul}</td>
            {Array.from({ length: 8 }).map((_, j) => <td key={j} className={cell}></td>)}
          </tr>
          {g.items.filter((it) => it.trim()).map((it, ii) => (
            <tr key={ii}>
              <td className={cell + " text-center"}>{ii + 1}</td>
              <td className={cell + " text-left"}>{it}</td>
              {Array.from({ length: 8 }).map((_, j) => <td key={j} className={cell}></td>)}
            </tr>
          ))}
        </Fragment>
      ))}
    </tbody>
  );
}

function Inner() {
  const sp = useSearchParams();
  const tanggal = /^\d{4}-\d{2}-\d{2}$/.test(sp.get("tanggal") || "") ? sp.get("tanggal")! : jakartaToday();
  const dok = sp.get("dok") || "semua";
  const [data, setData] = useState<DistData | null>(null);
  const [err, setErr] = useState(false);
  const [paper, setPaper] = useState("A4");

  useEffect(() => {
    fetch(`/api/admin/distribusi?tanggal=${tanggal}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: DistData) => setData(d))
      .catch(() => setErr(true));
  }, [tanggal]);

  if (err) return <p className="p-8 text-center">Gagal memuat data distribusi.</p>;
  if (!data) return <p className="p-8 text-center">Memuat…</p>;

  const sppg = data.sppg;
  const serdik = data.baris.filter((b) => b.jenis === "serdik" && b.ikut && b.besar + b.kecil > 0);
  const b3 = data.baris.filter((b) => b.jenis === "b3" && b.ikut && b.b3 > 0);
  const showBast = dok === "bast" || dok === "semua";
  const showSJ = dok === "surat-jalan" || dok === "semua";
  const showOrg = dok === "organoleptik" || dok === "semua";
  const sppgLine = ("SPPG " + (sppg.nama || "").replace(/^SPPG\s+/i, "")).toUpperCase();

  return (
    <div className="min-h-screen bg-white py-6 text-black">
      <style>{`@media print{@page{size:${PAPERS[paper]?.size || PAPERS.A4.size};margin:14mm}.no-print{display:none}.doc{page-break-after:always}}.doc:last-child{page-break-after:auto}`}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[760px] flex-wrap items-center justify-between gap-3 px-4">
        <p className="text-sm text-gray-600">{serdik.length} sekolah · {b3.length} posyandu · {tglLong(tanggal)}</p>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Ukuran kertas</label>
          <select value={paper} onChange={(e) => setPaper(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
            {Object.entries(PAPERS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button onClick={() => window.print()} className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">
            🖨️ Cetak / Simpan PDF
          </button>
        </div>
      </div>

      {/* ===== BAST per sekolah ===== */}
      {showBast && serdik.map((s) => {
        const jml = s.besar + s.kecil;
        return (
          <div key={"bast-" + s.penerima_id} className="doc mx-auto mb-6 max-w-[720px] border border-gray-300 p-8 font-serif leading-relaxed shadow-sm">
            <h2 className="text-center text-sm font-bold uppercase">Berita Acara Penerimaan Paket Makanan Program Makan Bergizi Gratis</h2>
            <h3 className="mb-4 text-center text-sm font-bold">Satuan Pelayanan Pemenuhan Gizi (SPPG) {sppg.nama}</h3>
            <p className="text-justify text-sm">
              Pada Hari {hari(tanggal)} Tanggal {tglSlash(tanggal)} jam ______ telah diterima paket makanan sejumlah:{" "}
              <b>{jml} Paket</b> Makanan Bergizi dari Satuan Pelayanan Pemenuhan Gizi (SPPG) {sppg.nama}, yang melayani{" "}
              <b>{s.nama}</b>. Baik dimakan sebelum jam ______
            </p>
            <p className="mt-3 text-sm">Yang menyerahkan : ______________________</p>
            <p className="text-sm">Nomor Telepon &nbsp;&nbsp;: ______________________</p>
            <Ttd
              kiri={<>Mengetahui,<br /><br /><br /><b>{sppg.kepala_sppg || "____________"}</b><br />Kepala SPPG {sppg.nama}</>}
              kanan={<>Diterima oleh,<br /><br /><br />(________________)<br />Nama PIC Sekolah Penerima</>}
            />
            <hr className="my-5 border-gray-400" />
            <h3 className="text-center text-sm font-bold uppercase">Berita Acara Pengembalian Alat Makan (Ompreng)</h3>
            <p className="mt-3 text-justify text-sm">
              Pada Hari {hari(tanggal)} Tanggal {tglSlash(tanggal)} jam ______ telah diserahkan kembali ompreng sejumlah:{" "}
              <b>{jml}</b> dari {s.nama} kepada SPPG {sppg.nama}.
            </p>
            <p className="mt-3 text-sm">Yang menyerahkan : ______________________ (Nama PIC Sekolah)</p>
          </div>
        );
      })}

      {/* ===== Surat Jalan per penerima ===== */}
      {showSJ && [...serdik, ...b3].map((s) => {
        const rows = kelasRows(s);
        const totalPorsi = rows.reduce((a, r) => a + r.porsi, 0);
        const pad = Math.max(0, 5 - rows.length);
        return (
          <div key={"sj-" + s.penerima_id} className="doc mx-auto mb-6 max-w-[720px] bg-white p-10 font-serif text-black">
            <div className="text-center leading-snug">
              <p className="text-base font-bold">SURAT JALAN</p>
              <p className="text-base font-bold">PROGRAM MAKAN BERGIZI GRATIS</p>
              <p className="text-base font-bold">{sppgLine}</p>
            </div>
            <div className="mt-1 border-b-4 border-black" />

            <div className="mt-6 flex justify-between text-sm">
              <div className="pt-1">Kepada : {s.nama}</div>
              <table className="text-sm">
                <tbody>
                  <tr><td className="pr-4">Hari / Tanggal</td><td>: {tglSlash(tanggal)}</td></tr>
                  <tr><td className="pr-4">Waktu Pengiriman</td><td>: {s.jam_kirim || ""}</td></tr>
                  <tr><td className="pr-4">Driver</td><td>: {data.distribusi.driver || ""}</td></tr>
                </tbody>
              </table>
            </div>

            <table className="mt-6 w-full border-collapse text-center text-sm">
              <thead>
                <tr className="bg-[#dbe5f1]">
                  <th rowSpan={2} className="border border-black px-2 py-1">No</th>
                  <th rowSpan={2} className="border border-black px-2 py-1">Kelas</th>
                  <th rowSpan={2} className="border border-black px-2 py-1">Jumlah<br />Porsi</th>
                  <th colSpan={2} className="border border-black px-2 py-1">Jumlah Packaging</th>
                  <th rowSpan={2} className="border border-black px-2 py-1">Keterangan</th>
                </tr>
                <tr className="bg-[#dbe5f1]">
                  <th className="border border-black px-2 py-1">Sebelum</th>
                  <th className="border border-black px-2 py-1">Sesudah</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.kelas}>
                    <td className="border border-black px-2 py-1">{i + 1}</td>
                    <td className="border border-black px-2 py-1">{r.kelas}</td>
                    <td className="border border-black px-2 py-1">{r.porsi}</td>
                    <td className="border border-black px-2 py-1"></td>
                    <td className="border border-black px-2 py-1"></td>
                    <td className="border border-black px-2 py-1"></td>
                  </tr>
                ))}
                {Array.from({ length: pad }).map((_, i) => (
                  <tr key={"pad" + i}>
                    <td className="border border-black px-2 py-3"></td>
                    <td className="border border-black"></td>
                    <td className="border border-black"></td>
                    <td className="border border-black"></td>
                    <td className="border border-black"></td>
                    <td className="border border-black"></td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="border border-black px-2 py-1" colSpan={2}>Total</td>
                  <td className="border border-black px-2 py-1">{totalPorsi}</td>
                  <td className="border border-black px-2 py-1"></td>
                  <td className="border border-black px-2 py-1"></td>
                  <td className="border border-black px-2 py-1"></td>
                </tr>
              </tbody>
            </table>

            <div className="mt-10 text-sm">
              <div className="flex justify-between">
                <div className="w-2/3 text-center">Diperiksa Oleh,</div>
                <div className="w-1/3 text-center">Diterima Oleh,<br />Pihak {s.jenis === "b3" ? "Posyandu" : "Sekolah"},</div>
              </div>
              <div className="mt-1 flex">
                <div className="w-1/3 text-center">Ahli Gizi Dapur,</div>
                <div className="w-1/3 text-center">Koordinator Lapangan</div>
                <div className="w-1/3" />
              </div>
              <div className="mt-16 flex items-end">
                <div className="w-1/3 text-center font-bold">{sppg.ahli_gizi || "____________"}</div>
                <div className="w-1/3 text-center font-bold">{sppg.koordinator || "____________"}</div>
                <div className="w-1/3 px-2"><div className="border-b border-black" /></div>
              </div>
            </div>
          </div>
        );
      })}

      {/* ===== Uji Organoleptik per penerima (sekolah & posyandu) ===== */}
      {showOrg && [...serdik, ...b3].map((s) => {
        const isB3 = s.jenis === "b3";
        const grup = isB3 ? data.distribusi.menu_posyandu || [] : data.distribusi.menu_sekolah || [];
        return (
          <div key={"org-" + s.penerima_id} className="doc mx-auto mb-6 max-w-[720px] bg-white p-10 font-serif text-black">
            <KopBGN />
            <h2 className="mt-6 text-center text-base font-bold">FORM UJI ORGANOLEPTIK</h2>

            <div className="mt-6 text-sm leading-relaxed">
              {[
                { l: <>Hari/Tanggal</>, v: <>{(hari(tanggal) + " " + tglLong(tanggal)).toUpperCase()}</> },
                { l: <>Nama Sekolah</>, v: <b>{s.nama}</b> },
                { l: <>Asal Sampel</>, v: <b>SPPG {sppg.nama}</b> },
                { l: <>Petugas Sampel<br /><span className="text-xs">(pihak {isB3 ? "Posyandu" : "sekolah"})</span></>, v: null },
                { l: <>Menu</>, v: data.distribusi.menu ? <>{data.distribusi.menu}</> : null },
                { l: <>Instruksi</>, v: <>Isilah dengan memberi tanda centang (✓) pada Indikator Penilaian Uji Organoleptik</> },
              ].map((row, i) => (
                <div key={i} className="flex items-end py-0.5">
                  <div className="w-36 shrink-0">{row.l}</div>
                  <div className="shrink-0 pr-1">:</div>
                  {row.v !== null ? (
                    <div className="flex-1 self-center">{row.v}</div>
                  ) : (
                    <div className="mb-1 flex-1 self-end border-b border-dotted border-black" />
                  )}
                </div>
              ))}
            </div>

            <table className="mt-5 w-full border-collapse text-center text-sm">
              <thead className="font-bold">
                <tr>
                  <th rowSpan={3} className="border border-black px-2 py-1">No</th>
                  <th rowSpan={3} className="border border-black px-2 py-1">Nama Menu<br />({isB3 ? "Balita" : "Sampel"})</th>
                  <th colSpan={8} className="border border-black px-2 py-1">Indikator Penilaian</th>
                </tr>
                <tr>
                  <th colSpan={2} className="border border-black px-2 py-1">Rasa</th>
                  <th colSpan={2} className="border border-black px-2 py-1">Aroma</th>
                  <th colSpan={2} className="border border-black px-2 py-1">Warna</th>
                  <th colSpan={2} className="border border-black px-2 py-1">Tekstur</th>
                </tr>
                <tr className="text-xs font-normal">
                  {["Baik", "Tidak Baik", "Baik", "Tidak Baik", "Baik", "Tidak Baik", "Baik", "Tidak Baik"].map((h, i) => (
                    <th key={i} className="border border-black px-1 py-1">{h}</th>
                  ))}
                </tr>
              </thead>
              <OrgTableBody grup={grup} />
            </table>

            <div className="mt-4 text-sm">
              <div className="flex items-end"><span className="shrink-0 pr-1">Catatan :</span><span className="mb-1 flex-1 self-end border-b border-dotted border-black" /></div>
              <div className="mb-1 mt-2 border-b border-dotted border-black" />
              <div className="mb-1 mt-2 border-b border-dotted border-black" />
            </div>

            <div className="mt-8 flex justify-end text-center text-sm">
              <div className="w-64">
                <p>Diperiksa oleh,</p>
                <p>Pihak {isB3 ? "Posyandu" : "Sekolah"}</p>
                <div className="mx-auto mt-20 w-56 border-b border-black" />
              </div>
            </div>
          </div>
        );
      })}

      {serdik.length === 0 && b3.length === 0 && (
        <p className="p-8 text-center text-gray-600">
          Belum ada data distribusi untuk tanggal ini. Isi &amp; simpan di halaman Distribusi Harian dulu.
        </p>
      )}
    </div>
  );
}

export default function CetakDistribusiPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center">Memuat…</p>}>
      <Inner />
    </Suspense>
  );
}
