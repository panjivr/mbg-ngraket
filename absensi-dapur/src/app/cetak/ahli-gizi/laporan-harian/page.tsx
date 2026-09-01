import { PrintFrame, Tgl } from "../../akuntan/_components";
import { SumberGiziSwitch, TTDGiziAuto } from "../_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";
import { KopGizi } from "../_kop";

const t = getTemplateGizi("laporan-harian")!;

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
        Rencana standar porsi menu untuk penyelenggaraan makan pada hari{" "}
        <Tgl mode="hari" />, <Tgl mode="tanggal" />. Rincian per kelompok sasaran
        beserta rekapitulasi zat gizi dan persentase pemenuhan (target 30% AKG
        per waktu makan).
      </p>

      <SumberGiziSwitch />

      <p className="mt-4 text-right">
        Ponorogo, <Tgl mode="tanggal" />
      </p>

      <TTDGiziAuto />
    </PrintFrame>
  );
}
