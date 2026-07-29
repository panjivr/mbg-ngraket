import { Ed, TTD, TabelEditable, PrintFrame } from "../_components";
import { getTemplate } from "@/lib/akuntan";

const t = getTemplate("servis-peralatan")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} nomor={t.nomor}>
      <p className="text-justify">
        Pada hari ini <Ed>Kamis</Ed>, tanggal <Ed>23 Juli 2026</Ed>, telah
        dilaksanakan pekerjaan servis dan perbaikan peralatan di SPPG Ponorogo
        Balong Ngraket.
      </p>
      <p className="mt-2 text-justify">
        Kegiatan servis dilakukan untuk menjaga kondisi dan fungsi peralatan
        operasional agar tetap berjalan dengan baik. Adapun rincian pekerjaan yang
        telah dilakukan adalah sebagai berikut:
      </p>

      <div className="mt-3">
        <TabelEditable
          headers={["No", "Jenis Pekerjaan", "Biaya"]}
          baris={3}
          lastRowLabel="TOTAL"
        />
      </div>

      <p className="mt-3 text-justify">
        Total biaya pekerjaan servis dan perbaikan sebesar Rp<Ed>180.000</Ed> (
        <Ed>seratus delapan puluh ribu rupiah</Ed>).
      </p>
      <p className="mt-2 text-justify">
        Pekerjaan telah selesai dilaksanakan dengan baik sesuai kebutuhan perbaikan
        yang dilakukan. Dokumentasi foto selama proses pengerjaan dan invoice
        pembayaran terlampir sebagai bukti pelaksanaan kegiatan.
      </p>
      <p className="mt-2 text-justify">
        Demikian berita acara ini dibuat dengan sebenar-benarnya untuk dapat
        digunakan sebagaimana mestinya.
      </p>

      <p className="mt-4 text-right">
        Ponorogo, <Ed>23 Juli 2026</Ed>
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
