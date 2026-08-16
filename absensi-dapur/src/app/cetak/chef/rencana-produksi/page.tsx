import { PrintFrame, Tgl, TabelEditable, Ed, TTD } from "../../akuntan/_components";
import { findTemplate } from "@/lib/cetak-forms";
import { TEMPLATE_CHEF } from "@/lib/chef";

const t = findTemplate(TEMPLATE_CHEF, "rencana-produksi")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} slug={t.slug} judul={t.judul} landscape noSave>
      <p className="text-justify">
        Rincian rencana produksi masakan hari ini: menu, jumlah porsi, urutan
        memasak, alokasi tim, dan target waktu selesai per item.
      </p>
      <table className="mt-3 w-full text-sm">
        <tbody>
          <tr>
            <td className="py-0.5 pr-2">Hari / Tanggal</td>
            <td>: <Tgl mode="hari" />, <Tgl mode="tanggal" /></td>
            <td className="py-0.5 pr-2">Total Porsi</td>
            <td>: <Ed /></td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3">
        <TabelEditable
          headers={["No", "Menu", "Jml Porsi", "Urutan Masak", "Tim / PIC", "Target Selesai"]}
          baris={8}
        />
      </div>
      <p className="mt-6 text-right">Ponorogo, <Tgl mode="tanggal" /></p>
      <TTD
        kiri={{ peran: "Menyetujui, Kepala Dapur", nama: "(                    )" }}
        kanan={{ peran: "Chef / Kepala Produksi", nama: "(                    )" }}
      />
    </PrintFrame>
  );
}
