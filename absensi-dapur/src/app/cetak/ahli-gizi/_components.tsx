"use client";

/**
 * Komponen khusus formulir Ahli Gizi (di atas primitif bersama akuntan).
 * - GridBulanan: tabel monitoring bulanan (kolom tanggal 1–31) yang barisnya
 *   bisa ditambah/dihapus, sel memakai contentEditable (isi-lalu-cetak).
 * - TabelGizi: tabel zat gizi (menu + kolom gizi) dengan baris rekap.
 * - TTDGizi: blok tanda tangan 2 kolom untuk dokumen gizi.
 * Semua kontrol tambah/hapus baris ber-kelas `.no-print` sehingga tidak ikut
 * tersimpan/tercetak (PrintFrame membuang elemen .no-print saat menyimpan).
 */
import { useRef, useState } from "react";
import { Ed } from "../akuntan/_components";

/** Angka tanggal 1..31 untuk header grid bulanan. */
export const DAYS: number[] = Array.from({ length: 31 }, (_, i) => i + 1);

const th =
  "border border-black px-1 py-0.5 text-center font-bold align-middle";
const cell = "border border-black px-1 py-0.5 align-top";

/**
 * Tabel monitoring bulanan: satu kolom label + 31 kolom tanggal + opsional Ket.
 * Cocok untuk checklist kebersihan, monitoring suhu harian, dsb.
 */
export function GridBulanan({
  labelKolom,
  barisAwal,
  editLabel = false,
  ket = false,
  bisaTambah = false,
  fontSize = "text-[8px]",
}: {
  /** Judul kolom pertama (label baris). */
  labelKolom: string;
  /** Teks label untuk tiap baris awal. */
  barisAwal: string[];
  /** Bila true, label baris bisa diedit (contentEditable). */
  editLabel?: boolean;
  /** Tambah kolom "Ket" (keterangan) di ujung kanan. */
  ket?: boolean;
  /** Tampilkan tombol tambah baris. */
  bisaTambah?: boolean;
  fontSize?: string;
}) {
  const [rows, setRows] = useState<{ id: number; label: string }[]>(() =>
    barisAwal.map((label, i) => ({ id: i, label })),
  );
  const nextId = useRef(barisAwal.length);

  return (
    <div>
      <table className={`w-full border-collapse ${fontSize}`}>
        <thead>
          <tr style={{ backgroundColor: "#D9E1F2" }}>
            <th className={th + " min-w-[110px] text-left"}>{labelKolom}</th>
            {DAYS.map((d) => (
              <th key={d} className={th + " w-[2.4%]"}>
                {d}
              </th>
            ))}
            {ket && <th className={th + " min-w-[60px]"}>Ket</th>}
            {bisaTambah && (
              <th className="no-print border border-black px-1 text-center">
                ·
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className={cell + " text-left"}>
                {editLabel ? <Ed>{r.label}</Ed> : r.label}
              </td>
              {DAYS.map((d) => (
                <td key={d} className={cell + " text-center"}>
                  <Ed block />
                </td>
              ))}
              {ket && (
                <td className={cell}>
                  <Ed block />
                </td>
              )}
              {bisaTambah && (
                <td className="no-print border border-black text-center">
                  <button
                    type="button"
                    onClick={() =>
                      setRows((s) => s.filter((x) => x.id !== r.id))
                    }
                    className="px-1 text-red-600"
                    title="Hapus baris"
                  >
                    ×
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {bisaTambah && (
        <button
          type="button"
          onClick={() => {
            const id = nextId.current++;
            setRows((s) => [...s, { id, label: "" }]);
          }}
          className="no-print mt-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
        >
          ＋ Tambah baris
        </button>
      )}
    </div>
  );
}

/**
 * Tabel zat gizi untuk Laporan Harian (Rencana Standar Porsi Menu).
 * Kolom: Waktu | Menu | Sumber Pangan | Berat (g) | URT | Energi | Protein |
 * Lemak | KH | Serat. Ada 3 baris rekap berlabel tetap (Total / Kebutuhan 30% /
 * %Pemenuhan) yang nilainya diisi manual (contentEditable).
 */
export function TabelGizi({ barisAwal = 5 }: { barisAwal?: number }) {
  const [rows, setRows] = useState<number[]>(() =>
    Array.from({ length: barisAwal }, (_, i) => i),
  );
  const nextId = useRef(barisAwal);

  const HEAD = [
    "Waktu",
    "Menu",
    "Sumber Pangan",
    "Berat (g)",
    "URT",
    "Energi (kkal)",
    "Protein (g)",
    "Lemak (g)",
    "KH (g)",
    "Serat (g)",
  ];
  const REKAP = [
    "Total Zat Gizi",
    "Kebutuhan Zat Gizi (30%)",
    "% Pemenuhan Zat Gizi",
  ];

  return (
    <div>
      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr style={{ backgroundColor: "#D9E1F2" }}>
            {HEAD.map((h) => (
              <th key={h} className={th}>
                {h}
              </th>
            ))}
            <th className="no-print border border-black px-1 text-center">·</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((id) => (
            <tr key={id}>
              {HEAD.map((_, c) => (
                <td key={c} className={cell}>
                  <Ed block />
                </td>
              ))}
              <td className="no-print border border-black text-center">
                <button
                  type="button"
                  onClick={() => setRows((s) => s.filter((x) => x !== id))}
                  className="px-1 text-red-600"
                  title="Hapus baris"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
          {REKAP.map((label) => (
            <tr key={label} style={{ backgroundColor: "#F2F2F2" }}>
              <td className={th + " text-left"} colSpan={5}>
                {label}
              </td>
              {/* Energi, Protein, Lemak, KH, Serat */}
              {Array.from({ length: 5 }).map((_, c) => (
                <td key={c} className={cell + " text-center font-semibold"}>
                  <Ed block />
                </td>
              ))}
              <td className="no-print border border-black" />
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={() => {
          const id = nextId.current++;
          setRows((s) => [...s, id]);
        }}
        className="no-print mt-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
      >
        ＋ Tambah baris menu
      </button>
    </div>
  );
}

/** Blok tanda tangan 2 kolom (peran + nama, keduanya bisa diedit). */
export function TTDGizi({
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
      <div className="h-14" />
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
