import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { TEMPLATE_AKUNTAN } from "@/lib/akuntan";

export const dynamic = "force-dynamic";

export default async function AkuntanHubPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  // Hanya admin penuh yang boleh mengakses template akuntan.
  if (session.role !== "admin") redirect("/dapur");

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">🧮 Berita Acara Akuntan</h1>
          <p className="mt-1 text-sm text-slate-400">
            Pilih template, isi bidang yang disorot, lalu cetak atau simpan
            sebagai PDF. Template mengikuti format resmi SPPG Ngraket Balong
            Ponorogo.
          </p>
        </div>
        <Link
          href="/admin/akuntan/arsip"
          className="shrink-0 rounded-lg border border-gold-500/40 px-3 py-2 text-sm font-semibold text-gold-300 transition hover:bg-gold-500/10"
        >
          🗓️ Arsip BA
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATE_AKUNTAN.map((t) => (
          <Link
            key={t.slug}
            href={`/cetak/akuntan/${t.slug}`}
            className="card group flex flex-col gap-2 p-4 transition hover:border-gold-500/50 hover:bg-ink-850"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{t.ikon}</span>
              <div>
                <p className="font-semibold leading-snug group-hover:text-gold-300">
                  {t.judul}
                </p>
                {t.nomor && (
                  <p className="mt-0.5 text-[11px] text-slate-500">{t.nomor}</p>
                )}
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">{t.deskripsi}</p>
            <span className="mt-auto pt-1 text-xs font-medium text-gold-400 opacity-0 transition group-hover:opacity-100">
              Buka template →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
