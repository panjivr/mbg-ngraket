import Link from "next/link";

const fitur = [
  {
    judul: "Absen Selfie",
    teks: "Clock in & clock out dengan verifikasi foto langsung dari kamera ponsel.",
    icon: "📸",
  },
  {
    judul: "Geofence GPS",
    teks: "Absensi hanya valid di area dapur — divalidasi otomatis dengan radius lokasi.",
    icon: "📍",
  },
  {
    judul: "Rekap & Ekspor",
    teks: "Admin memantau kehadiran real-time dan mengunduh rekap ke Excel/CSV.",
    icon: "📊",
  },
  {
    judul: "Hak Akses",
    teks: "Peran Staf dan Admin terpisah dengan sesi aman (JWT + cookie httpOnly).",
    icon: "🔐",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5 py-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold-500 text-xl text-ink-950">
            🍲
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-wide">ABSENSI DAPUR</p>
            <p className="text-xs text-slate-400">Program MBG</p>
          </div>
        </div>
        <Link href="/login" className="btn-gold">
          Masuk
        </Link>
      </header>

      <section className="mt-16 flex flex-1 flex-col items-start justify-center">
        <span className="badge bg-gold-500/15 text-gold-400">
          Sistem Kehadiran Digital
        </span>
        <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
          Absensi Dapur yang{" "}
          <span className="text-gold-400">profesional & akurat</span>
        </h1>
        <p className="mt-4 max-w-xl text-base text-slate-400">
          Catat kehadiran tim dapur dengan verifikasi selfie dan validasi lokasi
          GPS. Cepat untuk staf, transparan untuk admin.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/login" className="btn-gold px-5 py-3 text-base">
            Mulai Absen →
          </Link>
          <a href="#fitur" className="btn-ghost px-5 py-3 text-base">
            Lihat Fitur
          </a>
        </div>
      </section>

      <section id="fitur" className="mt-16 grid gap-4 sm:grid-cols-2">
        {fitur.map((f) => (
          <div key={f.judul} className="card p-5">
            <div className="text-2xl">{f.icon}</div>
            <h3 className="mt-3 text-lg font-bold">{f.judul}</h3>
            <p className="mt-1 text-sm text-slate-400">{f.teks}</p>
          </div>
        ))}
      </section>

      <footer className="mt-16 border-t border-white/5 pt-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Absensi Dapur MBG · Dibuat untuk operasional
        dapur yang rapi.
      </footer>
    </main>
  );
}
