import Link from "next/link";
import {
  AKSEN_PALETTE,
  type CetakGrup,
  type CetakTemplate,
} from "@/lib/cetak-forms";

/**
 * Hub kartu formulir cetak generik — dipakai bersama oleh peran kepala dapur,
 * asisten lapangan, chef, dst. Menggeneralisasi tata letak hub Ahli Gizi supaya
 * konsisten tanpa menggandakan ~240 baris per peran. Server Component murni.
 */

const AKSEN_DEFAULT = {
  ikon: "bg-gold-500/15 text-gold-300 ring-gold-500/30",
  garis: "from-gold-500/70",
  ring: "hover:ring-gold-500/40 hover:shadow-gold-500/10",
  teks: "group-hover:text-gold-200",
};

interface CetakHubProps {
  /** Badge kecil di atas judul (mis. "Kepala SPPG"). */
  badge: string;
  judul: string;
  deskripsi: string;
  /** Basis rute cetak, mis. "/cetak/kepala-dapur". */
  basePath: string;
  templates: readonly CetakTemplate[];
  grup: readonly CetakGrup[];
  /** Nama penanggung jawab (dari session). */
  penanggungJawab?: string;
  /** Warna aksen banner (default emerald untuk keselarasan tema). */
  aksenBanner?: "emerald" | "sky" | "amber" | "violet" | "rose";
}

const BANNER: Record<
  NonNullable<CetakHubProps["aksenBanner"]>,
  { badge: string; blob1: string; blob2: string }
> = {
  emerald: {
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    blob1: "bg-emerald-500/10",
    blob2: "bg-teal-500/10",
  },
  sky: {
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    blob1: "bg-sky-500/10",
    blob2: "bg-blue-500/10",
  },
  amber: {
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    blob1: "bg-amber-500/10",
    blob2: "bg-orange-500/10",
  },
  violet: {
    badge: "border-violet-500/30 bg-violet-500/10 text-violet-300",
    blob1: "bg-violet-500/10",
    blob2: "bg-fuchsia-500/10",
  },
  rose: {
    badge: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    blob1: "bg-rose-500/10",
    blob2: "bg-pink-500/10",
  },
};

export default function CetakHub({
  badge,
  judul,
  deskripsi,
  basePath,
  templates,
  grup,
  penanggungJawab,
  aksenBanner = "emerald",
}: CetakHubProps) {
  const byslug = new Map(templates.map((t) => [t.slug, t]));
  const b = BANNER[aksenBanner];

  return (
    <div className="space-y-8">
      {/* Banner header */}
      <div className="relative overflow-hidden rounded-2xl border border-ink-700 bg-gradient-to-br from-ink-850 via-ink-900 to-ink-900 p-6 sm:p-8">
        <div
          className={`pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl ${b.blob1}`}
        />
        <div
          className={`pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full blur-3xl ${b.blob2}`}
        />
        <div className="relative max-w-2xl">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${b.badge}`}
          >
            {badge}
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            {judul}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {deskripsi}
          </p>
        </div>

        {/* Strip statistik */}
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:max-w-md sm:grid-cols-3">
          <div className="rounded-xl border border-ink-700 bg-ink-900/60 px-4 py-3">
            <p className="text-2xl font-bold tabular-nums">{templates.length}</p>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              Formulir
            </p>
          </div>
          <div className="rounded-xl border border-ink-700 bg-ink-900/60 px-4 py-3">
            <p className="text-2xl font-bold tabular-nums">{grup.length}</p>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              Kategori
            </p>
          </div>
          <div className="col-span-2 rounded-xl border border-ink-700 bg-ink-900/60 px-4 py-3 sm:col-span-1">
            <p className="truncate text-sm font-semibold text-slate-200">
              {penanggungJawab ?? "Admin"}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              Penanggung jawab
            </p>
          </div>
        </div>
      </div>

      {/* Kelompok template */}
      {grup.map((g) => {
        const items = g.slugs
          .map((s) => byslug.get(s))
          .filter((t): t is CetakTemplate => Boolean(t));
        if (items.length === 0) return null;

        return (
          <section key={g.label}>
            <div className="mb-3 flex items-baseline gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                {g.label}
              </h2>
              <span className="h-px flex-1 bg-ink-700" />
              <span className="text-xs text-slate-500">{g.ket}</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((t) => {
                const a = t.warna ? AKSEN_PALETTE[t.warna] : AKSEN_DEFAULT;
                return (
                  <Link
                    key={t.slug}
                    href={`${basePath}/${t.slug}`}
                    className={`group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-ink-700 bg-ink-850 p-5 shadow-sm ring-1 ring-transparent transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${a.ring}`}
                  >
                    <span
                      className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r to-transparent opacity-0 transition group-hover:opacity-100 ${a.garis}`}
                    />
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ring-1 ${a.ikon}`}
                      >
                        {t.ikon}
                      </span>
                      <div className="min-w-0">
                        <p
                          className={`font-semibold leading-snug transition ${a.teks}`}
                        >
                          {t.judul}
                        </p>
                        {t.landscape && (
                          <span className="mt-1 inline-block rounded bg-ink-900 px-1.5 py-0.5 text-[10px] text-slate-500">
                            Cetak mendatar
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-400">
                      {t.deskripsi}
                    </p>
                    <span className="mt-auto flex items-center gap-1 pt-1 text-xs font-medium text-slate-500 transition group-hover:gap-2 group-hover:text-slate-300">
                      Buka formulir
                      <span aria-hidden>→</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
