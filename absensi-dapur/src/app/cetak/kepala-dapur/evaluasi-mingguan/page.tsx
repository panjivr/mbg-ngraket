import { PrintFrame, Tgl, TabelEditable, Ed, TTD } from "../../akuntan/_components";
import { findTemplate } from "@/lib/cetak-forms";
import { TEMPLATE_KEPALA_DAPUR } from "@/lib/kepala-dapur";

const t = findTemplate(TEMPLATE_KEPALA_DAPUR, "evaluasi-mingguan")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} slug={t.slug} judul={t.judul} landscape noSave>
      <p className="text-justify">
        Rekap capaian dapur selama satu pekan: total porsi, ketepatan waktu,
        kendala berulang, dan rencana perbaikan untuk pekan berikutnya.
      </p>
      <table className="mt-3 w-full text-sm">
        <tbody>
          <tr>
            <td className="py-0.5 pr-2">Periode</td>
            <td>: <Ed /> s/d <Ed /></td>
            <td className="py-0.5 pr-2">Total Porsi Sepekan</td>
            <td>: <Ed /></td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3">
        <TabelEditable
          headers={["No", "Indikator", "Target", "Realisasi", "Analisis", "Rencana Perbaikan"]}
          baris={8}
        />
      </div>
      <p className="mt-6 text-right">Ponorogo, <Tgl mode="tanggal" /></p>
      <TTD
        kiri={{ peran: "Mengetahui, Kepala SPPG", nama: "(                    )" }}
        kanan={{ peran: "Kepala Dapur", nama: "(                    )" }}
      />
    </PrintFrame>
  );
}
