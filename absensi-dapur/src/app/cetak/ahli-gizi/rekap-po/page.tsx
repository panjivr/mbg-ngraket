import { PrintFrame, Tgl, TTD, TabelEditable, Ed } from "../../akuntan/_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";

const t = getTemplateGizi("rekap-po")!;

export default function Page() {
  return (
    <PrintFrame
      heading={t.heading}
      nomor={t.nomor}
      slug={t.slug}
      judul={t.judul}
      landscape={t.landscape}
    >
      <p className="text-justify">
        Rekapitulasi kebutuhan bahan baku hasil perhitungan standar porsi menu,
        sebagai dasar penyusunan Purchase Order (PO) kepada pemasok.
      </p>

      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <span>
          Untuk tanggal menu: <Ed>………</Ed>
        </span>
        <span>
          Jumlah porsi: <Ed>………</Ed>
        </span>
      </div>

      <div className="mt-3">
        <TabelEditable
          headers={[
            "No",
            "Nama Bahan",
            "Satuan",
            "Kebutuhan / Porsi",
            "Jumlah Porsi",
            "Total Kebutuhan",
            "Ket",
          ]}
          baris={8}
        />
      </div>

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
