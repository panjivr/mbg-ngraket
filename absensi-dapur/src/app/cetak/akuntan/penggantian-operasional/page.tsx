import { Ed, Tgl, TTD, TabelEditable, PrintFrame } from "../_components";
import { getTemplate } from "@/lib/akuntan";

const t = getTemplate("penggantian-operasional")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} nomor={t.nomor} slug={t.slug} judul={t.judul}>
      <p className="text-justify">
        Pada hari ini, <Tgl mode="hari" /> <Tgl mode="tanggal" />, bertempat di SPPG
        Ngraket Balong 2026, telah dilakukan pembelian barang untuk kebutuhan
        operasional dengan rincian sebagai berikut:
      </p>

      <table className="mt-3 text-sm">
        <tbody>
          <tr>
            <td className="pr-3 align-top">Nama Kegiatan</td>
            <td className="align-top">: <Ed>Pengadaan barang operasional SPPG</Ed></td>
          </tr>
          <tr>
            <td className="pr-3 align-top">Nama Penanggung Jawab</td>
            <td className="align-top">: <Ed>Dyah Ayu Widyawati, S.E</Ed></td>
          </tr>
          <tr>
            <td className="pr-3 align-top">Sumber Dana Sementara</td>
            <td className="align-top">: <Ed>Petty cash SPPG Ngraket Balong</Ed></td>
          </tr>
          <tr>
            <td className="pr-3 align-top">Total Pengeluaran</td>
            <td className="align-top">: Rp<Ed>0</Ed></td>
          </tr>
        </tbody>
      </table>

      <div className="mt-3">
        <TabelEditable
          headers={["Tanggal", "Nama Barang", "Total (Rp)"]}
          baris={3}
          autoNo={false}
          lastRowLabel="TOTAL"
        />
      </div>

      <p className="mt-3 text-justify">
        Adapun pembelian barang tersebut telah dilaksanakan sesuai dengan kebutuhan
        operasional dan menggunakan dana talangan sementara, sehingga diajukan
        penggantian dana operasional kepada pihak yang berwenang.
      </p>
      <p className="mt-2 text-justify">
        Sebagai bahan pertanggungjawaban, seluruh bukti pembelian (nota/invoice)
        terlampir dalam berita acara ini.
      </p>
      <p className="mt-2 text-justify">
        Demikian berita acara ini dibuat dengan sebenar-benarnya untuk dapat
        digunakan sebagaimana mestinya.
      </p>

      <p className="mt-4 text-right">
        Ponorogo, <Tgl mode="tanggal" />
      </p>

      <TTD
        kiri={{
          peran: "Penanggung jawab,\nPengawas Keuangan SPPG",
          nama: "(Dyah Ayu Widyawati, S.E)",
        }}
        kanan={{ peran: "Mengetahui,\nKepala SPPG", nama: "(Abdulah Indriawan, S.Sos)" }}
      />
    </PrintFrame>
  );
}
