"use client";

import { Fragment, Suspense, useEffect, useMemo, useState } from "react";

interface Penerima {
  id: number; jenis: "serdik" | "b3"; nama: string; jenjang: string;
  besar: number; kecil: number; b3: number; pj: number; jam_kirim: string; aktif: boolean;
}

const PAPERS: Record<string, { label: string; size: string }> = {
  A4: { label: "A4 (210×297)", size: "210mm 297mm" },
  F4: { label: "F4 / Folio (215×330)", size: "215mm 330mm" },
  Letter: { label: "Letter (216×279)", size: "216mm 279mm" },
  Legal: { label: "Legal (216×356)", size: "216mm 356mm" },
};

function Inner() {
  const [list, setList] = useState<Penerima[] | null>(null);
  const [nama, setNama] = useState("");
  const [paper, setPaper] = useState("A4");
  const [err, setErr] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/penerima", { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/admin/distribusi/pengaturan", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { pengaturan: {} })),
    ])
      .then(([a, b]) => { setList(a.penerima || []); setNama((b.pengaturan?.nama_sppg || "").replace(/^SPPG\s+/i, "")); })
      .catch(() => setErr(true));
  }, []);

  const grup = useMemo(() => {
    const m = new Map<string, Penerima[]>();
    for (const p of list || []) {
      const k = p.jenjang || "Lainnya";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(p);
    }
    return [...m.entries()];
  }, [list]);
  const tot = useMemo(() => {
    let besar = 0, kecil = 0, b3 = 0, pj = 0;
    for (const p of list || []) if (p.aktif) { besar += p.besar; kecil += p.kecil; b3 += p.b3; pj += p.pj; }
    return { besar, kecil, b3, pj };
  }, [list]);

  if (err) return <p className="p-8 text-center">Gagal memuat data penerima.</p>;
  if (!list) return <p className="p-8 text-center">Memuat…</p>;

  const th = "border border-black px-2 py-1 text-center";
  const cell = "border border-black px-2 py-1";

  return (
    <div className="min-h-screen bg-white py-6 text-black">
      <style>{`@media print{@page{size:${PAPERS[paper]?.size || PAPERS.A4.size};margin:14mm}.no-print{display:none}}`}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[800px] flex-wrap items-center justify-between gap-3 px-4">
        <p className="text-sm text-gray-600">{list.length} penerima</p>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Ukuran kertas</label>
          <select value={paper} onChange={(e) => setPaper(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
            {Object.entries(PAPERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={() => window.print()} className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">🖨️ Cetak / Simpan PDF</button>
        </div>
      </div>

      <div className="mx-auto max-w-[800px] bg-white p-8 font-serif text-black">
        <div className="relative mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bgn-logo.webp" alt="Logo BGN" className="absolute left-0 top-1/2 h-16 w-16 -translate-y-1/2 object-contain" />
          <div className="px-20 text-center leading-snug">
            <p className="text-base font-bold">DATA PENERIMA MANFAAT (PM)</p>
            <p className="text-sm font-bold">SPPG {nama.toUpperCase()}</p>
          </div>
          <div className="mt-2 border-b-4 border-black" />
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="font-bold" style={{ backgroundColor: "#dbe5f1" }}>
              <th className={th}>No</th><th className={th}>Nama Penerima</th><th className={th}>Jam</th>
              <th className={th}>Besar</th><th className={th}>Kecil</th><th className={th}>B3</th><th className={th}>PJ</th>
            </tr>
          </thead>
          <tbody>
            {grup.map(([jenjang, rows]) => (
              <Fragment key={jenjang}>
                <tr style={{ backgroundColor: "#eef2f7" }}>
                  <td className={cell + " font-bold"} colSpan={7}>{jenjang}</td>
                </tr>
                {rows.map((p, i) => (
                  <tr key={p.id}>
                    <td className={th}>{i + 1}</td>
                    <td className={cell}>{p.nama}</td>
                    <td className={th}>{p.jam_kirim}</td>
                    <td className={th}>{p.besar || ""}</td>
                    <td className={th}>{p.kecil || ""}</td>
                    <td className={th}>{p.b3 || ""}</td>
                    <td className={th}>{p.pj || ""}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
            <tr className="font-bold" style={{ backgroundColor: "#dbe5f1" }}>
              <td className={th} colSpan={3}>TOTAL AKTIF</td>
              <td className={th}>{tot.besar}</td>
              <td className={th}>{tot.kecil}</td>
              <td className={th}>{tot.b3}</td>
              <td className={th}>{tot.pj}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CetakPenerimaPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center">Memuat…</p>}>
      <Inner />
    </Suspense>
  );
}
