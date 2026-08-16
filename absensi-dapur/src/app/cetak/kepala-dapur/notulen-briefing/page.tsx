import { PrintFrame, Tgl, TabelEditable, Ed, TTD } from "../../akuntan/_components";
import { findTemplate } from "@/lib/cetak-forms";
import { TEMPLATE_KEPALA_DAPUR } from "@/lib/kepala-dapur";

const t = findTemplate(TEMPLATE_KEPALA_DAPUR, "notulen-briefing")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} slug={t.slug} judul={t.judul} noSave>
      <p className="text-justify">
        Notulen briefing / apel dapur: poin arahan, pembagian tugas per divisi,
        target hari ini, dan pengumuman untuk seluruh tim.
      </p>
      <table className="mt-3 w-full text-sm">
        <tbody>
          <tr>
            <td className="py-0.5 pr-2">Hari / Tanggal</td>
            <td>: <Tgl mode="hari" />, <Tgl mode="tanggal" /></td>
            <td className="py-0.5 pr-2">Pemimpin Briefing</td>
            <td>: <Ed /></td>
          </tr>
        </tbody>
      </table>
      <p className="mt-3 font-semibold">Pembagian tugas dan arahan:</p>
      <div className="mt-1">
        <TabelEditable headers={["No", "Divisi", "Arahan / Tugas", "PIC"]} baris={7} />
      </div>
      <p className="mt-3">Pengumuman lain:</p>
      <Ed block className="mt-1 min-h-[3rem] w-full border border-black p-2" />
      <p className="mt-6 text-right">Ponorogo, <Tgl mode="tanggal" /></p>
      <TTD
        kiri={{ peran: "Notulis", nama: "(                    )" }}
        kanan={{ peran: "Kepala Dapur", nama: "(                    )" }}
      />
    </PrintFrame>
  );
}
