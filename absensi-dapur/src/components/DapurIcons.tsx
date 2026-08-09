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
  | "clipboard"
  | "gauge"
  | "users"
  | "settings"
  | "chart"
  | "building"
  | "utensils"
  | "leaf"
  | "coins";

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
  gauge: (
    <>
      <path d="M4 18a8 8 0 1 1 16 0" />
      <path d="M12 18l3.5-4.5" />
      <circle cx="12" cy="18" r="1.1" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20c0-3.2 2.5-5 5.5-5s5.5 1.8 5.5 5" />
      <path d="M16 5.4a3 3 0 0 1 0 5.7M17 15.4c2.1.5 3.5 2.1 3.5 4.6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1" />
    </>
  ),
  chart: (
    <>
      <path d="M4 4v16h16" />
      <rect x="7.3" y="12" width="2.6" height="5" rx="0.6" />
      <rect x="11.7" y="8.5" width="2.6" height="8.5" rx="0.6" />
      <rect x="16.1" y="14" width="2.6" height="3" rx="0.6" />
    </>
  ),
  building: (
    <>
      <path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16" />
      <path d="M14 21V9h5a1 1 0 0 1 1 1v11M2.5 21h19" />
      <path d="M7 8h2M7 12h2M7 16h2M11 8v.01M11 12v.01" />
    </>
  ),
  utensils: (
    <>
      <path d="M6.5 3v6a2 2 0 0 0 4 0V3M8.5 9v12" />
      <path d="M16.5 3c-1.8 0-3 2-3 5s1.2 4 3 4v9" />
    </>
  ),
  leaf: (
    <>
      <path d="M4 20c0-8 6-14 16-14 0 10-6 14-16 14z" />
      <path d="M4.5 19.5c4-6 8-8.5 12-9.5" />
    </>
  ),
  coins: (
    <>
      <circle cx="8" cy="8" r="5" />
      <path d="M12 4.6A5 5 0 1 1 15.4 15" />
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
