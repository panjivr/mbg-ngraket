import { PrintFrame, Tgl, TabelEditable, Ed } from "../../akuntan/_components";
import { findTemplate } from "@/lib/cetak-forms";
import { TEMPLATE_ASLAP } from "@/lib/aslap";

const t = findTemplate(TEMPLATE_ASLAP, "rekap-penerima")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} slug={t.slug} judul={t.judul} landscape noSave>
      <p className="text-justify">
        Rekapitulasi jumlah penerima per titik/sekolah pada satu hari distribusi:
        rencana vs realisasi porsi dan jam pengiriman.
      </p>
      <table className="mt-3 w-full text-sm">
        <tbody>
          <tr>
            <td className="py-0.5 pr-2">Hari / Tanggal</td>
            <td>: <Tgl mode="hari" />, <Tgl mode="tanggal" /></td>
            <td className="py-0.5 pr-2">Koordinator</td>
            <td>: <Ed /></td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3">
        <TabelEditable
          headers={["No", "Titik / Sekolah", "Rencana", "Realisasi", "Selisih", "Jam Kirim", "Keterangan"]}
          baris={12}
          lastRowLabel="TOTAL"
        />
      </div>
      <p className="mt-6 text-right">Ponorogo, <Tgl mode="tanggal" /></p>
    </PrintFrame>
  );
}
