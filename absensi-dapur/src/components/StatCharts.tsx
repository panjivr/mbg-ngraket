"use client";

/**
 * Komponen grafik ringan untuk halaman Statistik absensi.
 * Tanpa dependensi chart eksternal — cukup HTML/SVG + Tailwind agar bundel kecil
 * dan otomatis mengikuti tema terang/gelap (utilitas bg-white/*, text-slate-*,
 * border-white/* sudah dipetakan ulang oleh tema; warna aksen sama di kedua tema).
 */
import type { ReactNode } from "react";

/* ---------------- Kartu statistik (KPI) ---------------- */
export function StatTile({
  label,
  value,
  sub,
  tone = "text-slate-100",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3 text-center">
      <p className={`text-2xl font-extrabold leading-none ${tone}`}>{value}</p>
      <p className="mt-1 text-[11px] text-slate-400">{label}</p>
      {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

/* ---------------- Donut (proporsi) ---------------- */
export interface DonutSeg {
  label: string;
  value: number;
  color: string;
}

export function Donut({
  segments,
  centerValue,
  centerLabel,
}: {
  segments: DonutSeg[];
  centerValue: string;
  centerLabel: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const R = 54;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="relative mx-auto h-36 w-36 shrink-0">
      <svg viewBox="0 0 128 128" className="h-36 w-36 -rotate-90">
        {/* track */}
        <circle
          cx={64}
          cy={64}
          r={R}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.12}
          strokeWidth={18}
          className="text-slate-400"
        />
        {total > 0 &&
          segments.map((s) => {
            const frac = s.value / total;
            const dash = Math.max(frac * C - 2, 0); // sela 2px antar-segmen
            const el = (
              <circle
                key={s.label}
                cx={64}
                cy={64}
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={18}
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-acc}
              >
                <title>{`${s.label}: ${s.value} (${Math.round(frac * 100)}%)`}</title>
              </circle>
            );
            acc += frac * C;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-slate-100">{centerValue}</span>
        <span className="text-[11px] text-slate-400">{centerLabel}</span>
      </div>
    </div>
  );
}

export function Legend({
  items,
}: {
  items: { label: string; color: string; value?: string }[];
}) {
  return (
    <ul className="space-y-1.5">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-2 text-sm">
          <span
            className="inline-block h-3 w-3 shrink-0 rounded-sm"
            style={{ background: it.color }}
          />
          <span className="text-slate-300">{it.label}</span>
          {it.value !== undefined && (
            <span className="ml-auto font-semibold text-slate-100">{it.value}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ---------------- Baris bar horizontal (generik) ---------------- */
export function HBar({
  left,
  right,
  value,
  max,
  color,
  barClass,
}: {
  left: ReactNode;
  right?: ReactNode;
  value: number;
  max: number;
  color?: string;
  barClass?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="w-28 shrink-0 truncate text-xs text-slate-300 sm:w-36">{left}</div>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className={"h-full rounded-full " + (barClass || "")}
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="w-14 shrink-0 text-right text-xs font-semibold text-slate-200">
        {right}
      </div>
    </div>
  );
}

/* ---------------- Tren harian (bar bertumpuk per hari) ---------------- */
export interface DayPoint {
  d: string; // YYYY-MM-DD
  tepat: number;
  terlambat: number;
  hadir: number;
}

const ON_TIME = "#34d399"; // emerald-400
const LATE = "#fbbf24"; // amber-400

export function DayTrend({ data }: { data: DayPoint[] }) {
  const max = Math.max(1, ...data.map((p) => p.hadir));
  return (
    <div>
      <div className="scroll-x overflow-x-auto pb-1">
        <div className="flex min-w-full items-end gap-1" style={{ height: 160 }}>
          {data.map((p) => {
            const tinggiTepat = (p.tepat / max) * 140;
            const tinggiTelat = (p.terlambat / max) * 140;
            const day = p.d.slice(8, 10);
            return (
              <div
                key={p.d}
                className="flex min-w-[16px] flex-1 flex-col items-center justify-end gap-0.5"
                title={`${p.d} · Hadir ${p.hadir} (Tepat ${p.tepat}, Telat ${p.terlambat})`}
              >
                <div className="flex w-full flex-col justify-end" style={{ height: 140 }}>
                  {p.terlambat > 0 && (
                    <div
                      className="w-full rounded-t-sm"
                      style={{ height: tinggiTelat, background: LATE }}
                    />
                  )}
                  {p.tepat > 0 && (
                    <div
                      className={p.terlambat > 0 ? "w-full" : "w-full rounded-t-sm"}
                      style={{ height: tinggiTepat, background: ON_TIME }}
                    />
                  )}
                </div>
                <span className="text-[9px] text-slate-500">{day}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: ON_TIME }} /> Tepat waktu
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: LATE }} /> Terlambat
        </span>
      </div>
    </div>
  );
}

export { ON_TIME, LATE };
