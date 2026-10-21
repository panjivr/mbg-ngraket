"use client";

/**
 * Tabel pencatatan suhu & waktu pendinginan (resting) makanan per tahap.
 * Replika persis formulir asli: header putih bertingkat (Mulai/Selesai Resting
 * masing-masing Pukul + Suhu Makanan), lebar kolom diukur dari PDF asli, dan
 * 9 baris awal T01–T03 × Karbohidrat/Protein/Sayur. Sel isian contentEditable;
 * baris tambahan bisa ditambah/dihapus (kontrol .no-print tidak ikut tercetak).
 */
import { useRef, useState } from "react";
import { Ed } from "../../akuntan/_components";

const th =
  "border border-black px-[0.5mm] py-0 align-top text-center font-bold leading-[1.1]";
const cell = "border border-black px-[1mm] py-[0.6mm] align-top font-bold";

/** Lebar kolom (%) hasil pengukuran garis tabel pada PDF asli. */
const W = {
  no: "3.5%",
  tahap: "5.8%",
  jenis: "7.4%",
  nama: "11.1%",
  jumlah: "7.5%",
  mulaiPukul: "7.1%",
  mulaiSuhu: "7.5%",
  selesaiPukul: "7.7%",
  selesaiSuhu: "8.4%",
  durasi: "9.1%",
  ruang: "7%",
  ket: "8.4%",
  paraf: "9.3%",
};

const BARIS_AWAL: { tahap: string; jenis: string }[] = [
  { tahap: "T01", jenis: "Karbohidrat" },
  { tahap: "T01", jenis: "Protein" },
  { tahap: "T01", jenis: "Sayur" },
  { tahap: "T02", jenis: "Karbohidrat" },
  { tahap: "T02", jenis: "Protein" },
  { tahap: "T02", jenis: "Sayur" },
  { tahap: "T03", jenis: "Karbohidrat" },
  { tahap: "T03", jenis: "Protein" },
  { tahap: "T03", jenis: "Sayur" },
];

export function TabelSuhuPendinginan() {
  const [rows, setRows] = useState<
    { id: number; tahap: string; jenis: string }[]
  >(() => BARIS_AWAL.map((b, i) => ({ id: i, ...b })));
  const nextId = useRef(BARIS_AWAL.length);

  return (
    <div>
      <table className="w-full table-fixed border-collapse text-[7pt]">
        <colgroup>
          {Object.values(W).map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
          <col className="no-print" style={{ width: "1.5%" }} />
        </colgroup>
        <thead>
          <tr className="h-[3mm]">
            <th className={th} rowSpan={2}>
              No.
            </th>
            <th className={th} rowSpan={2}>
              Tahap
            </th>
            <th className={th} rowSpan={2}>
              Jenis Menu
            </th>
            <th className={th} rowSpan={2}>
              Nama Menu / Olahan
            </th>
            <th className={th} rowSpan={2}>
              Jumlah Produksi
            </th>
            <th className={th} colSpan={2}>
              Mulai <i>Resting</i>
            </th>
            <th className={th} colSpan={2}>
              Selesai <i>Resting</i>
            </th>
            <th className={th} rowSpan={2}>
              Total Durasi <i>Resting</i> (menit)
            </th>
            <th className={th} rowSpan={2}>
              Suhu Ruang (°C)
            </th>
            <th className={th} rowSpan={2}>
              Keterangan / Tindakan Koreksi
            </th>
            <th className={th} rowSpan={2}>
              Paraf
            </th>
            <th className="no-print border border-black" rowSpan={2} />
          </tr>
          <tr className="h-[5.8mm]">
            <th className={th}>Pukul</th>
            <th className={th}>Suhu Makanan (°C)</th>
            <th className={th}>Pukul</th>
            <th className={th}>Suhu Makanan (°C)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.id} className="h-[7.5mm]">
              <td className={cell}>{idx + 1}</td>
              <td className={cell}>
                <Ed>{r.tahap}</Ed>
              </td>
              <td className={cell + " text-[6.5pt]"}>
                <Ed>{r.jenis}</Ed>
              </td>
              {Array.from({ length: 10 }).map((_, c) => (
                <td key={c} className={cell + " font-normal"}>
                  <Ed block />
                </td>
              ))}
              <td className="no-print border border-black text-center">
                <button
                  type="button"
                  onClick={() => setRows((s) => s.filter((x) => x.id !== r.id))}
                  className="text-red-600"
                  title="Hapus baris"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={() => {
          const id = nextId.current++;
          setRows((s) => [...s, { id, tahap: "", jenis: "" }]);
        }}
        className="no-print mt-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
      >
        ＋ Tambah baris
      </button>
    </div>
  );
}
