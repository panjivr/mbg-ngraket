"use client";

import { useState } from "react";
import type { Slip } from "@/lib/slip";

const PAPERS: Record<string, { label: string; size: string }> = {
  A4: { label: "A4 (210×297)", size: "210mm 297mm" },
  F4: { label: "F4 / Folio (215×330)", size: "215mm 330mm" },
  Letter: { label: "Letter (216×279)", size: "216mm 279mm" },
  Legal: { label: "Legal (216×356)", size: "216mm 356mm" },
};

const HARI3 = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

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
function dow(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}
function dayNum(iso: string): string {
  return String(Number(iso.split("-")[2]));
}
function fmtWaktu(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SlipGaji({
  slip,
  dapur,
  canPrint = false,
  onConfirm,
  confirming = false,
}: {
  slip: Slip;
  dapur: string;
  canPrint?: boolean;
  onConfirm?: () => void;
  confirming?: boolean;
}) {
  const [paper, setPaper] = useState("A4");
  const u = slip.user;
  const namaDapur = (dapur || "").replace(/^SPPG\s+/i, "");

  const baris = (label: string, detail: string, nilai: number, minus = false) => (
    <tr>
      <td className="border border-black px-2 py-1.5 sm:px-3">{label}</td>
      <td className="border border-black px-2 py-1.5 text-center text-xs sm:px-3 sm:text-sm">{detail}</td>
      <td className="whitespace-nowrap border border-black px-2 py-1.5 text-right sm:px-3">
        {minus && nilai > 0 ? "− " : ""}
        {rupiah(nilai)}
      </td>
    </tr>
  );

  return (
    <div className="slip-print-root min-h-screen bg-white py-4 text-black sm:py-6">
      {canPrint ? (
        // Cetak HANYA slip: sembunyikan sisa halaman (nav/tab/kontrol) agar 1 halaman rapi.
        <style>{`@media print{
          @page{size:${PAPERS[paper]?.size || PAPERS.A4.size};margin:12mm}
          body{visibility:hidden!important}
          .slip-print-root{visibility:visible!important;position:absolute!important;left:0;top:0;width:100%;min-height:0!important;padding-top:0!important;padding-bottom:0!important}
          .slip-print-root *{visibility:visible!important}
          .no-print{display:none!important}
        }`}</style>
      ) : (
        // Karyawan: dokumen hanya untuk dilihat, tidak untuk dicetak/diunduh.
        <style>{`@media print{.slip-doc{display:none!important}.slip-noprint{display:block!important}}`}</style>
      )}
      {!canPrint && (
        <div className="slip-noprint hidden p-10 text-center text-black">
          🔒 Slip gaji bersifat rahasia dan tidak untuk dicetak atau diunduh.
        </div>
      )}

      {canPrint && (
        <div className="no-print mx-auto mb-4 flex max-w-[720px] flex-wrap items-center justify-end gap-2 px-3">
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
            🖨️ Cetak / PDF
          </button>
        </div>
      )}

      <div className="slip-doc mx-auto max-w-[720px] bg-white p-4 font-serif text-black sm:p-8">
        {/* Peringatan rahasia */}
        <div className="mb-4 rounded-md border-2 border-red-600 bg-red-50 px-3 py-2 text-center text-[11px] font-semibold leading-snug text-red-700 sm:text-xs">
          🔒 DOKUMEN RAHASIA PERUSAHAAN — Dilarang keras membagikan, menginformasikan, atau
          menunjukkan isi slip ini kepada orang lain atau tim lain dalam bentuk apa pun.
        </div>

        {/* Kop */}
        <div className="border-b-2 border-black pb-3 text-center">
          <h1 className="text-base font-bold uppercase sm:text-lg">SPPG {namaDapur}</h1>
          <p className="mt-1 text-sm font-semibold uppercase tracking-wide">Slip Gaji Karyawan</p>
        </div>

        {/* Identitas */}
        <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <p><span className="inline-block w-24 text-gray-600">Nama</span>: <b>{u.nama}</b></p>
          <p><span className="inline-block w-24 text-gray-600">Periode</span>: {tgl(slip.periode.from)} – {tgl(slip.periode.to)}</p>
          <p><span className="inline-block w-24 text-gray-600">Jabatan</span>: {u.jabatan || "—"}</p>
          <p><span className="inline-block w-24 text-gray-600">Divisi</span>: {u.divisi_nama || "—"}</p>
          <p><span className="inline-block w-24 text-gray-600">NIP</span>: {u.nip || "—"}</p>
          <p><span className="inline-block w-24 text-gray-600">Kehadiran</span>: {slip.hadir} hari (telat {slip.telat})</p>
        </div>

        {/* Checklist hari masuk */}
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold text-gray-700">Rekap Kehadiran (✓ = masuk)</p>
          <div className="flex flex-wrap gap-1.5">
            {slip.hari.map((h) => (
              <div
                key={h.tanggal}
                className={
                  "flex w-10 flex-col items-center rounded border px-1 py-1 text-center " +
                  (h.masuk ? "border-green-600 bg-green-50 text-green-700" : "border-gray-300 bg-gray-50 text-gray-400")
                }
              >
                <span className="text-[9px] leading-none">{HARI3[dow(h.tanggal)]}</span>
                <span className="text-[11px] font-semibold leading-tight">{dayNum(h.tanggal)}</span>
                <span className="text-[10px] leading-none">{h.masuk ? "✓" : "–"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rincian */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr style={{ backgroundColor: "#dbe4f0" }}>
                <th className="border border-black px-2 py-1.5 text-left sm:px-3">Komponen</th>
                <th className="border border-black px-2 py-1.5 text-center sm:px-3">Perhitungan</th>
                <th className="border border-black px-2 py-1.5 text-right sm:px-3">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {baris("Upah Kehadiran", `${slip.hadir} hari × ${rupiah(u.gaji_harian)}`, slip.upah_kehadiran)}
              {baris("Uang Lembur", `${slip.lembur_hari} hari × ${rupiah(u.lembur_per_hari)}`, slip.upah_lembur)}
              {/* BPJS: status, bukan nominal */}
              <tr>
                <td className="border border-black px-2 py-1.5 sm:px-3">Tunjangan BPJS Ketenagakerjaan</td>
                <td className="border border-black px-2 py-1.5 text-center text-xs sm:px-3 sm:text-sm">—</td>
                <td className="border border-black px-2 py-1.5 text-right font-semibold sm:px-3">
                  {u.bpjs_tk ? "Terbayar" : "—"}
                </td>
              </tr>
              {baris("Potongan Keterlambatan", `${slip.telat} × ${rupiah(u.potongan_per_telat)}`, slip.potongan, true)}
              <tr className="text-base font-bold" style={{ backgroundColor: "#cfe0cf" }}>
                <td className="border border-black px-2 py-2 sm:px-3" colSpan={2}>TOTAL DITERIMA</td>
                <td className="whitespace-nowrap border border-black px-2 py-2 text-right sm:px-3">{rupiah(slip.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-2 text-xs italic text-gray-600">Terbilang: {terbilang(slip.total)} rupiah.</p>

        {/* Konfirmasi diterima (bukan tanda tangan) */}
        <div className="mt-6 rounded-md border border-gray-300 bg-gray-50 p-3">
          {slip.confirmed_at ? (
            <p className="text-center text-sm font-semibold text-green-700">
              ✅ Telah dikonfirmasi diterima pada {fmtWaktu(slip.confirmed_at)}
            </p>
          ) : onConfirm ? (
            <div className="text-center">
              <p className="mb-2 text-xs text-gray-600">
                Dengan menekan tombol di bawah, Anda mengonfirmasi telah menerima slip gaji ini.
              </p>
              <button
                onClick={onConfirm}
                disabled={confirming}
                className="no-print rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {confirming ? "Menyimpan…" : "✓ Konfirmasi Diterima"}
              </button>
            </div>
          ) : (
            <p className="text-center text-sm text-gray-500">Belum dikonfirmasi oleh karyawan.</p>
          )}
        </div>

        <p className="mt-6 text-[11px] text-gray-500">
          Slip ini dihasilkan otomatis dari data presensi (dihitung sejak jam masuk/absen).
          Uang lembur dihitung per hari kerja yang melewati ambang jam standar.
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
    "", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan",
    "sembilan", "sepuluh", "sebelas",
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
      return konversi(Math.floor(x / 1_000_000_000)) + " miliar" + (x % 1_000_000_000 ? " " + konversi(x % 1_000_000_000) : "");
    return konversi(Math.floor(x / 1_000_000_000_000)) + " triliun" + (x % 1_000_000_000_000 ? " " + konversi(x % 1_000_000_000_000) : "");
  };
  return konversi(n).replace(/\s+/g, " ").trim();
}
