import Link from "next/link";
import MarketingShell, { ProductMark } from "@/components/marketing/MarketingShell";
import ContactCTA from "@/components/marketing/ContactCTA";
import ProductPreview, { FeatureIcon } from "@/components/marketing/ProductPreview";
import StructuredData from "@/components/marketing/StructuredData";
import { GUIDES, SOLUTIONS, publicMetadata } from "@/lib/marketing";

const title = "Aplikasi SPPG: Absensi, Rekap Gaji & Distribusi Dapur MBG";
const description = "Sistem Dapur MBG membantu staf, kepala, dan admin SPPG mengelola absensi, rekap gaji, distribusi porsi, menu, serta laporan. Minta demo untuk dapur Anda.";
export const metadata = publicMetadata("/", title, description);
const roles = [
  { name: "Staf dan relawan", text: "Catat masuk/pulang, lihat jadwal, ajukan izin, serta periksa slip dan riwayat dari satu portal." },
  { name: "Admin SPPG", text: "Tinjau kehadiran, susun rekap, kelola porsi, dan siapkan dokumentasi tanpa menggabungkan catatan dari banyak percakapan." },
  { name: "Kepala SPPG", text: "Pantau ringkasan operasional, laporan, serta temuan yang perlu ditindaklanjuti bersama tim." },
];
const faqs = [
  { q: "Apa itu Sistem Dapur MBG?", a: "Aplikasi web independen untuk administrasi dan operasional dapur SPPG: absensi, rekap, distribusi, menu, laporan, dan modul lain sesuai paket serta hak akses." },
  { q: "Apakah ini aplikasi resmi BGN?", a: "Bukan. Sistem Dapur MBG dikembangkan secara independen. Pengelola dapur tetap mengikuti ketentuan BGN dan aturan lain yang berlaku." },
  { q: "Apakah mendukung shift malam?", a: "Ya. Pencatatan masuk/pulang mendukung sesi kerja yang melewati pergantian tanggal dan jadwal per divisi." },
  { q: "Apakah staf bisa memakai ponsel?", a: "Aplikasi dapat diakses melalui browser pada perangkat yang mendukung. Foto/lokasi memerlukan izin perangkat dan pencatatan memerlukan koneksi ke server." },
  { q: "Berapa biaya dan bagaimana mulai?", a: "Biaya mengikuti paket serta kebutuhan penerapan. Hubungi tim melalui WhatsApp untuk meminta demo dan penawaran. Akun operasional disediakan oleh pengelola dapur." },
  { q: "Apakah seluruh fitur langsung tersedia?", a: "Ketersediaan fitur mengikuti paket, hak akses, dan pengaturan dapur. Modul HR/gaji memakai izin khusus; slip staf terlihat ketika diterbitkan pengelola." },
];
const packages = [
  { name: "Bronze", text: "Absensi dan kepegawaian", items: ["Absensi foto & lokasi", "Pegawai, divisi, dan jadwal", "Izin serta pengumuman"] },
  { name: "Silver", text: "Administrasi akuntan", items: ["Modul pada Bronze", "Pusat berita acara akuntan", "Dokumen pembukuan"] },
  { name: "Gold", text: "Operasional harian", items: ["Modul pada Silver", "Distribusi dan perencanaan menu", "Laporan harian & dokumentasi"] },
  { name: "Pro", text: "Modul lengkap", items: ["Modul pada Gold", "HR/gaji dan gudang", "Pusat ahli gizi"] },
];
export default function Home() {
  return <MarketingShell>
    <StructuredData path="/" title={title} description={description}/>
    <section className="mk-hero">
      <div><div className="mk-hero-brand"><ProductMark large/><div><p>SISTEM DAPUR MBG</p><span className="text-sm text-slate-400">Untuk staf, admin, dan kepala SPPG</span></div></div>
      <h1>Operasional SPPG <em>lebih tertata.</em><br/>Tim lebih terarah.</h1>
      <p className="mk-hero-copy">Aplikasi SPPG untuk absensi, rekap gaji, distribusi porsi, dan laporan dapur MBG. Satukan pekerjaan harian tim dalam alur yang mudah diperiksa.</p>
      <div className="mk-hero-actions"><ContactCTA placement="home-hero">Lihat demo aplikasi <span aria-hidden="true">→</span></ContactCTA><Link href="/fitur" className="btn-ghost">Jelajahi fitur</Link></div>
      <p className="mk-hero-note">Berbasis browser · Shift lintas tanggal · Akses sesuai peran</p></div>
      <ProductPreview/>
    </section>
    <div className="mk-proof-strip">{[["Catat dengan jelas","Absensi, jadwal, dan riwayat staf"],["Periksa dalam satu alur","Rekap, gaji, dan dokumentasi"],["Pantau pekerjaan tim","Distribusi dan laporan operasional"]].map(([heading,text],i) => <div key={heading}><span className="mk-icon"><FeatureIcon index={i === 2 ? 7 : i}/></span><div><strong>{heading}</strong><p>{text}</p></div></div>)}</div>
    <section className="mt-14"><span className="mk-section-label">DIRANCANG UNTUK TIM DAPUR</span><h2 className="mk-section-title">Satu alur. Setiap peran terbantu.</h2><div className="mt-6 grid gap-4 md:grid-cols-3">{roles.map((r,i) => <div key={r.name} className="card mk-role-card"><span className="mk-role-number" aria-hidden="true">0{i+1}</span><span className="mk-icon"><FeatureIcon index={i+1}/></span><h3 className="text-lg font-bold">{r.name}</h3><p className="mt-3 leading-7 text-slate-300">{r.text}</p></div>)}</div></section>
    <section className="mt-14"><h2 className="text-2xl font-bold">Pilih masalah yang ingin diselesaikan</h2><p className="mt-3 text-slate-400">Pelajari alurnya sebelum meminta demo untuk dapur Anda.</p><div className="mt-6 grid gap-4 md:grid-cols-3">{SOLUTIONS.map((a,i) => <Link key={a.slug} href={`/solusi/${a.slug}`} className="card-interactive p-6"><span className="mk-icon mb-5"><FeatureIcon index={i}/></span><h3 className="text-lg font-bold">{a.title}</h3><p className="mt-3 leading-7 text-slate-300">{a.summary}</p><span className="mt-4 block font-semibold text-gold-400">Pelajari solusi →</span></Link>)}</div></section>
    <section className="card mk-demo-band mt-14"><h2 className="text-2xl font-bold">Mulai dari demo alur dapur Anda</h2><ol className="mt-5 grid gap-5 md:grid-cols-3">{[
      ["1. Pilih kebutuhan", "Ceritakan peran Anda dan pekerjaan yang masih memakai rekap manual."],
      ["2. Lihat alur", "Tinjau contoh absensi, rekap, atau distribusi memakai data demo."],
      ["3. Siapkan penerapan", "Bahas paket, akun, jadwal divisi, dan pendampingan sebelum dipakai tim."],
    ].map(([h,p]) => <li key={h}><h3 className="font-bold">{h}</h3><p className="mt-2 leading-7 text-slate-300">{p}</p></li>)}</ol><div className="mt-6"><ContactCTA placement="home-workflow"/></div></section>
    <section id="paket" className="mt-14 scroll-mt-40"><h2 className="text-2xl font-bold">Paket sesuai kebutuhan operasional</h2><p className="mt-3 max-w-3xl leading-7 text-slate-400">Mulai dari absensi dan kepegawaian, lalu tambahkan modul sesuai kebutuhan. Harga dan pendampingan dijelaskan melalui penawaran.</p><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{packages.map(p => <div key={p.name} className="card flex flex-col p-5"><h3 className="text-xl font-bold">{p.name}</h3><p className="mt-2 text-sm text-slate-400">{p.text}</p><ul className="my-5 flex-1 list-disc space-y-2 pl-5 text-sm text-slate-300">{p.items.map(i => <li key={i}>{i}</li>)}</ul><ContactCTA topic={`paket ${p.name}`} placement={`package-${p.name.toLowerCase()}`} className="btn-ghost">Tanyakan paket</ContactCTA></div>)}</div></section>
    <section className="mt-14"><h2 className="text-2xl font-bold">Panduan untuk admin dan tim SPPG</h2><div className="mt-6 grid gap-4 md:grid-cols-2">{GUIDES.map((a,i) => <Link key={a.slug} href={`/panduan/${a.slug}`} className="card-interactive p-6"><span className="mk-icon mb-5"><FeatureIcon index={i}/></span><h3 className="text-lg font-bold">{a.title}</h3><p className="mt-3 leading-7 text-slate-300">{a.summary}</p><span className="mt-4 block font-semibold text-gold-400">Baca panduan →</span></Link>)}</div></section>
    <section className="mx-auto mt-14 max-w-3xl"><h2 className="text-2xl font-bold">Pertanyaan sebelum mulai</h2><div className="mt-5 divide-y divide-white/10">{faqs.map(f => <details key={f.q} className="py-4"><summary className="cursor-pointer font-semibold">{f.q}</summary><p className="mt-3 leading-7 text-slate-300">{f.a}</p></details>)}</div></section>
  </MarketingShell>;
}
