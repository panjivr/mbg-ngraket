import { PrintFrame, Tgl, TabelEditable, Ed } from "../../akuntan/_components";
import { findTemplate } from "@/lib/cetak-forms";
import { TEMPLATE_ASLAP } from "@/lib/aslap";

const t = findTemplate(TEMPLATE_ASLAP, "retur-sisa")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} slug={t.slug} judul={t.judul} landscape noSave>
      <p className="text-justify">
        Pencatatan makanan yang dikembalikan atau tersisa per titik distribusi
        beserta alasan dan tindakan penanganannya.
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
          headers={["No", "Titik", "Menu", "Jml Sisa", "Alasan", "Penanganan"]}
          baris={10}
        />
      </div>
      <p className="mt-6 text-right">Ponorogo, <Tgl mode="tanggal" /></p>
    </PrintFrame>
  );
}
