"use client";

/**
 * Pemilih pegawai yang lembur untuk BA Lembur. Data diambil dari /api/admin/
 * employees (pegawai dapur ini) lalu bisa dicentang siapa saja yang lembur.
 * Panel pemilih bertanda .no-print (tidak ikut cetak/arsip); yang tercetak
 * hanyalah tabel No | Nama | Divisi berisi pegawai terpilih.
 */
import { useEffect, useState } from "react";

interface Pegawai {
  id: number;
  nama: string;
  jabatan: string | null;
  divisi_nama: string | null;
}

export function LemburPicker() {
  const [list, setList] = useState<Pegawai[]>([]);
  const [dipilih, setDipilih] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/employees");
        const data = (await res.json().catch(() => ({}))) as {
          employees?: Pegawai[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || "Gagal memuat pegawai.");
        if (!batal) setList(data.employees ?? []);
      } catch (e) {
        if (!batal) setError(e instanceof Error ? e.message : "Gagal memuat.");
      } finally {
        if (!batal) setLoading(false);
      }
    })();
    return () => {
      batal = true;
    };
  }, []);

  const toggle = (id: number) =>
    setDipilih((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  // Pertahankan urutan sesuai daftar pegawai.
  const terpilih = list.filter((p) => dipilih.includes(p.id));

  const cell = "border border-black px-2 py-1 align-top";
  const th = "border border-black px-2 py-1 text-center font-bold";

  return (
    <div>
      {/* Panel pemilih — tidak ikut tercetak / tersimpan */}
      <div className="no-print mb-3 rounded-lg border border-gray-300 bg-gray-50 p-3">
        <p className="mb-2 text-sm font-semibold text-gray-700">
          Pilih pegawai yang lembur:
        </p>
        {loading && <p className="text-sm text-gray-500">Memuat pegawai…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && list.length === 0 && (
          <p className="text-sm text-gray-500">Belum ada data pegawai.</p>
        )}
        <div className="grid gap-1 sm:grid-cols-2">
          {list.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-2 text-sm text-gray-800"
            >
              <input
                type="checkbox"
                checked={dipilih.includes(p.id)}
                onChange={() => toggle(p.id)}
              />
              <span>
                {p.nama}
                {p.divisi_nama ? (
                  <span className="text-gray-500"> — {p.divisi_nama}</span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Tabel tercetak */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr style={{ backgroundColor: "#D9E1F2" }}>
            <th className={th + " w-10"}>No</th>
            <th className={th}>Nama</th>
            <th className={th}>Divisi</th>
          </tr>
        </thead>
        <tbody>
          {terpilih.length === 0 ? (
            <tr>
              <td className={cell + " text-center text-gray-400"} colSpan={3}>
                (belum ada pegawai dipilih)
              </td>
            </tr>
          ) : (
            terpilih.map((p, i) => (
              <tr key={p.id}>
                <td className={th + " w-10"}>{i + 1}</td>
                <td className={cell}>{p.nama}</td>
                <td className={cell}>{p.divisi_nama || p.jabatan || "-"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
