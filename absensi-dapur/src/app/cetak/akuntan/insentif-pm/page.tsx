"use client";

/**
 * BA Insentif Penerima Manfaat.
 * Satu dataset lembaga → dua keluaran PDF:
 *  1) Rekap Insentif PIC (satu halaman, seperti "Database Laporan Insentif PM").
 *  2) BA Serah Terima Insentif per lembaga — sekali cetak, satu halaman per
 *     lembaga (seperti BAST / Surat Jalan / Organoleptik).
 * Total dihitung otomatis: PM × Jumlah hari × Nominal. Isian bisa diubah;
 * daftar lembaga sudah terisi default dan bisa ditambah/dikurangi/dicentang.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatTanggalID } from "../_components";
import { LEMBAGA_PM_DEFAULT, fmtRibuan, angka } from "@/lib/insentif-pm";

const PAPERS: Record<string, { label: string; size: string }> = {
  A4: { label: "A4", size: "210mm 297mm" },
  F4: { label: "F4 / Folio", size: "215mm 330mm" },
  Letter: { label: "Letter", size: "216mm 279mm" },
  Legal: { label: "Legal", size: "216mm 356mm" },
};

interface Row {
  id: number;
  sertakan: boolean;
  nama: string;
  pm: string;
  hari: string;
  nominal: string;
  pic: string;
  bank: string;
  rekening: string;
}

function todayJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function InsentifPmPage() {
  const [rows, setRows] = useState<Row[]>(() =>
    LEMBAGA_PM_DEFAULT.map((l, i) => ({
      id: i,
      sertakan: true,
      nama: l.nama,
      pm: "",
      hari: "",
      nominal: String(l.nominal),
      pic: l.pic,
      bank: l.bank,
      rekening: l.rekening,
    })),
  );
  const nextId = useRef(LEMBAGA_PM_DEFAULT.length);

  const [periode, setPeriode] = useState("27 Juli s.d 08 Agustus 2026");
  const [hariDefault, setHariDefault] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [kepala, setKepala] = useState("Abdulah Indriawan, S.Sos");
  const [pengawas, setPengawas] = useState("Dyah Ayu Widyawati, S.E");
  const [instansi, setInstansi] = useState("SPPG Ponorogo Ngraket Balong");

  const [output, setOutput] = useState<"rekap" | "ba">("rekap");
  const [paper, setPaper] = useState("A4");
  const [orient, setOrient] = useState<"portrait" | "landscape">("landscape");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => setTanggal(todayJakarta()), []);

  const upd = (id: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const hapus = (id: number) => setRows((rs) => rs.filter((r) => r.id !== id));
  const tambah = () =>
    setRows((rs) => [
      ...rs,
      {
        id: nextId.current++,
        sertakan: true,
        nama: "",
        pm: "",
        hari: "",
        nominal: "",
        pic: "",
        bank: "",
        rekening: "",
      },
    ]);

  const allChecked = rows.length > 0 && rows.every((r) => r.sertakan);
  const toggleAll = () =>
    setRows((rs) => rs.map((r) => ({ ...r, sertakan: !allChecked })));

  // Hitung total per baris + rekap.
  const calc = useMemo(() => {
    const list = rows.map((r) => {
      const pm = angka(r.pm);
      const hari = angka(r.hari || hariDefault);
      const nominal = angka(r.nominal);
      return { ...r, pmN: pm, hariN: hari, nominalN: nominal, total: pm * hari * nominal };
    });
    const included = list.filter((r) => r.sertakan);
    const sumPM = included.reduce((a, r) => a + r.pmN, 0);
    const sumTotal = included.reduce((a, r) => a + r.total, 0);
    return { list, included, sumPM, sumTotal };
  }, [rows, hariDefault]);

  const gantiOutput = (o: "rekap" | "ba") => {
    setOutput(o);
    setOrient(o === "rekap" ? "landscape" : "portrait");
  };

  const pageSize = () => {
    const dims = (PAPERS[paper]?.size || PAPERS.A4.size).split(" ");
    return orient === "landscape" ? `${dims[1]} ${dims[0]}` : `${dims[0]} ${dims[1]}`;
  };

  const printCss = `
    @media print {
      @page { size: ${pageSize()}; margin: 12mm; }
      .no-print { display: none !important; }
      body { background: #fff !important; }
      .sheet { box-shadow: none !important; margin: 0 !important; max-width: none !important; }
      .doc { page-break-after: always; }
      .doc:last-child { page-break-after: auto; }
    }
  `;

  const simpan = async () => {
    const node = sheetRef.current;
    if (!node || !tanggal || saving) return;
    setSaving(true);
    setMsg("");
    try {
      const clone = node.cloneNode(true) as HTMLElement;
      clone.querySelectorAll(".no-print").forEach((el) => el.remove());
      const res = await fetch("/api/admin/akuntan/ba", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "insentif-pm",
          judul:
            output === "rekap"
              ? "Rekap Insentif PIC"
              : "BA Serah Terima Insentif Penerima Manfaat",
          nomor: "",
          tanggal,
          konten_html: clone.innerHTML,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan.");
      setMsg("✓ Tersimpan ke arsip.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const inp =
    "w-full rounded border border-gray-300 px-1.5 py-1 text-xs text-black focus:border-gold-500 focus:outline-none";
  const th = "border border-black px-2 py-1 text-center font-bold";
  const td = "border border-black px-2 py-1 align-top";

  return (
    <div className="min-h-screen bg-gray-200 py-6 text-black">
      <style>{printCss}</style>

      {/* ==== Toolbar ==== */}
      <div className="no-print mx-auto mb-4 flex max-w-[1100px] flex-wrap items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2">
          <Link href="/admin/akuntan" className="text-sm text-gray-700 underline">
            ← Menu Akuntan
          </Link>
          <span className="hidden text-sm text-gray-500 sm:inline">
            · Insentif Penerima Manfaat
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-300">
            <button
              type="button"
              onClick={() => gantiOutput("rekap")}
              className={`px-3 py-1.5 text-sm font-semibold ${output === "rekap" ? "bg-black text-white" : "bg-white text-gray-700"}`}
            >
              Rekap
            </button>
            <button
              type="button"
              onClick={() => gantiOutput("ba")}
              className={`px-3 py-1.5 text-sm font-semibold ${output === "ba" ? "bg-black text-white" : "bg-white text-gray-700"}`}
            >
              BA per Lembaga
            </button>
          </div>
          <select
            value={paper}
            onChange={(e) => setPaper(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          >
            {Object.entries(PAPERS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <select
            value={orient}
            onChange={(e) => setOrient(e.target.value as "portrait" | "landscape")}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="portrait">Potret</option>
            <option value="landscape">Lanskap</option>
          </select>
          <button
            type="button"
            onClick={simpan}
            disabled={saving || !tanggal}
            className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : "💾 Simpan"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            🖨️ Cetak / PDF
          </button>
        </div>
        {msg && <p className="w-full text-right text-sm text-gray-700">{msg}</p>}
      </div>

      {/* ==== Panel input (tidak ikut cetak) ==== */}
      <div className="no-print mx-auto mb-6 max-w-[1100px] rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">Periode</span>
            <input value={periode} onChange={(e) => setPeriode(e.target.value)} className={inp + " text-sm"} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">Tanggal dokumen</span>
            <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className={inp + " text-sm"} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">Jumlah hari (default semua)</span>
            <input inputMode="numeric" value={hariDefault} onChange={(e) => setHariDefault(e.target.value)} placeholder="mis. 10" className={inp + " text-sm"} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">Instansi penyerah</span>
            <input value={instansi} onChange={(e) => setInstansi(e.target.value)} className={inp + " text-sm"} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">Kepala SPPG</span>
            <input value={kepala} onChange={(e) => setKepala(e.target.value)} className={inp + " text-sm"} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">Pengawas Keuangan SPPG</span>
            <input value={pengawas} onChange={(e) => setPengawas(e.target.value)} className={inp + " text-sm"} />
          </label>
        </div>

        <p className="mt-4 mb-2 text-sm font-semibold text-gray-700">
          Daftar lembaga penerima insentif — centang yang disertakan. Total = PM ×
          hari × nominal (otomatis).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-1 py-1">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} title="Centang semua" />
                </th>
                <th className="border border-gray-300 px-2 py-1 text-left">Nama Lembaga</th>
                <th className="border border-gray-300 px-2 py-1">PM</th>
                <th className="border border-gray-300 px-2 py-1">Hari</th>
                <th className="border border-gray-300 px-2 py-1">Nominal</th>
                <th className="border border-gray-300 px-2 py-1 text-right">Total</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Nama PIC</th>
                <th className="border border-gray-300 px-2 py-1">Bank</th>
                <th className="border border-gray-300 px-2 py-1">No. Rekening</th>
                <th className="border border-gray-300 px-1 py-1">·</th>
              </tr>
            </thead>
            <tbody>
              {calc.list.map((r) => (
                <tr key={r.id} className={r.sertakan ? "" : "opacity-40"}>
                  <td className="border border-gray-300 px-1 py-1 text-center">
                    <input type="checkbox" checked={r.sertakan} onChange={(e) => upd(r.id, { sertakan: e.target.checked })} />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input value={r.nama} onChange={(e) => upd(r.id, { nama: e.target.value })} className={inp} />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input inputMode="numeric" value={r.pm} onChange={(e) => upd(r.id, { pm: e.target.value })} className={inp + " w-14 text-right"} />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input inputMode="numeric" value={r.hari} onChange={(e) => upd(r.id, { hari: e.target.value })} placeholder={hariDefault || "-"} className={inp + " w-12 text-right"} />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input inputMode="numeric" value={r.nominal} onChange={(e) => upd(r.id, { nominal: e.target.value })} className={inp + " w-20 text-right"} />
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right tabular-nums text-gray-700">
                    {fmtRibuan(r.total)}
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input value={r.pic} onChange={(e) => upd(r.id, { pic: e.target.value })} className={inp} />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input value={r.bank} onChange={(e) => upd(r.id, { bank: e.target.value })} className={inp + " w-20"} />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input value={r.rekening} onChange={(e) => upd(r.id, { rekening: e.target.value })} className={inp + " w-32"} />
                  </td>
                  <td className="border border-gray-300 px-1 py-1 text-center">
                    <button type="button" onClick={() => hapus(r.id)} className="px-1 text-red-600" title="Hapus baris">
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={tambah} className="mt-2 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100">
          ＋ Tambah lembaga
        </button>
        <p className="mt-2 text-xs text-gray-500">
          {calc.included.length} lembaga disertakan · Total PM {fmtRibuan(calc.sumPM)} ·
          Total insentif Rp {fmtRibuan(calc.sumTotal)}
        </p>
      </div>

      {/* ==== Keluaran cetak ==== */}
      <div
        ref={sheetRef}
        className="sheet mx-auto max-w-[1100px] bg-white p-8 font-serif text-[12px] leading-relaxed text-black shadow-lg"
      >
        {output === "rekap" ? (
          <RekapDoc
            included={calc.included}
            sumPM={calc.sumPM}
            sumTotal={calc.sumTotal}
            periode={periode}
            tanggal={tanggal}
            kepala={kepala}
            pengawas={pengawas}
            th={th}
            td={td}
          />
        ) : calc.included.length === 0 ? (
          <p className="py-10 text-center text-gray-400">
            (Belum ada lembaga yang dicentang)
          </p>
        ) : (
          calc.included.map((r) => (
            <BaDoc
              key={r.id}
              nama={r.nama}
              pic={r.pic}
              pm={r.pmN}
              hari={r.hariN}
              nominal={r.nominalN}
              total={r.total}
              periode={periode}
              tanggal={tanggal}
              kepala={kepala}
              instansi={instansi}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ---------- Rekap Insentif PIC (satu halaman) ---------- */
function RekapDoc({
  included,
  sumPM,
  sumTotal,
  periode,
  tanggal,
  kepala,
  pengawas,
  th,
  td,
}: {
  included: { id: number; nama: string; pmN: number; hariN: number; nominalN: number; total: number; pic: string; bank: string; rekening: string }[];
  sumPM: number;
  sumTotal: number;
  periode: string;
  tanggal: string;
  kepala: string;
  pengawas: string;
  th: string;
  td: string;
}) {
  return (
    <div>
      <div className="text-center leading-snug">
        <p className="text-[15px] font-bold uppercase">SPPG Ponorogo Balong Ngraket</p>
        <p className="text-[12px] font-bold uppercase">
          Yayasan Pengembangan Potensi Sumber Daya Pertahanan
        </p>
        <p className="text-[11px]">
          Jl. Raya Ngumpul - Balong, Desa Ngraket, Kec. Balong, Kab. Ponorogo
        </p>
      </div>
      <div className="mt-2 border-b-4 border-black" />

      <h2 className="mt-4 text-center text-[15px] font-bold uppercase">Insentif PIC</h2>
      <p className="text-center text-[12px]">Periode : {periode}</p>

      <table className="mt-3 w-full border-collapse text-[11px]">
        <thead>
          <tr style={{ backgroundColor: "#D9E1F2" }}>
            <th className={th}>No</th>
            <th className={th}>Nama Lembaga</th>
            <th className={th}>PM</th>
            <th className={th}>Jumlah hari</th>
            <th className={th}>Nominal</th>
            <th className={th}>Total</th>
            <th className={th}>Nama PIC</th>
            <th className={th}>Nama Bank</th>
            <th className={th}>No. Rekening</th>
          </tr>
        </thead>
        <tbody>
          {included.map((r, i) => (
            <tr key={r.id}>
              <td className={td + " text-center"}>{i + 1}</td>
              <td className={td}>{r.nama}</td>
              <td className={td + " text-right tabular-nums"}>{r.pmN || ""}</td>
              <td className={td + " text-center tabular-nums"}>{r.hariN || ""}</td>
              <td className={td + " text-right tabular-nums"}>{fmtRibuan(r.nominalN)}</td>
              <td className={td + " text-right tabular-nums"}>{fmtRibuan(r.total)}</td>
              <td className={td}>{r.pic}</td>
              <td className={td + " text-center"}>{r.bank}</td>
              <td className={td}>{r.rekening}</td>
            </tr>
          ))}
          <tr className="font-bold" style={{ backgroundColor: "#F2F2F2" }}>
            <td className={td + " text-center"} colSpan={2}>
              TOTAL
            </td>
            <td className={td + " text-right tabular-nums"}>{sumPM || ""}</td>
            <td className={td} />
            <td className={td} />
            <td className={td + " text-right tabular-nums"}>{fmtRibuan(sumTotal)}</td>
            <td className={td} colSpan={3} />
          </tr>
        </tbody>
      </table>

      <p className="mt-6 text-right text-[12px]">
        Ponorogo, {formatTanggalID(tanggal, "tanggal")}
      </p>
      <table className="mt-1 w-full text-[12px]">
        <tbody>
          <tr>
            <td className="w-1/2 text-center align-top">
              <p>Mengetahui</p>
              <p>Kepala SPPG</p>
              <div className="h-16" />
              <p className="font-bold underline">{kepala}</p>
            </td>
            <td className="w-1/2 text-center align-top">
              <p>Dibuat oleh</p>
              <p>Staf Pengawas Keuangan SPPG</p>
              <div className="h-16" />
              <p className="font-bold underline">{pengawas}</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ---------- BA Serah Terima Insentif (satu halaman per lembaga) ---------- */
function BaDoc({
  nama,
  pic,
  pm,
  hari,
  nominal,
  total,
  periode,
  tanggal,
  kepala,
  instansi,
}: {
  nama: string;
  pic: string;
  pm: number;
  hari: number;
  nominal: number;
  total: number;
  periode: string;
  tanggal: string;
  kepala: string;
  instansi: string;
}) {
  const L = ({ label, value }: { label: string; value: string }) => (
    <div className="flex">
      <span className="w-40 shrink-0">{label}</span>
      <span>: {value}</span>
    </div>
  );
  return (
    <div className="doc font-serif text-[13px] leading-relaxed">
      {/* Kop SPPG */}
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/bgn-logo.webp"
          alt="Logo BGN"
          className="absolute left-0 top-1/2 h-16 w-16 -translate-y-1/2 object-contain"
        />
        <div className="px-20 text-center leading-snug">
          <p className="text-[15px] font-bold uppercase">
            Satuan Pelayanan Pemenuhan Gizi Ngraket Balong
          </p>
          <p className="text-[11px]">
            Jl. Raya Ngumpul - Balong Dkh. Jugil, Desa Ngraket, Kec. Balong, Kab.
            Ponorogo, Jawa Timur 63461
          </p>
          <p className="text-[11px]">Email: sppgngraketbalong@gmail.com</p>
        </div>
        <div className="mt-2 border-b-4 border-black" />
      </div>

      <h2 className="mt-4 text-center text-[15px] font-bold uppercase">
        Berita Acara Serah Terima Insentif
      </h2>

      <p className="mt-4 text-justify">
        Pada hari ini {formatTanggalID(tanggal, "hari")} tanggal{" "}
        {formatTanggalID(tanggal, "tanggal")} kami yang bertanda tangan di bawah
        ini :
      </p>

      <p className="mt-3 font-semibold">Pihak yang menyerahkan</p>
      <L label="Nama" value={kepala} />
      <L label="Jabatan" value="Kepala SPPG" />
      <L label="Instansi" value={instansi} />

      <p className="mt-2 font-semibold">Pihak yang menerima</p>
      <L label="Nama" value={pic} />
      <L label="Jabatan" value="PIC" />
      <L label="Instansi" value={nama} />

      <p className="mt-3 text-justify">
        Dengan ini menyerahkan bahwa telah dilakukan serah terima insentif MBG
        dengan rincian sebagai berikut :
      </p>
      <L label="Jumlah Penerima" value={pm ? String(pm) : ""} />
      <L label="Jumlah hari" value={hari ? String(hari) : ""} />
      <L label="Nominal insentif" value={"Rp " + fmtRibuan(nominal)} />
      <L label="Total insentif" value={"Rp " + fmtRibuan(total)} />
      <L label="Periode Tanggal" value={periode} />

      <p className="mt-3 text-justify">
        Demikian berita acara ini dibuat dengan sebenar-benarnya untuk digunakan
        sebagaimana mestinya.
      </p>

      <table className="mt-6 w-full text-[13px]">
        <tbody>
          <tr>
            <td className="w-1/2 text-center align-top">
              <p>Pihak menyerahkan</p>
              <p>Kepala SPPG</p>
              <div className="h-16" />
              <p className="font-bold underline">{kepala}</p>
            </td>
            <td className="w-1/2 text-center align-top">
              <p>Pihak menerima</p>
              <p>&nbsp;</p>
              <div className="h-16" />
              <p className="font-bold underline">{pic}</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
