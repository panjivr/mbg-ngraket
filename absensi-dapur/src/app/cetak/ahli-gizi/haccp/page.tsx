import { PrintFrame, Tgl, TabelEditable } from "../../akuntan/_components";
import { TTDGiziAuto } from "../_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";
import { KopGizi } from "../_kop";

const t = getTemplateGizi("haccp")!;

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

      <p className="text-justify">
        Pemantauan titik kendali kritis (Critical Control Point) mutu dan
        keamanan pangan pada setiap tahap: penerimaan, penyimpanan, pengolahan,
        pemorsian, dan distribusi.
      </p>

      <p className="mt-3">
        Tanggal pemantauan: <Tgl mode="tanggal" />
      </p>

      <div className="mt-3">
        <TabelEditable
          headers={[
            "No",
            "Tahap / CCP",
            "Bahaya (Fisik/Kimia/Biologi)",
            "Batas Kritis",
            "Hasil Pemantauan",
            "Tindakan Koreksi",
            "Paraf",
          ]}
          baris={6}
        />
      </div>

      <p className="mt-6 text-right">
        Ponorogo, <Tgl mode="tanggal" />
      </p>

      <TTDGiziAuto />
    </PrintFrame>
  );
}
