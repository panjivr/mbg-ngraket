import { PrintFrame, Tgl, TabelEditable, Ed, TTD } from "../../akuntan/_components";
import { findTemplate } from "@/lib/cetak-forms";
import { TEMPLATE_KEPALA_DAPUR } from "@/lib/kepala-dapur";

const t = findTemplate(TEMPLATE_KEPALA_DAPUR, "laporan-harian-operasional")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} slug={t.slug} judul={t.judul} landscape noSave>
      <p className="text-justify">
        Ringkasan operasional dapur untuk satu hari kerja: jumlah porsi yang
        diproduksi, menu, kehadiran staf, serta kendala dan tindak lanjut.
      </p>
      <table className="mt-3 w-full text-sm">
        <tbody>
          <tr>
            <td className="py-0.5 pr-2">Hari / Tanggal</td>
            <td>: <Tgl mode="hari" />, <Tgl mode="tanggal" /></td>
            <td className="py-0.5 pr-2">Total Porsi</td>
            <td>: <Ed /></td>
          </tr>
          <tr>
            <td className="py-0.5 pr-2">Staf Hadir / Total</td>
            <td>: <Ed /> / <Ed /></td>
            <td className="py-0.5 pr-2">Cuaca</td>
            <td>: <Ed /></td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3">
        <TabelEditable
          headers={["No", "Menu / Item", "Rencana Porsi", "Realisasi Porsi", "Kendala", "Tindak Lanjut"]}
          baris={8}
        />
      </div>
      <p className="mt-3">Catatan umum / evaluasi hari ini:</p>
      <Ed block className="mt-1 min-h-[3rem] w-full border border-black p-2" />
      <p className="mt-6 text-right">Ponorogo, <Tgl mode="tanggal" /></p>
      <TTD
        kiri={{ peran: "Mengetahui, Kepala SPPG", nama: "(                    )" }}
        kanan={{ peran: "Yang membuat, Kepala Dapur", nama: "(                    )" }}
      />
    </PrintFrame>
  );
}
