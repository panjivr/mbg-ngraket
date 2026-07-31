import { PrintFrame, Tgl } from "../../akuntan/_components";
import { MonitorKebersihanArea, TTDGiziAuto } from "../_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";
import { KopGizi } from "../_kop";

const t = getTemplateGizi("kebersihan-ruang")!;

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

      <MonitorKebersihanArea />

      <p className="mt-6 text-right text-[12px]">
        Ponorogo, <Tgl mode="tanggal" />
      </p>

      <TTDGiziAuto />
    </PrintFrame>
  );
}
