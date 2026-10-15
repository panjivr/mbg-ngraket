import Link from "next/link";
import { verifySlipToken } from "@/lib/slip-verify";

export const dynamic = "force-dynamic";

function rupiah(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}
function tgl(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y) return "—";
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}
function waktu(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * Halaman verifikasi keaslian slip gaji (publik). Dibuka dari QR tanda tangan
 * elektronik pada slip. Memeriksa tanda tangan HMAC token — bila valid, isi slip
 * dipastikan asli & tidak diubah. Tidak menampilkan rincian sensitif di luar yang
 * sudah ada pada slip itu sendiri.
 */
export default async function VerifikasiSlipPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const payload = t ? verifySlipToken(t) : null;

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-1 bg-gradient-to-r from-emas-500 via-gold-500 to-emas-500" />
      <div className="card w-full max-w-md p-6 sm:p-8">
        <div className="text-center">
          <span
            className={
              "inline-grid h-14 w-14 place-items-center rounded-full text-3xl " +
              (payload ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400")
            }
          >
            {payload ? "✓" : "✕"}
          </span>
          <h1 className="mt-3 text-xl font-bold">
            {payload ? "Slip Gaji Terverifikasi" : "Slip Tidak Terverifikasi"}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {payload
              ? "Tanda tangan elektronik valid — isi di bawah dipastikan asli dan tidak diubah."
              : "Tautan/QR tidak valid atau telah diubah. Jangan pakai slip ini sebagai acuan."}
          </p>
        </div>

        {payload && (
          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <Baris label="Unit" value={payload.u || "—"} />
              <Baris label="Nama" value={payload.n} />
              <Baris label="Jabatan" value={payload.j || "—"} />
              <Baris label="Periode" value={`${tgl(payload.pf)} – ${tgl(payload.pt)}`} />
              <Baris label="Total diterima" value={rupiah(payload.tot)} strong />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <StatusTtd
                judul="Diterima karyawan"
                ok={!!payload.emp}
                detail={payload.emp ? waktu(payload.emp) : "Belum ditandatangani"}
              />
              <StatusTtd
                judul="Disahkan HR"
                ok={!!payload.hrt}
                detail={payload.hrt ? `${payload.hr || "HR"} · ${waktu(payload.hrt)}` : "Belum disahkan"}
              />
            </div>

            <p className="text-center text-[11px] text-slate-500">
              Diverifikasi {waktu(new Date(payload.iss).toISOString())}
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

function Baris({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 py-1.5 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={"text-right text-sm " + (strong ? "font-bold text-emerald-300" : "font-medium text-slate-100")}>
        {value}
      </span>
    </div>
  );
}

function StatusTtd({ judul, ok, detail }: { judul: string; ok: boolean; detail: string }) {
  return (
    <div className={"rounded-xl border p-3 " + (ok ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/10 bg-white/[0.03]")}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
        <span className={ok ? "text-emerald-400" : "text-slate-500"}>{ok ? "✔" : "○"}</span>
        {judul}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-400">{detail}</p>
    </div>
  );
}
