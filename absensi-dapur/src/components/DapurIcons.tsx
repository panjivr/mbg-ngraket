import type { ReactNode } from "react";

/**
 * Satu keluarga ikon garis untuk seluruh UI pegawai — mengganti emoji sebagai
 * ikon struktural (nirmana: kesatuan; UI Pro Max §Icons: SVG, bukan emoji).
 * Semua ikon berbagi viewBox 24 & stroke 1.8 agar bobot visualnya seragam.
 */

export type IconName =
  | "trophy"
  | "receipt"
  | "calendar"
  | "book"
  | "docPen"
  | "megaphone"
  | "wallet"
  | "history"
  | "idCard"
  | "pin"
  | "grid"
  | "car"
  | "box"
  | "shield"
  | "truck"
  | "clipboard";

const PATHS: Record<IconName, ReactNode> = {
  trophy: (
    <>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3v18l2-1.2L10 21l2-1.2L14 21l2-1.2 2 1.2V3l-2 1.2L14 3l-2 1.2L10 3 8 4.2 6 3z" />
      <path d="M9 8.5h6M9 12h6M9 15.5h3.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
      <path d="M7.5 13.5h3v3h-3z" />
    </>
  ),
  book: (
    <>
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15.5H6.5A1.5 1.5 0 0 0 5 20V4.5z" />
      <path d="M5 18.5A1.5 1.5 0 0 1 6.5 17H19M9 7.5h6M9 11h4" />
    </>
  ),
  docPen: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
      <path d="M8 8h6M8 12h4" />
      <path d="M19 13.5 21 15.5 16.5 20 14 20.5 14.5 18 19 13.5z" />
    </>
  ),
  megaphone: (
    <>
      <path d="M4 10v4a1 1 0 0 0 1 1h2l8 4V5L7 9H5a1 1 0 0 0-1 1z" />
      <path d="M18 9a3 3 0 0 1 0 6M8 15v3a1.5 1.5 0 0 0 3 0v-2" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a1 1 0 0 1 1 1v1.5" />
      <rect x="3" y="7.5" width="18" height="12" rx="2.5" />
      <path d="M16 13.5h2.5" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 4v4h4M12 8v4l3 2" />
    </>
  ),
  idCard: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <circle cx="9" cy="11" r="2" />
      <path d="M6 16c.4-1.6 1.7-2.5 3-2.5s2.6.9 3 2.5M14.5 9.5H18M14.5 12.5H18M14.5 15.5h2.5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" />
    </>
  ),
  car: (
    <>
      <path d="M3 13.5 4.6 8A2 2 0 0 1 6.5 6.5h11A2 2 0 0 1 19.4 8L21 13.5" />
      <path d="M3 13.5h18v4.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1V17H6.5v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4.5z" />
      <path d="M6.5 16h.01M17.5 16h.01" />
    </>
  ),
  box: (
    <>
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  truck: (
    <>
      <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H14v10H3V6.5z" />
      <path d="M14 8h3.5l3 3.5V15H14V8z" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17.5" cy="17.5" r="1.8" />
      <path d="M9 17.5h6.5" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4.5" width="14" height="16" rx="2.2" />
      <path d="M9 3.5h6v3H9z" />
      <path d="M8.5 11h7M8.5 14.5h5" />
    </>
  ),
};

export default function DapurIcon({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
