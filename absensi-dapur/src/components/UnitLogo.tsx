import BgnLogo from "@/components/BgnLogo";

/**
 * Lambang unit yang adaptif:
 * - Bila `logoUrl` diisi (unggahan admin / URL) → tampilkan logo itu.
 * - Perusahaan tanpa logo → marka korporat (inisial nama di kotak indigo),
 *   TANPA lambang BGN — kesan startup/kantoran.
 * - Dapur → lambang resmi Badan Gizi Nasional (BgnLogo).
 *
 * Dipakai di header admin & karyawan serta halaman login berbranding unit.
 */
function initials(nama: string): string {
  const p = (nama || "").trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "•";
}

export default function UnitLogo({
  jenis,
  nama,
  logoUrl = "",
  size = 40,
  ring = true,
  className = "",
}: {
  jenis?: string;
  nama?: string;
  logoUrl?: string;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  const perusahaan = jenis === "perusahaan";

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data URL / URL dinamis, bukan aset statis.
      <img
        src={logoUrl}
        alt={nama ? `Logo ${nama}` : "Logo unit"}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={
          "shrink-0 rounded-xl bg-white/5 object-contain " +
          (ring ? "ring-1 ring-white/15 " : "") +
          className
        }
      />
    );
  }

  if (perusahaan) {
    return (
      <span
        aria-label={nama ? `Logo ${nama}` : "Logo perusahaan"}
        role="img"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
        className={
          "grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 font-extrabold tracking-tight text-white " +
          (ring ? "ring-1 ring-white/15 shadow-glow " : "") +
          className
        }
      >
        {initials(nama || "")}
      </span>
    );
  }

  return <BgnLogo size={size} ring={ring} className={className} />;
}
