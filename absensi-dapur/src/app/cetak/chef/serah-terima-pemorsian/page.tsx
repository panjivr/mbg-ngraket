import { PrintFrame, Tgl, TabelEditable, Ed, TTD } from "../../akuntan/_components";
import { findTemplate } from "@/lib/cetak-forms";
import { TEMPLATE_CHEF } from "@/lib/chef";

const t = findTemplate(TEMPLATE_CHEF, "serah-terima-pemorsian")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} slug={t.slug} judul={t.judul} noSave>
      <p className="text-justify">
        Serah terima masakan matang dari tim produksi ke tim pemorsian: jenis,
        jumlah, suhu saat serah, dan jam serah terima.
      </p>
      <table className="mt-3 w-full text-sm">
        <tbody>
          <tr>
            <td className="py-0.5 pr-2">Hari / Tanggal</td>
            <td>: <Tgl mode="hari" />, <Tgl mode="tanggal" /></td>
            <td className="py-0.5 pr-2">Jam Serah</td>
            <td>: <Ed /></td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3">
        <TabelEditable
          headers={["No", "Jenis Masakan", "Jumlah", "Suhu", "Jam Serah", "Keterangan"]}
          baris={7}
        />
      </div>
      <p className="mt-6 text-right">Ponorogo, <Tgl mode="tanggal" /></p>
      <TTD
        kiri={{ peran: "Yang menyerahkan, Chef Produksi", nama: "(                    )" }}
        kanan={{ peran: "Yang menerima, Tim Pemorsian", nama: "(                    )" }}
      />
    </PrintFrame>
  );
}
