import { PrintFrame, Tgl, Ed } from "../../akuntan/_components";
import { GridBulanan, TTDGiziAuto } from "../_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";
import { KopGizi } from "../_kop";

const t = getTemplateGizi("kebersihan-area")!;

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
          Petugas kebersihan: <Ed>………</Ed>
        </span>
      </div>

      <GridBulanan
        labelKolom="Area / Kegiatan"
        barisAwal={[
          "Gudang bahan kering",
          "Ruang penyimpanan dingin (chiller/freezer)",
          "Area pengolahan / dapur",
          "Area pemorsian",
          "Area pencucian alat",
          "Loker & ruang ganti",
          "Toilet & wastafel",
          "Tempat sampah & saluran limbah",
        ]}
        editLabel
        ket
        bisaTambah
      />

      <p className="mt-3 text-xs italic">
        Keterangan: beri tanda (✓) pada kolom tanggal bila area/kegiatan sudah
        dibersihkan sesuai standar. Tambahkan baris bila ada area lain.
      </p>

      <p className="mt-6 text-right">
        Ponorogo, <Tgl mode="tanggal" />
      </p>

      <TTDGiziAuto />
    </PrintFrame>
  );
}
