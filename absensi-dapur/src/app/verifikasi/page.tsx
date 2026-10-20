import Link from "next/link";
import { verifyTteToken } from "@/lib/tte";

export const dynamic = "force-dynamic";

function waktu(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }) + " WIB";
}

/**
 * Verifikasi keaslian tanda tangan elektronik dokumen cetak (dibuka dari QR).
 * Memeriksa tanda tangan HMAC token — bila valid, data dipastikan asli & tak
 * diubah. TTE self-hosted (sah sebagai alat bukti UU ITE, belum tersertifikasi).
 */
export default async function VerifikasiPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const p = t ? verifyTteToken(t) : null;

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-1 bg-gradient-to-r from-emas-500 via-gold-500 to-emas-500" />
      <div className="card w-full max-w-md p-6 sm:p-8">
        <div className="text-center">
          <span
            className={
              "inline-grid h-14 w-14 place-items-center rounded-full text-3xl " +
              (p ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400")
            }
          >
            {p ? "✓" : "✕"}
          </span>
          <h1 className="mt-3 text-xl font-bold">
            {p ? "Dokumen Terverifikasi" : "Tidak Terverifikasi"}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {p
              ? "Tanda tangan elektronik valid — dokumen asli & tidak diubah."
              : "Tautan/QR tidak valid atau telah diubah."}
          </p>
        </div>

        {p && (
          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <Baris label="Unit" value={p.u || "—"} />
              <Baris label="Dokumen" value={p.j || "—"} />
              <Baris label="Waktu TTE" value={waktu(p.w)} />
            </div>
            <p className="text-center text-[11px] text-slate-500">
              Ditandatangani secara elektronik melalui sistem Absensi MBG. Sah sebagai alat bukti
              sesuai UU ITE (belum tersertifikasi BSrE/PSrE).
            </p>
          </div>
        )}

        <Link href="/" className="mt-6 block text-center text-xs text-slate-500 hover:text-slate-300">
          ← Beranda
        </Link>
      </div>
    </main>
  );
}

function Baris({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 py-1.5 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-100">{value}</span>
    </div>
  );
}
