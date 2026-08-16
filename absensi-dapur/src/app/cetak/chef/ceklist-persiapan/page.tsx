import { PrintFrame, Tgl, TabelEditable, Ed, TTD } from "../../akuntan/_components";
import { findTemplate } from "@/lib/cetak-forms";
import { TEMPLATE_CHEF } from "@/lib/chef";

const t = findTemplate(TEMPLATE_CHEF, "ceklist-persiapan")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} slug={t.slug} judul={t.judul} noSave>
      <p className="text-justify">
        Daftar bahan yang harus disiapkan sebelum memasak (mise en place):
        pemotongan, bumbu, takaran, dan status kesiapan.
      </p>
      <table className="mt-3 w-full text-sm">
        <tbody>
          <tr>
            <td className="py-0.5 pr-2">Hari / Tanggal</td>
            <td>: <Tgl mode="hari" />, <Tgl mode="tanggal" /></td>
            <td className="py-0.5 pr-2">Penanggung Jawab</td>
            <td>: <Ed /></td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3">
        <TabelEditable
          headers={["No", "Bahan", "Jumlah / Takaran", "Perlakuan", "Status"]}
          baris={10}
        />
      </div>
      <p className="mt-6 text-right">Ponorogo, <Tgl mode="tanggal" /></p>
      <TTD
        kiri={{ peran: "Petugas Persiapan", nama: "(                    )" }}
        kanan={{ peran: "Chef / Kepala Produksi", nama: "(                    )" }}
      />
    </PrintFrame>
  );
}
