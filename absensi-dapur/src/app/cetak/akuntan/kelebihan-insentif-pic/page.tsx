import { Ed, Tgl, TTD, PrintFrame } from "../_components";
import { getTemplate } from "@/lib/akuntan";

const t = getTemplate("kelebihan-insentif-pic")!;

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
        Dengan ini menyatakan bahwa telah terjadi kelebihan transfer dana Insentif
        PIC Periode <Ed>13-25 Juli 2026</Ed> sebesar Rp<Ed>160.000</Ed> (
        <Ed>seratus enam puluh ribu rupiah</Ed>). Atas kelebihan transfer tersebut,
        dana akan ditarik/dikembalikan kembali sesuai dengan ketentuan yang berlaku.
      </p>
      <p className="mt-2 text-justify">
        Demikian pernyataan ini dibuat dengan sebenar-benarnya untuk dapat
        dipergunakan sebagaimana mestinya.
      </p>

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
