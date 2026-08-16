import { PrintFrame, Tgl, TabelEditable } from "../../akuntan/_components";
import { TTDGiziAuto } from "../_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";
import { KopGizi } from "../_kop";

const t = getTemplateGizi("organoleptik")!;

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
        Uji organoleptik (uji sensori) dilakukan Ahli Gizi terhadap setiap menu
        sebelum didistribusikan, meliputi warna, aroma, rasa, tekstur, dan
        tingkat kematangan. Hasil menyatakan makanan <b>LAYAK</b> atau{" "}
        <b>TIDAK LAYAK</b> edar. Isi tiap kolom dengan penilaian:{" "}
        <i>Baik / Cukup / Kurang</i>.
      </p>

      <p className="mt-3">
        Tanggal Uji: <span className="font-semibold">………………………</span>
      </p>

      <div className="mt-3">
        <TabelEditable
          headers={[
            "No",
            "Nama Menu",
            "Warna",
            "Aroma",
            "Rasa",
            "Tekstur",
            "Kematangan",
            "Kesimpulan (Layak / Tidak)",
            "Paraf",
          ]}
          baris={10}
        />
      </div>

      <p className="mt-4 text-xs text-slate-600">
        Catatan: Menu yang dinyatakan <b>TIDAK LAYAK</b> edar dilarang
        didistribusikan dan wajib dicatat tindak lanjutnya.
      </p>

      <p className="mt-6 text-right">
        Ponorogo, <Tgl mode="tanggal" />
      </p>

      <TTDGiziAuto />
    </PrintFrame>
  );
}
