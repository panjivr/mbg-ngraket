import Link from "next/link";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface DokRow {
  id: string;
  signer_nama: string | null;
  peran: string | null;
  unit: string;
  jenis: string;
  waktu: string | null;
  konten: string;
  created_at: string;
}

function waktuFmt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }) + " WIB";
}

/**
 * Verifikasi keaslian dokumen ber-tanda tangan elektronik (dibuka dari QR).
 * Menampilkan metadata + ISI dokumen yang disimpan saat ditandatangani, jadi
 * hasil scan sesuai dengan berkas yang sebenarnya. TTE self-hosted (sah sebagai
 * alat bukti UU ITE, belum tersertifikasi).
 */
export default async function VerifikasiPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  let dok: DokRow | null = null;
  if (id && /^[A-Z2-9]{12}$/.test(id)) {
    dok = (
      await query<DokRow>(
        `SELECT id, signer_nama, peran, unit, jenis, waktu::text, konten, created_at::text
           FROM tte_dokumen WHERE id = $1`,
        [id],
      )
    )[0] || null;
  }

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4 py-8">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-1 bg-gradient-to-r from-emas-500 via-gold-500 to-emas-500" />
      <div className="card p-6 sm:p-8">
        <div className="text-center">
          <span
            className={
              "inline-grid h-14 w-14 place-items-center rounded-full text-3xl " +
              (dok ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400")
            }
          >
            {dok ? "✓" : "✕"}
          </span>
          <h1 className="mt-3 text-xl font-bold">
            {dok ? "Dokumen Terverifikasi" : "Dokumen Tidak Ditemukan"}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {dok
              ? "Tanda tangan elektronik valid. Isi dokumen yang ditandatangani tampil di bawah."
              : "Kode/QR tidak valid atau dokumen sudah tidak tersedia."}
          </p>
        </div>

        {dok && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <Baris label="Unit" value={dok.unit || "—"} />
              <Baris label="Jenis dokumen" value={dok.jenis || "—"} />
              <Baris label="Ditandatangani oleh" value={dok.signer_nama || "—"} />
              {dok.peran && <Baris label="Jabatan" value={dok.peran} />}
              <Baris label="Waktu TTE" value={waktuFmt(dok.waktu)} />
              <Baris label="Kode TTE" value={dok.id} />
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Isi Dokumen</p>
              <pre className="max-h-[60dvh] overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs leading-relaxed text-slate-200">
                {dok.konten || "(kosong)"}
              </pre>
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
      <span className="shrink-0 text-xs text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-100">{value}</span>
    </div>
  );
}
