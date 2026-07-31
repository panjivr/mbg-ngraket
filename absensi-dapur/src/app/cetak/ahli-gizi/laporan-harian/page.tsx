import { PrintFrame, Tgl, TTD, Ed } from "../../akuntan/_components";
import { TabelGizi } from "../_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";
import { KopGizi } from "../_kop";

const t = getTemplateGizi("laporan-harian")!;

const KELOMPOK = [
  "Balita, Ibu Hamil & Menyusui (B3)",
  "SD Kelas 1–3",
  "SD Kelas 4–6",
  "SMP & SMA",
];

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
        Rencana standar porsi menu untuk penyelenggaraan makan pada hari{" "}
        <Tgl mode="hari" />, <Tgl mode="tanggal" />. Rincian per kelompok sasaran
        beserta rekapitulasi zat gizi dan persentase pemenuhan (target 30% AKG
        per waktu makan).
      </p>

      {KELOMPOK.map((k) => (
        <div key={k} className="mt-5 break-inside-avoid">
          <p className="mb-1 text-sm font-bold uppercase">
            Kelompok: <Ed>{k}</Ed>
          </p>
          <TabelGizi />
        </div>
      ))}

      <p className="mt-4 text-right">
        Ponorogo, <Tgl mode="tanggal" />
      </p>

      <TTD
        kiri={{ peran: "Mengetahui,\nKepala SPPG", nama: "(………………………)" }}
        kanan={{ peran: "Ahli Gizi SPPG", nama: "(………………………)" }}
      />
    </PrintFrame>
  );
}
