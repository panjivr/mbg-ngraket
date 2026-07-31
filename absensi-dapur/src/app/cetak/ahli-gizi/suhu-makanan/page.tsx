import { PrintFrame, Tgl, TabelEditable } from "../../akuntan/_components";
import { TTDGiziAuto } from "../_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";
import { KopGizi } from "../_kop";

const t = getTemplateGizi("suhu-makanan")!;

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
        Pemeriksaan suhu makanan matang dan pada saat diporsi guna memastikan
        keamanan pangan. Standar: makanan matang panas ≥ 60℃, penyajian tidak
        lebih dari 4 jam pada suhu ruang.
      </p>

      <p className="mt-3">
        Bulan / Periode: <span className="font-semibold">………………</span>
      </p>

      <div className="mt-3">
        <TabelEditable
          headers={[
            "No",
            "Tanggal",
            "Menu",
            "Suhu Matang (℃)",
            "Waktu Cek",
            "Suhu Diporsi (℃)",
            "Waktu Porsi",
            "Paraf",
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
