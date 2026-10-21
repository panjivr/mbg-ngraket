import { PrintFrame, Ed } from "../../akuntan/_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";
import { KopGizi } from "../_kop";
import { TabelChecklistSampel } from "./TabelChecklistSampel";

const t = getTemplateGizi("checklist-sampel")!;

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

      <p className="mt-1 text-center text-[13px]">
        No. <Ed>…………………………</Ed>
      </p>

      {/* Identitas SPPG */}
      <div className="mt-4 space-y-1 text-[13px]">
        {["Nama SPPG", "ID SPPG", "Periode (Bulan)", "Tahun"].map((label) => (
          <div key={label} className="flex">
            <span className="w-40 shrink-0">{label}</span>
            <span>
              : <Ed>…………………………</Ed>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <TabelChecklistSampel />
      </div>
    </PrintFrame>
  );
}
