import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";
import { TEMPLATE_SUPPLIER } from "@/lib/supplier";

export const dynamic = "force-dynamic";

/** Aksen warna per template (kelas Tailwind lengkap agar tidak ter-purge). */
const AKSEN: Record<string, { ikon: string; garis: string; ring: string; teks: string }> = {
  "nota-po": {
    ikon: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
    garis: "from-sky-500/70",
    ring: "hover:ring-sky-500/40 hover:shadow-sky-500/10",
    teks: "group-hover:text-sky-200",
  },
  invoice: {
    ikon: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    garis: "from-emerald-500/70",
    ring: "hover:ring-emerald-500/40 hover:shadow-emerald-500/10",
    teks: "group-hover:text-emerald-200",
  },
};

const AKSEN_DEFAULT = {
  ikon: "bg-gold-500/15 text-gold-300 ring-gold-500/30",
  garis: "from-gold-500/70",
  ring: "hover:ring-gold-500/40 hover:shadow-gold-500/10",
  teks: "group-hover:text-gold-200",
};

export default async function SupplierHubPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  // Admin penuh ATAU sub-admin Keuangan. Flag dibaca ulang dari DB agar
  // pemberian/pencabutan akses langsung berlaku tanpa login ulang.
  if (session.role !== "admin") {
    const r = await query<{ akses_keuangan: boolean }>(
      `SELECT akses_keuangan FROM users WHERE id = $1`,
      [session.uid],
    );
    if (!r[0]?.akses_keuangan) redirect("/dapur");
  }

  return (
    <div className="space-y-8">
      {/* Banner header */}
      <div className="relative overflow-hidden rounded-2xl border border-ink-700 bg-gradient-to-br from-ink-850 via-ink-900 to-ink-900 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-sky-300">
            Dokumen Supplier
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Nota PO &amp; Invoice Supplier
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Buat Nota Purchase Order atau Invoice tagihan yang rapi &amp;
            profesional. Bisa tambah logo perusahaan, informasi rekening (norek),
            rincian barang dengan total otomatis, serta syarat &amp; ketentuan.
            Isi bidang yang disorot lalu cetak atau simpan sebagai PDF.
          </p>
        </div>
      </div>

      {/* Kartu template */}
      <div className="grid gap-4 sm:grid-cols-2">
        {TEMPLATE_SUPPLIER.map((t) => {
          const a = AKSEN[t.slug] ?? AKSEN_DEFAULT;
          return (
            <Link
              key={t.slug}
              href={`/cetak/supplier/${t.slug}`}
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
                  <p className={`font-semibold leading-snug transition ${a.teks}`}>
                    {t.judul}
                  </p>
                  <span className="mt-1 inline-block rounded bg-ink-900 px-1.5 py-0.5 font-mono text-[10px] uppercase text-slate-500">
                    {t.heading}
                  </span>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">{t.deskripsi}</p>
              <span className="mt-auto flex items-center gap-1 pt-1 text-xs font-medium text-slate-500 transition group-hover:gap-2 group-hover:text-gold-300">
                Buka &amp; isi dokumen
                <span aria-hidden>→</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
