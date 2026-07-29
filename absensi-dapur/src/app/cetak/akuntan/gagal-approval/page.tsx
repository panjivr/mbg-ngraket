import { Ed, Tgl, TTD, TabelEditable, PrintFrame } from "../_components";
import { getTemplate } from "@/lib/akuntan";

const t = getTemplate("gagal-approval")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} nomor={t.nomor} slug={t.slug} judul={t.judul}>
      <p className="text-justify">
        Pada hari ini <Tgl mode="hari" /> tanggal <Tgl mode="tanggal" /> bertempat di
        SPPG Ngraket Balong Ponorogo, telah dilakukan proses pemeriksaan dan
        pengajuan persetujuan (approval) atas pembayaran dengan rincian sebagai
        berikut:
      </p>

      <div className="mt-3">
        <TabelEditable
          headers={[
            "No",
            "Uraian",
            "Nama Penerima",
            "No. Rekening",
            "Bank",
            "Jumlah",
          ]}
          baris={3}
        />
      </div>

      <p className="mt-3 text-justify">
        Adapun proses approval tersebut gagal dilakukan sehingga pembayaran belum
        dapat diproses. Sehubungan dengan hal tersebut, akan dilakukan proses ulang
        (re-approval) agar pembayaran dapat diselesaikan sesuai ketentuan.
      </p>
      <p className="mt-2 text-justify">
        Demikian berita acara ini dibuat dengan sebenar-benarnya untuk dapat
        digunakan sebagaimana mestinya.
      </p>

      <p className="mt-4 text-right">
        Ponorogo, <Tgl mode="tanggal" />
      </p>

      <TTD
        kiri={{ peran: "Kepala SPPG", nama: "(Abdulah Indriawan, S.Sos)" }}
        kanan={{
          peran: "Staf Pengawas Keuangan SPPG",
          nama: "(Dyah Ayu Widyawati, S.E)",
        }}
      />

      <div className="mt-6 text-center text-sm">
        <p className="whitespace-pre-line">
          <Ed>{"Mengetahui,\nYayasan"}</Ed>
        </p>
        <div className="h-16" />
        <p className="font-bold underline">
          <Ed>(………………………………)</Ed>
        </p>
        <p>
          <Ed>Ketua / yang Mewakili</Ed>
        </p>
      </div>
    </PrintFrame>
  );
}
