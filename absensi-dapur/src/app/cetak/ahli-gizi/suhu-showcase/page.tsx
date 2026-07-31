import { PrintFrame, Tgl, TTD, Ed } from "../../akuntan/_components";
import { GridBulanan } from "../_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";

const t = getTemplateGizi("suhu-showcase")!;

export default function Page() {
  return (
    <PrintFrame
      heading={t.heading}
      nomor={t.nomor}
      slug={t.slug}
      judul={t.judul}
      landscape={t.landscape}
    >
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

      <TTD
        kiri={{ peran: "Mengetahui,\nKepala SPPG", nama: "(………………………)" }}
        kanan={{ peran: "Ahli Gizi SPPG", nama: "(………………………)" }}
      />
    </PrintFrame>
  );
}
