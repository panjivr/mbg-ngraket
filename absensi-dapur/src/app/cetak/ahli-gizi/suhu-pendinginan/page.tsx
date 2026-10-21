import { PrintFrame, Ed } from "../../akuntan/_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";
import { TabelSuhuPendinginan } from "./TabelSuhuPendinginan";

const t = getTemplateGizi("suhu-pendinginan")!;

/**
 * Replika persis FORMULIR PENCATATAN SUHU DAN WAKTU PENDINGINAN MAKANAN
 * (A4 mendatar, Arial, tanpa kop). Ukuran baris/kolom dalam mm mengikuti
 * hasil pengukuran PDF asli supaya hasil cetak identik dan muat satu halaman.
 */
export default function Page() {
  return (
    <PrintFrame
      saveUrl="/api/admin/ahli-gizi/dok"
      heading={t.heading}
      slug={t.slug}
      judul={t.judul}
      landscape
      hideKop
    >
      {/* Saat cetak: tanpa padding atas/bawah lembar (sisi kiri-kanan tetap 5mm
          pengaman printer → total ±15mm seperti aslinya) agar muat 1 halaman. */}
      <style>
        {
          "@media print{.sheet.sheet.sheet{padding-top:0!important;padding-bottom:0!important}}"
        }
      </style>
      <div
        className="text-black"
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        <p className="text-center text-[16pt] font-bold leading-tight">
          {t.heading}
        </p>

        {/* Identitas formulir (kotak selebar halaman) */}
        <table className="mt-[2.5mm] w-full table-fixed border-collapse text-[9.5pt] font-bold">
          <colgroup>
            <col style={{ width: "15.6%" }} />
            <col />
          </colgroup>
          <tbody>
            {["Nama SPPG", "Tanggal Produksi", "Petugas", "Verifikator"].map(
              (label) => (
                <tr key={label} className="h-[7.6mm]">
                  <td className="border border-black px-[1.5mm] align-middle">
                    {label}
                  </td>
                  <td className="border border-black px-[1.5mm] align-middle">
                    : <Ed>&nbsp;</Ed>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>

        <p className="mt-[1.5mm] text-justify text-[8.5pt] font-bold leading-[1.4]">
          Petunjuk pengisian: Catat setiap tahap pengolahan secara terpisah.
          Satu baris = satu komponen menu dalam satu tahap. Suhu dicatat
          menggunakan termometer probe yang telah dikalibrasi. &quot;Waktu mulai{" "}
          <i>resting</i>&quot; adalah saat makanan selesai dimasak dan
          dipindahkan ke wadah <i>resting</i>; &quot;waktu selesai{" "}
          <i>resting</i>&quot; adalah saat komponen siap dilakukan pemorsian.
        </p>

        <div className="mt-[4mm]">
          <TabelSuhuPendinginan />
        </div>

        <p className="mt-[2.5mm] text-justify text-[8.5pt] font-bold leading-[1.4]">
          Catatan penting: Formulir ini merekam proses per tahap. Nomor tahap
          harus konsisten dengan identifikasi tahap pada proses memasak,
          pemorsian, dan pencatatan penyaluran agar keterlacakan (
          <i>traceability</i>) terjaga.
        </p>

        {/* Tanda tangan: 3 kolom sama lebar, ±46,5% lebar tabel. Lebar diatur di
            pembungkus karena CSS cetak global memaksa setiap <table> 100%. */}
        <div className="ml-[2.3%] mt-[2.5mm] w-[46.5%]">
          <table className="w-full table-fixed border-collapse text-center font-bold">
            <tbody>
              <tr className="h-[7.6mm] text-[8.5pt] leading-tight">
                {[
                  "Jurutama Masak",
                  "Ahli Gizi",
                  "Kepala SPPG / Verifikator",
                ].map((p) => (
                  <td
                    key={p}
                    className="border border-black px-[1mm] align-middle"
                  >
                    {p}
                  </td>
                ))}
              </tr>
              <tr className="h-[19mm]">
                {[0, 1, 2].map((i) => (
                  <td
                    key={i}
                    className="border border-black px-[3mm] pb-[3.4mm] align-bottom"
                  >
                    <div className="border-b border-black" />
                  </td>
                ))}
              </tr>
              <tr className="h-[7.6mm] text-[8.5pt] leading-tight">
                {[0, 1, 2].map((i) => (
                  <td
                    key={i}
                    className="border border-black px-[1mm] align-middle"
                  >
                    Nama / Paraf / Tanggal
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </PrintFrame>
  );
}
