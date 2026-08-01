import Link from "next/link";
import BgnLogo from "@/components/BgnLogo";

const kategoriFitur = [
  {
    tag: "Absensi & Kehadiran",
    icon: "🕒",
    warna: "border-gold-500/30 bg-gold-500/10 text-gold-300",
    items: [
      { icon: "📸", judul: "Verifikasi Wajah + GPS", teks: "Clock in & out dengan foto wajah langsung dari kamera dan validasi titik lokasi (geofence) area dapur." },
      { icon: "🗂️", judul: "Shift per Divisi", teks: "Tiap divisi punya jam kerja sendiri — termasuk shift malam lintas hari (mis. 22:00–08:00)." },
      { icon: "⏱️", judul: "Berbasis Jam, Bukan Hari", teks: "Absensi dihitung per shift, bukan per tanggal, sehingga shift lewat tengah malam tetap akurat." },
      { icon: "📊", judul: "Rekap & Ekspor", teks: "Pantau kehadiran real-time, status tepat waktu/terlambat, unduh rekap ke Excel/CSV/PDF." },
    ],
  },
  {
    tag: "Distribusi & Dokumen Resmi",
    icon: "🚚",
    warna: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    items: [
      { icon: "🚚", judul: "Distribusi Harian", teks: "Atur porsi Besar/Kecil/B3 tiap penerima per hari, dengan checklist penerima yang ikut hari itu." },
      { icon: "🏫", judul: "Data Penerima", teks: "Master sekolah (SERDIK) & posyandu B3 — Balita, Ibu Hamil, Ibu Menyusui — dikelompokkan per desa." },
      { icon: "🧾", judul: "BAST · Surat Jalan · Organoleptik", teks: "Cetak dokumen resmi berkop BGN otomatis; Surat Jalan & Uji Organoleptik dibuat per desa." },
      { icon: "🔬", judul: "Menu Uji Organoleptik", teks: "Menu sampel terpisah untuk Sekolah, Balita, dan B2 (Bumil & Busui) di tiap dokumen." },
    ],
  },
  {
    tag: "Menu, Resep & Belanja",
    icon: "🍱",
    warna: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    items: [
      { icon: "🍱", judul: "Bank Menu & Resep", teks: "Simpan resep bahan per menu; jumlah bahan otomatis diskalakan mengikuti porsi." },
      { icon: "💰", judul: "HPP & Food Cost", teks: "Hitung harga pokok per porsi dari resep + harga bahan pasar terkini (SISKAPERBAPO)." },
      { icon: "📅", judul: "Jadwal Menu Periode", teks: "Susun menu Reguler & B3 per periode (~10 hari kerja) meniru pola kerja dapur nyata." },
      { icon: "🛒", judul: "Generator Belanja", teks: "Daftar belanja otomatis per hari dari resep × porsi, plus realisasi Harga AK vs patokan SP." },
    ],
  },
  {
    tag: "Laporan & Gudang",
    icon: "📋",
    warna: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    items: [
      { icon: "📋", judul: "Laporan Harian", teks: "Isi laporan kegiatan terstruktur lengkap dengan dokumentasi foto per tanggal." },
      { icon: "📦", judul: "Gudang & Stok", teks: "Kelola stok bahan masuk & keluar untuk memantau kebutuhan dapur." },
    ],
  },
  {
    tag: "HR & Penggajian",
    icon: "👥",
    warna: "border-ember-500/30 bg-ember-500/10 text-ember-400",
    items: [
      { icon: "👥", judul: "Pegawai & Divisi", teks: "Kelola data pegawai, divisi, jadwal kerja, dan pengajuan izin dalam satu tempat." },
      { icon: "💵", judul: "Gaji & Slip", teks: "Hitung gaji berbasis kehadiran dan cetak slip gaji rapi per pegawai." },
      { icon: "🏆", judul: "Leaderboard, SOP & Pengumuman", teks: "Peringkat kedisiplinan, panduan SOP dapur, dan papan pengumuman internal." },
    ],
  },
  {
    tag: "Manajemen & Keamanan",
    icon: "🛡️",
    warna: "border-emas-500/30 bg-emas-500/10 text-emas-300",
    items: [
      { icon: "🌐", judul: "Multi-Dapur (SPPG)", teks: "Super admin memantau & mengelola banyak dapur dari satu pusat kendali." },
      { icon: "🔐", judul: "Peran & Akses Terpisah", teks: "Admin, Sub-Admin Distribusi/Penerimaan, HR, dan Staf dengan hak akses masing-masing." },
      { icon: "🔔", judul: "Notifikasi & Audit Log", teks: "Pusat notifikasi dan catatan aktivitas (audit trail) untuk mendukung akuntabilitas." },
    ],
  },
];

const PORTAL_BGN = "https://www.bgn.go.id";

// Ganti dengan nomor WhatsApp bisnis kamu (format internasional tanpa "+").
const KONTAK_WA = "6285157503744";
const PESAN_WA =
  "Halo, saya tertarik memakai aplikasi manajemen dapur MBG untuk dapur kami. Boleh minta info & penawaran?";
const WA_LINK = `https://wa.me/${KONTAK_WA}?text=${encodeURIComponent(PESAN_WA)}`;

// Bangun link WhatsApp dengan pesan spesifik per paket.
const waPaket = (nama: string) =>
  `https://wa.me/${KONTAK_WA}?text=${encodeURIComponent(
    `Halo, saya tertarik dengan Paket ${nama} untuk dapur MBG kami. Boleh minta detail fitur & penawaran harganya?`,
  )}`;

// Selaras dengan sistem paket berjenjang di lib/paket.ts (Bronze → Silver → Gold → Pro).
const paket = [
  {
    nama: "Bronze",
    ikon: "🥉",
    aksen: "from-amber-600 to-amber-800",
    ringkas: "Fondasi absensi & kepegawaian untuk mulai digital.",
    unggulan: false,
    fitur: [
      "Absensi wajah + GPS & shift per divisi",
      "Manajemen pegawai & divisi",
      "Jadwal kerja & pengajuan izin",
      "Papan pengumuman internal",
      "Rekap kehadiran + ekspor Excel/CSV/PDF",
    ],
  },
  {
    nama: "Silver",
    ikon: "🥈",
    aksen: "from-slate-300 to-slate-500",
    ringkas: "Bronze + pembukuan & berita acara resmi.",
    unggulan: false,
    fitur: [
      "Semua fitur Bronze",
      "Modul Akuntan / pembukuan",
      "Berita Acara (BAST) berkop resmi",
      "Dokumentasi keuangan rapi",
    ],
  },
  {
    nama: "Gold",
    ikon: "🥇",
    aksen: "from-gold-300 to-ember-400",
    ringkas: "Silver + distribusi, menu & laporan harian.",
    unggulan: true,
    fitur: [
      "Semua fitur Silver",
      "Distribusi porsi + Surat Jalan & Organoleptik",
      "Bank Menu, resep & jadwal menu",
      "Laporan kegiatan harian + foto",
    ],
  },
  {
    nama: "Pro",
    ikon: "💎",
    aksen: "from-sky-300 to-indigo-400",
    ringkas: "Semua fitur aktif — operasional dapur end-to-end.",
    unggulan: false,
    fitur: [
      "Semua fitur Gold",
      "HR & penggajian: gaji + slip",
      "Gudang & manajemen stok bahan",
      "Ahli Gizi & analisis menu",
      "Multi-dapur, audit log & prioritas dukungan",
    ],
  },
];

const statistik = [
  { angka: "6", label: "Modul Terintegrasi" },
  { angka: "20+", label: "Fitur Siap Pakai" },
  { angka: "∞", label: "Dapur & Cabang" },
  { angka: "24/7", label: "Akses Cloud" },
];

const keunggulan = [
  {
    icon: "⏱️",
    judul: "Hemat Waktu Admin",
    teks: "Rekap absensi, dokumen distribusi, dan daftar belanja dibuat otomatis. Pekerjaan berjam-jam jadi hitungan menit.",
  },
  {
    icon: "🧾",
    judul: "Dokumen Siap Cetak",
    teks: "BAST, Surat Jalan, dan Uji Organoleptik langsung berkop resmi & rapi — tinggal cetak dan tanda tangan.",
  },
  {
    icon: "📈",
    judul: "Transparan & Akuntabel",
    teks: "Kehadiran, distribusi, dan biaya tercatat digital. Mudah diaudit dan dipertanggungjawabkan.",
  },
  {
    icon: "🌐",
    judul: "Siap Multi-Dapur",
    teks: "Kelola satu atau banyak dapur SPPG dari satu akun. Tumbuh tanpa perlu ganti sistem.",
  },
  {
    icon: "🔒",
    judul: "Aman & Andal",
    teks: "Data terenkripsi, sesi JWT, hak akses per peran, berjalan di infrastruktur cloud modern.",
  },
  {
    icon: "🤝",
    judul: "Tanpa Ribet Setup",
    teks: "Kami bantu pasang, migrasi data, dan latih tim. Anda tinggal pakai dan fokus ke dapur.",
  },
];

const langkah = [
  {
    no: "1",
    judul: "Hubungi & Konsultasi",
    teks: "Ceritakan kebutuhan dapur Anda lewat WhatsApp. Kami bantu tentukan paket yang paling pas.",
  },
  {
    no: "2",
    judul: "Setup & Migrasi Data",
    teks: "Kami siapkan akun, sesuaikan data penerima & menu, lalu selaraskan dengan alur kerja dapur Anda.",
  },
  {
    no: "3",
    judul: "Latih Tim & Jalan",
    teks: "Pelatihan singkat untuk staf dan admin. Dapur Anda langsung beroperasi secara digital.",
  },
];

const testimoni = [
  {
    isi: "Rekap absensi yang dulu makan waktu seharian sekarang beres dalam hitungan menit. Dokumen BAST & Surat Jalan tinggal cetak — rapi dan resmi.",
    nama: "Kepala SPPG",
    peran: "Dapur MBG Kabupaten",
    inisial: "KS",
  },
  {
    isi: "Absensi wajah + GPS bikin kehadiran tim jadi jujur dan tercatat. Laporan harian lengkap dengan foto sangat membantu saat audit.",
    nama: "Admin Dapur",
    peran: "Operasional Harian",
    inisial: "AD",
  },
  {
    isi: "Menu, resep, dan daftar belanja otomatis dari porsi. HPP per porsi langsung kelihatan, jadi belanja lebih terkontrol.",
    nama: "Ahli Gizi",
    peran: "Perencanaan Menu",
    inisial: "AG",
  },
];

const faq = [
  {
    tanya: "Apakah bisa dipakai untuk lebih dari satu dapur?",
    jawab:
      "Bisa. Sistem mendukung multi-dapur (SPPG) — satu super admin dapat memantau dan mengelola banyak dapur dari satu pusat kendali, tanpa perlu ganti aplikasi saat berkembang.",
  },
  {
    tanya: "Apakah data kami aman?",
    jawab:
      "Aman. Data terenkripsi, sesi login memakai JWT, hak akses dipisah per peran (admin, HR, staf), dan seluruh sistem berjalan di infrastruktur cloud modern.",
  },
  {
    tanya: "Kami tidak paham teknologi, apakah repot memasangnya?",
    jawab:
      "Tidak. Kami bantu pasang, migrasi data penerima & menu, lalu latih tim Anda sampai bisa. Anda tinggal pakai dan fokus mengurus dapur.",
  },
  {
    tanya: "Dokumen yang dicetak apakah sudah resmi?",
    jawab:
      "Ya. BAST, Surat Jalan, dan Uji Organoleptik otomatis berkop resmi BGN dan rapi — tinggal cetak dan tanda tangan.",
  },
  {
    tanya: "Berapa biayanya?",
    jawab:
      "Menyesuaikan skala dapur Anda. Konsultasi awal gratis — hubungi kami via WhatsApp, ceritakan kebutuhan, dan kami bantu tentukan paket yang paling pas.",
  },
];

const berita = [
  {
    tag: "Program",
    icon: "🍱",
    judul: "Makan Bergizi Gratis untuk Generasi Emas",
    teks: "Program prioritas nasional yang menyediakan makanan bergizi bagi anak sekolah, santri, balita, serta ibu hamil dan menyusui di seluruh Indonesia.",
    warna: "border-emas-500/30 bg-emas-500/10 text-emas-300",
  },
  {
    tag: "Gizi",
    icon: "🥗",
    judul: "Standar Gizi Seimbang di Setiap Porsi",
    teks: "Menu disusun memenuhi angka kecukupan gizi — karbohidrat, protein hewani & nabati, sayur, dan buah — dalam porsi yang terukur.",
    warna: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },
  {
    tag: "Dapur SPPG",
    icon: "👩‍🍳",
    judul: "Satuan Pelayanan Pemenuhan Gizi sebagai Ujung Tombak",
    teks: "Dapur SPPG menyiapkan dan mendistribusikan makanan setiap hari dengan mengutamakan kebersihan, mutu, dan ketepatan waktu.",
    warna: "border-gold-500/30 bg-gold-500/10 text-gold-300",
  },
  {
    tag: "Transparansi",
    icon: "🛡️",
    judul: "Higiene & Akuntabilitas Jadi Prioritas",
    teks: "Proses pengolahan diawasi ketat; kehadiran dan kinerja tim dapur tercatat digital untuk mendukung akuntabilitas program.",
    warna: "border-ember-500/30 bg-ember-500/10 text-ember-400",
  },
  {
    tag: "Penerima Manfaat",
    icon: "🎒",
    judul: "Menyasar Anak Sekolah hingga Ibu Hamil",
    teks: "Sasaran penerima mencakup peserta didik PAUD sampai SMA, santri, balita, serta ibu hamil dan menyusui.",
    warna: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  },
  {
    tag: "Ekonomi Lokal",
    icon: "🌾",
    judul: "Memberdayakan Petani & UMKM Sekitar",
    teks: "Bahan baku diutamakan dari petani, peternak, dan UMKM setempat sehingga program turut menggerakkan ekonomi daerah.",
    warna: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
  {
    tag: "Kesehatan",
    icon: "📉",
    judul: "Mendukung Pencegahan Stunting",
    teks: "Asupan gizi yang baik bagi balita serta ibu hamil dan menyusui membantu upaya menurunkan angka stunting nasional.",
    warna: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },
  {
    tag: "Keamanan Pangan",
    icon: "✅",
    judul: "Sanitasi Terjaga di Setiap Tahap",
    teks: "Prinsip keamanan pangan (food safety) diterapkan mulai dari penyimpanan bahan, pengolahan, hingga distribusi makanan.",
    warna: "border-gold-500/30 bg-gold-500/10 text-gold-300",
  },
  {
    tag: "Operasional",
    icon: "⏱️",
    judul: "Distribusi Tepat Waktu Setiap Hari",
    teks: "Penyajian dan pengantaran dijadwalkan agar makanan sampai ke penerima dalam kondisi layak dan tepat waktu.",
    warna: "border-ember-500/30 bg-ember-500/10 text-ember-400",
  },
  {
    tag: "Kolaborasi",
    icon: "🤝",
    judul: "Sinergi Lintas Sektor",
    teks: "Pelaksanaan melibatkan pemerintah pusat dan daerah, sekolah, serta masyarakat agar program tepat sasaran.",
    warna: "border-emas-500/30 bg-emas-500/10 text-emas-300",
  },
];

export default function Home() {
  return (
    <div id="atas" className="relative min-h-dvh scroll-mt-24">
      {/* aksen garis emas khas dokumen resmi */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 h-1 bg-gradient-to-r from-emas-500 via-gold-500 to-emas-500" />
      {/* cahaya dekoratif latar */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(700px 350px at 15% -5%, rgba(224,169,46,0.16), transparent 60%), radial-gradient(600px 300px at 100% 10%, rgba(214,120,40,0.12), transparent 60%)",
        }}
      />

      {/* Navigasi atas — sticky, kaca, profesional */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/70 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <a href="#atas" className="flex items-center gap-2.5">
            <BgnLogo size={40} />
            <span className="leading-tight">
              <span className="block text-sm font-bold tracking-wide">SISTEM DAPUR MBG</span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Badan Gizi Nasional
              </span>
            </span>
          </a>
          <div className="hidden items-center gap-0.5 text-sm md:flex">
            <a href="#fitur" className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/5 hover:text-white">Fitur</a>
            <a href="#keunggulan" className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/5 hover:text-white">Keunggulan</a>
            <a href="#cara" className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/5 hover:text-white">Cara Mulai</a>
            <a href="#faq" className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/5 hover:text-white">FAQ</a>
            <a href="#paket" className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/5 hover:text-white">Paket</a>
            <a href="#berita" className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/5 hover:text-white">Berita</a>
          </div>
          <Link href="/login" className="btn-gold px-5">
            Masuk
          </Link>
        </nav>
      </header>

      <main className="relative mx-auto flex max-w-6xl flex-col px-5 pb-7">
      <section className="mt-10 flex flex-1 flex-col items-start justify-center sm:mt-16">
        <BgnLogo size={88} className="mb-6" />
        <span className="badge border border-emas-500/30 bg-emas-500/10 text-emas-400">
          ★ Solusi Digital untuk Dapur SPPG · Program MBG
        </span>
        <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
          Digitalkan Seluruh{" "}
          <span className="bg-gradient-to-r from-gold-400 to-ember-400 bg-clip-text text-transparent">
            Operasional Dapur
          </span>{" "}
          MBG Anda
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
          Satu aplikasi untuk absensi wajah &amp; GPS, distribusi porsi dengan
          dokumen resmi, menu &amp; belanja ber-HPP, laporan harian, gudang,
          hingga penggajian. Hemat waktu admin, rapi, dan transparan — siap pakai
          untuk dapur Anda.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold px-6 py-3 text-base"
          >
            💬 Pesan untuk Dapur Anda
          </a>
          <Link href="/login" className="btn-ghost px-6 py-3 text-base">
            Coba Masuk Demo →
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-slate-400">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Berbasis
            cloud, akses dari mana saja
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gold-400" /> Data aman —
            enkripsi &amp; sesi JWT
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emas-400" /> Setup dibantu
            sampai jalan
          </span>
        </div>

        {/* Statistik ringkas */}
        <div className="mt-12 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
          {statistik.map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <p className="bg-gradient-to-r from-gold-300 to-ember-400 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
                {s.angka}
              </p>
              <p className="mt-1 text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="fitur" className="mt-16 scroll-mt-24">
        <div className="text-center">
          <span className="badge border border-gold-500/30 bg-gold-500/10 text-gold-300">
            ⚡ Fitur Lengkap
          </span>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Satu Sistem untuk Seluruh Operasional Dapur MBG
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Dari absensi tim, distribusi &amp; dokumen resmi, menu &amp; belanja,
            sampai laporan, gudang, dan penggajian — semua dalam satu aplikasi.
          </p>
        </div>

        <div className="mt-10 space-y-10">
          {kategoriFitur.map((k) => (
            <div key={k.tag}>
              <div className="flex items-center gap-3">
                <span className={`badge border ${k.warna}`}>
                  {k.icon} {k.tag}
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {k.items.map((f) => (
                  <div
                    key={f.judul}
                    className="card p-5 transition hover:border-gold-500/40"
                  >
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-gold-500/15 text-2xl">
                      {f.icon}
                    </div>
                    <h3 className="mt-3 text-base font-bold">{f.judul}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-300">
                      {f.teks}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Kenapa memilih kami */}
      <section id="keunggulan" className="mt-20 scroll-mt-24">
        <div className="text-center">
          <span className="badge border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            ✓ Kenapa Memilih Kami
          </span>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Dibuat Khusus untuk Alur Kerja Dapur MBG
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Bukan aplikasi umum yang dipaksakan — setiap fitur mengikuti cara
            kerja dapur SPPG sehari-hari.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {keunggulan.map((k) => (
            <div key={k.judul} className="card p-5 transition hover:border-gold-500/40">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/15 text-2xl">
                {k.icon}
              </div>
              <h3 className="mt-3 text-base font-bold">{k.judul}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">{k.teks}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cara mulai */}
      <section id="cara" className="mt-20 scroll-mt-24">
        <div className="text-center">
          <span className="badge border border-sky-500/30 bg-sky-500/10 text-sky-300">
            🚀 Cara Mulai
          </span>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Dapur Anda Digital dalam 3 Langkah
          </h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {langkah.map((l) => (
            <div key={l.no} className="card relative p-6">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-gold-400 to-ember-400 text-xl font-extrabold text-black">
                {l.no}
              </div>
              <h3 className="mt-4 text-lg font-bold">{l.judul}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">{l.teks}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimoni */}
      <section id="testimoni" className="mt-20 scroll-mt-24">
        <div className="text-center">
          <span className="badge border border-emas-500/30 bg-emas-500/10 text-emas-400">
            💬 Kata Mereka
          </span>
          <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
            Dipercaya Tim Dapur MBG
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
            Pengalaman nyata dari peran-peran yang setiap hari menjalankan
            operasional dapur.
          </p>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimoni.map((t) => (
            <figure
              key={t.nama}
              className="card flex flex-col justify-between p-6"
            >
              <blockquote className="text-sm leading-relaxed text-slate-200">
                <span className="mb-2 block text-3xl leading-none text-emas-400/60">
                  &ldquo;
                </span>
                {t.isi}
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-300 to-ember-400 text-sm font-bold text-ink-950">
                  {t.inisial}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-100">
                    {t.nama}
                  </span>
                  <span className="block text-xs text-slate-400">{t.peran}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* CTA penutup */}
      <section className="mt-20">
        <div className="card relative overflow-hidden p-8 text-center sm:p-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(600px 260px at 50% -20%, rgba(224,169,46,0.5), transparent 70%)",
            }}
          />
          <div className="relative">
            <span className="badge border border-emas-500/30 bg-emas-500/10 text-emas-400">
              💛 Siap Digitalkan Dapur Anda?
            </span>
            <h2 className="mx-auto mt-3 max-w-2xl text-2xl font-extrabold leading-tight sm:text-4xl">
              Tinggalkan Kertas &amp; Excel.{" "}
              <span className="bg-gradient-to-r from-gold-300 to-ember-400 bg-clip-text text-transparent">
                Kelola Dapur dari Satu Layar.
              </span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
              Konsultasi gratis. Ceritakan kebutuhan dapur Anda dan kami bantu
              siapkan sistemnya — dari setup, migrasi data, sampai pelatihan tim.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold px-7 py-3 text-base"
              >
                💬 Chat via WhatsApp
              </a>
              <a href="#paket" className="btn-ghost px-7 py-3 text-base">
                Lihat Paket &amp; Harga
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mt-20 scroll-mt-24">
        <div className="text-center">
          <span className="badge border border-emas-500/30 bg-emas-500/10 text-emas-400">
            ❓ Pertanyaan Umum
          </span>
          <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
            Yang Sering Ditanyakan
          </h2>
        </div>
        <div className="mx-auto mt-8 max-w-3xl divide-y divide-white/10">
          {faq.map((f) => (
            <details key={f.tanya} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold text-slate-100 transition-colors hover:text-emas-300">
                {f.tanya}
                <span className="shrink-0 text-emas-400 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                {f.jawab}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Berita & informasi BGN */}
      <section id="berita" className="mt-16 scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="badge border border-emas-500/30 bg-emas-500/10 text-emas-400">
              📰 Berita & Informasi
            </span>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Seputar Badan Gizi Nasional
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Sorotan Program Makan Bergizi Gratis (MBG).
            </p>
          </div>
          <a
            href={PORTAL_BGN}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost px-5"
          >
            Kunjungi Portal Resmi BGN →
          </a>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {berita.map((b) => (
            <a
              key={b.judul}
              href={PORTAL_BGN}
              target="_blank"
              rel="noopener noreferrer"
              className="card group flex gap-4 p-5 transition hover:border-gold-500/40"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/5 text-2xl">
                {b.icon}
              </div>
              <div className="min-w-0">
                <span className={"badge border " + b.warna}>{b.tag}</span>
                <h3 className="mt-2 text-base font-bold leading-snug group-hover:text-gold-300">
                  {b.judul}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">{b.teks}</p>
                <p className="mt-2 text-xs font-semibold text-gold-400">
                  Selengkapnya di bgn.go.id →
                </p>
              </div>
            </a>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Sumber resmi: Badan Gizi Nasional —{" "}
          <a
            href={PORTAL_BGN}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-slate-300"
          >
            bgn.go.id
          </a>
        </p>
      </section>

      {/* Fitur budaya: Hitung Aura Weton */}
      <section className="mt-12">
        <div className="card relative overflow-hidden p-6 text-center sm:p-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(500px 200px at 50% -20%, rgba(224,169,46,0.5), transparent 70%)",
            }}
          />
          <div className="relative">
            <span className="badge border border-emas-500/30 bg-emas-500/10 text-emas-400">
              ✦ Warisan Budaya Jawa
            </span>
            <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
              Hitung{" "}
              <span className="bg-gradient-to-r from-emas-300 to-gold-400 bg-clip-text text-transparent">
                Aura Weton
              </span>{" "}
              &amp; Jodoh
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-300">
              Cari tahu weton, neptu, aura, dan ramalan kecocokan jodoh dari tanggal lahir —
              berdasarkan kaidah primbon Jawa.
            </p>
            <Link href="/aura" className="btn-gold mt-5 px-6 py-3 text-base">
              🔮 Buka Hitung Aura Weton
            </Link>
          </div>
        </div>
      </section>

      {/* Paket & Harga */}
      <section id="paket" className="mt-20 scroll-mt-24">
        <div className="text-center">
          <span className="badge border border-gold-500/30 bg-gold-500/10 text-gold-300">
            💎 Paket & Harga
          </span>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Paket Berjenjang, Sesuai Skala Dapur Anda
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Dari Bronze sampai Pro — makin tinggi paket, makin banyak fitur
            terbuka. Pilih paket, klik tombolnya, dan langsung terhubung ke
            WhatsApp kami untuk penawaran resmi.
          </p>
        </div>

        <div className="mt-10 grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {paket.map((p) => (
            <div
              key={p.nama}
              className={
                "card relative flex h-full flex-col p-6 " +
                (p.unggulan
                  ? "border-gold-500/50 ring-1 ring-gold-500/30 lg:-mt-3 lg:mb-3"
                  : "")
              }
            >
              {p.unggulan && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-gold-400 to-ember-400 px-4 py-1 text-xs font-bold text-ink-950 shadow-lg">
                  ★ Paling Populer
                </span>
              )}
              <div className="flex items-center gap-3">
                <span
                  className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${p.aksen} text-2xl shadow-inner`}
                >
                  {p.ikon}
                </span>
                <h3 className="text-lg font-extrabold">{p.nama}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                {p.ringkas}
              </p>
              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="bg-gradient-to-r from-gold-300 to-ember-400 bg-clip-text text-2xl font-extrabold text-transparent">
                  Hubungi untuk Penawaran
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Konsultasi awal gratis · tanpa biaya tersembunyi
                </p>
              </div>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-slate-300">
                {p.fitur.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <span className="mt-0.5 shrink-0 text-emerald-400" aria-hidden="true">
                      ✓
                    </span>
                    <span className="leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href={waPaket(p.nama)}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  "mt-6 w-full px-6 py-3 text-center text-base " +
                  (p.unggulan ? "btn-gold" : "btn-ghost")
                }
              >
                💬 Pesan Paket {p.nama}
              </a>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Butuh kebutuhan khusus?{" "}
          <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-gold-400 underline underline-offset-2 hover:text-gold-300"
          >
            Chat langsung untuk paket custom →
          </a>
        </p>
      </section>

      <footer className="mt-16 border-t border-white/10 pt-6 text-center text-xs text-slate-500">
        <p>
          Ingin sistem serupa untuk dapur Anda?{" "}
          <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-gold-400 underline underline-offset-2 hover:text-gold-300"
          >
            Hubungi kami via WhatsApp →
          </a>
        </p>
        <p className="mt-3">
          © {new Date().getFullYear()} Sistem Manajemen Dapur MBG · Mendukung
          Program Makan Bergizi Gratis.
        </p>
      </footer>
      </main>
    </div>
  );
}
