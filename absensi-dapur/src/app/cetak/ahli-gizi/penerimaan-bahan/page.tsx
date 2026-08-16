import { PrintFrame, Tgl, TabelEditable } from "../../akuntan/_components";
import { TTDGiziAuto } from "../_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";
import { KopGizi } from "../_kop";

const t = getTemplateGizi("penerimaan-bahan")!;

export default function Page() {
  return (
    <PrintFrame
      saveUrl="/api/admin/ahli-gizi/dok"
      heading={t.heading}
      slug={t.slug}
      judul={t.judul}
      landscape
      hideKop
    >
      <KopGizi heading={t.heading} />

      <p className="text-justify">
        Setiap bahan baku yang diterima dari supplier diperiksa mutunya sebelum
        disimpan: kesesuaian jumlah, suhu (untuk bahan dingin/beku), kondisi
        fisik &amp; kesegaran, serta tanggal kadaluarsa. Bahan yang tidak
        memenuhi syarat dinyatakan <b>DITOLAK</b> dan dikembalikan ke supplier.
      </p>

      <p className="mt-3">
        Tanggal Penerimaan: <span className="font-semibold">………………………</span>
      </p>

      <div className="mt-3">
        <TabelEditable
          headers={[
            "No",
            "Nama Bahan",
            "Supplier",
            "Jumlah",
            "Satuan",
            "Suhu (°C)",
            "Kondisi / Mutu",
            "Tgl Kadaluarsa",
            "Diterima / Ditolak",
            "Paraf",
          ]}
          baris={12}
        />
      </div>

      <p className="mt-4 text-xs text-slate-600">
        Catatan: Bahan beku diterima ≤ −18°C, bahan dingin ≤ 5°C. Bahan berjamur,
        berbau, kemasan rusak, atau kadaluarsa wajib DITOLAK.
      </p>

      <p className="mt-6 text-right">
        Ponorogo, <Tgl mode="tanggal" />
      </p>

      <TTDGiziAuto />
    </PrintFrame>
  );
}
