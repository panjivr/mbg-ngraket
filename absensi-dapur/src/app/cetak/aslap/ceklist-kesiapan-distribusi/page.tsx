import { PrintFrame, Tgl, TabelEditable, Ed, TTD } from "../../akuntan/_components";
import { findTemplate } from "@/lib/cetak-forms";
import { TEMPLATE_ASLAP } from "@/lib/aslap";

const t = findTemplate(TEMPLATE_ASLAP, "ceklist-kesiapan-distribusi")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} slug={t.slug} judul={t.judul} noSave>
      <p className="text-justify">
        Pemeriksaan kesiapan armada dan perlengkapan sebelum keberangkatan
        distribusi. Beri tanda pada kolom status.
      </p>
      <table className="mt-3 w-full text-sm">
        <tbody>
          <tr>
            <td className="py-0.5 pr-2">Hari / Tanggal</td>
            <td>: <Tgl mode="hari" />, <Tgl mode="tanggal" /></td>
            <td className="py-0.5 pr-2">Kendaraan / Plat</td>
            <td>: <Ed /></td>
          </tr>
          <tr>
            <td className="py-0.5 pr-2">Pengemudi</td>
            <td>: <Ed /></td>
            <td className="py-0.5 pr-2">Jam Berangkat</td>
            <td>: <Ed /></td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3">
        <TabelEditable
          headers={["No", "Item Pemeriksaan", "Status", "Keterangan"]}
          baris={8}
        />
      </div>
      <p className="mt-6 text-right">Ponorogo, <Tgl mode="tanggal" /></p>
      <TTD
        kiri={{ peran: "Pemeriksa", nama: "(                    )" }}
        kanan={{ peran: "Koordinator Distribusi", nama: "(                    )" }}
      />
    </PrintFrame>
  );
}
