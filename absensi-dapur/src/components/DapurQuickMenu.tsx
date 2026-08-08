import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Grid layanan pegawai ala dasbor profesional (referensi aplikasi fintech):
 * kartu berjudul berisi petak-petak ikon yang menautkan ke seluruh fitur staf.
 * Server component murni — tanpa state, tanpa query DB (item operasional
 * bersyarat tetap tersedia lewat sheet "Menu" di bilah bawah).
 *
 * Warna mengikuti palet resmi BGN: navy #071e49, biru pastel #b5e0ea,
 * emas #d1b06c — dipakai sebagai gradasi lembut pada tiap chip ikon agar
 * tampil bermartabat & konsisten dengan lambang Badan Gizi Nasional.
 */

type SvgProps = { className?: string };

function Icon({ children, className }: { children: ReactNode } & SvgProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const TrophyIcon = (p: SvgProps) => (
  <Icon {...p}>
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
    <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
  </Icon>
);
const ReceiptIcon = (p: SvgProps) => (
  <Icon {...p}>
    <path d="M6 3v18l2-1.2L10 21l2-1.2L14 21l2-1.2 2 1.2V3l-2 1.2L14 3l-2 1.2L10 3 8 4.2 6 3z" />
    <path d="M9 8.5h6M9 12h6M9 15.5h3.5" />
  </Icon>
);
const CalendarIcon = (p: SvgProps) => (
  <Icon {...p}>
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    <path d="M7.5 13.5h3v3h-3z" />
  </Icon>
);
const BookIcon = (p: SvgProps) => (
  <Icon {...p}>
    <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15.5H6.5A1.5 1.5 0 0 0 5 20V4.5z" />
    <path d="M5 18.5A1.5 1.5 0 0 1 6.5 17H19M9 7.5h6M9 11h4" />
  </Icon>
);
const DocPenIcon = (p: SvgProps) => (
  <Icon {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
    <path d="M8 8h6M8 12h4" />
    <path d="M19 13.5 21 15.5 16.5 20 14 20.5 14.5 18 19 13.5z" />
  </Icon>
);
const MegaphoneIcon = (p: SvgProps) => (
  <Icon {...p}>
    <path d="M4 10v4a1 1 0 0 0 1 1h2l8 4V5L7 9H5a1 1 0 0 0-1 1z" />
    <path d="M18 9a3 3 0 0 1 0 6M8 15v3a1.5 1.5 0 0 0 3 0v-2" />
  </Icon>
);
const WalletIcon = (p: SvgProps) => (
  <Icon {...p}>
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a1 1 0 0 1 1 1v1.5" />
    <rect x="3" y="7.5" width="18" height="12" rx="2.5" />
    <path d="M16 13.5h2.5" />
  </Icon>
);
const HistoryIcon = (p: SvgProps) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 4v4h4M12 8v4l3 2" />
  </Icon>
);
const IdCardIcon = (p: SvgProps) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <circle cx="9" cy="11" r="2" />
    <path d="M6 16c.4-1.6 1.7-2.5 3-2.5s2.6.9 3 2.5M14.5 9.5H18M14.5 12.5H18M14.5 15.5h2.5" />
  </Icon>
);

type Service = {
  href: string;
  label: string;
  Icon: (p: SvgProps) => ReactNode;
  /** Skema warna chip: navy | sky | gold */
  tone: "navy" | "sky" | "gold";
};

const SERVICES: Service[] = [
  { href: "/dapur/peringkat", label: "Peringkat", Icon: TrophyIcon, tone: "gold" },
  { href: "/dapur/slip", label: "Slip Gaji", Icon: ReceiptIcon, tone: "navy" },
  { href: "/dapur/jadwal", label: "Jadwal", Icon: CalendarIcon, tone: "sky" },
  { href: "/dapur/sop", label: "SOP", Icon: BookIcon, tone: "navy" },
  { href: "/dapur/izin", label: "Izin", Icon: DocPenIcon, tone: "sky" },
  { href: "/dapur/pengaduan", label: "Aspirasi", Icon: MegaphoneIcon, tone: "gold" },
  { href: "/dapur/finansial", label: "Finansial", Icon: WalletIcon, tone: "navy" },
  { href: "/dapur/riwayat", label: "Riwayat", Icon: HistoryIcon, tone: "sky" },
  { href: "/dapur/profil", label: "Kartu Saya", Icon: IdCardIcon, tone: "gold" },
];

// Gradasi chip mengacu palet resmi BGN (bgn.go.id/logo-meaning).
const TONE: Record<Service["tone"], string> = {
  navy: "from-[#0e1f55] to-[#071e49] text-[#b5e0ea] ring-1 ring-inset ring-white/10",
  sky: "from-[#5b8bff] to-[#3464e6] text-white ring-1 ring-inset ring-white/15",
  gold: "from-[#e0a92e] to-[#c08e1e] text-[#fff7e6] ring-1 ring-inset ring-white/15",
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
                "grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br shadow-[0_8px_20px_-10px_rgba(2,8,40,0.7)] transition-transform duration-200 group-hover:-translate-y-0.5 group-active:scale-95 " +
                TONE[s.tone]
              }
            >
              <s.Icon className="h-7 w-7" />
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
