import { Ed, Tgl, TTD, PrintFrame } from "../_components";
import { getTemplate } from "@/lib/akuntan";

const t = getTemplate("kelebihan-transfer")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} nomor={t.nomor} slug={t.slug} judul={t.judul}>
      <p className="text-justify">
        Pada hari ini <Tgl mode="hari" /> tanggal <Tgl mode="tanggal" />, kami yang
        bertanda tangan di bawah ini :
      </p>

      <table className="mt-3 text-sm">
        <tbody>
          <tr>
            <td className="pr-3 align-top">Nama</td>
            <td className="align-top">: <Ed>Dyah Ayu Widyawati, S.E</Ed></td>
          </tr>
          <tr>
            <td className="pr-3 align-top">Jabatan</td>
            <td className="align-top">: <Ed>Staf Pengawas Keuangan SPPG</Ed></td>
          </tr>
          <tr>
            <td className="pr-3 align-top">Instansi</td>
            <td className="align-top">: <Ed>SPPG Ngraket Balong Ponorogo</Ed></td>
          </tr>
        </tbody>
      </table>

      <p className="mt-3 text-justify">
        Dengan ini menyatakan bahwa telah terjadi kelebihan transfer dana bahan baku
        pada <Ed>4 April 2026</Ed> kepada Supplier <Ed>AR Toserba</Ed>, dengan
        rincian sebagai berikut:
      </p>

      <table className="mt-3 text-sm">
        <tbody>
          <tr>
            <td className="pr-3 align-top">Nama Bank</td>
            <td className="align-top">: <Ed>………………………………</Ed></td>
          </tr>
          <tr>
            <td className="pr-3 align-top">Nomor Rekening Tujuan</td>
            <td className="align-top">: <Ed>………………………………</Ed></td>
          </tr>
          <tr>
            <td className="pr-3 align-top">Nama Pemilik Rekening</td>
            <td className="align-top">: <Ed>………………………………</Ed></td>
          </tr>
          <tr>
            <td className="pr-3 align-top">Jumlah Dana yang Seharusnya Ditransfer</td>
            <td className="align-top">: Rp<Ed>0</Ed></td>
          </tr>
          <tr>
            <td className="pr-3 align-top">Jumlah Dana yang Terkirim</td>
            <td className="align-top">: Rp<Ed>0</Ed></td>
          </tr>
          <tr>
            <td className="pr-3 align-top">Kelebihan Transfer</td>
            <td className="align-top">: Rp<Ed>0</Ed></td>
          </tr>
        </tbody>
      </table>

      <p className="mt-3 text-justify">
        Atas kelebihan transfer tersebut, pihak penerima bersedia mengembalikan
        kelebihan dana melalui rekening berikut:
      </p>
      <table className="mt-2 text-sm">
        <tbody>
          <tr>
            <td className="pr-3 align-top">Nama Bank</td>
            <td className="align-top">: <Ed>………………………………</Ed></td>
          </tr>
          <tr>
            <td className="pr-3 align-top">Nomor Rekening</td>
            <td className="align-top">: <Ed>………………………………</Ed></td>
          </tr>
          <tr>
            <td className="pr-3 align-top">Atas Nama</td>
            <td className="align-top">: <Ed>………………………………</Ed></td>
          </tr>
        </tbody>
      </table>

      <p className="mt-3 text-justify">
        Kedua belah pihak sepakat bahwa pengembalian kelebihan transfer dilakukan
        sesuai dengan nilai yang tercantum di atas dan tanpa mengurangi hak maupun
        kewajiban masing-masing pihak.
      </p>
      <p className="mt-2 text-justify">
        Demikian pernyataan ini dibuat dengan sebenar-benarnya untuk dapat
        dipergunakan sebagaimana mestinya.
      </p>
      <p className="mt-2 italic">Lampiran: Mutasi &amp; Invoice 4 April 2026.</p>

      <p className="mt-4 text-right">
        Ponorogo, <Tgl mode="tanggal" />
      </p>

      <TTD
        kiri={{
          peran: "Yang membuat pernyataan,\nStaf Pengawas Keuangan SPPG",
          nama: "(Dyah Ayu Widyawati, S.E)",
        }}
        kanan={{ peran: "Mengetahui,\nKepala SPPG", nama: "(Abdulah Indriawan, S.Sos)" }}
      />
    </PrintFrame>
  );
}
