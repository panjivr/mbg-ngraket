import { Ed, TTD, PrintFrame } from "../_components";
import { getTemplate } from "@/lib/akuntan";

const t = getTemplate("kekurangan-transfer")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} nomor={t.nomor}>
      <p className="text-justify">
        Pada hari ini <Ed>Rabu</Ed> tanggal <Ed>6 Mei 2026</Ed>, kami yang bertanda
        tangan di bawah ini :
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
        Dengan ini menyatakan bahwa telah terjadi kekurangan transfer dana bahan
        baku pada <Ed>6 Mei 2026</Ed> kepada Supplier <Ed>AR Toserba</Ed>, dengan
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
            <td className="pr-3 align-top">Selisih Kekurangan Transfer</td>
            <td className="align-top">: Rp<Ed>0</Ed></td>
          </tr>
        </tbody>
      </table>

      <p className="mt-3 text-justify">
        Atas kekurangan transfer tersebut, pihak pengirim bersedia melakukan
        pelunasan kekurangan dana melalui rekening berikut:
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
        Kedua belah pihak sepakat bahwa pelunasan kekurangan transfer dilakukan
        sesuai dengan nilai yang tercantum di atas dan tanpa mengurangi hak maupun
        kewajiban masing-masing pihak.
      </p>
      <p className="mt-2 text-justify">
        Demikian pernyataan ini dibuat dengan sebenar-benarnya untuk dapat
        dipergunakan sebagaimana mestinya.
      </p>
      <p className="mt-2 italic">Lampiran: Mutasi &amp; Invoice 6 Mei 2026.</p>

      <p className="mt-4 text-right">
        Ponorogo, <Ed>6 Mei 2026</Ed>
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
