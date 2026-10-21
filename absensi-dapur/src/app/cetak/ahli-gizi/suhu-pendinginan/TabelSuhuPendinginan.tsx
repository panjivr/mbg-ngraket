"use client";

/**
 * Tabel pencatatan suhu & waktu pendinginan (resting) makanan per tahap.
 * Replika persis FORMULIR PENCATATAN SUHU DAN WAKTU PENDINGINAN MAKANAN:
 * header bertingkat (Mulai Resting / Selesai Resting masing-masing Pukul +
 * Suhu Makanan) dan 9 baris awal terisi Tahap (T01–T03) × Jenis (Karbohidrat/
 * Protein/Sayur). Semua sel isian memakai contentEditable (isi-lalu-cetak);
 * baris tambahan bisa ditambah/dihapus. Dicetak mendatar (landscape).
 */
import { useRef, useState } from "react";
import { Ed } from "../../akuntan/_components";

const th = "border border-black px-1 py-1 text-center font-bold align-middle";
const cell = "border border-black px-1 py-0.5 align-top";

/** Baris awal: 3 tahap (T01–T03) × 3 jenis komponen menu. */
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
  const [rows, setRows] = useState<{ id: number; tahap: string; jenis: string }[]>(
    () => BARIS_AWAL.map((b, i) => ({ id: i, ...b })),
  );
  const nextId = useRef(BARIS_AWAL.length);

  return (
    <div>
      <table className="w-full border-collapse text-[10px]">
        <thead style={{ backgroundColor: "#D9E1F2" }}>
          <tr>
            <th className={th + " w-[3%]"} rowSpan={2}>
              No.
            </th>
            <th className={th + " w-[5%]"} rowSpan={2}>
              Tahap
            </th>
            <th className={th + " w-[8%]"} rowSpan={2}>
              Jenis Menu
            </th>
            <th className={th} rowSpan={2}>
              Nama Menu / Olahan
            </th>
            <th className={th + " w-[7%]"} rowSpan={2}>
              Jumlah Produksi
            </th>
            <th className={th} colSpan={2}>
              Mulai <i>Resting</i>
            </th>
            <th className={th} colSpan={2}>
              Selesai <i>Resting</i>
            </th>
            <th className={th + " w-[7%]"} rowSpan={2}>
              Total Durasi <i>Resting</i> (menit)
            </th>
            <th className={th + " w-[6%]"} rowSpan={2}>
              Suhu Ruang (°C)
            </th>
            <th className={th} rowSpan={2}>
              Keterangan / Tindakan Koreksi
            </th>
            <th className={th + " w-[6%]"} rowSpan={2}>
              Paraf
            </th>
            <th className="no-print border border-black px-1 text-center" rowSpan={2}>
              ·
            </th>
          </tr>
          <tr>
            <th className={th + " w-[6%]"}>Pukul</th>
            <th className={th + " w-[6%]"}>Suhu Makanan (°C)</th>
            <th className={th + " w-[6%]"}>Pukul</th>
            <th className={th + " w-[6%]"}>Suhu Makanan (°C)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.id}>
              <td className={cell + " text-center"}>{idx + 1}</td>
              <td className={cell + " text-center font-semibold"}>
                <Ed>{r.tahap}</Ed>
              </td>
              <td className={cell}>
                <Ed>{r.jenis}</Ed>
              </td>
              <td className={cell}>
                <Ed block />
              </td>
              <td className={cell}>
                <Ed block />
              </td>
              <td className={cell}>
                <Ed block />
              </td>
              <td className={cell}>
                <Ed block />
              </td>
              <td className={cell}>
                <Ed block />
              </td>
              <td className={cell}>
                <Ed block />
              </td>
              <td className={cell}>
                <Ed block />
              </td>
              <td className={cell}>
                <Ed block />
              </td>
              <td className={cell}>
                <Ed block />
              </td>
              <td className={cell}>
                <Ed block />
              </td>
              <td className="no-print border border-black text-center">
                <button
                  type="button"
                  onClick={() => setRows((s) => s.filter((x) => x.id !== r.id))}
                  className="px-1 text-red-600"
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
