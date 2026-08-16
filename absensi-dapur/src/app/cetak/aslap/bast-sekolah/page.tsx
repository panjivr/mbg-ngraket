import { PrintFrame, Tgl, TabelEditable, Ed, TTD } from "../../akuntan/_components";
import { findTemplate } from "@/lib/cetak-forms";
import { TEMPLATE_ASLAP } from "@/lib/aslap";

const t = findTemplate(TEMPLATE_ASLAP, "bast-sekolah")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} slug={t.slug} judul={t.judul} noSave>
      <p className="text-justify">
        Pada hari ini <Tgl mode="hari" />, tanggal <Tgl mode="tanggal" />, telah
        dilakukan serah terima makanan Program MBG dari pihak dapur SPPG kepada
        pihak sekolah/titik penerima berikut:
      </p>
      <table className="mt-3 w-full text-sm">
        <tbody>
          <tr>
            <td className="py-0.5 pr-2">Nama Sekolah / Titik</td>
            <td>: <Ed /></td>
          </tr>
          <tr>
            <td className="py-0.5 pr-2">Alamat</td>
            <td>: <Ed /></td>
          </tr>
          <tr>
            <td className="py-0.5 pr-2">Jam Serah Terima</td>
            <td>: <Ed /></td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3">
        <TabelEditable
          headers={["No", "Menu / Item", "Jumlah Porsi", "Kondisi", "Keterangan"]}
          baris={5}
        />
      </div>
      <p className="mt-3 text-justify">
        Makanan diterima dalam kondisi baik dan layak konsumsi. Demikian berita
        acara ini dibuat untuk dipergunakan sebagaimana mestinya.
      </p>
      <TTD
        kiri={{ peran: "Yang menyerahkan, Petugas Distribusi", nama: "(                    )" }}
        kanan={{ peran: "Yang menerima, Pihak Sekolah", nama: "(                    )" }}
      />
    </PrintFrame>
  );
}
