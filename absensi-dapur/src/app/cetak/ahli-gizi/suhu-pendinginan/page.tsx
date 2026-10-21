import { PrintFrame, Ed } from "../../akuntan/_components";
import { getTemplateGizi } from "@/lib/ahli-gizi";
import { KopGizi } from "../_kop";
import { TabelSuhuPendinginan } from "./TabelSuhuPendinginan";

const t = getTemplateGizi("suhu-pendinginan")!;

/** Satu kolom tanda tangan (replika kotak "Nama / Paraf / Tanggal" di formulir). */
function KolomTtd({ peran }: { peran: string }) {
  return (
    <td className="border border-black align-top">
      <div className="px-2 py-1.5 text-center text-[12px] font-bold">{peran}</div>
      <div className="h-24 border-t border-black" />
      <div className="border-t border-black px-2 py-1 text-center text-[11px]">
        Nama / Paraf / Tanggal
      </div>
    </td>
  );
}

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
      <KopGizi heading={t.heading} />

      {/* Identitas formulir */}
      <table className="mt-4 w-full max-w-md border-collapse text-[12px]">
        <tbody>
          {[
            "Nama SPPG",
            "Tanggal Produksi",
            "Petugas",
            "Verifikator",
          ].map((label) => (
            <tr key={label}>
              <td className="w-44 border border-black px-2 py-1 font-semibold">
                {label}
              </td>
              <td className="border border-black px-2 py-1">
                : <Ed>&nbsp;</Ed>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 text-justify text-[11px] leading-relaxed">
        <b>Petunjuk pengisian:</b> Catat setiap tahap pengolahan secara terpisah.
        Satu baris = satu komponen menu dalam satu tahap. Suhu dicatat menggunakan
        termometer probe yang telah dikalibrasi. &ldquo;Waktu mulai <i>resting</i>&rdquo;
        adalah saat makanan selesai dimasak dan dipindahkan ke wadah <i>resting</i>;
        &ldquo;waktu selesai <i>resting</i>&rdquo; adalah saat komponen siap dilakukan
        pemorsian.
      </p>

      <div className="mt-3">
        <TabelSuhuPendinginan />
      </div>

      <p className="mt-3 text-justify text-[11px] leading-relaxed">
        <b>Catatan penting:</b> Formulir ini merekam proses per tahap. Nomor tahap
        harus konsisten dengan identifikasi tahap pada proses memasak, pemorsian,
        dan pencatatan penyaluran agar keterlacakan (<i>traceability</i>) terjaga.
      </p>

      {/* Tanda tangan 3 kolom: Jurutama Masak · Ahli Gizi · Kepala SPPG / Verifikator */}
      <table className="mt-5 w-full max-w-2xl border-collapse">
        <tbody>
          <tr>
            <KolomTtd peran="Jurutama Masak" />
            <KolomTtd peran="Ahli Gizi" />
            <KolomTtd peran="Kepala SPPG / Verifikator" />
          </tr>
        </tbody>
      </table>
    </PrintFrame>
  );
}
