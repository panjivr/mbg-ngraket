import { Tgl, TTD, PrintFrame, TabelEditable, Ed } from "../_components";
import { getTemplate } from "@/lib/akuntan";

const t = getTemplate("buku-kas-harian")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} nomor={t.nomor} slug={t.slug} judul={t.judul}>
      <p className="text-justify">
        Buku kas umum harian mencatat seluruh penerimaan dan pengeluaran kas
        kecil (petty cash) SPPG beserta saldo berjalan sebagai bukti
        pertanggungjawaban keuangan harian.
      </p>
      <table className="mt-3 w-full text-sm">
        <tbody>
          <tr>
            <td className="py-0.5 pr-2">Hari / Tanggal</td>
            <td>: <Tgl mode="hari" />, <Tgl mode="tanggal" /></td>
            <td className="py-0.5 pr-2">Saldo Awal</td>
            <td>: Rp <Ed /></td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3">
        <TabelEditable
          headers={["No", "Uraian", "Penerimaan (Rp)", "Pengeluaran (Rp)", "Saldo (Rp)"]}
          baris={10}
          lastRowLabel="SALDO AKHIR"
        />
      </div>
      <p className="mt-4 text-justify">
        Demikian buku kas umum harian ini dibuat dengan sebenarnya dan dapat
        dipertanggungjawabkan.
      </p>
      <p className="mt-4 text-right">Ponorogo, <Tgl mode="tanggal" /></p>
      <TTD
        kiri={{ peran: "Mengetahui,\nKepala SPPG", nama: "(                    )" }}
        kanan={{ peran: "Penanggung jawab,\nPengawas Keuangan SPPG", nama: "(                    )" }}
      />
    </PrintFrame>
  );
}
