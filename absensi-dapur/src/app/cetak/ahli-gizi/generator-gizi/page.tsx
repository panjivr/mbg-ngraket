import { PrintFrame } from "../../akuntan/_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";
import { KopGizi } from "../_kop";
import GeneratorGizi from "./GeneratorGizi";

const t = getTemplateGizi("generator-gizi")!;

export default function Page() {
  return (
    <PrintFrame
      saveUrl="/api/admin/ahli-gizi/dok"
      heading={t.heading}
      slug={t.slug}
      judul={t.judul}
      hideKop
    >
      <KopGizi heading={t.heading} />
      <GeneratorGizi />
    </PrintFrame>
  );
}
