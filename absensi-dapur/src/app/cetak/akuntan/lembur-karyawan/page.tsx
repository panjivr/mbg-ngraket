import { Ed, TTD, TabelEditable, PrintFrame } from "../_components";
import { getTemplate } from "@/lib/akuntan";

const t = getTemplate("lembur-karyawan")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} nomor={t.nomor}>
      <p className="text-justify">
        Pada hari <Ed>Senin</Ed>, <Ed>27 Juli 2026</Ed> menyatakan bahwa karyawan
        berikut telah melaksanakan lembur kerja guna menyelesaikan pekerjaan yang
        belum selesai di luar jam kerja.
      </p>

      <div className="mt-3">
        <TabelEditable headers={["NAMA", "JABATAN"]} autoNo={false} baris={8} />
      </div>

      <p className="mt-4 text-justify">
        Demikian berita acara lembur ini dibuat, agar dipertanggungjawabkan /
        dipergunakan dengan sebaik mungkin. Terimakasih atas kerjasamanya.
      </p>

      <p className="mt-4 text-right">
        Ponorogo, <Ed>27 Juli 2026</Ed>
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
