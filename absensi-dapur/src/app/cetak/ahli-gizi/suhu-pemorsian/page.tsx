import { PrintFrame, Tgl, Ed } from "../../akuntan/_components";
import { GridBulanan, TTDGiziAuto } from "../_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";
import { KopGizi } from "../_kop";

const t = getTemplateGizi("suhu-pemorsian")!;

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

      <div className="mb-3 flex flex-wrap justify-between gap-2 text-sm">
        <span>
          Bulan: <Ed>………</Ed>
        </span>
        <span>
          Standar suhu ruang pemorsian: <Ed>15℃ – 35℃</Ed>
        </span>
      </div>

      <GridBulanan
        labelKolom="Uraian"
        barisAwal={["Suhu Ruang Pemorsian (℃)", "Paraf Petugas"]}
      />

      <p className="mt-3 text-xs italic">
        Keterangan: catat suhu ruang pemorsian setiap hari pada kolom tanggal
        yang sesuai. Bila suhu di luar batas standar, lakukan tindakan koreksi
        dan catat pada laporan harian.
      </p>

      <p className="mt-6 text-right">
        Ponorogo, <Tgl mode="tanggal" />
      </p>

      <TTDGiziAuto />
    </PrintFrame>
  );
}
