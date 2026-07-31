import { PrintFrame, Tgl, TabelEditable } from "../../akuntan/_components";
import { TTDGiziAuto } from "../_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";
import { KopGizi } from "../_kop";

const t = getTemplateGizi("foodwaste")!;

export default function Page() {
  return (
    <PrintFrame
      heading={t.heading}
      slug={t.slug}
      judul={t.judul}
      landscape={t.landscape}
      hideKop
    >
      <KopGizi heading={t.heading} />

      <p className="text-justify">
        Pencatatan sisa/limbah makanan (food waste) sebagai indikator penerimaan
        menu dan efisiensi produksi. Ditimbang dalam kilogram (kg) per komponen
        menu.
      </p>

      <p className="mt-3">
        Bulan / Periode: <span className="font-semibold">………………</span>
      </p>

      <div className="mt-3">
        <TabelEditable
          headers={[
            "No",
            "Tanggal",
            "Jml Porsi",
            "Makanan Pokok (kg)",
            "Lauk (kg)",
            "Sayur (kg)",
            "Buah (kg)",
            "Total (kg)",
            "Ket",
          ]}
          baris={8}
        />
      </div>

      <p className="mt-6 text-right">
        Ponorogo, <Tgl mode="tanggal" />
      </p>

      <TTDGiziAuto />
    </PrintFrame>
  );
}
