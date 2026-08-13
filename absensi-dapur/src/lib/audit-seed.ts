// Seed pertanyaan acuan per area audit dapur — dipakai form observasi supaya
// auditor tinggal centang. Angka & susunan mengikuti FITUR-AUDIT-DAPUR.md.

export const AUDIT_AREA_SEED = {
  penerimaan: {
    label: "Penerimaan Bahan",
    pertanyaan: [
      "Bahan datang tepat waktu?",
      "Bahan datang dari supplier yang benar?",
      "Jumlah sesuai PO?",
      "Kondisi bahan baik (tidak rusak)?",
      "Ada bahan yang kurang?",
      "Bahan sesuai spesifikasi pesanan?",
      "Proses pengecekan dilakukan?",
      "Bahan langsung dipindahkan ke penyimpanan?",
      "Tidak terjadi penumpukan di area penerimaan?",
      "Tidak ada bahan yang terlalu lama di area penerimaan?",
    ],
  },
  penyimpanan: {
    label: "Penyimpanan Bahan",
    pertanyaan: [
      "Bahan ditata rapi & dikelompokkan?",
      "Bahan mudah rusak dipisahkan?",
      "Bahan diberi label?",
      "Tanggal penerimaan terlihat?",
      "Sistem FIFO/FEFO diterapkan?",
      "Bahan tidak langsung diletakkan di lantai (pakai pallet/rak)?",
      "Tempat penyimpanan tidak overpack?",
      "Tidak ada bahan yang berpotensi rusak?",
      "Semua bahan berada di tempat yang sesuai?",
      "Area penyimpanan bersih?",
    ],
  },
  persiapan: {
    label: "Persiapan (Prep)",
    pertanyaan: [
      "Preparation dimulai sesuai jadwal?",
      "Tenaga kerja cukup?",
      "Tidak terjadi antrian di alat?",
      "Tidak ada bahan menumpuk?",
      "Proses berjalan sesuai urutan?",
      "Tidak ada pekerjaan yang menunggu pekerjaan lain?",
      "Tidak terjadi pekerjaan berulang?",
      "Tidak ada bahan terbuang?",
      "Area kerja tidak terlalu padat?",
      "Pembagian tugas jelas?",
    ],
  },
  pengolahan: {
    label: "Pengolahan (Cooking)",
    pertanyaan: [
      "Pengolahan dimulai tepat waktu?",
      "Proses sesuai jadwal produksi?",
      "Tidak ada keterlambatan?",
      "Sesuai prosedur/resep standar?",
      "Tidak terjadi antrian?",
      "Tidak ada bahan tertinggal?",
      "Tidak ada proses yang harus diulang?",
      "Tidak terjadi pemborosan?",
      "Alat berfungsi normal (tidak ada masalah)?",
      "Proses tidak berhenti di tengah?",
    ],
  },
  pemorsian: {
    label: "Pemorsian",
    pertanyaan: [
      "Pembagian porsi konsisten?",
      "Tidak ada perbedaan jumlah antar porsi?",
      "Proses berjalan lancar?",
      "Tidak terjadi antrian?",
      "Tidak ada makanan tercecer?",
      "Tidak ada produk yang harus diperbaiki?",
      "Tidak ada porsi kurang?",
      "Tidak ada porsi berlebihan?",
      "Target jumlah tercapai?",
      "Gramasi sesuai standar (catat aktual)?",
    ],
  },
  distribusi: {
    label: "Distribusi",
    pertanyaan: [
      "Loading ompreng mulai tepat waktu?",
      "Makanan selesai dimuat sesuai jadwal?",
      "Tidak ada antrean kendaraan?",
      "Jumlah makanan sesuai manifest?",
      "Tidak ada keterlambatan?",
      "Tidak ada perubahan jumlah dadakan?",
      "Tidak ada makanan tertinggal?",
      "Dokumen distribusi (BAST/Surat Jalan) tersedia & lengkap?",
      "Proses sesuai jadwal jam kirim?",
    ],
  },
  higiene: {
    label: "Kebersihan & Higiene",
    pertanyaan: [
      "APD dipakai lengkap (celemek, sarung tangan bila perlu)?",
      "Pakaian kerja bersih?",
      "Penutup kepala dipakai?",
      "Masker dipakai (jika diwajibkan)?",
      "Kebiasaan cuci tangan terlihat?",
      "Tidak menyentuh benda lain saat menangani makanan?",
      "Lantai bersih?",
      "Meja bersih?",
      "Dinding & area preparation bersih?",
      "Area cooking, packing, penyimpanan bersih?",
      "Tempat sampah tidak overflow?",
      "Area cuci bersih?",
      "Alur bersih–kotor tidak silang?",
    ],
  },
  sdm_relawan: {
    label: "SDM Relawan",
    pertanyaan: [
      "Jumlah relawan sesuai kebutuhan?",
      "Pembagian tugas jelas?",
      "Tidak ada relawan yang overload?",
      "Tidak ada relawan yang menganggur?",
      "Setiap pekerjaan punya PIC?",
      "Tidak terjadi saling menunggu?",
      "Tidak terjadi miskomunikasi?",
      "Tidak terjadi pekerjaan ganda?",
      "Tidak ada konflik pembagian tugas?",
      "Tidak ada relawan berpindah-pindah tugas berlebihan?",
      "Tidak ada bottleneck pada 1 pekerjaan?",
    ],
  },
  sdm_staf: {
    label: "SDM Staf",
    pertanyaan: [
      "Staf menjalankan SOP?",
      "Staf melakukan koordinasi antar bagian?",
      "Pembagian pekerjaan berjalan?",
      "Instruksi ke relawan jelas?",
      "Tidak terjadi miskomunikasi?",
      "Keputusan operasional tidak terlambat?",
      "Semua pekerjaan punya PIC?",
      "Tidak ada pekerjaan berulang?",
      "Tidak ada masalah koordinasi antar bagian?",
    ],
  },
  supplier: {
    label: "Supplier",
    pertanyaan: [
      "Pengiriman tepat waktu?",
      "Barang sesuai pesanan?",
      "Kualitas bahan baik?",
      "Jumlah bahan sesuai?",
      "Dokumen lengkap (surat jalan, invoice)?",
      "Ketepatan spesifikasi?",
      "Konsistensi kualitas dari pengiriman sebelumnya?",
      "Tidak ada keterlambatan?",
      "Tidak ada retur?",
      "Tidak ada komplain?",
      "Tidak ada ketidaksesuaian PO vs barang datang?",
    ],
  },
} as const;

export type AreaKey = keyof typeof AUDIT_AREA_SEED;

/** Urutan area yang dipakai untuk render kartu observasi & timeline. */
export const AREA_KEYS = Object.keys(AUDIT_AREA_SEED) as AreaKey[];

/** Label ramah untuk sebuah area (fallback ke key kalau tidak dikenal). */
export function areaLabel(area: string): string {
  return (AUDIT_AREA_SEED as Record<string, { label: string } | undefined>)[area]?.label ?? area;
}
