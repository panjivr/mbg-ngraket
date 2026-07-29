import { Ed, Tgl, TTD, TabelEditable, PrintFrame } from "../_components";
import { getTemplate } from "@/lib/akuntan";

const t = getTemplate("tambahan-bahan-baku")!;

export default function Page() {
  return (
    <PrintFrame heading={t.heading} nomor={t.nomor} slug={t.slug} judul={t.judul}>
      <p className="text-justify">
        Pada hari ini, <Tgl mode="hari" /> tanggal <Tgl mode="tgl" /> bulan{" "}
        <Tgl mode="bulan" /> tahun <Tgl mode="tahun" />, bertempat di SPPG Ngraket
        Balong, telah dilakukan penambahan
        pembelian bahan baku di luar Purchase Order (PO) Supplier.
      </p>

      <p className="mt-3 font-bold">I. Pihak yang Terlibat</p>
      <p>Nama : <Ed>Abdulah Indriawan, S.Sos</Ed>&nbsp; (Penanggung Jawab SPPG)</p>
      <p>Nama : <Ed>Dyah Ayu Widyawati, S.E</Ed>&nbsp; (Staf Pengawas Keuangan)</p>

      <p className="mt-3 font-bold">II. Dasar Permasalahan</p>
      <p className="text-justify">
        Dalam pelaksanaan operasional SPPG Ngraket Balong Ponorogo, terjadi
        kekurangan bahan baku yang disebabkan oleh ketidaksesuaian antara kebutuhan
        aktual produksi dengan estimasi pada Purchase Order (PO).
      </p>

      <p className="mt-3 font-bold">III. Pembelian Bahan Baku</p>
      <p className="text-justify">
        Sehubungan dengan kebutuhan mendesak tersebut, telah dilakukan penambahan
        pembelian bahan baku sebagai berikut:
      </p>
      <p className="mt-2">Rincian Barang:</p>
      <div className="mt-1">
        <TabelEditable
          headers={["No", "Nama Barang", "Jumlah", "Harga (Rp)", "Satuan", "Total (Rp)"]}
          baris={3}
        />
      </div>

      <p className="mt-3 font-bold">IV. Keputusan</p>
      <p>Berdasarkan kondisi tersebut, disepakati bahwa:</p>
      <ol className="ml-6 list-decimal text-justify">
        <li>Dilakukan pembelian bahan baku tambahan di luar Purchase Order (PO) utama.</li>
        <li>Pembelian tambahan dilakukan menggunakan dana petty cash SPPG Ngraket Balong.</li>
        <li>Pembelian hanya dilakukan untuk bahan baku yang bersifat mendesak dan menunjang kelancaran operasional.</li>
        <li>Seluruh transaksi wajib dicatat dan dipertanggungjawabkan sesuai prosedur administrasi keuangan yang berlaku.</li>
      </ol>

      <p className="mt-3 font-bold">V. Penutup</p>
      <p className="text-justify">
        Demikian berita acara ini dibuat dengan sebenar-benarnya untuk dapat
        digunakan sebagaimana mestinya dan sebagai bentuk pertanggungjawaban
        administrasi di lingkungan SPPG Ngraket Balong.
      </p>

      <p className="mt-4 text-right">
        Ponorogo, <Tgl mode="tanggal" />
      </p>

      <TTD
        kiri={{
          peran: "Penanggung jawab,\nPengawas Keuangan SPPG",
          nama: "(Dyah Ayu Widyawati, S.E)",
        }}
        kanan={{ peran: "Mengetahui,\nKepala SPPG", nama: "(Abdulah Indriawan, S.Sos)" }}
      />
    </PrintFrame>
  );
}
