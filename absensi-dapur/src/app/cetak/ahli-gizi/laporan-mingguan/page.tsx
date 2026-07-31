import { PrintFrame, Tgl, TTD, Ed } from "../../akuntan/_components";
import { DaftarPenerima, DokHari } from "../_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";

const t = getTemplateGizi("laporan-mingguan")!;

/** Bab bernomor (judul tebal kapital + isi). */
function Bab({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="text-center font-bold uppercase">{judul}</p>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

/** Sub-bagian berjudul dengan satu paragraf naratif yang bisa diedit. */
function Sub({ judul, isi }: { judul: string; isi: string }) {
  return (
    <div>
      <p className="font-bold">{judul}</p>
      <p className="mt-0.5 whitespace-pre-line text-justify">
        <Ed block>{isi}</Ed>
      </p>
    </div>
  );
}

/** 5 hari pemberian (Senin–Jumat), tiap hari 2 foto 1:1. */
const HARI: { ke: string; hari: string; menu?: string }[] = [
  {
    ke: "01",
    hari: "Senin",
    menu: "Nasi putih, Lele saus padang, Perkedel tahu, Tumis manisa, Apel",
  },
  { ke: "02", hari: "Selasa" },
  { ke: "03", hari: "Rabu" },
  { ke: "04", hari: "Kamis" },
  { ke: "05", hari: "Jumat" },
];

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
        Periode Pemberian: <Ed>………</Ed> s.d. <Ed>………</Ed> Tahun{" "}
        <Ed>2026</Ed> (5 hari kerja)
      </p>

      {/* BAB I */}
      <Bab judul="BAB I — Pendahuluan">
        <Sub
          judul="A. Latar Belakang"
          isi="Program Makan Bergizi Gratis (MBG) Badan Gizi Nasional R.I. melalui Satuan Pelayanan Pemenuhan Gizi (SPPG) bertujuan memenuhi kebutuhan gizi sasaran secara terukur, aman, dan berkelanjutan. Laporan mingguan ini disusun sebagai bentuk pertanggungjawaban pelaksanaan kegiatan selama satu minggu pemberian."
        />
        <Sub
          judul="B. Tujuan"
          isi={`1. Memastikan menu yang diberikan memenuhi standar gizi sasaran.\n2. Menjaga mutu, keamanan, dan higiene sanitasi selama pengolahan hingga distribusi.\n3. Menyajikan dokumentasi dan evaluasi pelaksanaan sebagai bahan perbaikan.`}
        />
        <Sub
          judul="C. Sasaran"
          isi="Penerima manfaat MBG pada wilayah layanan SPPG (PAUD, TK/RA, SD/MI, SMP/MTs, serta posyandu/B3) sebagaimana rincian pada tabel Daftar Penerima MBG di BAB II."
        />
      </Bab>

      {/* BAB II */}
      <Bab judul="BAB II — Pelaksanaan Kegiatan">
        <Sub
          judul="A. Persiapan"
          isi="Perencanaan menu mingguan, pengecekan ketersediaan bahan baku, serta koordinasi jadwal pengolahan dan distribusi dengan tim dapur dan pengantar."
        />
        <Sub
          judul="B. Pelaksanaan"
          isi={`Kegiatan dilaksanakan secara bertahap setiap hari:\n• Persiapan bahan (pukul 16.00 WIB, hari sebelumnya).\n• Pengolahan (pukul 00.00–03.30 WIB).\n• Pemorsian (pukul 03.30–07.00 WIB).\n• Distribusi ke titik penerima (mulai pukul 07.00 WIB).`}
        />

        <div>
          <p className="font-bold">C. Daftar Penerima MBG</p>
          <p className="mb-1 text-[11px] italic text-gray-600">
            Data sekolah/posyandu diambil dari master distribusi. Centang (✓)
            sekolah yang ikut menerima pada minggu ini — yang tidak dicentang
            tidak akan ikut tercetak.
          </p>
          <DaftarPenerima />
        </div>

        <div>
          <p className="font-bold">D. Dokumentasi Pemberian MBG</p>
          {HARI.map((h) => (
            <DokHari key={h.ke} ke={h.ke} hari={h.hari} menu={h.menu} />
          ))}
        </div>
      </Bab>

      {/* BAB III */}
      <Bab judul="BAB III — Permasalahan dan Kendala">
        <Sub
          judul="A. Permasalahan dan Kendala"
          isi="Uraian permasalahan yang dihadapi selama pelaksanaan (mis. keterlambatan bahan, kendala cuaca/distribusi, atau penerimaan sasaran)."
        />
        <Sub
          judul="B. Penanganan Permasalahan"
          isi="Langkah penanganan yang telah dilakukan terhadap setiap permasalahan di atas."
        />
        <Sub
          judul="C. Rencana Tindak Lanjut"
          isi={`1. Menyusun laporan berkala dan evaluasi menu mingguan.\n2. Menyempurnakan standar porsi dan higiene sanitasi.\n3. Menghitung ulang kebutuhan bahan baku untuk minggu berikutnya.`}
        />
      </Bab>

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
