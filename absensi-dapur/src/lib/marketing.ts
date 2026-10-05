import type { Metadata } from "next";

export const SITE_NAME = "Sistem Dapur MBG";
export const SITE_URL = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://djati.web.id").origin;
export const WHATSAPP_NUMBER = "6285157503744";
// Root layout remains noindex by default; only approved marketing pages opt in.
export const PUBLIC_INDEXABLE = process.env.VERCEL_ENV !== "preview";
export const PUBLIC_PATHS = [
  "/", "/fitur", "/solusi/absensi-sppg", "/solusi/rekap-gaji", "/solusi/distribusi",
  "/panduan", "/panduan/memilih-aplikasi-sppg", "/panduan/rekap-absensi-shift-malam", "/tentang",
];
export const PRIVATE_PATHS = ["/admin", "/dapur", "/cetak", "/api", "/login", "/info-gizi", "/game", "/offline.html"];

export function publicMetadata(path: string, title: string, description: string): Metadata {
  const url = `${SITE_URL}${path === "/" ? "" : path}`;
  return {
    title, description, alternates: { canonical: url },
    robots: { index: PUBLIC_INDEXABLE, follow: PUBLIC_INDEXABLE },
    openGraph: { type: "website", locale: "id_ID", siteName: SITE_NAME, url, title, description,
      images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: "Aplikasi absensi, rekap, dan distribusi untuk SPPG" }] },
    twitter: { card: "summary_large_image", title, description, images: [`${SITE_URL}/opengraph-image`] },
  };
}

export function contactUrl(topic: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Halo, saya ingin melihat demo ${SITE_NAME} untuk ${topic}. Peran saya di SPPG: ...`)}`;
}

export type MarketingArticle = {
  slug: string; title: string; description: string; category: "Solusi" | "Panduan";
  summary: string; sections: { title: string; paragraphs: string[]; bullets?: string[] }[];
  faq: { question: string; answer: string }[]; related: string[];
};
export const SOLUTIONS: MarketingArticle[] = [
  {
    slug: "absensi-sppg", category: "Solusi", title: "Aplikasi Absensi Relawan SPPG dengan Foto dan GPS",
    description: "Catat absensi relawan MBG per shift dengan foto wajah, GPS, riwayat kehadiran, dan rekap untuk admin SPPG.",
    summary: "Sistem Dapur MBG membantu staf mencatat masuk dan pulang, sementara admin meninjau kehadiran per divisi. Shift malam yang melewati tengah malam tetap dibaca sebagai sesi kerja.",
    sections: [
      { title: "Masalah harian yang ingin diselesaikan", paragraphs: ["Daftar hadir di kertas dan pesan WhatsApp membuat admin harus menggabungkan catatan dari beberapa tempat. Pada shift malam, tanggal masuk dan pulang berbeda sehingga rekap per tanggal saja dapat membingungkan.", "Aplikasi memusatkan catatan masuk/pulang, foto, dan lokasi pada sesi absensi. Admin dapat meninjau catatan tanpa meminta staf mengirim ulang bukti di percakapan pribadi."] },
      { title: "Alur staf dan admin", paragraphs: ["Staf masuk menggunakan akun yang disediakan pengelola dapur. Saat mencatat kehadiran, staf mengikuti proses foto dan izin lokasi sesuai pengaturan dapur."], bullets: ["Atur divisi, jam masuk/pulang, titik dapur, dan radius lokasi.", "Staf mencatat masuk dan pulang melalui perangkat yang mendukung kamera serta lokasi.", "Admin meninjau hadir, terlambat, sedang bekerja, dan riwayat absensi.", "Gunakan rekap sesuai periode untuk pemeriksaan dan kebutuhan penggajian."] },
      { title: "Pengaturan yang bisa disesuaikan", paragraphs: ["Setiap divisi dapat mempunyai jadwal berbeda. Geofence dapat diaktifkan sesuai kebijakan dapur. Pencatatan tidak sekadar berdasarkan tanggal kalender, melainkan mempertimbangkan sesi dan shift.", "Foto dan GPS merupakan bukti pencatatan, bukan jaminan mutlak identitas atau keakuratan lokasi. Izin kamera, izin lokasi, koneksi, serta kemampuan perangkat perlu diperiksa saat onboarding."] },
      { title: "Mulai dari satu alur yang paling sering dipakai", paragraphs: ["Untuk penerapan awal, siapkan akun staf dan jadwal satu divisi terlebih dahulu. Gunakan data contoh saat demo, lalu pastikan admin memahami cara membaca riwayat sebelum dipakai pada operasional nyata."] },
    ], faq: [
      { question: "Apakah bisa untuk shift malam?", answer: "Ya. Aplikasi mendukung shift yang melewati pergantian tanggal serta pencatatan masuk/pulang per sesi kerja." },
      { question: "Apakah staf harus memasang aplikasi dari Play Store?", answer: "Aplikasi diakses melalui browser. Pada perangkat yang mendukung, website dapat ditambahkan ke layar utama sebagai PWA." },
      { question: "Apakah bisa dipakai tanpa koneksi?", answer: "Pencatatan dan sinkronisasi absensi memerlukan koneksi ke server. Tampilan offline bukan pengganti pencatatan kehadiran." },
    ], related: ["/panduan/rekap-absensi-shift-malam", "/solusi/rekap-gaji", "/fitur"],
  },
  {
    slug: "rekap-gaji", category: "Solusi", title: "Rekap Absensi dan Slip Gaji untuk Admin SPPG",
    description: "Kelola rekap kehadiran, komponen gaji, penyesuaian, kasbon, dan slip gaji staf dapur MBG sesuai pengaturan internal SPPG.",
    summary: "Catatan kehadiran dapat ditinjau bersama komponen penggajian. Admin dan HR mempunyai alur untuk menyiapkan rekap, memeriksa penyesuaian, serta menerbitkan slip bagi staf.",
    sections: [
      { title: "Kurangi pemindahan data antarcatatan", paragraphs: ["Saat data absensi dan data gaji dikelola terpisah, admin perlu memindahkan jumlah kehadiran, keterlambatan, dan penyesuaian secara berulang. Kesalahan bisa terjadi pada periode atau pegawai yang dipilih.", "Sistem menyediakan rekap kehadiran serta modul HR untuk menyusun komponen gaji. Pemeriksaan oleh pengelola tetap diperlukan sebelum slip diterbitkan."] },
      { title: "Komponen yang tersedia", paragraphs: ["Pengelola yang mempunyai akses HR dapat mengatur komponen sesuai kebutuhan internal dapur."], bullets: ["Upah harian, komponen lembur, dan potongan keterlambatan.", "Penyesuaian gaji harian dan kalender hari khusus.", "Kasbon atau utang gaji beserta pengurangannya.", "Komponen BPJS ketenagakerjaan dan konfigurasi tampilan slip.", "Pratinjau, cetak, ketersediaan slip, serta konfirmasi penerimaan staf."] },
      { title: "Pemeriksaan sebelum menerbitkan slip", paragraphs: ["Pastikan periode, divisi, dan nama pegawai sudah benar. Tinjau izin, sesi yang belum selesai, penyesuaian manual, serta kasbon yang masih aktif.", "Penentuan upah, potongan, dan lembur merupakan keputusan pengelola berdasarkan aturan yang berlaku. Keberadaan kolom dalam aplikasi tidak menetapkan kebijakan atau menjadi dasar hukum penggajian."] },
      { title: "Demo menggunakan data contoh", paragraphs: ["Demo dapat difokuskan pada urutan rekap kehadiran, konfigurasi komponen, pratinjau slip, dan tampilan slip staf. Data pribadi serta nominal gaji asli tidak perlu digunakan dalam materi promosi."] },
    ], faq: [
      { question: "Apakah semua admin dapat mengelola gaji?", answer: "Modul HR menggunakan izin khusus. Akses penggajian serta tampilan slip mengikuti hak akses, paket, dan pengaturan dapur." },
      { question: "Apakah staf dapat melihat slipnya sendiri?", answer: "Ya, ketika slip disediakan oleh pengelola. Staf juga dapat mengonfirmasi penerimaannya." },
      { question: "Apakah aplikasi menentukan potongan gaji?", answer: "Tidak. Pengelola menentukan pengaturan dan memeriksa hasil perhitungan. Aplikasi menyediakan pencatatan dan perhitungan sesuai konfigurasi." },
    ], related: ["/solusi/absensi-sppg", "/panduan/memilih-aplikasi-sppg", "/fitur"],
  },
  {
    slug: "distribusi", category: "Solusi", title: "Aplikasi Distribusi Porsi dan Laporan Harian SPPG",
    description: "Kelola penerima sekolah dan B3, porsi harian, jam kirim, dokumentasi, serta dokumen distribusi dapur MBG dalam satu alur.",
    summary: "Admin dapat mengelola titik penerima dan jumlah porsi per tanggal, lalu menyiapkan dokumentasi serta dokumen distribusi. Data sekolah dan B3 dibedakan sesuai kategorinya.",
    sections: [
      { title: "Satu daftar untuk titik penerima dan porsi", paragraphs: ["Perubahan jumlah porsi mudah terlewat jika informasi hanya tersebar di percakapan. Daftar penerima terstruktur membantu tim memeriksa siapa yang ikut distribusi pada tanggal tertentu.", "Aplikasi menyediakan master sekolah dan titik B3, pengelompokan desa, serta jumlah porsi besar, kecil, dan kategori B3. Balita, ibu hamil, dan ibu menyusui dapat dibedakan dalam pengelolaan data."] },
      { title: "Alur administrasi distribusi", paragraphs: ["Mulai dari data penerima, kemudian tinjau jumlah porsi sebelum menyiapkan dokumen."], bullets: ["Kelola sekolah, titik B3, kategori, desa, dan penanggung jawab.", "Tentukan penerima yang ikut per hari dan input porsi serta jam kirim.", "Tinjau total porsi serta rekap distribusi periode/bulanan.", "Siapkan dokumen distribusi, surat jalan, dan BAST melalui halaman cetak.", "Lengkapi laporan kegiatan dengan foto dokumentasi."] },
      { title: "Dokumen harus mengikuti kondisi nyata", paragraphs: ["Aplikasi membantu menyusun dokumen dari data yang dimasukkan. Pengelola tetap memeriksa nama titik, porsi, tanggal, menu, dan penanggung jawab sebelum dicetak atau ditandatangani.", "Tersedianya template tidak berarti suatu dokumen otomatis disahkan oleh BGN. Format dan kebutuhan administrasi perlu disesuaikan dengan ketentuan yang berlaku pada dapur."] },
      { title: "Terhubung dengan perencanaan menu", paragraphs: ["Modul menu dan kebutuhan bahan menggunakan informasi porsi untuk membantu perencanaan. Hal ini memungkinkan diskusi antara admin, tim gizi, serta tim produksi memakai data yang lebih terstruktur."] },
    ], faq: [
      { question: "Apakah penerima B3 dipisahkan dari sekolah?", answer: "Ya. Master data dan kategori porsi mendukung pemisahan sekolah serta balita, ibu hamil, dan ibu menyusui." },
      { question: "Apakah bisa mencetak dokumen?", answer: "Ya. Tersedia halaman cetak distribusi dan dokumen operasional. Data serta format perlu diperiksa pengelola sebelum digunakan." },
      { question: "Apakah tersedia laporan foto kegiatan?", answer: "Ya. Modul laporan harian dan dokumentasi menyediakan pencatatan kegiatan serta foto." },
    ], related: ["/fitur", "/solusi/absensi-sppg", "/panduan/memilih-aplikasi-sppg"],
  },
];

export const GUIDES: MarketingArticle[] = [
  {
    slug: "memilih-aplikasi-sppg", category: "Panduan", title: "Cara Memilih Aplikasi SPPG untuk Tim Dapur MBG",
    description: "Panduan memilih aplikasi SPPG berdasarkan kebutuhan staf, admin, shift malam, rekap, hak akses, dokumentasi, dan proses penerapan.",
    summary: "Mulai dari pekerjaan yang paling sering diulang oleh staf dan admin. Uji aplikasi dengan contoh alur dapur, kemudian periksa hak akses, keluaran dokumen, dan dukungan penerapan.",
    sections: [
      { title: "1. Tentukan pekerjaan yang paling banyak diulang", paragraphs: ["Catat pekerjaan yang masih dikerjakan dari beberapa sumber: daftar hadir, rekap gaji, perubahan porsi, laporan foto, atau kebutuhan bahan. Pilih satu masalah yang paling jelas sebelum meminta demo.", "Staf memerlukan alur yang mudah digunakan; admin memerlukan data yang mudah diperiksa. Banyaknya fitur tidak selalu berarti pekerjaan sehari-hari menjadi lebih sederhana."] },
      { title: "2. Uji menggunakan contoh yang menyerupai shift dapur", paragraphs: ["Gunakan data contoh dengan satu sesi melewati tengah malam. Bandingkan waktu masuk, waktu pulang, keterlambatan, dan penempatan sesi dalam rekap."], bullets: ["Apa yang terjadi jika GPS atau kamera belum diizinkan?", "Bagaimana admin memeriksa sesi yang belum ditutup?", "Bagaimana izin dan penyesuaian dicatat?", "Apakah teks, tombol, dan tabel tetap terbaca di ponsel staf?"] },
      { title: "3. Periksa akses dan hasil keluaran", paragraphs: ["Tanyakan siapa yang dapat melihat data pegawai, mengubah gaji, mengelola distribusi, atau meninjau beberapa dapur. Periksa juga apakah data dapat diekspor sesuai kebutuhan administrasi.", "Unduh satu contoh rekap dan cetak satu contoh dokumen saat demo. Tinjau judul, periode, nama, dan total. Hindari memakai data pribadi asli dalam demo publik."] },
      { title: "4. Tanyakan biaya dan pendampingan", paragraphs: ["Pastikan cakupan paket, masa aktif, pendampingan awal, dan cara meminta bantuan tertulis dengan jelas. Periksa kebutuhan perangkat serta koneksi sebelum onboarding.", "Sistem Dapur MBG menyediakan modul absensi, rekap, distribusi, serta modul lain sesuai paket dan akses. Gunakan halaman solusi untuk menentukan bagian yang ingin diperlihatkan saat demo."] },
    ], faq: [
      { question: "Apa yang sebaiknya diuji terlebih dahulu?", answer: "Uji satu pekerjaan yang sering diulang: masuk/pulang staf, rekap admin, atau pencatatan porsi. Gunakan data contoh yang sesuai alur dapur." },
      { question: "Apakah langsung perlu memakai semua modul?", answer: "Tidak harus. Mulai dari satu alur, pastikan tim memahaminya, kemudian tambah modul sesuai kebutuhan." },
    ], related: ["/solusi/absensi-sppg", "/solusi/rekap-gaji", "/solusi/distribusi"],
  },
  {
    slug: "rekap-absensi-shift-malam", category: "Panduan", title: "Cara Merekap Absensi Shift Malam di Dapur SPPG",
    description: "Pahami sesi kerja lintas tanggal, jadwal divisi, absensi masuk/pulang, dan pemeriksaan rekap shift malam untuk admin dapur MBG.",
    summary: "Rekap shift malam perlu mempertimbangkan sesi kerja, bukan hanya tanggal masuk dan pulang. Tetapkan jadwal divisi dan tinjau pasangan waktu masuk/pulang sebelum menggunakan rekap.",
    sections: [
      { title: "Satu sesi kerja dapat berada pada dua tanggal", paragraphs: ["Contoh: staf masuk Senin pukul 22.00 dan pulang Selasa pukul 06.00. Secara kalender ada dua tanggal, tetapi keduanya merupakan satu sesi kerja yang berlangsung selama delapan jam jika tidak ada jeda yang dikurangkan.", "Jika hanya menghitung jumlah tanggal yang tercatat, satu shift dapat terbaca sebagai dua hari. Jika hanya melihat tanggal pulang, sesi juga dapat ditempatkan pada periode yang keliru. Cara penghitungan harus disepakati dan mengikuti konfigurasi sistem."] },
      { title: "Data yang perlu diperiksa admin", paragraphs: ["Pastikan setiap catatan mempunyai konteks jadwal serta pasangan waktu yang lengkap."], bullets: ["Nama pegawai, divisi, dan jadwal shift yang berlaku.", "Waktu masuk dan pulang, termasuk pergantian tanggal.", "Status izin, keterlambatan, atau perubahan jadwal.", "Sesi yang belum ditutup dan koreksi yang sudah disetujui.", "Periode rekap yang digunakan untuk laporan atau penggajian."] },
      { title: "Tinjau sesi yang belum selesai", paragraphs: ["Catatan masuk tanpa pulang belum memberi durasi kerja lengkap. Admin perlu mengonfirmasi kondisi nyata dan mengikuti prosedur koreksi internal, bukan menebak waktu pulang.", "Aplikasi yang mendukung shift lintas tanggal membantu menyajikan sesi secara terstruktur. Kebijakan hari kerja, jeda, lembur, dan penggajian tetap menjadi tanggung jawab pengelola."] },
      { title: "Coba alur sebelum dipakai satu dapur", paragraphs: ["Saat demo Sistem Dapur MBG, minta contoh shift malam dan hasil rekapnya. Periksa pula tampilan staf, proses foto/lokasi, serta cara admin meninjau riwayat.", "Panduan ini membahas pencatatan administratif, bukan ketentuan hukum jam kerja atau penggajian. Gunakan kebijakan dapur dan aturan yang berlaku untuk menetapkan hak serta kewajiban pegawai."] },
    ], faq: [
      { question: "Apakah masuk dan pulang pada tanggal berbeda berarti dua shift?", answer: "Tidak otomatis. Keduanya dapat menjadi satu sesi jika mengikuti jadwal shift malam yang sama." },
      { question: "Bagaimana jika lupa mencatat pulang?", answer: "Tinjau catatan bersama pegawai dan ikuti prosedur koreksi yang disetujui pengelola. Jangan menganggap sesi tersebut lengkap tanpa pemeriksaan." },
    ], related: ["/solusi/absensi-sppg", "/solusi/rekap-gaji", "/panduan/memilih-aplikasi-sppg"],
  },
];
export const ALL_ARTICLES = [...SOLUTIONS, ...GUIDES];
export function linkTitle(path: string) {
  const slug = path.split("/").pop();
  return ALL_ARTICLES.find(a => a.slug === slug)?.title || (path === "/fitur" ? "Daftar fitur aplikasi" : "Panduan admin SPPG");
}
