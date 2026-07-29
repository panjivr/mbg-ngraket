import { Tgl, TTD, PrintFrame } from "../_components";
import { LemburPicker } from "../LemburPicker";
import { getTemplate } from "@/lib/akuntan";

const t = getTemplate("lembur-karyawan")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} nomor={t.nomor} slug={t.slug} judul={t.judul}>
      <p className="text-justify">
        Pada hari <Tgl mode="hari" />, <Tgl mode="tanggal" /> menyatakan bahwa
        karyawan berikut telah melaksanakan lembur kerja guna menyelesaikan
        pekerjaan yang belum selesai di luar jam kerja.
      </p>

      <div className="mt-3">
        <LemburPicker />
      </div>

      <p className="mt-4 text-justify">
        Demikian berita acara lembur ini dibuat, agar dipertanggungjawabkan /
        dipergunakan dengan sebaik mungkin. Terimakasih atas kerjasamanya.
      </p>

      <p className="mt-4 text-right">
        Ponorogo, <Tgl mode="tanggal" />
      </p>

      <TTD
        kiri={{ peran: "Mengetahui,\nKepala SPPG", nama: "(Abdulah Indriawan, S.Sos)" }}
        kanan={{
          peran: "Penanggung jawab,\nPengawas Keuangan SPPG",
          nama: "(Dyah Ayu Widyawati, S.E)",
        }}
      />
    </PrintFrame>
  );
}
