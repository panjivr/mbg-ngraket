import { PrintFrame, Tgl, TabelEditable, Ed, TTD } from "../../akuntan/_components";
import { findTemplate } from "@/lib/cetak-forms";
import { TEMPLATE_KEPALA_DAPUR } from "@/lib/kepala-dapur";

const t = findTemplate(TEMPLATE_KEPALA_DAPUR, "laporan-insiden")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} slug={t.slug} judul={t.judul} noSave>
      <p className="text-justify">
        Pencatatan kejadian tak terduga (kecelakaan kerja, kerusakan alat,
        kontaminasi, komplain) beserta kronologi, dampak, dan tindakan koreksi.
      </p>
      <table className="mt-3 w-full text-sm">
        <tbody>
          <tr>
            <td className="py-0.5 pr-2">Hari / Tanggal</td>
            <td>: <Tgl mode="hari" />, <Tgl mode="tanggal" /></td>
            <td className="py-0.5 pr-2">Jam Kejadian</td>
            <td>: <Ed /></td>
          </tr>
          <tr>
            <td className="py-0.5 pr-2">Lokasi</td>
            <td>: <Ed /></td>
            <td className="py-0.5 pr-2">Jenis Insiden</td>
            <td>: <Ed /></td>
          </tr>
        </tbody>
      </table>
      <p className="mt-3 font-semibold">Kronologi kejadian:</p>
      <Ed block className="mt-1 min-h-[4rem] w-full border border-black p-2" />
      <p className="mt-3 font-semibold">Dampak / kerugian:</p>
      <Ed block className="mt-1 min-h-[2.5rem] w-full border border-black p-2" />
      <p className="mt-3 font-semibold">Tindakan koreksi dan pencegahan:</p>
      <div className="mt-1">
        <TabelEditable headers={["No", "Tindakan", "PIC", "Batas Waktu"]} baris={4} />
      </div>
      <p className="mt-6 text-right">Ponorogo, <Tgl mode="tanggal" /></p>
      <TTD
        kiri={{ peran: "Pelapor", nama: "(                    )" }}
        kanan={{ peran: "Kepala Dapur", nama: "(                    )" }}
      />
    </PrintFrame>
  );
}
