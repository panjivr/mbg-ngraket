import { PrintFrame, Tgl, TabelEditable, Ed, TTD } from "../../akuntan/_components";
import { findTemplate } from "@/lib/cetak-forms";
import { TEMPLATE_KEPALA_DAPUR } from "@/lib/kepala-dapur";

const t = findTemplate(TEMPLATE_KEPALA_DAPUR, "serah-terima-shift")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} slug={t.slug} judul={t.judul} noSave>
      <p className="text-justify">
        Berita acara penyerahan tugas antar penanggung jawab shift.
      </p>
      <div className="mt-3">
        <TabelEditable headers={["No", "Uraian / Item", "Status", "Keterangan"]} baris={8} />
      </div>
      <p className="mt-6 text-right">Ponorogo, <Tgl mode="tanggal" /></p>
      <TTD kiri={{ peran: "Menyerahkan,\nPJ Shift", nama: "( ... )" }} kanan={{ peran: "Menerima,\nPJ Shift", nama: "( ... )" }} />
    </PrintFrame>
  );
}
