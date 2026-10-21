"use client";

/**
 * Tabel Checklist Sampel Makanan (replika persis formulir asli): header putih
 * tebal, baris contoh pengisian bercetak miring, baris "dst.", lalu baris
 * kosong yang bisa diisi (contentEditable) serta ditambah/dihapus.
 * Lebar kolom (%) hasil pengukuran garis tabel pada PDF asli.
 */
import { useRef, useState } from "react";
import { Ed } from "../../akuntan/_components";

const th =
  "border border-black px-[2.2mm] pt-[1.5mm] pb-[1.5mm] text-center font-bold align-top";
const cell = "border border-black px-[2.2mm] pt-[1.5mm] pb-[1.5mm] align-top";

export function TabelChecklistSampel() {
  const [rows, setRows] = useState<number[]>(() => [0]);
  const nextId = useRef(1);

  return (
    <div>
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col style={{ width: "14.9%" }} />
          <col style={{ width: "19.1%" }} />
          <col style={{ width: "15.4%" }} />
          <col style={{ width: "15.7%" }} />
          <col style={{ width: "34.9%" }} />
          <col className="no-print" style={{ width: "4%" }} />
        </colgroup>
        <thead>
          <tr>
            <th className={th}>Tanggal</th>
            <th className={th}>Pengantaran</th>
            <th className={th}>Nama Petugas</th>
            <th className={th}>Nama Makanan</th>
            <th className={th}>Paraf (Pengawas Gizi/Ka SPPG)</th>
            <th className="no-print border border-black" />
          </tr>
        </thead>
        <tbody>
          <tr className="italic">
            <td className={cell}>diisi tanggal produksi</td>
            <td className={cell}>diisi pengantaran ke 1/2/3</td>
            <td className={cell}>diisi nama petugas yang mengambil sampel</td>
            <td className={cell}>
              diisi nama menu (tuliskan seluruh nama menu)
            </td>
            <td className={cell}>Mengetahui Ka SPPG atau Pengawas Gizi</td>
            <td className="no-print border border-black" />
          </tr>
          <tr className="h-[8.8mm]">
            <td className={cell}>dst.</td>
            <td className={cell} />
            <td className={cell} />
            <td className={cell} />
            <td className={cell} />
            <td className="no-print border border-black" />
          </tr>
          {rows.map((id) => (
            <tr key={id} className="h-[9.1mm]">
              {[0, 1, 2, 3, 4].map((c) => (
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
        ＋ Tambah baris
      </button>
    </div>
  );
}
