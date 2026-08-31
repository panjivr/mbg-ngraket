import { PrintFrame, Tgl, Ed } from "../../akuntan/_components";
import { TabelGizi, TTDGiziAuto } from "../_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";
import { KopGizi } from "../_kop";

const t = getTemplateGizi("laporan-harian")!;

// Tiap kelompok sasaran dipetakan ke sumber menu (sasaran distribusi) + AKG.
// B3 → menu sasaran "b3" (AKG balita); tiga kelompok lain → menu "reguler"
// (per-porsi identik; hanya % pemenuhan berbeda mengikuti AKG).
const KELOMPOK: { label: string; sasaran: "reguler" | "b3"; akgKey: string }[] = [
  { label: "Balita, Ibu Hamil & Menyusui (B3)", sasaran: "b3", akgKey: "balita" },
  { label: "SD Kelas 1–3", sasaran: "reguler", akgKey: "sd13" },
  { label: "SD Kelas 4–6", sasaran: "reguler", akgKey: "sd46" },
  { label: "SMP & SMA", sasaran: "reguler", akgKey: "smp" },
];

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

      {KELOMPOK.map((k) => (
        <div key={k.label} className="mt-5 break-inside-avoid">
          <p className="mb-1 text-sm font-bold uppercase">
            Kelompok: <Ed>{k.label}</Ed>
          </p>
          <TabelGizi sasaran={k.sasaran} akgKey={k.akgKey} />
        </div>
      ))}

      <p className="mt-4 text-right">
        Ponorogo, <Tgl mode="tanggal" />
      </p>

      <TTDGiziAuto />
    </PrintFrame>
  );
}
