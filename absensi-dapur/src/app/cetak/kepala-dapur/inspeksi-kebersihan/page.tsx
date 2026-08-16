import { PrintFrame, Tgl, TabelEditable, Ed, TTD } from "../../akuntan/_components";
import { findTemplate } from "@/lib/cetak-forms";
import { TEMPLATE_KEPALA_DAPUR } from "@/lib/kepala-dapur";

const t = findTemplate(TEMPLATE_KEPALA_DAPUR, "inspeksi-kebersihan")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} slug={t.slug} judul={t.judul} landscape noSave>
      <p className="text-justify">
        Ceklist kebersihan area kerja dan peralatan sebelum dan sesudah proses
        produksi. Beri tanda centang pada kolom sesuai kondisi.
      </p>
      <table className="mt-3 w-full text-sm">
        <tbody>
          <tr>
            <td className="py-0.5 pr-2">Hari / Tanggal</td>
            <td>: <Tgl mode="hari" />, <Tgl mode="tanggal" /></td>
            <td className="py-0.5 pr-2">Petugas</td>
            <td>: <Ed /></td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3">
        <TabelEditable
          headers={["No", "Area / Peralatan", "Sebelum", "Sesudah", "Petugas", "Keterangan"]}
          baris={12}
        />
      </div>
      <p className="mt-2 text-xs italic">
        Kolom Sebelum/Sesudah: isi tanda centang bila bersih, tanda silang bila
        perlu tindakan.
      </p>
      <p className="mt-6 text-right">Ponorogo, <Tgl mode="tanggal" /></p>
      <TTD
        kiri={{ peran: "Petugas Kebersihan", nama: "(                    )" }}
        kanan={{ peran: "Kepala Dapur", nama: "(                    )" }}
      />
    </PrintFrame>
  );
}
