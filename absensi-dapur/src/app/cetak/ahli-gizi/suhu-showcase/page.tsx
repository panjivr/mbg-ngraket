import { PrintFrame, Tgl, Ed } from "../../akuntan/_components";
import { GridBulanan, TTDGiziAuto } from "../_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";
import { KopGizi } from "../_kop";

const t = getTemplateGizi("suhu-showcase")!;

export default function Page() {
  return (
    <PrintFrame
      saveUrl="/api/admin/ahli-gizi/dok"
      heading={t.heading}
      slug={t.slug}
      judul={t.judul}
      landscape={t.landscape}
      hideKop
    >
      <KopGizi heading={t.heading} />

      <div className="mb-3 flex flex-wrap justify-between gap-2 text-sm">
        <span>
          Bulan: <Ed>………</Ed>
        </span>
        <span>
          Jenis alat: <Ed>Showcase / Chiller / Freezer</Ed>
        </span>
        <span>
          Standar: Chiller <Ed>0–5℃</Ed> · Freezer <Ed>≤ −18℃</Ed>
        </span>
      </div>

      <GridBulanan
        labelKolom="Waktu Pemeriksaan"
        barisAwal={[
          "Pagi — Suhu (℃)",
          "Pagi — Paraf",
          "Malam — Suhu (℃)",
          "Malam — Paraf",
        ]}
      />

      <p className="mt-3 text-xs italic">
        Keterangan: periksa suhu penyimpanan dingin dua kali sehari (pagi &
        malam). Bila suhu di luar batas, pindahkan bahan dan laporkan.
      </p>

      <p className="mt-6 text-right">
        Ponorogo, <Tgl mode="tanggal" />
      </p>

      <TTDGiziAuto />
    </PrintFrame>
  );
}
