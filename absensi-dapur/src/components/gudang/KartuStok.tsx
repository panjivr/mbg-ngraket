"use client";

/**
 * Kartu Stok bertanggal untuk satu bahan.
 * Menyusun ledger harian (Stok Awal → Masuk → Keluar → Stok Akhir →
 * Harga Satuan → Nilai Persediaan) dari riwayat mutasi (tabel stok_mutasi),
 * untuk periode yang dipilih. Siap cetak / simpan PDF (lanskap).
 * Dipakai admin dan petugas barang keluar (keduanya read /api/admin/gudang/*).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { KATEGORI_LABEL, type Barang, type Mutasi } from "@/lib/gudang";

const PAPERS: Record<string, string> = {
  A4: "210mm 297mm",
  F4: "215mm 330mm",
  Letter: "216mm 279mm",
  Legal: "216mm 356mm",
};

function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function firstOfMonth(iso: string): string {
  return iso.slice(0, 8) + "01";
}
const fmtQty = (n: number | null) =>
  n == null || n === 0 ? "" : Number.isInteger(n) ? n.toLocaleString("id-ID") : n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
const fmtRp = (n: number | null) => (n == null ? "" : "Rp " + Math.round(n).toLocaleString("id-ID"));
const tglID = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

/** Semua tanggal (YYYY-MM-DD) dari awal s.d akhir (inklusif, maks 400 hari). */
function eachDay(awal: string, akhir: string): string[] {
  const res: string[] = [];
  if (!awal || !akhir || awal > akhir) return res;
  let d = new Date(awal + "T00:00:00Z");
  const end = new Date(akhir + "T00:00:00Z");
  let guard = 0;
  while (d <= end && guard < 400) { res.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); guard++; }
  return res;
}

interface LedgerRow {
  tanggal: string;
  stokAwal: number | null;
  masuk: number;
  keluar: number;
  stokAkhir: number | null;
  nilai: number | null;
  ket: string;
}

export default function KartuStok() {
  const [list, setList] = useState<Barang[]>([]);
  const [barangId, setBarangId] = useState<number | null>(null);
  const [mutasi, setMutasi] = useState<Mutasi[]>([]);
  const [loadingM, setLoadingM] = useState(false);
  const today = jakartaToday();
  const [awal, setAwal] = useState(firstOfMonth(today));
  const [akhir, setAkhir] = useState(today);
  const [paper, setPaper] = useState("A4");
  const [orient, setOrient] = useState<"landscape" | "portrait">("landscape");

  useEffect(() => {
    fetch("/api/admin/gudang/barang", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const arr: Barang[] = d.barang || [];
        setList(arr);
        if (arr.length && barangId == null) setBarangId(arr[0].id);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMutasi = useCallback(async (id: number) => {
    setLoadingM(true);
    try {
      const r = await fetch(`/api/admin/gudang/mutasi?barang_id=${id}`, { cache: "no-store" });
      const d = await r.json();
      setMutasi(d.mutasi || []);
    } finally { setLoadingM(false); }
  }, []);
  useEffect(() => { if (barangId != null) loadMutasi(barangId); }, [barangId, loadMutasi]);

  const barang = useMemo(() => list.find((b) => b.id === barangId) || null, [list, barangId]);

  const rows = useMemo<LedgerRow[]>(() => {
    if (!barang) return [];
    const asc = [...mutasi].sort((a, b) =>
      a.tanggal < b.tanggal ? -1 : a.tanggal > b.tanggal ? 1 : a.created_at < b.created_at ? -1 : 1,
    );
    // Stok awal periode.
    const before = asc.filter((m) => m.tanggal < awal);
    let opening: number;
    if (before.length) opening = before[before.length - 1].stok_sesudah;
    else if (asc.length) {
      const f = asc[0];
      opening = f.tipe === "masuk" ? f.stok_sesudah - f.jumlah : f.tipe === "keluar" ? f.stok_sesudah + f.jumlah : f.stok_sesudah;
    } else opening = barang.stok;

    let carry = opening;
    let active = opening > 0;
    return eachDay(awal, akhir).map((d) => {
      const day = asc.filter((m) => m.tanggal === d);
      const masuk = day.filter((m) => m.tipe === "masuk").reduce((a, m) => a + m.jumlah, 0);
      const keluar = day.filter((m) => m.tipe === "keluar").reduce((a, m) => a + m.jumlah, 0);
      const wasActive = active;
      const stokAwal = wasActive ? carry : null;
      const stokAkhir = day.length ? day[day.length - 1].stok_sesudah : carry;
      carry = stokAkhir;
      if (day.length) active = true;
      const ket = day.map((m) => m.keterangan).filter(Boolean).join("; ");
      return {
        tanggal: d,
        stokAwal,
        masuk,
        keluar,
        stokAkhir: active ? stokAkhir : null,
        nilai: active ? stokAkhir * (barang.harga || 0) : null,
        ket,
      };
    });
  }, [barang, mutasi, awal, akhir]);

  const totalNilai = barang ? (rows.length ? rows[rows.length - 1].nilai ?? 0 : 0) : 0;
  const size = orient === "landscape"
    ? PAPERS[paper].split(" ").reverse().join(" ")
    : PAPERS[paper];

  const th = "border border-black px-2 py-1 text-center font-bold";
  const td = "border border-black px-2 py-1";

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #kartu-stok-sheet, #kartu-stok-sheet * { visibility: visible !important; }
          #kartu-stok-sheet { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
          @page { size: ${size}; margin: 12mm; }
        }
      `}</style>

      {/* Kontrol (tak ikut cetak) */}
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[220px] flex-1">
          <label className="label">Nama Bahan</label>
          <select className="input" value={barangId ?? ""} onChange={(e) => setBarangId(Number(e.target.value))}>
            {list.length === 0 && <option value="">(belum ada barang)</option>}
            {list.map((b) => (
              <option key={b.id} value={b.id}>{b.nama} — {KATEGORI_LABEL[b.kategori]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Tanggal Awal</label>
          <input type="date" className="input" value={awal} onChange={(e) => setAwal(e.target.value)} />
        </div>
        <div>
          <label className="label">Tanggal Akhir</label>
          <input type="date" className="input" value={akhir} onChange={(e) => setAkhir(e.target.value)} />
        </div>
        <div>
          <label className="label">Kertas</label>
          <select className="input" value={paper} onChange={(e) => setPaper(e.target.value)}>
            {Object.keys(PAPERS).map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Orientasi</label>
          <select className="input" value={orient} onChange={(e) => setOrient(e.target.value as "landscape" | "portrait")}>
            <option value="landscape">Lanskap</option>
            <option value="portrait">Potret</option>
          </select>
        </div>
        <button onClick={() => window.print()} className="btn-gold" disabled={!barang}>🖨️ Cetak / PDF</button>
      </div>

      {/* Lembar dokumen (putih, seperti hasil cetak) */}
      <div className="scroll-x overflow-x-auto">
        <div id="kartu-stok-sheet" className="mx-auto min-w-[900px] max-w-[1400px] bg-white p-8 font-serif text-[12px] leading-relaxed text-black shadow-lg">
          {/* Kop */}
          <div className="relative mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bgn-logo.webp" alt="Logo BGN" className="absolute left-0 top-1/2 h-16 w-16 -translate-y-1/2 object-contain" />
            <div className="px-20 text-center leading-snug">
              <p className="text-[15px] font-bold uppercase">Badan Gizi Nasional</p>
              <p className="text-[13px] font-bold uppercase">SPPG Ngraket Balong Ponorogo</p>
              <p className="text-[10px]">Jl. Raya Ngumpul - Balong, Desa Ngraket, Kec. Balong, Kab. Ponorogo, Jawa Timur 63461</p>
            </div>
            <div className="mt-2 border-b-4 border-black" />
          </div>

          <h2 className="mb-3 text-center text-[15px] font-bold uppercase">Kartu Stok</h2>

          {/* Info bahan + periode */}
          <div className="mb-3 flex flex-wrap justify-between gap-x-8 gap-y-1">
            <table className="text-[12px]">
              <tbody>
                <tr><td className="pr-2 align-top">Nama Bahan</td><td className="align-top">: {barang?.nama || "-"}</td></tr>
                <tr><td className="pr-2 align-top">Kode Akun</td><td className="align-top">: {barang?.kode_akun || "-"}</td></tr>
                <tr><td className="pr-2 align-top">Satuan</td><td className="align-top">: {barang?.satuan || "-"}</td></tr>
              </tbody>
            </table>
            <table className="text-[12px]">
              <tbody>
                <tr><td className="pr-2 align-top">Kategori</td><td className="align-top">: {barang ? KATEGORI_LABEL[barang.kategori] : "-"}</td></tr>
                <tr><td className="pr-2 align-top">Harga Satuan</td><td className="align-top">: {fmtRp(barang?.harga ?? 0)}</td></tr>
                <tr><td className="pr-2 align-top">Periode</td><td className="align-top">: {tglID(awal)} s.d {tglID(akhir)}</td></tr>
              </tbody>
            </table>
          </div>

          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr style={{ backgroundColor: "#D9E1F2" }}>
                <th className={th}>No</th>
                <th className={th}>Tanggal</th>
                <th className={th}>Stok Awal</th>
                <th className={th}>Masuk</th>
                <th className={th}>Keluar</th>
                <th className={th}>Stok Akhir</th>
                <th className={th}>Harga Satuan (Rp)</th>
                <th className={th}>Nilai Persediaan (Rp)</th>
                <th className={th}>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {!barang ? (
                <tr><td className={td + " text-center text-gray-400"} colSpan={9}>Pilih bahan.</td></tr>
              ) : loadingM ? (
                <tr><td className={td + " text-center text-gray-400"} colSpan={9}>Memuat…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className={td + " text-center text-gray-400"} colSpan={9}>Periode tidak valid.</td></tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={r.tanggal}>
                    <td className={td + " text-center"}>{i + 1}</td>
                    <td className={td + " text-center"}>{tglID(r.tanggal)}</td>
                    <td className={td + " text-right tabular-nums"}>{fmtQty(r.stokAwal)}</td>
                    <td className={td + " text-right tabular-nums"}>{fmtQty(r.masuk)}</td>
                    <td className={td + " text-right tabular-nums"}>{fmtQty(r.keluar)}</td>
                    <td className={td + " text-right tabular-nums"}>{fmtQty(r.stokAkhir)}</td>
                    <td className={td + " text-right tabular-nums"}>{r.stokAkhir != null ? fmtRp(barang.harga || 0) : ""}</td>
                    <td className={td + " text-right tabular-nums"}>{fmtRp(r.nilai)}</td>
                    <td className={td}>{r.ket}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {barang && rows.length > 0 && (
            <p className="mt-2 text-right text-[12px] font-semibold">
              Nilai persediaan akhir: {fmtRp(totalNilai)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
