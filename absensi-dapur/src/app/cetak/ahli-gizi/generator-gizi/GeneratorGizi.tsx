"use client";

/**
 * Generator Kandungan Gizi — kalkulator interaktif komposisi menu SPPG.
 * Zona EDITOR (.no-print): pilih kelompok sasaran, jumlah porsi, lalu tambah
 * bahan + berat (gram per porsi). Zona HASIL (ikut cetak): tabel rincian gizi
 * per porsi, total, dan panel %AKG terhadap kebutuhan harian & target sekali
 * makan (30% AKG). Semua perhitungan di sisi klien dari basis data TKPI —
 * pengganti mandiri Nutri Survey tanpa dependensi eksternal.
 *
 * Dipakai sebagai child <PrintFrame> (lihat ../_components: toolbar + print CSS +
 * simpan arsip). Kontrol editor ber-kelas .no-print → tidak ikut tercetak/tersimpan.
 */
import { useMemo, useState } from "react";
import { Ed, Tgl } from "../../akuntan/_components";
import {
  BAHAN_GIZI,
  KATEGORI_LABEL,
  MEAL_FRACTION,
  SASARAN,
  getBahanGizi,
  getSasaran,
  type KategoriBahan,
} from "@/lib/gizi-nutrisi";

const th = "border border-black px-1 py-0.5 text-center font-bold align-middle";
const cell = "border border-black px-1 py-0.5 align-top";

/** Bulatkan ke `d` desimal dan buang nol berlebih (1.0 → "1"). */
function fmt(n: number, d = 1): string {
  const r = Math.round(n * 10 ** d) / 10 ** d;
  return String(r);
}

interface Baris {
  id: number;
  bahanId: string;
  /** Berat per porsi (gram), string agar input mudah dikosongkan. */
  gram: string;
}

/** Ringkasan satu zat gizi hasil penjumlahan seluruh bahan. */
interface Total {
  energi: number;
  protein: number;
  lemak: number;
  karbo: number;
  serat: number;
}

const NOL: Total = { energi: 0, protein: 0, lemak: 0, karbo: 0, serat: 0 };

/** Urutan kategori untuk pengelompokan <optgroup>. */
const URUT_KATEGORI: KategoriBahan[] = [
  "pokok",
  "hewani",
  "nabati",
  "sayur",
  "buah",
  "olahan",
  "lainnya",
];

export default function GeneratorGizi() {
  const [sasaranKey, setSasaranKey] = useState(SASARAN[1].key); // default SD 1–3
  const [porsi, setPorsi] = useState("1");
  const [rows, setRows] = useState<Baris[]>([
    { id: 0, bahanId: "nasi-putih", gram: "150" },
    { id: 1, bahanId: "dada-ayam", gram: "50" },
    { id: 2, bahanId: "tempe", gram: "30" },
    { id: 3, bahanId: "bayam", gram: "40" },
  ]);
  const [nextId, setNextId] = useState(4);

  const sasaran = getSasaran(sasaranKey) ?? SASARAN[1];
  const jumlahPorsi = Math.max(1, parseInt(porsi, 10) || 1);

  // Kontribusi gizi tiap baris (per porsi) + total keseluruhan.
  const { detail, total } = useMemo(() => {
    const detail = rows.map((r) => {
      const b = getBahanGizi(r.bahanId);
      const g = parseFloat(r.gram) || 0;
      const f = g / 100;
      return {
        id: r.id,
        bahan: b,
        gram: g,
        energi: b ? b.energi * f : 0,
        protein: b ? b.protein * f : 0,
        lemak: b ? b.lemak * f : 0,
        karbo: b ? b.karbo * f : 0,
        serat: b ? b.serat * f : 0,
      };
    });
    const total = detail.reduce<Total>(
      (a, d) => ({
        energi: a.energi + d.energi,
        protein: a.protein + d.protein,
        lemak: a.lemak + d.lemak,
        karbo: a.karbo + d.karbo,
        serat: a.serat + d.serat,
      }),
      { ...NOL },
    );
    return { detail, total };
  }, [rows]);

  const beratTotal = detail.reduce((a, d) => a + d.gram, 0);

  const addRow = () => {
    setRows((s) => [...s, { id: nextId, bahanId: "", gram: "" }]);
    setNextId((n) => n + 1);
  };
  const delRow = (id: number) =>
    setRows((s) => s.filter((r) => r.id !== id));
  const setBahan = (id: number, bahanId: string) =>
    setRows((s) => s.map((r) => (r.id === id ? { ...r, bahanId } : r)));
  const setGram = (id: number, gram: string) =>
    setRows((s) => s.map((r) => (r.id === id ? { ...r, gram } : r)));

  // Baris panel %AKG: satu per zat gizi.
  const gizi: {
    nama: string;
    sat: string;
    nilai: number;
    akg: number;
  }[] = [
    { nama: "Energi", sat: "kkal", nilai: total.energi, akg: sasaran.energi },
    { nama: "Protein", sat: "g", nilai: total.protein, akg: sasaran.protein },
    { nama: "Lemak", sat: "g", nilai: total.lemak, akg: sasaran.lemak },
    { nama: "Karbohidrat", sat: "g", nilai: total.karbo, akg: sasaran.karbo },
    { nama: "Serat", sat: "g", nilai: total.serat, akg: sasaran.serat },
  ];

  return (
    <div className="text-[12px]">
      {/* ============ ZONA EDITOR (tidak dicetak) ============ */}
      <div className="no-print mb-4 space-y-3 rounded-lg border border-dashed border-emerald-400 bg-emerald-50 p-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
          <label className="flex items-center gap-2">
            <span className="font-semibold text-emerald-800">
              Kelompok sasaran:
            </span>
            <select
              value={sasaranKey}
              onChange={(e) => setSasaranKey(e.target.value)}
              className="rounded border border-emerald-300 px-2 py-1"
            >
              {SASARAN.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="font-semibold text-emerald-800">Jumlah porsi:</span>
            <input
              type="number"
              min={1}
              value={porsi}
              onChange={(e) => setPorsi(e.target.value)}
              className="w-20 rounded border border-emerald-300 px-2 py-1"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="text-left text-emerald-800">
                <th className="px-1 py-1">Bahan pangan</th>
                <th className="w-28 px-1 py-1">Berat/porsi (g)</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-1 py-0.5">
                    <select
                      value={r.bahanId}
                      onChange={(e) => setBahan(r.id, e.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1"
                    >
                      <option value="">— pilih bahan —</option>
                      {URUT_KATEGORI.map((k) => (
                        <optgroup key={k} label={KATEGORI_LABEL[k]}>
                          {BAHAN_GIZI.filter((b) => b.kategori === k).map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.nama}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </td>
                  <td className="px-1 py-0.5">
                    <input
                      type="number"
                      min={0}
                      value={r.gram}
                      onChange={(e) => setGram(r.id, e.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-1 py-0.5 text-center">
                    <button
                      type="button"
                      onClick={() => delRow(r.id)}
                      className="px-1 text-red-600"
                      title="Hapus bahan"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="rounded border border-emerald-400 bg-white px-3 py-1 text-[12px] font-medium text-emerald-700 hover:bg-emerald-100"
        >
          ＋ Tambah bahan
        </button>
        <p className="text-[11px] italic text-emerald-700">
          Isi bahan &amp; berat per porsi. Tabel hasil di bawah otomatis
          terhitung dan itulah yang tercetak. Nilai gizi mengacu Tabel Komposisi
          Pangan Indonesia (TKPI) &amp; AKG Permenkes 28/2019.
        </p>
      </div>

      {/* ============ ZONA HASIL (ikut dicetak) ============ */}
      <div className="mb-2 flex flex-wrap justify-between gap-x-6 gap-y-1 text-[12px]">
        <span>
          Nama Menu: <Ed>…………………………………</Ed>
        </span>
        <span>
          Tanggal: <Tgl mode="tanggal" />
        </span>
      </div>
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-[12px]">
        <span>
          Kelompok Sasaran: <b>{sasaran.label}</b>
        </span>
        <span>
          Jumlah Porsi: <b>{jumlahPorsi}</b>
        </span>
        <span>
          Total Berat/Porsi: <b>{fmt(beratTotal)} g</b>
        </span>
      </div>

      {/* Rincian gizi per porsi */}
      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr style={{ backgroundColor: "#D9E1F2" }}>
            <th className={th + " w-[4%]"}>No</th>
            <th className={th + " text-left"}>Bahan Pangan</th>
            <th className={th + " w-[12%]"}>Kelompok</th>
            <th className={th + " w-[9%]"}>Berat (g)</th>
            <th className={th + " w-[11%]"}>Energi (kkal)</th>
            <th className={th + " w-[10%]"}>Protein (g)</th>
            <th className={th + " w-[10%]"}>Lemak (g)</th>
            <th className={th + " w-[10%]"}>KH (g)</th>
            <th className={th + " w-[9%]"}>Serat (g)</th>
          </tr>
        </thead>
        <tbody>
          {detail.map((d, i) => (
            <tr key={d.id}>
              <td className={cell + " text-center"}>{i + 1}</td>
              <td className={cell}>{d.bahan?.nama ?? "—"}</td>
              <td className={cell + " text-center"}>
                {d.bahan ? KATEGORI_LABEL[d.bahan.kategori] : "—"}
              </td>
              <td className={cell + " text-center"}>{fmt(d.gram)}</td>
              <td className={cell + " text-right"}>{fmt(d.energi)}</td>
              <td className={cell + " text-right"}>{fmt(d.protein)}</td>
              <td className={cell + " text-right"}>{fmt(d.lemak)}</td>
              <td className={cell + " text-right"}>{fmt(d.karbo)}</td>
              <td className={cell + " text-right"}>{fmt(d.serat)}</td>
            </tr>
          ))}
          <tr style={{ backgroundColor: "#F2F2F2" }} className="font-bold">
            <td className={cell + " text-center"} colSpan={3}>
              TOTAL per porsi
            </td>
            <td className={cell + " text-center"}>{fmt(beratTotal)}</td>
            <td className={cell + " text-right"}>{fmt(total.energi)}</td>
            <td className={cell + " text-right"}>{fmt(total.protein)}</td>
            <td className={cell + " text-right"}>{fmt(total.lemak)}</td>
            <td className={cell + " text-right"}>{fmt(total.karbo)}</td>
            <td className={cell + " text-right"}>{fmt(total.serat)}</td>
          </tr>
          <tr style={{ backgroundColor: "#F2F2F2" }}>
            <td className={cell + " text-center"} colSpan={3}>
              TOTAL untuk {jumlahPorsi} porsi
            </td>
            <td className={cell + " text-center"}>{fmt(beratTotal * jumlahPorsi)}</td>
            <td className={cell + " text-right"}>{fmt(total.energi * jumlahPorsi)}</td>
            <td className={cell + " text-right"}>{fmt(total.protein * jumlahPorsi)}</td>
            <td className={cell + " text-right"}>{fmt(total.lemak * jumlahPorsi)}</td>
            <td className={cell + " text-right"}>{fmt(total.karbo * jumlahPorsi)}</td>
            <td className={cell + " text-right"}>{fmt(total.serat * jumlahPorsi)}</td>
          </tr>
        </tbody>
      </table>

      {/* Panel %AKG */}
      <p className="mt-4 mb-1 text-[12px] font-bold uppercase">
        Analisis Pemenuhan Angka Kecukupan Gizi (AKG)
      </p>
      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr style={{ backgroundColor: "#D9E1F2" }}>
            <th className={th + " text-left"}>Zat Gizi</th>
            <th className={th + " w-[15%]"}>Per Porsi</th>
            <th className={th + " w-[15%]"}>AKG Harian</th>
            <th className={th + " w-[14%]"}>% AKG Harian</th>
            <th className={th + " w-[16%]"}>Target Sekali Makan (30%)</th>
            <th className={th + " w-[13%]"}>% Target</th>
            <th className={th + " w-[12%]"}>Status</th>
          </tr>
        </thead>
        <tbody>
          {gizi.map((g) => {
            const target = g.akg * MEAL_FRACTION;
            const pctHarian = g.akg ? (g.nilai / g.akg) * 100 : 0;
            const pctTarget = target ? (g.nilai / target) * 100 : 0;
            const status =
              pctTarget < 80 ? "Kurang" : pctTarget > 120 ? "Berlebih" : "Sesuai";
            return (
              <tr key={g.nama}>
                <td className={cell + " font-semibold"}>{g.nama}</td>
                <td className={cell + " text-right"}>
                  {fmt(g.nilai)} {g.sat}
                </td>
                <td className={cell + " text-right"}>
                  {fmt(g.akg)} {g.sat}
                </td>
                <td className={cell + " text-right"}>{fmt(pctHarian)}%</td>
                <td className={cell + " text-right"}>
                  {fmt(target)} {g.sat}
                </td>
                <td className={cell + " text-right"}>{fmt(pctTarget)}%</td>
                <td className={cell + " text-center"}>{status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="mt-2 text-[9px] italic leading-snug text-gray-600">
        Keterangan: nilai gizi dihitung dari Tabel Komposisi Pangan Indonesia
        (TKPI) per 100 g bahan dapat dimakan; AKG harian mengacu Permenkes RI No.
        28 Tahun 2019. Target sekali makan diasumsikan 30% AKG harian untuk satu
        waktu makan utama. Status &quot;Sesuai&quot; bila pemenuhan 80–120% target.
        Angka bersifat estimasi perencanaan menu, bukan hasil uji laboratorium.
      </p>
    </div>
  );
}
