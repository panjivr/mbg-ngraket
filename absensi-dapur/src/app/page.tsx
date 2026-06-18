import Link from "next/link";

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
    teks: "Admin memantau kehadiran real-time, status tepat waktu/terlambat, dan mengunduh rekap ke Excel/CSV.",
    icon: "📊",
  },
];

export default function Home() {
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-5 py-7">
      {/* aksen garis emas khas dokumen resmi */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-1 bg-gradient-to-r from-emas-500 via-gold-500 to-emas-500" />

      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-emas-500 text-sm font-black tracking-tight text-ink-950 shadow-glow">
            MBG
          </span>
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

      <footer className="mt-16 border-t border-white/10 pt-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Absensi Dapur · Program Makan Bergizi Gratis
        — Badan Gizi Nasional. Sistem internal operasional dapur.
      </footer>
    </main>
  );
}
