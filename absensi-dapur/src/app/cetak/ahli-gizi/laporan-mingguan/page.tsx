import { PrintFrame, Tgl, TTD, Ed } from "../../akuntan/_components";
import {
  DaftarPenerima,
  DokumentasiMingguan,
  TabelMenuMingguan,
} from "../_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";
import { getSession } from "@/lib/session";
import { getSppg } from "@/lib/sppg";

export const dynamic = "force-dynamic";

const t = getTemplateGizi("laporan-mingguan")!;

/** Bab bernomor (judul tebal kapital + isi). */
function Bab({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <p className="text-center font-bold uppercase">{judul}</p>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

/** Sub-bagian berjudul dengan satu blok naratif kuning yang bisa diedit. */
function Sub({ judul, isi }: { judul: string; isi: string }) {
  return (
    <div>
      <p className="font-bold">{judul}</p>
      <p className="mt-0.5 whitespace-pre-line text-justify leading-relaxed">
        <Ed block>{isi}</Ed>
      </p>
    </div>
  );
}

export default async function Page() {
  const session = await getSession();
  const sppg = session?.sppg_id ? await getSppg(session.sppg_id) : null;
  const nama = sppg?.nama || "SPPG";
  const alamat = sppg?.alamat || "";

  return (
    <PrintFrame
      heading={t.heading}
      nomor={t.nomor}
      slug={t.slug}
      judul={t.judul}
      landscape={t.landscape}
    >
      {/* ===== SAMPUL ===== */}
      <div className="border-b-2 border-black pb-4 text-center">
        <p className="text-lg font-bold leading-snug">
          LAPORAN PELAKSANAAN
          <br />
          PROGRAM MAKAN BERGIZI GRATIS
        </p>
        <p className="mt-1 font-semibold">BADAN GIZI NASIONAL R.I.</p>
        <p className="font-semibold">
          SATUAN PELAYANAN PEMENUHAN GIZI (SPPG)
        </p>
        <p className="mt-2 text-base font-bold uppercase tracking-wide">
          {nama}
        </p>
        {alamat && <p className="text-[12px] text-gray-700">{alamat}</p>}
        <p className="mt-3 text-[13px]">
          Periode Pemberian: <Ed>………</Ed> s.d. <Ed>………</Ed> Tahun{" "}
          <Ed>2026</Ed>
        </p>
      </div>

      {/* ===== BAB I ===== */}
      <Bab judul="BAB I — Pendahuluan">
        <Sub
          judul="A. Latar Belakang"
          isi={`Pemenuhan gizi yang baik merupakan salah satu faktor kunci dalam pembangunan sumber daya manusia (SDM) yang berkualitas. Di Indonesia, isu gizi masih menjadi tantangan besar yang memengaruhi kualitas hidup masyarakat, terutama anak-anak dan ibu hamil. Gizi yang seimbang tidak hanya penting untuk pertumbuhan fisik, tetapi juga untuk perkembangan kognitif, daya tahan tubuh, dan produktivitas seseorang. Oleh karena itu, pemenuhan gizi yang optimal menjadi fondasi bagi kemajuan bangsa.

Data dari Kementerian Kesehatan menunjukkan bahwa anak-anak di bawah usia lima tahun di beberapa wilayah mengalami kekurangan gizi, yang berdampak pada tingkat kecerdasan dan daya saing mereka di masa depan. Selain itu, kesadaran masyarakat tentang pentingnya pola makan sehat masih rendah. Banyak keluarga, terutama di wilayah pedesaan, belum memahami pentingnya asupan makanan bergizi untuk menunjang kesehatan. Hal ini diperparah oleh keterbatasan ekonomi yang membuat sebagian besar keluarga hanya mampu menyediakan makanan pokok tanpa memikirkan kandungan nutrisinya.

Program Makan Bergizi Gratis hadir sebagai solusi konkret untuk mengatasi permasalahan ini. Program ini bertujuan memberikan akses makanan bergizi kepada masyarakat yang membutuhkan, sekaligus meningkatkan kesadaran tentang pentingnya pola makan sehat. Melalui pendekatan yang terintegrasi, program ini diharapkan dapat mendukung upaya pemerintah dalam mencapai target pembangunan berkelanjutan (SDGs), khususnya tujuan ke-2: mengakhiri kelaparan dan meningkatkan ketahanan pangan.

Sebagai bagian dari upaya kolektif untuk menciptakan masyarakat yang lebih sehat dan produktif, Program Makan Bergizi Gratis tidak hanya menyediakan makanan, tetapi juga membawa misi edukasi, pemberdayaan, dan solidaritas sosial. Dengan demikian, program ini menjadi langkah penting dalam menciptakan masa depan yang lebih baik bagi generasi mendatang.`}
        />
        <Sub
          judul="B. Tujuan"
          isi={`Program ini bertujuan untuk:
1. Memberikan makanan bergizi secara gratis kepada masyarakat yang membutuhkan.
2. Meningkatkan kesadaran masyarakat akan pentingnya pola makan sehat.
3. Memperbaiki akses makanan gizi seimbang di lokasi sasaran.`}
        />

        <div>
          <p className="font-bold">C. Sasaran</p>
          <p className="mb-1 mt-0.5 text-justify leading-relaxed">
            <Ed block>{`Adapun sasaran dari kegiatan yang dilakukan ${nama} adalah sebagai berikut. Daftar sekolah/posyandu berikut diambil dari master distribusi; centang (✓) sasaran yang menerima pada minggu ini — yang tidak dicentang tidak akan ikut tercetak.`}</Ed>
          </p>
          <DaftarPenerima />

          <p className="mb-1 mt-4 font-bold">Jenis Menu MBG Diberikan</p>
          <p className="mb-1 text-[11px] italic text-gray-600">
            Menu dan jumlah penerima manfaat mengikuti data hari pada distribusi
            (pilih tanggal mulai lalu muat).
          </p>
          <TabelMenuMingguan />
        </div>
      </Bab>

      {/* ===== BAB II ===== */}
      <Bab judul="BAB II — Pelaksanaan Kegiatan">
        <Sub
          judul="A. Persiapan"
          isi={`Program makan bergizi gratis muncul sebagai respons terhadap berbagai tantangan kesehatan dan sosial yang dihadapi oleh masyarakat, terutama kelompok rentan seperti anak-anak, ibu hamil, dan keluarga berpenghasilan rendah. Program ini bertujuan untuk memastikan bahwa setiap individu, terlepas dari status ekonominya, memiliki akses terhadap makanan bergizi yang cukup untuk mendukung kesehatan, pertumbuhan, dan produktivitas mereka. ${nama} telah melaksanakan persiapan sejak bulan Desember untuk rekrutmen seluruh karyawan.

Pelaksanaan mulai pada tanggal ………. Sampai dengan laporan ini dibuat, kami juga tetap melakukan koordinasi dengan Koordinator kecamatan dan Koordinator wilayah terkait hal-hal yang berhubungan dengan persiapan dalam menjalankan dapur SPPG. Tidak kalah penting kami juga melaksanakan komunikasi intensif kepada pihak sekolah di wilayah sasaran untuk mendata penerima manfaat. Hal ini bertujuan untuk memastikan bahwa data siswa yang relevan dapat difasilitasi secara tepat waktu dan akurat. Data ini sangat penting sebagai dasar untuk perencanaan dan pelaksanaan kegiatan, sehingga tidak terjadi kendala terkait validitas dan ketersediaan informasi. Pihak sekolah dan posyandu memberikan dukungan penuh dalam menyediakan akses terhadap data tersebut, termasuk membantu mengidentifikasi siswa yang memerlukan prioritas perhatian.

Data sasaran untuk pelaksanaan program MBG telah melalui koordinasi dengan Dinas Kesehatan setempat. Dinas Kesehatan juga telah memberikan pelatihan, monitoring, serta pengawasan, sekaligus membantu mengawasi dan mengevaluasi kegiatan produksi hingga distribusi MBG untuk meminimalisir terjadinya Kejadian Luar Biasa (KLB).`}
        />
        <Sub
          judul="B. Pelaksanaan"
          isi={`Pelaksanaan program MBG di ${nama} telah dimulai sejak tanggal ………. Beberapa permasalahan diselesaikan dengan evaluasi cermat oleh Kepala SPPG beserta tim pengawas yakni Pengawas Gizi, Chef, Akunting, dan Asisten Lapangan. Dalam pelaksanaan pekerjaan, struktur dibuat dengan beberapa tim, seperti Pengawas Gizi yang bertanggung jawab pada tim pemorsian, Chef pada tim pengolahan dan tim persiapan, serta Asisten Lapangan yang membawahi tim cuci peralatan, tim distribusi, dan tim kebersihan. Akunting merangkap sebagai admin serta melaksanakan kontak dengan pihak-pihak eksternal.

${nama} mengajukan order bahan baku kepada supplier terpilih. Bahan baku datang di siang hari sebelumnya, yang kemudian mulai dilakukan proses persiapan dari pukul 16.00 hingga selesai.`}
        />
        <Sub
          judul="1) Persiapan"
          isi={`Tim persiapan bekerja pukul 16.00 WIB di hari sebelum proses distribusi makanan. Tim ini dipimpin oleh satu PIC (Penanggung Jawab) dengan lima orang anggota, sehingga total tim persiapan sebanyak 6 orang. PIC memiliki tugas untuk melaporkan kepada Pengawas Gizi mengenai kebutuhan material alat yang diperlukan dalam pelaksanaan operasional. PIC juga harus memberikan contoh kepada anggota agar tetap fokus dalam melaksanakan pekerjaan. Sementara itu, Chef dibantu Pengawas Gizi terus melakukan pemantauan terkait kerja divisi persiapan. Tim persiapan bertugas melakukan sortir bahan pangan yang datang, kemudian membantu menimbang, melakukan pencucian, dan memotong sesuai bahan-bahan yang akan dimasak berdasarkan menu yang telah ditetapkan oleh Pengawas Gizi dan Chef.`}
        />
        <Sub
          judul="2) Pengolahan"
          isi={`Tim pengolahan bekerja pukul 00.00 WIB. Tim pengolahan di dapur memiliki peran krusial dalam memastikan makanan yang disajikan berkualitas, higienis, dan sesuai dengan standar yang ditetapkan. Tim pengolahan terdiri dari 6 orang, dipimpin oleh satu PIC. Dalam pelaksanaannya, PIC pengolahan mengatur jadwal kerja tim dan pembagian jobdesk sesuai dengan potensi tim dan jenis menu yang diminta oleh Pengawas Gizi. Selain itu, pada saat proses pengolahan harus berkoordinasi dengan tim pemorsian sehingga jumlah makanan yang dibuat tidak kurang dari porsi yang telah ditetapkan. Pada saat operasional di minggu pertama sempat mengalami kendala seperti kekurangan bahan baku dan keterlambatan pemasakan, namun dapat diatasi secepatnya.`}
        />
        <Sub
          judul="3) Pemorsian"
          isi={`Tim pemorsian bekerja pukul 03.30 WIB. Tim pemorsian memiliki peran untuk melakukan pemorsian makanan yang telah matang, sesuai dengan jumlah dan kategori usia penerima berdasarkan arahan Pengawas Gizi. Tim pemorsian juga bertanggung jawab atas kesesuaian gramasi yang ditentukan Pengawas Gizi, serta berkoordinasi dengan tim pengolahan dan driver agar porsi atau jumlah paket yang diterima penerima manfaat tidak kurang atau lebih. Pemorsian pertama selesai sekitar pukul 07.30 WIB untuk penerima manfaat PAUD dan TK, dan pemorsian kedua sekitar pukul 08.30 WIB untuk penerima manfaat SD, SMP, SMK, serta posyandu.`}
        />
        <Sub
          judul="4) Distribusi"
          isi={`Tim distribusi bekerja pukul 07.00 WIB. Tim distribusi melaksanakan pengantaran makanan MBG sesuai dengan titik lokasi yang telah ditentukan, dan akan terus berubah seiring bertambahnya penerima manfaat. Setiap hari food tray (ompreng) dihitung berdasarkan surat jalan yang berisi jumlah makanan yang diterima di setiap sekolah/titik, sehingga jumlah yang dikirim dan diterima dapat dipertanggungjawabkan.`}
        />

        <div>
          <p className="font-bold">C. Dokumentasi Pemberian MBG</p>
          <p className="mb-1 text-[11px] italic text-gray-600">
            Lima hari pemberian (Senin–Jumat), masing-masing dua foto
            dokumentasi.
          </p>
          <DokumentasiMingguan />
        </div>
      </Bab>

      {/* ===== BAB III ===== */}
      <Bab judul="BAB III — Permasalahan dan Kendala">
        <Sub
          judul="A. Permasalahan dan Kendala"
          isi={`Dalam pelaksanaan kegiatan di ${nama} terdapat beberapa permasalahan dan kendala operasional yang kami alami dan menjadi bahan evaluasi untuk perbaikan di masa mendatang, antara lain: (1) terjadi miskomunikasi dengan driver yang menyebabkan keterlambatan pengantaran; (2) terjadi kekurangan bahan baku akibat kesalahan penghitungan pada tim persiapan; serta (3) pihak sekolah terkadang memberi konfirmasi mendadak terkait ada atau tidaknya pengiriman MBG pada hari tersebut, sehingga seluruh divisi harus menghitung ulang kebutuhan bahan dan berpotensi menimbulkan banyak bahan sisa.`}
        />
        <Sub
          judul="B. Penanganan Permasalahan"
          isi={`Dalam menangani permasalahan yang muncul dalam operasional ${nama}, berbagai langkah strategis telah diambil untuk memastikan kegiatan tetap berjalan lancar dan efektif, yaitu: (1) melakukan konfirmasi kepada PIC sekolah terkait pengantaran serta briefing ulang kepada driver agar lebih memahami alur pengiriman; (2) melakukan evaluasi kepada semua divisi untuk memastikan jumlah penghitungan sudah benar, saling mengecek ulang (crosscheck), dan memastikan hitungan antar divisi untuk menanggulangi miskomunikasi; serta (3) memberi pengarahan kepada PIC sekolah agar tidak melakukan konfirmasi secara mendadak, disertai pendataan ulang terkait hari libur sekolah, jumlah siswa tetap, dan riwayat alergi.`}
        />
        <Sub
          judul="C. Rencana Tindak Lanjut"
          isi={`Untuk meningkatkan operasional ${nama} dan mengatasi berbagai kendala yang dihadapi, rencana tindak lanjut strategis disusun dan diterapkan sebagai berikut: (1) membuat laporan secara berkala kepada BGN Pusat; (2) memberikan masukan dan rekomendasi standar operasional kepada mitra, mencakup pengaturan dapur, alat kerja, dan prosedur kerja yang lebih efisien; (3) menyusun laporan berkala yang memuat evaluasi kegiatan, identifikasi permasalahan, serta usulan solusi sebagai dasar pengambilan keputusan strategis; (4) meningkatkan ketelitian dalam menghitung kebutuhan bahan baku dengan mempertimbangkan konsumsi harian dan cadangan sehingga meminimalkan risiko kekurangan bahan; serta (5) mencari dan menjalin kerja sama dengan supplier yang lebih terpercaya berdasarkan ketepatan waktu pengiriman, kualitas bahan, dan konsistensi pelayanan.`}
        />
      </Bab>

      {/* ===== BAB IV ===== */}
      <Bab judul="BAB IV — Penutup">
        <p className="mt-0.5 whitespace-pre-line text-justify leading-relaxed">
          <Ed block>{`Pemberian makanan bergizi gratis di wilayah layanan ${nama} telah dilaksanakan dengan feedback sebagian besar baik dan penuh rasa syukur atas adanya program MBG. Adapun kritik dan saran kami tampung dengan senang hati untuk segera dilakukan evaluasi serta realisasi di lapangan. Harapan ke depan, ${nama} dapat terus berbenah dan beroperasi lebih baik dari hari sebelumnya; selain untuk tujuan utama memperbaiki gizi anak bangsa, juga diharapkan menjadi tempat pengembangan SDM dan ekonomi masyarakat sekitar.`}</Ed>
        </p>
      </Bab>

      <p className="mt-8 text-right">
        <Ed>Ponorogo</Ed>, <Tgl mode="tanggal" />
      </p>

      <TTD
        kiri={{ peran: "Mengetahui,\nKepala SPPG", nama: "(………………………)" }}
        kanan={{ peran: "Ahli Gizi SPPG", nama: "(………………………)" }}
      />
    </PrintFrame>
  );
}
