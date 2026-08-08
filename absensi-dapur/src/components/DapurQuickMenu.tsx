import Link from "next/link";
import DapurIcon, { type IconName } from "@/components/DapurIcons";

/**
 * Grid layanan pegawai ala dasbor profesional: kartu berjudul berisi petak
 * ikon yang menautkan ke seluruh fitur staf. Server component murni — tanpa
 * state/DB (item operasional bersyarat tetap tersedia lewat sheet "Menu").
 *
 * Nirmana: satu permukaan tenang untuk semua petak, aksen hanya pada warna
 * ikon — grid terbaca sebagai satu sistem, bukan tumpukan tombol berwarna.
 * Ikon dari satu keluarga SVG (DapurIcons), bukan emoji.
 */

type Service = {
  href: string;
  label: string;
  icon: IconName;
  /** Skema warna aksen ikon: navy | sky | gold */
  tone: "navy" | "sky" | "gold";
};

const SERVICES: Service[] = [
  { href: "/dapur/peringkat", label: "Peringkat", icon: "trophy", tone: "gold" },
  { href: "/dapur/slip", label: "Slip Gaji", icon: "receipt", tone: "navy" },
  { href: "/dapur/jadwal", label: "Jadwal", icon: "calendar", tone: "sky" },
  { href: "/dapur/sop", label: "SOP", icon: "book", tone: "navy" },
  { href: "/dapur/izin", label: "Izin", icon: "docPen", tone: "sky" },
  { href: "/dapur/pengaduan", label: "Aspirasi", icon: "megaphone", tone: "gold" },
  { href: "/dapur/finansial", label: "Finansial", icon: "wallet", tone: "navy" },
  { href: "/dapur/riwayat", label: "Riwayat", icon: "history", tone: "sky" },
  { href: "/dapur/profil", label: "Kartu Saya", icon: "idCard", tone: "gold" },
];

// Nirmana — kesatuan: satu permukaan tenang untuk semua petak, aksen hanya
// pada warna ikon. Menghindari mozaik gradasi yang ramai agar grid terbaca
// sebagai satu sistem yang profesional (bukan tumpukan tombol berwarna).
const TONE: Record<Service["tone"], string> = {
  navy: "text-sky-300",
  sky: "text-ember-400",
  gold: "text-emas-400",
};

export default function DapurQuickMenu() {
  return (
    <section className="card p-4" aria-labelledby="layanan-pegawai">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="layanan-pegawai" className="text-sm font-bold text-slate-100">
          Layanan Pegawai
        </h2>
        <span className="text-[11px] font-medium text-slate-400">Akses cepat</span>
      </div>
      <div className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4">
        {SERVICES.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex flex-col items-center gap-2 rounded-2xl px-1 py-1.5 text-center transition-colors hover:bg-white/5"
          >
            <span
              className={
                "grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/5 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-white/20 group-hover:bg-white/10 group-active:scale-95 " +
                TONE[s.tone]
              }
            >
              <DapurIcon name={s.icon} className="h-6 w-6" />
            </span>
            <span className="text-[11px] font-medium leading-tight text-slate-300">
              {s.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
