import { PrintFrame, Tgl, TabelEditable, Ed, TTD } from "../../akuntan/_components";
import { findTemplate } from "@/lib/cetak-forms";
import { TEMPLATE_ASLAP } from "@/lib/aslap";

const t = findTemplate(TEMPLATE_ASLAP, "monitoring-sekolah")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} slug={t.slug} judul={t.judul} noSave>
      <p className="text-justify">
        Catatan pemantauan lapangan: penerimaan siswa, respons terhadap rasa dan
        porsi, serta temuan lain sebagai umpan balik untuk dapur.
      </p>
      <table className="mt-3 w-full text-sm">
        <tbody>
          <tr>
            <td className="py-0.5 pr-2">Hari / Tanggal</td>
            <td>: <Tgl mode="hari" />, <Tgl mode="tanggal" /></td>
            <td className="py-0.5 pr-2">Sekolah</td>
            <td>: <Ed /></td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3">
        <TabelEditable
          headers={["No", "Aspek Pemantauan", "Temuan", "Rekomendasi"]}
          baris={8}
        />
      </div>
      <p className="mt-6 text-right">Ponorogo, <Tgl mode="tanggal" /></p>
      <TTD
        kiri={{ peran: "Petugas Monitoring", nama: "(                    )" }}
        kanan={{ peran: "Koordinator Distribusi", nama: "(                    )" }}
      />
    </PrintFrame>
  );
}
