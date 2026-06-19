import Link from "next/link";
import BgnLogo from "@/components/BgnLogo";

const fitur = [
  {
    judul: "Verifikasi Wajah + Lokasi",
    teks: "Clock in & clock out dengan foto wajah langsung dari kamera dan validasi titik lokasi (GPS geofence) area dapur.",
    icon: "📸",
  },
  {
    judul: "Shift per Divisi",
    teks: "Setiap divisi punya jam kerja sendiri — termasuk shift malam lintas hari (mis. 22:00–08:00).",
    icon: "🗂️",
  },
  {
    judul: "Berbasis Jam, Bukan Hari",
    teks: "Absensi dihitung per shift, bukan per tanggal, sehingga shift yang melewati tengah malam tetap akurat.",
    icon: "🕒",
  },
  {
    judul: "Rekap & Ekspor",
    teks: "Admin memantau kehadiran real-time, status tepat waktu/terlambat, dan mengunduh rekap ke Excel/CSV/PDF.",
    icon: "📊",
  },
];

const PORTAL_BGN = "https://www.bgn.go.id";

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
    <main className="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-5 py-7">
      {/* aksen garis emas khas dokumen resmi */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-1 bg-gradient-to-r from-emas-500 via-gold-500 to-emas-500" />

      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BgnLogo size={48} />
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-wide">ABSENSI DAPUR MBG</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              Badan Gizi Nasional
            </p>
          </div>
        </div>
        <Link href="/login" className="btn-gold px-5">
          Masuk
        </Link>
      </header>

      <section className="mt-14 flex flex-1 flex-col items-start justify-center sm:mt-20">
        <BgnLogo size={88} className="mb-6" />
        <span className="badge border border-emas-500/30 bg-emas-500/10 text-emas-400">
          ★ Program Makan Bergizi Gratis · Republik Indonesia
        </span>
        <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
          Sistem Absensi{" "}
          <span className="bg-gradient-to-r from-gold-400 to-ember-400 bg-clip-text text-transparent">
            Operasional Dapur
          </span>{" "}
          Badan Gizi Nasional
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
          Catat kehadiran tim dapur MBG dengan verifikasi wajah dan lokasi GPS,
          jadwal shift per divisi, serta perhitungan berbasis jam yang akurat
          untuk shift malam. Cepat untuk staf, transparan untuk admin.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className="btn-gold px-6 py-3 text-base">
            Mulai Absen →
          </Link>
          <a href="#fitur" className="btn-ghost px-6 py-3 text-base">
            Lihat Fitur
          </a>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-slate-400">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Sesi aman JWT
            + cookie httpOnly
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gold-400" /> HTTPS &
            kamera/GPS aktif otomatis
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emas-400" /> Peran Admin &
            Staf terpisah
          </span>
        </div>
      </section>

      <section id="fitur" className="mt-16 grid gap-4 sm:grid-cols-2">
        {fitur.map((f) => (
          <div key={f.judul} className="card p-5 transition hover:border-gold-500/40">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gold-500/15 text-2xl">
              {f.icon}
            </div>
            <h3 className="mt-3 text-lg font-bold">{f.judul}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">{f.teks}</p>
          </div>
        ))}
      </section>

      {/* Berita & informasi BGN */}
      <section id="berita" className="mt-16">
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

      <footer className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Absensi Dapur · Program Makan Bergizi Gratis
        — Badan Gizi Nasional. Sistem internal operasional dapur.
      </footer>
    </main>
  );
}
