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
      {/* Kop lembaga: logo kiri + identitas di tengah */}
      <div className="relative pb-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/bgn-logo.webp"
          alt="Logo BGN"
          className="absolute left-0 top-1/2 h-20 w-20 -translate-y-1/2 object-contain"
        />
        <div className="px-24 text-center leading-snug">
          <p className="text-[17px] font-bold uppercase tracking-wide">
            Badan Gizi Nasional
          </p>
          <p className="text-[12px] italic">(National Nutrition Agency)</p>
          <p className="text-[13px] font-semibold uppercase">
            Satuan Pelayanan Pemenuhan Gizi
          </p>
          <p className="text-[13px] font-semibold uppercase">{namaSppg}</p>
          {alamat && <p className="text-[11px] text-gray-700">{alamat}</p>}
        </div>
        <div className="mt-4 border-b-4 border-black" />
      </div>

      {/* Judul dokumen di tengah, di bawah garis kop */}
      <p className="mt-3 text-center text-[15px] font-bold uppercase leading-snug">
        {heading}
      </p>
    </div>
  );
}
