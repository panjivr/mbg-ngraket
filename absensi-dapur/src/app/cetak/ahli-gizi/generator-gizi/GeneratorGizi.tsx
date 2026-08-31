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
import { useEffect, useMemo, useState } from "react";
import { Ed, Tgl } from "../../akuntan/_components";
import {
  BAHAN_GIZI,
  KATEGORI_LABEL,
  MEAL_FRACTION,
  SASARAN,
  MIKRO_KEYS,
  MIKRO_META,
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
  kalsium: number;
  besi: number;
  vit_a: number;
  vit_c: number;
  zinc: number;
}

const NOL: Total = { energi: 0, protein: 0, lemak: 0, karbo: 0, serat: 0, kalsium: 0, besi: 0, vit_a: 0, vit_c: 0, zinc: 0 };

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

/**
 * Pemilih bahan dengan pencarian ketik-cari (native <datalist>).
 * Jauh lebih mudah daripada scroll <select> ratusan item: klik → ketik nama →
 * pilih. Menyimpan teks lokal; hanya memanggil onChange saat cocok persis
 * dengan salah satu nama bahan.
 */
function BahanPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [q, setQ] = useState(getBahanGizi(value)?.nama ?? "");
  useEffect(() => {
    setQ(getBahanGizi(value)?.nama ?? "");
  }, [value]);
  return (
    <input
      list="bahan-list"
      value={q}
      onChange={(e) => {
        const text = e.target.value;
        setQ(text);
        const t = text.trim().toLowerCase();
        const match = BAHAN_GIZI.find((b) => b.nama.toLowerCase() === t);
        if (match) onChange(match.id);
      }}
      placeholder="Ketik nama bahan…"
      className="w-full rounded border border-gray-300 px-2 py-1"
    />
  );
}

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
  const { detail, total, mikroParsial } = useMemo(() => {
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
        kalsium: b ? (b.kalsium ?? 0) * f : 0,
        besi: b ? (b.besi ?? 0) * f : 0,
        vit_a: b ? (b.vit_a ?? 0) * f : 0,
        vit_c: b ? (b.vit_c ?? 0) * f : 0,
        zinc: b ? (b.zinc ?? 0) * f : 0,
        // true bila bahan dipilih tapi belum ada data mikronutrien.
        mikroKosong: !!b && b.kalsium === undefined && g > 0,
      };
    });
    const total = detail.reduce<Total>(
      (a, d) => ({
        energi: a.energi + d.energi,
        protein: a.protein + d.protein,
        lemak: a.lemak + d.lemak,
        karbo: a.karbo + d.karbo,
        serat: a.serat + d.serat,
        kalsium: a.kalsium + d.kalsium,
        besi: a.besi + d.besi,
        vit_a: a.vit_a + d.vit_a,
        vit_c: a.vit_c + d.vit_c,
        zinc: a.zinc + d.zinc,
      }),
      { ...NOL },
    );
    const mikroParsial = detail.filter((d) => d.mikroKosong).length;
    return { detail, total, mikroParsial };
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
    // Mikronutrien (dari data bertahap; bahan tanpa data tidak menyumbang).
    ...MIKRO_KEYS.map((k) => ({
      nama: MIKRO_META[k].label,
      sat: MIKRO_META[k].sat,
      nilai: total[k],
      akg: sasaran[k],
    })),
  ];

  return (
    <div className="text-[12px]">
      {/* ============ ZONA EDITOR (tidak dicetak) ============ */}
      <div className="no-print mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_12px_28px_-18px_rgba(15,23,42,0.25)]">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-700 ring-1 ring-inset ring-emerald-500/25">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M4 20c0-8 6-14 16-14 0 10-6 14-16 14z" /><path d="M4.5 19.5c4-6 8-8.5 12-9.5" /></svg>
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-800">Kalkulator Kandungan Gizi</p>
              <p className="text-[11px] text-slate-500">Basis TKPI Kemenkes · makro &amp; mikronutrien · %AKG Permenkes 28/2019</p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2.5 text-[13px]">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-500">Kelompok sasaran</span>
              <select
                value={sasaranKey}
                onChange={(e) => setSasaranKey(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {SASARAN.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-500">Jumlah porsi</span>
              <input
                type="number"
                min={1}
                value={porsi}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setPorsi(e.target.value)}
                className="w-24 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
          </div>
        </div>

        {/* Ringkasan gizi langsung (mini %AKG) */}
        <div className="grid grid-cols-2 gap-2 px-4 pt-3 sm:grid-cols-3 lg:grid-cols-5">
          {gizi.map((g) => {
            const target = g.akg * MEAL_FRACTION;
            const pct = target ? (g.nilai / target) * 100 : 0;
            const tone = pct < 80 ? "amber" : pct > 130 ? "sky" : "emerald";
            const barCol = tone === "amber" ? "bg-amber-400" : tone === "sky" ? "bg-sky-400" : "bg-emerald-400";
            const txtCol = tone === "amber" ? "text-amber-600" : tone === "sky" ? "text-sky-600" : "text-emerald-600";
            return (
              <div key={g.nama} className="rounded-xl border border-slate-200 bg-slate-50/60 px-2.5 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{g.nama}</p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-800">
                  {fmt(g.nilai)} <span className="text-[10px] font-normal text-slate-400">{g.sat}</span>
                </p>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-200">
                  <div className={"h-full rounded-full " + barCol} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <p className={"mt-0.5 text-[10px] font-semibold tabular-nums " + txtCol}>{fmt(pct)}% target</p>
              </div>
            );
          })}
        </div>

        <div className="space-y-3 p-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-1 py-1 font-medium">Bahan pangan</th>
                <th className="w-28 px-1 py-1 font-medium">Berat/porsi (g)</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-1 py-0.5">
                    <BahanPicker value={r.bahanId} onChange={(id) => setBahan(r.id, id)} />
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
          <datalist id="bahan-list">
            {URUT_KATEGORI.flatMap((k) =>
              BAHAN_GIZI.filter((b) => b.kategori === k).map((b) => (
                <option key={b.id} value={b.nama} label={KATEGORI_LABEL[k]} />
              )),
            )}
          </datalist>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M12 5v14M5 12h14" /></svg>
          Tambah bahan
        </button>
        <p className="text-[11px] text-slate-500">
          Isi bahan &amp; berat per porsi — ringkasan %AKG di atas &amp; tabel hasil di bawah
          (yang tercetak) terhitung otomatis. Nilai mengacu TKPI &amp; AKG Permenkes 28/2019.
        </p>
        </div>
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

      {mikroParsial > 0 && (
        <p className="no-print mt-2 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] text-amber-800">
          Catatan: {mikroParsial} bahan belum memiliki data mikronutrien (Kalsium/Zat Besi/Vitamin/Zinc),
          sehingga total mikronutrien di bawah bersifat parsial. Data mikronutrien dilengkapi bertahap
          untuk bahan yang nilainya mapan di TKPI.
        </p>
      )}

      <p className="mt-2 text-[9px] italic leading-snug text-gray-600">
        Keterangan: nilai gizi dihitung dari Tabel Komposisi Pangan Indonesia
        (TKPI) per 100 g bahan dapat dimakan; AKG (makro &amp; mikronutrien) mengacu
        Permenkes RI No. 28 Tahun 2019. Mikronutrien (Kalsium, Zat Besi, Vitamin A,
        Vitamin C, Zinc) tersedia untuk bahan-bahan utama dan dilengkapi bertahap.
        Target sekali makan diasumsikan 30% AKG harian untuk satu waktu makan utama.
        Status &quot;Sesuai&quot; bila pemenuhan 80–120% target. Angka bersifat estimasi
        perencanaan menu, bukan hasil uji laboratorium.
      </p>
    </div>
  );
}
