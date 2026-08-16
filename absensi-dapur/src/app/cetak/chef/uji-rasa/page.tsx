import { PrintFrame, Tgl, TabelEditable, Ed, TTD } from "../../akuntan/_components";
import { findTemplate } from "@/lib/cetak-forms";
import { TEMPLATE_CHEF } from "@/lib/chef";

const t = findTemplate(TEMPLATE_CHEF, "uji-rasa")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} slug={t.slug} judul={t.judul} noSave>
      <p className="text-justify">
        Penilaian rasa, tekstur, kematangan, dan kelayakan tiap menu sebelum
        dilepas ke tim pemorsian dan distribusi.
      </p>
      <table className="mt-3 w-full text-sm">
        <tbody>
          <tr>
            <td className="py-0.5 pr-2">Hari / Tanggal</td>
            <td>: <Tgl mode="hari" />, <Tgl mode="tanggal" /></td>
            <td className="py-0.5 pr-2">Penguji</td>
            <td>: <Ed /></td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3">
        <TabelEditable
          headers={["No", "Menu", "Rasa", "Tekstur", "Kematangan", "Kelayakan", "Catatan"]}
          baris={8}
        />
      </div>
      <p className="mt-6 text-right">Ponorogo, <Tgl mode="tanggal" /></p>
      <TTD
        kiri={{ peran: "Penguji Rasa", nama: "(                    )" }}
        kanan={{ peran: "Chef / Kepala Produksi", nama: "(                    )" }}
      />
    </PrintFrame>
  );
}
