import Link from "next/link";
import MarketingShell from "@/components/marketing/MarketingShell";
import ContactCTA from "@/components/marketing/ContactCTA";
import StructuredData from "@/components/marketing/StructuredData";
import { publicMetadata } from "@/lib/marketing";
const title = "Fitur Aplikasi SPPG: Absensi, Gaji, Distribusi, Menu & Audit";
const description = "Lihat modul Sistem Dapur MBG untuk staf, admin, dan kepala SPPG: absensi, rekap, penggajian, distribusi, menu, gudang, laporan, serta audit.";
export const metadata = publicMetadata('/fitur', title, description);
const groups = [
  { title: 'Absensi dan jadwal', items: ['Foto masuk/pulang dan pemeriksaan lokasi GPS sesuai pengaturan.', 'Shift per divisi, termasuk sesi lintas tanggal.', 'Jadwal, riwayat, izin, pengingat absensi, dan APD.'], href: '/solusi/absensi-sppg' },
  { title: 'Kepegawaian dan HR', items: ['Data pegawai, divisi, akun, dan hak akses.', 'Upah, lembur, penyesuaian, potongan, kasbon, dan komponen slip.', 'Pratinjau, cetak, penerbitan, serta konfirmasi slip staf.'], href: '/solusi/rekap-gaji' },
  { title: 'Distribusi dan penerima', items: ['Master sekolah dan B3, desa, serta kategori penerima.', 'Porsi per tanggal, keikutsertaan, jam kirim, dan rekap distribusi.', 'Dokumen distribusi, surat jalan, BAST, serta laporan lapangan.'], href: '/solusi/distribusi' },
  { title: 'Menu dan kebutuhan bahan', items: ['Bank menu, resep, jumlah porsi dasar, HPP, dan estimasi gizi.', 'Jadwal menu, daftar belanja, serta harga bahan acuan.', 'Generator resep, pembagian kerja, komponen bebas, dan paket historis.'] },
  { title: 'Gudang dan persediaan', items: ['Master barang, barang masuk/keluar, dan stok opname.', 'Kartu stok dan riwayat mutasi.', 'Nilai persediaan, stok menipis, kebutuhan pemesanan, dan kedaluwarsa.'] },
  { title: 'Gizi dan kontrol mutu', items: ['Generator gizi dan gambaran ompreng.', 'Template kontrol suhu, kebersihan, higiene, HACCP, dan organoleptik.', 'Retensi sampel, penerimaan bahan, food waste, serta arsip dokumen.'] },
  { title: 'Audit dan pengawasan', items: ['Sesi audit lapangan/dokumen, observasi, dan timeline.', 'Temuan, risiko, tindak lanjut, food waste, dan pemeriksaan silang.', 'Register, ringkasan, serta laporan lintas sesi.'] },
  { title: 'Laporan dan kendaraan', items: ['Laporan harian dan dokumentasi foto.', 'Data kendaraan, pencatatan kilometer, dan rekap perjalanan.', 'Pusat formulir kepala dapur, chef, serta Asisten Lapangan.'] },
  { title: 'People & Culture', items: ['Survei kondisi kerja dan umpan balik rekan/pimpinan.', 'Apresiasi, pelaporan masalah, dan pengelolaan insiden.', 'Rencana aksi, dasbor kondisi tim, serta catatan 1-on-1.'] },
  { title: 'Portal staf dan fitur tambahan', items: ['Pengumuman, aspirasi, profil, foto, serta kartu pegawai.', 'Keuangan pribadi, simulasi, materi belajar, dan keluaran PDF.', 'Blok Gizi, papan peringkat, dan turnamen.'] },
  { title: 'Pusat multi-dapur', items: ['Pengelolaan data SPPG dan penempatan pegawai.', 'Dasbor serta rekap lintas dapur untuk super admin.', 'Paket, masa aktif, dan pengaturan fitur.'] },
  { title: 'Sistem dan keluaran', items: ['Akses browser/PWA, tema gelap/terang, serta kontrol bahasa sebagian.', 'Pencarian halaman, navigasi staf, dan notifikasi.', 'Halaman cetak, serta ekspor Excel/CSV/PDF/gambar pada modul terkait.'] },
];
export default function Page() {
  return <MarketingShell><StructuredData path="/fitur" title={title} description={description}/><h1 className="max-w-4xl text-3xl font-bold sm:text-4xl">Fitur untuk pekerjaan harian tim SPPG</h1><p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-300">Mulai dari absensi dan rekap, kemudian gunakan modul tambahan sesuai kebutuhan. Ketersediaan fitur mengikuti paket, hak akses, serta pengaturan dapur.</p><div className="mt-8 grid gap-5 md:grid-cols-2">{groups.map(g => <section key={g.title} className="card p-5"><h2 className="text-xl font-bold">{g.title}</h2><ul className="mt-4 list-disc space-y-2 pl-5 leading-7 text-slate-300">{g.items.map(i => <li key={i}>{i}</li>)}</ul>{g.href && <Link href={g.href} className="mt-4 inline-block font-semibold text-gold-400 underline underline-offset-4">Pelajari alur penggunaan</Link>}</section>)}</div><section className="card mt-8 p-6"><h2 className="text-xl font-bold">Tinjau modul yang paling dibutuhkan</h2><p className="my-4 leading-7 text-slate-300">Saat meminta demo, sebutkan peran Anda dan alur yang ingin dicoba: absensi, rekap/slip, distribusi, atau modul lain.</p><ContactCTA placement="features-bottom"/></section></MarketingShell>;
}
