import { getSession } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { sppgKopLine } from "@/lib/ahli-gizi";

/**
 * Kop resmi BGN untuk SEMUA dokumen Ahli Gizi (tanpa nomor surat).
 * Nama SPPG & alamat diambil otomatis dari konfigurasi dapur yang sedang login,
 * lalu judul dokumen ditampilkan di tengah, di bawah garis kop.
 *
 * Server Component (async) — bisa dirender sebagai child dari PrintFrame (client).
 */
export async function KopGizi({ heading }: { heading: string }) {
  const session = await getSession();
  const sppg = session?.sppg_id ? await getSppg(session.sppg_id) : null;
  const namaSppg = sppgKopLine(sppg?.nama);
  const alamat = sppg?.alamat?.trim() || "";

  return (
    <div>
      {/* Kop lembaga: logo kiri + identitas melebar ke samping (bukan menumpuk di tengah) */}
      <div className="pb-1">
        <div className="flex items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/bgn-logo.webp"
            alt="Logo BGN"
            className="h-20 w-20 shrink-0 object-contain"
          />
          <div className="flex-1 text-center leading-snug">
            <p className="text-[20px] font-bold uppercase tracking-[0.18em]">
              Badan Gizi Nasional
            </p>
            <p className="text-[12px] italic tracking-wide">(National Nutrition Agency)</p>
            <p className="text-[15px] font-semibold uppercase tracking-[0.12em]">
              Satuan Pelayanan Pemenuhan Gizi
            </p>
            <p className="text-[15px] font-semibold uppercase tracking-[0.12em]">{namaSppg}</p>
            {alamat && <p className="mt-0.5 text-[11px] tracking-wide text-gray-700">{alamat}</p>}
          </div>
          {/* penyeimbang lebar logo agar teks tetap center terhadap halaman */}
          <div className="h-20 w-20 shrink-0" aria-hidden />
        </div>
        <div className="mt-3 border-b-4 border-black" />
      </div>

      {/* Judul dokumen di tengah, di bawah garis kop */}
      <p className="mt-3 text-center text-[15px] font-bold uppercase leading-snug">
        {heading}
      </p>
    </div>
  );
}
