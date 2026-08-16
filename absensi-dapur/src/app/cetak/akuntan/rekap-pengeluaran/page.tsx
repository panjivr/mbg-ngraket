import { Tgl, TTD, PrintFrame, TabelEditable, Ed } from "../_components";
import { getTemplate } from "@/lib/akuntan";

const t = getTemplate("rekap-pengeluaran")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} nomor={t.nomor} slug={t.slug} judul={t.judul}>
      <p className="text-justify">
        Rekapitulasi seluruh pengeluaran operasional SPPG dalam satu bulan,
        dikelompokkan per kategori sebagai bahan pelaporan dan evaluasi anggaran.
      </p>
      <table className="mt-3 w-full text-sm">
        <tbody>
          <tr>
            <td className="py-0.5 pr-2">Bulan</td>
            <td>: <Ed /></td>
            <td className="py-0.5 pr-2">Tahun</td>
            <td>: <Tgl mode="tahun" /></td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3">
        <TabelEditable
          headers={["No", "Kategori Pengeluaran", "Jumlah Transaksi", "Total (Rp)", "Keterangan"]}
          baris={10}
          lastRowLabel="TOTAL"
        />
      </div>
      <p className="mt-4 text-justify">
        Demikian rekapitulasi pengeluaran ini dibuat dengan sebenarnya untuk
        dipergunakan sebagaimana mestinya.
      </p>
      <p className="mt-4 text-right">Ponorogo, <Tgl mode="tanggal" /></p>
      <TTD
        kiri={{ peran: "Mengetahui,\nKepala SPPG", nama: "(                    )" }}
        kanan={{ peran: "Penanggung jawab,\nPengawas Keuangan SPPG", nama: "(                    )" }}
      />
    </PrintFrame>
  );
}
