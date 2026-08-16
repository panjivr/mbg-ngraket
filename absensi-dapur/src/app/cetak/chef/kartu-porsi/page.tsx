import { PrintFrame, Tgl, TabelEditable, Ed } from "../../akuntan/_components";
import { findTemplate } from "@/lib/cetak-forms";
import { TEMPLATE_CHEF } from "@/lib/chef";

const t = findTemplate(TEMPLATE_CHEF, "kartu-porsi")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} slug={t.slug} judul={t.judul} landscape noSave>
      <p className="text-justify">
        Standar berat/porsi per menu dan perhitungan hasil (yield) agar jumlah
        masakan sesuai target jumlah penerima.
      </p>
      <table className="mt-3 w-full text-sm">
        <tbody>
          <tr>
            <td className="py-0.5 pr-2">Hari / Tanggal</td>
            <td>: <Tgl mode="hari" />, <Tgl mode="tanggal" /></td>
            <td className="py-0.5 pr-2">Jml Penerima</td>
            <td>: <Ed /></td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3">
        <TabelEditable
          headers={["No", "Menu", "Standar/Porsi (gram)", "Jml Porsi", "Total Kebutuhan", "Yield", "Keterangan"]}
          baris={8}
        />
      </div>
      <p className="mt-6 text-right">Ponorogo, <Tgl mode="tanggal" /></p>
    </PrintFrame>
  );
}
