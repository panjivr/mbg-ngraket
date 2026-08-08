import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";
import { TEMPLATE_GIZI, KELOMPOK_GIZI } from "@/lib/ahli-gizi";

export const dynamic = "force-dynamic";

/**
 * Aksen warna per template (kelas Tailwind lengkap — tidak boleh di-concat
 * dinamis agar tidak ter-purge). Dipakai untuk ikon, garis atas kartu, dan glow.
 */
const AKSEN: Record<
  string,
  { ikon: string; garis: string; ring: string; teks: string }
> = {
  "laporan-harian": {
    ikon: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    garis: "from-emerald-500/70",
    ring: "hover:ring-emerald-500/40 hover:shadow-emerald-500/10",
    teks: "group-hover:text-emerald-200",
  },
  "laporan-mingguan": {
    ikon: "bg-green-500/15 text-green-300 ring-green-500/30",
    garis: "from-green-500/70",
    ring: "hover:ring-green-500/40 hover:shadow-green-500/10",
    teks: "group-hover:text-green-200",
  },
  "suhu-makanan": {
    ikon: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
    garis: "from-orange-500/70",
    ring: "hover:ring-orange-500/40 hover:shadow-orange-500/10",
    teks: "group-hover:text-orange-200",
  },
  "suhu-pemorsian": {
    ikon: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
    garis: "from-amber-500/70",
    ring: "hover:ring-amber-500/40 hover:shadow-amber-500/10",
    teks: "group-hover:text-amber-200",
  },
  "suhu-showcase": {
    ikon: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
    garis: "from-sky-500/70",
    ring: "hover:ring-sky-500/40 hover:shadow-sky-500/10",
    teks: "group-hover:text-sky-200",
  },
  "kebersihan-area": {
    ikon: "bg-teal-500/15 text-teal-300 ring-teal-500/30",
    garis: "from-teal-500/70",
    ring: "hover:ring-teal-500/40 hover:shadow-teal-500/10",
    teks: "group-hover:text-teal-200",
  },
  foodwaste: {
    ikon: "bg-lime-500/15 text-lime-300 ring-lime-500/30",
    garis: "from-lime-500/70",
    ring: "hover:ring-lime-500/40 hover:shadow-lime-500/10",
    teks: "group-hover:text-lime-200",
  },
  "rekap-po": {
    ikon: "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30",
    garis: "from-indigo-500/70",
    ring: "hover:ring-indigo-500/40 hover:shadow-indigo-500/10",
    teks: "group-hover:text-indigo-200",
  },
  haccp: {
    ikon: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
    garis: "from-violet-500/70",
    ring: "hover:ring-violet-500/40 hover:shadow-violet-500/10",
    teks: "group-hover:text-violet-200",
  },
};

const AKSEN_DEFAULT = {
  ikon: "bg-gold-500/15 text-gold-300 ring-gold-500/30",
  garis: "from-gold-500/70",
  ring: "hover:ring-gold-500/40 hover:shadow-gold-500/10",
  teks: "group-hover:text-gold-200",
};

export default async function AhliGiziHubPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  // Admin penuh ATAU sub-admin Ahli Gizi (akses_gizi). Flag dibaca dari DB
  // (bukan token) agar pemberian/pencabutan akses langsung berlaku.
  if (session.role !== "admin") {
    const me = (
      await query<{ akses_gizi: boolean }>(
        `SELECT akses_gizi FROM users WHERE id = $1`,
        [session.uid],
      )
    )[0];
    if (!me?.akses_gizi) redirect("/dapur");
  }

  const byslug = new Map(TEMPLATE_GIZI.map((t) => [t.slug, t]));

  return (
    <div className="space-y-8">
      {/* Banner header */}
      <div className="relative overflow-hidden rounded-2xl border border-ink-700 bg-gradient-to-br from-ink-850 via-ink-900 to-ink-900 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
              Ahli Gizi SPPG
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Laporan &amp; Checklist Ahli Gizi
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Pilih formulir, isi bidang yang disorot, lalu cetak atau simpan
              sebagai PDF. Tanggal terisi otomatis dan setiap dokumen bisa
              diarsipkan per tanggal. Mengikuti format resmi SPPG Ngraket Balong
              Ponorogo.
            </p>
          </div>
          <Link
            href="/admin/ahli-gizi/arsip"
            className="shrink-0 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-200 shadow-sm transition hover:bg-emerald-500/20"
          >
            🗓️ Arsip Laporan
          </Link>
        </div>

        {/* Strip statistik */}
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:max-w-md sm:grid-cols-3">
          <div className="rounded-xl border border-ink-700 bg-ink-900/60 px-4 py-3">
            <p className="text-2xl font-bold tabular-nums">
              {TEMPLATE_GIZI.length}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              Formulir
            </p>
          </div>
          <div className="rounded-xl border border-ink-700 bg-ink-900/60 px-4 py-3">
            <p className="text-2xl font-bold tabular-nums">
              {KELOMPOK_GIZI.length}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              Kategori
            </p>
          </div>
          <div className="col-span-2 rounded-xl border border-ink-700 bg-ink-900/60 px-4 py-3 sm:col-span-1">
            <p className="truncate text-sm font-semibold text-emerald-300">
              {session.nama ?? "Admin"}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              Penanggung jawab
            </p>
          </div>
        </div>
      </div>

      {/* Kelompok template */}
      {KELOMPOK_GIZI.map((grup) => {
        const items = grup.slugs
          .map((s) => byslug.get(s))
          .filter((t): t is NonNullable<typeof t> => Boolean(t));
        if (items.length === 0) return null;

        return (
          <section key={grup.label}>
            <div className="mb-3 flex items-baseline gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                {grup.label}
              </h2>
              <span className="h-px flex-1 bg-ink-700" />
              <span className="text-xs text-slate-500">{grup.ket}</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((t) => {
                const a = AKSEN[t.slug] ?? AKSEN_DEFAULT;
                return (
                  <Link
                    key={t.slug}
                    href={`/cetak/ahli-gizi/${t.slug}`}
                    className={`group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-ink-700 bg-ink-850 p-5 shadow-sm ring-1 ring-transparent transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${a.ring}`}
                  >
                    {/* Garis aksen atas */}
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
                    <span className="mt-auto flex items-center gap-1 pt-1 text-xs font-medium text-slate-500 transition group-hover:gap-2 group-hover:text-emerald-300">
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
