import { PrintFrame, Tgl, TabelEditable } from "../../akuntan/_components";
import { TTDGiziAuto } from "../_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";
import { KopGizi } from "../_kop";

const t = getTemplateGizi("retensi-sampel")!;

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
        Setiap menu yang didistribusikan wajib disimpan sampelnya minimal{" "}
        <b>2&times;24 jam</b> pada suhu simpan yang sesuai, sebagai bahan
        penelusuran bila terjadi keluhan atau dugaan keracunan makanan. Sampel
        baru dimusnahkan setelah masa retensi berakhir dan dinyatakan aman.
      </p>

      <p className="mt-3">
        Tanggal Produksi: <span className="font-semibold">………………………</span>
      </p>

      <div className="mt-3">
        <TabelEditable
          headers={[
            "No",
            "Nama Menu / Sampel",
            "Waktu Produksi",
            "Jumlah Sampel",
            "Suhu Simpan (°C)",
            "Mulai Retensi (tgl/jam)",
            "Pemusnahan 2×24 jam (tgl/jam)",
            "Kondisi Sampel",
            "Paraf",
          ]}
          baris={10}
        />
      </div>

      <p className="mt-4 text-xs text-slate-600">
        Catatan: Sampel disimpan dalam wadah tertutup &amp; berlabel (nama menu +
        tanggal-jam). Dilarang memusnahkan sampel sebelum masa 2&times;24 jam
        terlewati.
      </p>

      <p className="mt-6 text-right">
        Ponorogo, <Tgl mode="tanggal" />
      </p>

      <TTDGiziAuto />
    </PrintFrame>
  );
}
