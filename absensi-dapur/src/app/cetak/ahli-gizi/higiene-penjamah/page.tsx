import { PrintFrame, Tgl, TabelEditable } from "../../akuntan/_components";
import { TTDGiziAuto } from "../_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";
import { KopGizi } from "../_kop";

const t = getTemplateGizi("higiene-penjamah")!;

export default function Page() {
  return (
    <PrintFrame
      saveUrl="/api/admin/ahli-gizi/dok"
      heading={t.heading}
      slug={t.slug}
      judul={t.judul}
      landscape
      hideKop
    >
      <KopGizi heading={t.heading} />

      <p className="text-justify">
        Pemeriksaan higiene penjamah makanan dilakukan setiap hari sebelum mulai
        bekerja. Isi tiap kolom dengan tanda <b>✓</b> (memenuhi) atau <b>✗</b>{" "}
        (tidak). Penjamah yang sakit, demam, batuk-pilek, diare, atau memiliki
        luka terbuka tidak diperbolehkan mengolah makanan.
      </p>

      <p className="mt-3">
        Tanggal: <span className="font-semibold">………………………</span>
      </p>

      <div className="mt-3">
        <TabelEditable
          headers={[
            "No",
            "Nama Penjamah",
            "Sehat (tidak sakit)",
            "Kuku pendek & bersih",
            "Celemek/pakaian bersih",
            "Penutup kepala",
            "Masker",
            "Tanpa luka terbuka",
            "Cuci tangan",
            "Ket.",
          ]}
          baris={12}
        />
      </div>

      <p className="mt-4 text-xs text-slate-600">
        Catatan: Tanpa perhiasan tangan saat mengolah makanan. Penjamah dengan
        gejala penyakit menular dialihkan ke tugas non-pengolahan.
      </p>

      <p className="mt-6 text-right">
        Ponorogo, <Tgl mode="tanggal" />
      </p>

      <TTDGiziAuto />
    </PrintFrame>
  );
}
