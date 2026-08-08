import { getSession } from "@/lib/session";
import BgnLogo from "@/components/BgnLogo";
import { DotGrid } from "@/components/Illustrations";

/**
 * Kartu "hero" beranda pegawai — analog kartu saldo pada aplikasi fintech:
 * sapaan bernama, tanggal, peran, dan chip status. Selalu berlatar navy BGN
 * (#071e49) dengan aksen resmi BGN — jadi tampil sama profesional & terbaca di
 * tema gelap maupun terang tanpa penyesuaian khusus (permukaan berwarna).
 *
 * Server component: hanya baca sesi dari cookie (tanpa query DB tambahan).
 * Empat warna resmi BGN dipakai sekaligus: navy #071e49, hijau #92d05d,
 * biru pastel #b5e0ea, emas #d1b06c (bgn.go.id/logo-meaning).
 */

const JKT = "Asia/Jakarta";

function greeting(hour: number): string {
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

export default async function DapurHero() {
  const session = await getSession();
  const nama = session?.nama ?? "Pegawai";
  const roleLabel = session?.role === "admin" ? "Administrator" : "Staf Dapur";

  const now = new Date();
  const tanggal = new Intl.DateTimeFormat("id-ID", {
    timeZone: JKT,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  const jam = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: JKT, hour: "numeric", hour12: false }).format(now),
  );
  const sapa = greeting(jam);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0e1f55] to-[#071e49] p-5 shadow-soft">
      {/* Tekstur titik halus + aura pastel BGN */}
      <DotGrid className="pointer-events-none absolute inset-0 text-white/[0.04]" />
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full opacity-40 blur-2xl"
        style={{ background: "radial-gradient(circle, #b5e0ea55 0%, transparent 70%)" }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-[#b5e0ea]">{sapa},</p>
          <h1 className="mt-0.5 truncate text-2xl font-extrabold leading-tight tracking-tight text-white">{nama}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className="badge text-[#071e49]"
              style={{ backgroundColor: "#d1b06c" }}
            >
              {roleLabel}
            </span>
            <span className="text-[11px] text-slate-300">{tanggal}</span>
          </div>
        </div>
        <BgnLogo size={44} />
      </div>

      {/* Chip status — hijau BGN menandai sesi aktif */}
      <div className="relative mt-5 flex flex-wrap gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold text-[#071e49]"
          style={{ backgroundColor: "#92d05d" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#071e49]" />
          Sesi Aktif
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-200">
          Program Makan Bergizi Gratis
        </span>
      </div>
    </section>
  );
}
