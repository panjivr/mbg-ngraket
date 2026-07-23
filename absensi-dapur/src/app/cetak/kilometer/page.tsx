"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Kendaraan, KilometerEntri } from "@/lib/kilometer";

const PAPERS: Record<string, { label: string; size: string }> = {
  A4: { label: "A4 (210×297)", size: "210mm 297mm" },
  F4: { label: "F4 / Folio (215×330)", size: "215mm 330mm" },
  Letter: { label: "Letter (216×279)", size: "216mm 279mm" },
  Legal: { label: "Legal (216×356)", size: "216mm 356mm" },
};
const tglSlash = (t: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(t + "T00:00:00")).replace(/\//g, "-");

function Inner() {
  const sp = useSearchParams();
  const from = sp.get("from") || "";
  const to = sp.get("to") || "";
  const kidParam = sp.get("kendaraan_id");
  const [kendaraan, setKendaraan] = useState<Kendaraan[]>([]);
  const [entri, setEntri] = useState<KilometerEntri[]>([]);
  const [nama, setNama] = useState("");
  const [paper, setPaper] = useState("A4");
  const [state, setState] = useState<"load" | "ok" | "err">("load");

  useEffect(() => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    if (kidParam) q.set("kendaraan_id", kidParam);
    Promise.all([
      fetch(`/api/kilometer?${q.toString()}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/admin/distribusi/pengaturan", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { pengaturan: {} })),
    ])
      .then(([a, b]) => {
        setKendaraan(a.kendaraan || []);
        setEntri(a.entri || []);
        setNama((b.pengaturan?.nama_sppg || "").replace(/^SPPG\s+/i, ""));
        setState("ok");
      })
      .catch(() => setState("err"));
  }, [from, to, kidParam]);

  if (state === "err") return <p className="p-8 text-center">Gagal memuat data kilometer.</p>;
  if (state === "load") return <p className="p-8 text-center">Memuat…</p>;

  // Kendaraan yang punya entri (atau yang difilter).
  const shown = kendaraan.filter((k) => entri.some((e) => e.kendaraan_id === k.id));
  const th = "border border-black px-2 py-1 text-center align-top";
  const cell = "border border-black px-2 py-1 align-top";

  return (
    <div className="min-h-screen bg-white py-6 text-black">
      <style>{`@media print{@page{size:${PAPERS[paper]?.size || PAPERS.A4.size};margin:14mm}.no-print{display:none}.doc{page-break-after:always}}.doc:last-child{page-break-after:auto}`}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[800px] flex-wrap items-center justify-between gap-3 px-4">
        <p className="text-sm text-gray-600">{shown.length} kendaraan · {entri.length} entri</p>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Ukuran kertas</label>
          <select value={paper} onChange={(e) => setPaper(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
            {Object.entries(PAPERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={() => window.print()} className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">🖨️ Cetak / Simpan PDF</button>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="p-8 text-center text-gray-500">Belum ada data kilometer pada rentang ini.</p>
      ) : shown.map((k) => {
        const rows = entri.filter((e) => e.kendaraan_id === k.id);
        const pad = Math.max(0, 5 - rows.length);
        return (
          <div key={k.id} className="doc mx-auto mb-6 max-w-[760px] bg-white p-8 font-serif text-black">
            <div className="text-center leading-snug">
              <p className="text-base font-bold">DATA KILOMETER KENDARAAN</p>
              <p className="text-base font-bold">PROGRAM MAKAN BERGIZI GRATIS</p>
              <p className="text-base font-bold">SPPG {nama.toUpperCase()}</p>
            </div>
            <div className="mt-2 border-b-4 border-black" />
            <p className="mt-4 text-sm font-bold">NOPOL KENDARAAN : {k.nopol || "________________"}{k.nama ? ` (${k.nama})` : ""}</p>

            <table className="mt-2 w-full border-collapse text-sm">
              <thead>
                <tr className="font-bold" style={{ backgroundColor: "#dbe5f1" }}>
                  <th className={th} style={{ width: "8%" }}>NO</th>
                  <th className={th} style={{ width: "18%" }}>TANGGAL</th>
                  <th className={th}>KM BERANGKAT</th>
                  <th className={th}>KM PULANG</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e, i) => (
                  <tr key={e.id}>
                    <td className={th}>{i + 1}</td>
                    <td className={cell}>{tglSlash(e.tanggal)}</td>
                    <td className={cell}><KmCell foto={e.foto_berangkat} angka={e.km_berangkat} /></td>
                    <td className={cell}><KmCell foto={e.foto_pulang} angka={e.km_pulang} /></td>
                  </tr>
                ))}
                {Array.from({ length: pad }).map((_, i) => (
                  <tr key={"pad" + i}>
                    <td className={th + " h-8"}></td><td className={cell}></td><td className={cell}></td><td className={cell}></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function KmCell({ foto, angka }: { foto: string; angka: number }) {
  return (
    <div>
      <p className="font-bold">FOTO :</p>
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt="odometer" className="mx-auto mt-1 aspect-[4/3] w-full max-w-[220px] border border-gray-300 object-cover" />
      ) : (
        <div className="mt-1 h-24" />
      )}
      <p className="mt-2 font-bold">ANGKA :</p>
      <p>{angka ? `${angka} KM` : ""}</p>
    </div>
  );
}

export default function CetakKilometerPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center">Memuat…</p>}>
      <Inner />
    </Suspense>
  );
}
