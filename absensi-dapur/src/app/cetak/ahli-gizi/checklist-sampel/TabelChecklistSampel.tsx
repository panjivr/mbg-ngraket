"use client";

/**
 * Tabel Checklist Sampel Makanan (replika persis). Baris pertama berisi contoh
 * pengisian (teks miring) seperti pada formulir asli, diikuti baris "dst." dan
 * baris kosong yang bisa diisi (contentEditable) serta ditambah/dihapus.
 */
import { useRef, useState } from "react";
import { Ed } from "../../akuntan/_components";

const th = "border border-black px-2 py-1.5 text-center font-bold align-middle";
const cell = "border border-black px-2 py-1 align-top";

export function TabelChecklistSampel() {
  const [rows, setRows] = useState<number[]>(() => [0, 1]);
  const nextId = useRef(2);

  return (
    <div>
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr style={{ backgroundColor: "#D9E1F2" }}>
            <th className={th + " w-[14%]"}>Tanggal</th>
            <th className={th + " w-[16%]"}>Pengantaran</th>
            <th className={th + " w-[16%]"}>Nama Petugas</th>
            <th className={th + " w-[18%]"}>Nama Makanan</th>
            <th className={th}>Paraf (Pengawas Gizi/Ka SPPG)</th>
            <th className="no-print border border-black px-1 text-center">·</th>
          </tr>
        </thead>
        <tbody>
          {/* Baris contoh pengisian (teks miring, seperti formulir asli) */}
          <tr className="italic text-gray-700">
            <td className={cell}>diisi tanggal produksi</td>
            <td className={cell}>diisi pengantaran ke 1/2/3</td>
            <td className={cell}>diisi nama petugas yang mengambil sampel</td>
            <td className={cell}>diisi nama menu (tuliskan seluruh nama menu)</td>
            <td className={cell}>Mengetahui Ka SPPG atau Pengawas Gizi</td>
            <td className="no-print border border-black" />
          </tr>
          <tr>
            <td className={cell}>dst.</td>
            <td className={cell} />
            <td className={cell} />
            <td className={cell} />
            <td className={cell} />
            <td className="no-print border border-black" />
          </tr>
          {rows.map((id) => (
            <tr key={id}>
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
