import { PrintFrame, Tgl, TTD, Ed } from "../../akuntan/_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";

const t = getTemplateGizi("laporan-mingguan")!;

/** Satu bagian naratif berjudul (isi paragraf bisa diedit langsung). */
function Bagian({ judul, isi }: { judul: string; isi: string }) {
  return (
    <div className="mt-4">
      <p className="font-bold uppercase">
        <Ed>{judul}</Ed>
      </p>
      <p className="mt-1 whitespace-pre-line text-justify">
        <Ed block>{isi}</Ed>
      </p>
    </div>
  );
}

export default function Page() {
  return (
    <PrintFrame
      heading={t.heading}
      nomor={t.nomor}
      slug={t.slug}
      judul={t.judul}
      landscape={t.landscape}
    >
      <p className="text-center">
        Periode: <Ed>………</Ed> s.d. <Ed>………</Ed> ( Minggu ke- <Ed>…</Ed> )
      </p>

      <Bagian
        judul="I. Pendahuluan"
        isi="Laporan mingguan ini disusun sebagai bentuk pertanggungjawaban kegiatan ahli gizi dalam pengawasan mutu menu, higiene, dan pemenuhan gizi sasaran selama satu minggu."
      />
      <Bagian
        judul="II. Pelaksanaan Kegiatan"
        isi="Uraian pelaksanaan: perencanaan menu, pengawasan pengolahan, pemantauan suhu, pemorsian, serta distribusi makanan kepada sasaran."
      />
      <Bagian
        judul="III. Evaluasi Menu & Higiene Sanitasi"
        isi="Hasil evaluasi kesesuaian menu terhadap standar gizi, penerimaan sasaran (sisa/food waste), serta penerapan higiene sanitasi personel dan area."
      />
      <Bagian
        judul="IV. Kendala & Tindak Lanjut"
        isi="Kendala yang dihadapi selama pelaksanaan dan rencana tindak lanjut/perbaikan untuk minggu berikutnya."
      />
      <Bagian
        judul="V. Penutup"
        isi="Demikian laporan mingguan ini dibuat untuk dijadikan bahan evaluasi dan perbaikan penyelenggaraan makan bergizi."
      />

      <p className="mt-6 text-right">
        Ponorogo, <Tgl mode="tanggal" />
      </p>

      <TTD
        kiri={{ peran: "Mengetahui,\nKepala SPPG", nama: "(………………………)" }}
        kanan={{ peran: "Ahli Gizi SPPG", nama: "(………………………)" }}
      />
    </PrintFrame>
  );
}
