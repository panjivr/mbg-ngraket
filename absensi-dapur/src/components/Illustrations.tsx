import type { ReactNode } from "react";

/**
 * Pustaka vektor SVG bertema gelap-emas. Semua ilustrasi murni SVG (ringan,
 * tajam di segala resolusi, ikut tema). Dipakai untuk menghias halaman &
 * empty-state agar UI tidak terasa datar/membosankan.
 *
 * Konvensi: setiap komponen menerima `className` untuk mengatur ukuran/warna
 * dari pemanggil. Animasi dilakukan lewat SMIL (<animate>) di dalam SVG,
 * sehingga tidak bergantung pada keyframe CSS eksternal.
 */

type SvgProps = { className?: string };

/** Blob dekoratif berpendar — tempel di sudut kartu/hero sebagai atmosfer. */
export function DecorBlobs({ className }: SvgProps) {
  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="blobA" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f5c451" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#f5c451" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="blobB" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f0743a" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#f0743a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="140" r="150" fill="url(#blobA)">
        <animate
          attributeName="cy"
          values="140;170;140"
          dur="9s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="300" cy="280" r="130" fill="url(#blobB)">
        <animate
          attributeName="cx"
          values="300;270;300"
          dur="11s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}

/** Grid/pola titik halus untuk latar — memberi tekstur tanpa mengganggu. */
export function DotGrid({ className }: SvgProps) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="dotgrid"
          width="22"
          height="22"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dotgrid)" />
    </svg>
  );
}

/** Ilustrasi: periuk/panci dapur mengepul — ikon khas MBG. */
export function PanciMasak({ className }: SvgProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* uap */}
        <path className="opacity-70" d="M48 34c6-6-4-12 2-18">
          <animate
            attributeName="opacity"
            values="0.2;0.8;0.2"
            dur="3s"
            repeatCount="indefinite"
          />
        </path>
        <path className="opacity-70" d="M62 34c6-6-4-12 2-18">
          <animate
            attributeName="opacity"
            values="0.8;0.2;0.8"
            dur="3s"
            repeatCount="indefinite"
          />
        </path>
        <path className="opacity-70" d="M76 34c6-6-4-12 2-18">
          <animate
            attributeName="opacity"
            values="0.4;0.9;0.4"
            dur="3.6s"
            repeatCount="indefinite"
          />
        </path>
        {/* tutup & badan panci */}
        <path d="M30 48h60" />
        <path d="M60 40v8" />
        <path d="M34 48c0 22 6 40 26 40s26-18 26-40" />
        <path d="M20 56h8M92 56h8" />
      </g>
    </svg>
  );
}

/** Ilustrasi: sayur & sendok — cocok untuk menu/gizi. */
export function SayurSendok({ className }: SvgProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="52" cy="64" r="30" />
        <path d="M52 44c-8 6-8 34 0 40M40 50c-2 10 0 22 6 30M64 50c2 10 0 22-6 30" />
        <path d="M88 30c8 0 8 24 0 30-6-6-6-24 0-30zM88 60v34" />
      </g>
    </svg>
  );
}

/** Ilustrasi kosong: kotak terbuka — untuk "belum ada data". */
export function KotakKosong({ className }: SvgProps) {
  return (
    <svg
      viewBox="0 0 140 120"
      className={className}
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path className="opacity-90" d="M24 54l46-22 46 22-46 22-46-22z" />
        <path d="M24 54v34l46 22 46-22V54" />
        <path className="opacity-60" d="M70 76v34" />
        <path className="opacity-50" d="M52 20l6 12M96 20l-6 12" />
      </g>
    </svg>
  );
}

/**
 * FITUR BARU — EmptyState reusable: ilustrasi vektor + judul + keterangan +
 * aksi opsional. Menggantikan teks polos "belum ada data" yang membosankan.
 */
export function EmptyState({
  illustration = "kotak",
  title,
  description,
  action,
  className,
}: {
  illustration?: "kotak" | "panci" | "sayur";
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  const Ill =
    illustration === "panci"
      ? PanciMasak
      : illustration === "sayur"
        ? SayurSendok
        : KotakKosong;
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 px-6 py-12 text-center ${className ?? ""}`}
    >
      <div className="relative">
        <DecorBlobs className="absolute -inset-8 -z-10 opacity-60" />
        <Ill className="h-20 w-20 text-gold-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      {description && (
        <p className="max-w-xs text-sm leading-relaxed text-slate-400">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
