/**
 * Lambang resmi Badan Gizi Nasional (BGN). Disajikan dalam bingkai lingkaran
 * putih bertepi emas agar tampil rapi di atas latar navy tema BGN.
 */
export default function BgnLogo({
  size = 40,
  ring = true,
  className = "",
}: {
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  return (
    <img
      src="/bgn-logo.webp"
      alt="Lambang Badan Gizi Nasional Republik Indonesia"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={
        "shrink-0 rounded-full bg-white object-contain " +
        (ring ? "ring-1 ring-emas-500/50 shadow-glow " : "") +
        className
      }
    />
  );
}
