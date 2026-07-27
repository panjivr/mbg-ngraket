"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  KATEGORI_MENU_LABEL,
  KOMPONEN_GIZI,
  KOMPONEN_GIZI_LIST,
  skalaBahan,
  perPorsi,
  fmtJumlah,
  fmtKecil,
  type MenuLengkap,
} from "@/lib/menu";
import CetakFooter from "@/components/CetakFooter";

const PAPERS: Record<string, { label: string; size: string }> = {
  A4: { label: "A4 (210×297)", size: "210mm 297mm" },
  F4: { label: "F4 / Folio (215×330)", size: "215mm 330mm" },
  Letter: { label: "Letter (216×279)", size: "216mm 279mm" },
  Legal: { label: "Legal (216×356)", size: "216mm 356mm" },
};

function Inner() {
  const sp = useSearchParams();
  const menuId = Number(sp.get("menu") || 0);
  const porsi = Math.max(0, Number(sp.get("porsi") || 0));

  const [menu, setMenu] = useState<MenuLengkap | null>(null);
  const [nama, setNama] = useState("");
  const [paper, setPaper] = useState("A4");
  const [err, setErr] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/menu", { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/admin/distribusi/pengaturan", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { pengaturan: {} })),
    ])
      .then(([a, b]) => {
        const m = (a.menu || []).find((x: MenuLengkap) => x.id === menuId) || null;
        setMenu(m);
        setNama((b.pengaturan?.nama_sppg || "").replace(/^SPPG\s+/i, ""));
      })
      .catch(() => setErr(true));
  }, [menuId]);

  const rows = useMemo(() => {
    const list = (menu?.bahan || []).map((b) => ({
      nama: b.nama,
      satuan: b.satuan,
      komponen: b.komponen,
      perPorsi: perPorsi(b.jumlah_dasar, menu!.porsi_dasar),
      target: skalaBahan(b.jumlah_dasar, menu!.porsi_dasar, porsi, b.pembulatan),
    }));
    // Urutkan mengikuti urutan komponen gizi agar belanja lebih rapi.
    const rank = (k: string) => {
      const i = KOMPONEN_GIZI_LIST.indexOf(k as never);
      return i < 0 ? 99 : i;
    };
    return list.sort((a, b) => rank(a.komponen) - rank(b.komponen));
  }, [menu, porsi]);

  if (err) return <p className="p-8 text-center">Gagal memuat data menu.</p>;
  if (!menu) return <p className="p-8 text-center">Memuat…</p>;

  const th = "border border-black px-2 py-1 text-center";
  const cell = "border border-black px-2 py-1";
  const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-white py-6 text-black">
      <style>{`@media print{@page{size:${PAPERS[paper]?.size || PAPERS.A4.size};margin:14mm}.no-print{display:none}}`}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[800px] flex-wrap items-center justify-between gap-3 px-4">
        <p className="text-sm text-gray-600">
          {menu.nama} · {fmtJumlah(porsi)} porsi
        </p>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Ukuran kertas</label>
          <select value={paper} onChange={(e) => setPaper(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
            {Object.entries(PAPERS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <button onClick={() => window.print()} className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">
            🖨️ Cetak / Simpan PDF
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[800px] bg-white p-8 font-serif text-black">
        <div className="border-b-4 border-black pb-3 text-center">
          <p className="text-base font-bold">DAFTAR BELANJA BAHAN</p>
          <p className="text-sm font-bold">SPPG {nama.toUpperCase()}</p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <p><span className="inline-block w-28 text-gray-600">Menu</span>: <b>{menu.nama}</b></p>
          <p><span className="inline-block w-28 text-gray-600">Kategori</span>: {KATEGORI_MENU_LABEL[menu.kategori]}</p>
          <p><span className="inline-block w-28 text-gray-600">Jumlah porsi</span>: <b>{fmtJumlah(porsi)}</b></p>
          <p><span className="inline-block w-28 text-gray-600">Tanggal</span>: {today}</p>
          <p><span className="inline-block w-28 text-gray-600">Porsi dasar</span>: {fmtJumlah(menu.porsi_dasar)}</p>
        </div>

        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="font-bold" style={{ backgroundColor: "#dbe5f1" }}>
              <th className={th}>No</th>
              <th className={th}>Bahan</th>
              <th className={th}>Komponen</th>
              <th className={th}>Per porsi</th>
              <th className={th}>Kebutuhan</th>
              <th className={th}>Satuan</th>
              <th className={th}>Ceklis</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className={th}>{i + 1}</td>
                <td className={cell}>{r.nama}</td>
                <td className={th}>{KOMPONEN_GIZI[r.komponen]?.label || "-"}</td>
                <td className={th}>{fmtKecil(r.perPorsi)}</td>
                <td className={th}>{fmtJumlah(r.target)}</td>
                <td className={th}>{r.satuan}</td>
                <td className={th}>☐</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className={cell} colSpan={7}>
                  Menu ini belum punya bahan.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {menu.keterangan && <p className="mt-3 text-xs italic text-gray-600">Catatan: {menu.keterangan}</p>}

        <div className="mt-10 grid grid-cols-2 gap-6 text-center text-sm">
          <div>
            <p>Petugas Belanja</p>
            <div className="mt-14 border-t border-black" />
          </div>
          <div>
            <p>Mengetahui,</p>
            <div className="mt-14 border-t border-black" />
          </div>
        </div>

        <CetakFooter dapur={nama} />
      </div>
    </div>
  );
}

export default function CetakMenuBelanjaPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center">Memuat…</p>}>
      <Inner />
    </Suspense>
  );
}
