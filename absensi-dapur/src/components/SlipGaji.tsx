"use client";

import { useState } from "react";
import type { Slip } from "@/lib/slip";

const PAPERS: Record<string, { label: string; size: string }> = {
  A4: { label: "A4 (210×297)", size: "210mm 297mm" },
  F4: { label: "F4 / Folio (215×330)", size: "215mm 330mm" },
  Letter: { label: "Letter (216×279)", size: "216mm 279mm" },
  Legal: { label: "Legal (216×356)", size: "216mm 356mm" },
};

function rupiah(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}
function tgl(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function SlipGaji({ slip, dapur }: { slip: Slip; dapur: string }) {
  const [paper, setPaper] = useState("A4");
  const u = slip.user;
  const namaDapur = (dapur || "").replace(/^SPPG\s+/i, "");

  const baris = (label: string, detail: string, nilai: number, minus = false) => (
    <tr>
      <td className="border border-black px-3 py-1.5">{label}</td>
      <td className="border border-black px-3 py-1.5 text-center text-sm">{detail}</td>
      <td className="border border-black px-3 py-1.5 text-right">
        {minus && nilai > 0 ? "− " : ""}
        {rupiah(nilai)}
      </td>
    </tr>
  );

  return (
    <div className="min-h-screen bg-white py-6 text-black">
      <style>{`@media print{@page{size:${PAPERS[paper]?.size || PAPERS.A4.size};margin:16mm}.no-print{display:none}}`}</style>

      <div className="no-print mx-auto mb-4 flex max-w-[720px] flex-wrap items-center justify-between gap-3 px-4">
        <p className="text-sm text-gray-600">
          Slip Gaji · {u.nama} · {tgl(slip.periode.from)} – {tgl(slip.periode.to)}
        </p>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Ukuran kertas</label>
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

      <div className="mx-auto max-w-[720px] bg-white p-8 font-serif text-black">
        {/* Kop */}
        <div className="border-b-2 border-black pb-3 text-center">
          <h1 className="text-lg font-bold uppercase">SPPG {namaDapur}</h1>
          <p className="mt-1 text-sm font-semibold uppercase tracking-wide">Slip Gaji Karyawan</p>
        </div>

        {/* Identitas */}
        <table className="mt-4 w-full text-sm">
          <tbody>
            <tr>
              <td className="w-28 py-0.5 align-top text-gray-600">Nama</td>
              <td className="py-0.5 align-top font-semibold">: {u.nama}</td>
              <td className="w-28 py-0.5 align-top text-gray-600">Periode</td>
              <td className="py-0.5 align-top">
                : {tgl(slip.periode.from)} – {tgl(slip.periode.to)}
              </td>
            </tr>
            <tr>
              <td className="py-0.5 align-top text-gray-600">Jabatan</td>
              <td className="py-0.5 align-top">: {u.jabatan || "—"}</td>
              <td className="py-0.5 align-top text-gray-600">Divisi</td>
              <td className="py-0.5 align-top">: {u.divisi_nama || "—"}</td>
            </tr>
            <tr>
              <td className="py-0.5 align-top text-gray-600">NIP</td>
              <td className="py-0.5 align-top">: {u.nip || "—"}</td>
              <td className="py-0.5 align-top text-gray-600">Kehadiran</td>
              <td className="py-0.5 align-top">
                : {slip.hadir} hari (tepat {slip.tepat}, telat {slip.telat})
              </td>
            </tr>
          </tbody>
        </table>

        {/* Rincian */}
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr style={{ backgroundColor: "#dbe4f0" }}>
              <th className="border border-black px-3 py-1.5 text-left">Komponen</th>
              <th className="border border-black px-3 py-1.5 text-center">Perhitungan</th>
              <th className="border border-black px-3 py-1.5 text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {baris(
              "Upah Kehadiran",
              `${slip.hadir} hari × ${rupiah(u.gaji_harian)}`,
              slip.upah_kehadiran,
            )}
            {baris(
              "Uang Lembur",
              `${slip.lembur_jam} jam × ${rupiah(u.lembur_per_jam)}`,
              slip.upah_lembur,
            )}
            {baris("Tunjangan", "tetap", slip.tunjangan)}
            <tr className="font-semibold" style={{ backgroundColor: "#eef2f8" }}>
              <td className="border border-black px-3 py-1.5" colSpan={2}>
                Subtotal Pendapatan
              </td>
              <td className="border border-black px-3 py-1.5 text-right">
                {rupiah(slip.upah_kehadiran + slip.upah_lembur + slip.tunjangan)}
              </td>
            </tr>
            {baris(
              "Potongan Keterlambatan",
              `${slip.telat} × ${rupiah(u.potongan_per_telat)}`,
              slip.potongan,
              true,
            )}
            <tr className="text-base font-bold" style={{ backgroundColor: "#cfe0cf" }}>
              <td className="border border-black px-3 py-2" colSpan={2}>
                TOTAL DITERIMA
              </td>
              <td className="border border-black px-3 py-2 text-right">{rupiah(slip.total)}</td>
            </tr>
          </tbody>
        </table>

        <p className="mt-2 text-xs italic text-gray-600">
          Terbilang: {terbilang(slip.total)} rupiah.
        </p>

        {/* Tanda tangan */}
        <div className="mt-10 grid grid-cols-2 gap-8 text-center text-sm">
          <div>
            <p>Diterima oleh,</p>
            <div className="h-16" />
            <p className="font-semibold underline">{u.nama}</p>
          </div>
          <div>
            <p>Hormat kami,</p>
            <div className="h-16" />
            <p className="font-semibold underline">Kepala SPPG</p>
          </div>
        </div>

        <p className="mt-8 text-[11px] text-gray-500">
          Slip ini dihasilkan otomatis dari data presensi. Uang lembur dihitung dari jam kerja
          harian di atas ambang standar.
        </p>
      </div>
    </div>
  );
}

// Terbilang sederhana (0..triliun) untuk keterangan nominal.
function terbilang(n: number): string {
  n = Math.round(Math.abs(n));
  if (n === 0) return "nol";
  const satuan = [
    "",
    "satu",
    "dua",
    "tiga",
    "empat",
    "lima",
    "enam",
    "tujuh",
    "delapan",
    "sembilan",
    "sepuluh",
    "sebelas",
  ];
  const konversi = (x: number): string => {
    if (x < 12) return satuan[x];
    if (x < 20) return konversi(x - 10) + " belas";
    if (x < 100) return konversi(Math.floor(x / 10)) + " puluh" + (x % 10 ? " " + konversi(x % 10) : "");
    if (x < 200) return "seratus" + (x - 100 ? " " + konversi(x - 100) : "");
    if (x < 1000) return konversi(Math.floor(x / 100)) + " ratus" + (x % 100 ? " " + konversi(x % 100) : "");
    if (x < 2000) return "seribu" + (x - 1000 ? " " + konversi(x - 1000) : "");
    if (x < 1_000_000) return konversi(Math.floor(x / 1000)) + " ribu" + (x % 1000 ? " " + konversi(x % 1000) : "");
    if (x < 1_000_000_000)
      return konversi(Math.floor(x / 1_000_000)) + " juta" + (x % 1_000_000 ? " " + konversi(x % 1_000_000) : "");
    if (x < 1_000_000_000_000)
      return (
        konversi(Math.floor(x / 1_000_000_000)) +
        " miliar" +
        (x % 1_000_000_000 ? " " + konversi(x % 1_000_000_000) : "")
      );
    return (
      konversi(Math.floor(x / 1_000_000_000_000)) +
      " triliun" +
      (x % 1_000_000_000_000 ? " " + konversi(x % 1_000_000_000_000) : "")
    );
  };
  return konversi(n).replace(/\s+/g, " ").trim();
}
