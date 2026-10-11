import { getSession } from "@/lib/session";
import { getUserAccess } from "@/lib/user-access";
import UnitLogo from "@/components/UnitLogo";
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
  const me = session ? await getUserAccess(session.uid) : null;
  const perusahaan = me?.sppg_jenis === "perusahaan";
  const unitNama = me?.sppg_nama || (perusahaan ? "Perusahaan" : "Dapur MBG");
  const roleLabel =
    session?.role === "admin" ? "Administrator" : perusahaan ? "Karyawan" : "Staf Dapur";

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

  // Palet hero: navy+emas resmi BGN untuk dapur, grafit+indigo korporat untuk
  // perusahaan (kesan startup/kantoran).
  const grad = perusahaan ? "from-[#1c2230] to-[#0f1117]" : "from-[#0e1f55] to-[#071e49]";
  const aura = perusahaan ? "#6366f155" : "#b5e0ea55";
  const sapaColor = perusahaan ? "text-indigo-300" : "text-[#b5e0ea]";
  const roleBg = perusahaan ? "#6366f1" : "#d1b06c";
  const roleText = perusahaan ? "text-white" : "text-[#071e49]";
  const dot = perusahaan ? "#a5b4fc" : "#92d05d";
  const dotText = perusahaan ? "text-indigo-100" : "text-[#071e49]";

  return (
    <section className={"relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br p-5 shadow-soft " + grad}>
      {/* Tekstur titik halus + aura berpendar */}
      <DotGrid className="pointer-events-none absolute inset-0 text-white/[0.04]" />
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full opacity-40 blur-2xl"
        style={{ background: `radial-gradient(circle, ${aura} 0%, transparent 70%)` }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={"text-xs font-medium " + sapaColor}>{sapa},</p>
          <h1 className="truncate text-xl font-extrabold tracking-tight text-white">{nama}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={"badge " + roleText} style={{ backgroundColor: roleBg }}>
              {roleLabel}
            </span>
            <span className="text-[11px] text-slate-300">{tanggal}</span>
          </div>
        </div>
        <UnitLogo jenis={perusahaan ? "perusahaan" : "dapur"} nama={unitNama} logoUrl={me?.sppg_logo || ""} size={44} />
      </div>

      {/* Chip status + identitas unit */}
      <div className="relative mt-4 flex flex-wrap gap-2">
        <span
          className={"inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold " + dotText}
          style={{ backgroundColor: dot }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: perusahaan ? "#1c2230" : "#071e49" }} />
          Sesi Aktif
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-200">
          {perusahaan ? unitNama : "Program Makan Bergizi Gratis"}
        </span>
      </div>
    </section>
  );
}
