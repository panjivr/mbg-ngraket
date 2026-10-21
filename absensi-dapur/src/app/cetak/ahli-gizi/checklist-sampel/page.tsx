import { PrintFrame, Ed } from "../../akuntan/_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";
import { TabelChecklistSampel } from "./TabelChecklistSampel";

const t = getTemplateGizi("checklist-sampel")!;

/** Huruf formulir asli (Bookman Old Style) dengan cadangan serif serupa. */
const BOOKMAN =
  '"Bookman Old Style", Bookman, "URW Bookman", "URW Bookman L", Georgia, serif';

/**
 * Replika persis CHECKLIST SAMPEL MAKANAN (A4 potrait, tanpa kop). Jarak &
 * ukuran mengikuti hasil pengukuran PDF asli.
 */
export default function Page() {
  return (
    <PrintFrame
      saveUrl="/api/admin/ahli-gizi/dok"
      heading={t.heading}
      slug={t.slug}
      judul={t.judul}
      hideKop
    >
      {/* Saat cetak: tanpa padding lembar → hanya margin kertas (±16mm) sehingga
          lebar tabel ±178mm, mendekati aslinya (182mm). */}
      <style>{"@media print{.sheet.sheet.sheet{padding:0!important}}"}</style>
      <div
        className="text-[12pt] leading-[1.2] text-black"
        style={{ fontFamily: BOOKMAN }}
      >
        <p className="mt-[19mm] text-center font-bold">
          <i>CHECKLIST</i> SAMPEL MAKANAN
        </p>
        <p className="text-center">
          No. <Ed>…………………………</Ed>
        </p>

        {/* Identitas (bukan <table>: CSS cetak global memaksa tabel selebar kertas) */}
        <div className="ml-[11.3mm] mt-[5mm]">
          {["Nama SPPG", "ID SPPG", "Periode (Bulan)", "Tahun"].map((label) => (
            <div key={label} className="flex">
              <span className="w-[39.8mm] shrink-0">{label}</span>
              <span>
                : <Ed>……………….</Ed>
              </span>
            </div>
          ))}
        </div>

        <div className="mt-[10mm]">
          <TabelChecklistSampel />
        </div>
      </div>
    </PrintFrame>
  );
}
