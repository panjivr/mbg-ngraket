import { PrintFrame, Tgl, TTD, Ed } from "../../akuntan/_components";
import { GridBulanan } from "../_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";

const t = getTemplateGizi("suhu-pemorsian")!;

export default function Page() {
  return (
    <PrintFrame
      heading={t.heading}
      nomor={t.nomor}
      slug={t.slug}
      judul={t.judul}
      landscape={t.landscape}
    >
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

      <TTD
        kiri={{ peran: "Mengetahui,\nKepala SPPG", nama: "(………………………)" }}
        kanan={{ peran: "Ahli Gizi SPPG", nama: "(………………………)" }}
      />
    </PrintFrame>
  );
}
