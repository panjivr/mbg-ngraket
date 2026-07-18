import type { SopSeed } from "@/lib/sop-types";

// Data seed SOP hasil transkripsi dokumen resmi
// "Standar Operasional Prosedur (SOP) SPPG Ngraket".
// Setiap entri mewakili satu divisi/peran beserta langkah kerjanya.
export const SOP_SEED: SopSeed[] = [
  {
    kode: "1",
    judul: "Keamanan & Teknis",
    kategori: "K3 (Keselamatan Kerja)",
    tujuan:
      "Menjaga keamanan, ketertiban, dan kelancaran teknis operasional SPPG serta memastikan seluruh fasilitas, energi, dan keselamatan kerja terjaga dengan baik.",
    ruang_lingkup:
      "Seluruh area dan fasilitas SPPG, meliputi kelistrikan, ketersediaan energi & air, keamanan fisik, penanganan tamu, mitigasi kebakaran, dan pembelian keperluan mendesak dapur.",
    penanggung_jawab: "Petugas Keamanan & Teknis",
    prosedur: `1. Mencari atau membelikan barang dan keperluan mendesak dapur secara cepat, seperti plastik, tali, atau kekurangan buah saat akan dilakukan distribusi.
2. Penanganan Fasilitas: Menjaga seluruh fasilitas dan aset yang ada di SPPG.
3. Manajemen Tamu: Mendata setiap tamu yang berkunjung ke SPPG ke dalam buku tamu.
4. Respon Teknis: Memberikan servis atau perbaikan cepat jika terdapat kendala teknis di area dapur.
5. Kontrol Energi & Air: Memastikan stok gas, ketersediaan air, dan aliran listrik terjaga dengan baik untuk operasional.
6. Otomasi Kelistrikan: Bertanggung jawab penuh untuk menyalakan dan mematikan seluruh alat listrik yang ada di lingkungan SPPG.
7. Ketertiban Tim: Menjaga hubungan yang harmonis antar tim maupun anggota serta memastikan tidak ada pengelompokan (geng).
8. Kepatuhan Atribut: Wajib memakai perlengkapan kerja sesuai dengan standar SOP ketika berada di area dapur.
9. Mitigasi Kebakaran: Pengecekan rutin masa berlaku APAR (Alat Pemadam Api Ringan) karena risiko tinggi di area dapur.
10. Keamanan Fisik: Memastikan seluruh pintu, jendela, dan pagar terkunci rapat setelah jam operasional selesai.
11. Keselamatan Kerja (K3): Mengawasi area yang berisiko (seperti kabel terkelupas atau lantai licin) agar segera diperbaiki sebelum terjadi kecelakaan.
12. Membuat laporan atau nota pertanggungjawaban setiap kali melakukan pembelian barang mendesak (seperti plastik/buah tadi) agar keuangan tetap sinkron dengan bagian Akuntansi.`,
    referensi: "",
  },
  {
    kode: "2",
    judul: "Kebersihan dan Pelayanan Umum",
    kategori: "Higiene & Sanitasi",
    tujuan:
      "Menjaga kebersihan dan sanitasi seluruh area SPPG serta memberikan pelayanan umum guna menciptakan lingkungan kerja yang sehat dan bebas kontaminasi.",
    ruang_lingkup:
      "Seluruh ruang dan area dalam maupun luar SPPG, pengelolaan sampah, pengendalian hama, saluran pembuangan, alat kebersihan, dan pelayanan umum.",
    penanggung_jawab: "Petugas Kebersihan",
    prosedur: `1. Membersihkan titik detail setiap sudut ruang SPPG.
2. Memastikan sampah terbuang di TPA.
3. Membantu segala kebutuhan di SPPG (seperti membuat kopi/teh untuk tamu).
4. Menjaga hubungan harmonis antar tim (tidak ada geng).
5. Memakai perlengkapan kerja sesuai SOP ketika di dapur.
6. Melakukan pengecekan rutin dan memastikan tidak ada serangga, tikus, atau hama lain di lingkungan SPPG.
7. Membersihkan saluran pembuangan air dan bak kontrol (grease trap) agar tidak tersumbat dan menimbulkan bau.
8. Mengelola, membersihkan, dan menyimpan alat kebersihan (sapu, pel, kain lap) pada tempatnya agar tidak menjadi sumber kontaminasi.
9. Memastikan ketersediaan sabun cuci tangan, tisu, dan cairan disinfektan di area wastafel serta toilet.
10. Menjaga kebersihan area luar gedung agar tetap rapi dan mencerminkan lingkungan yang sehat.
11. Melaporkan kebutuhan sabun pel, kantong sampah, dan bahan pembersih lainnya kepada bagian Admin sebelum habis.
12. Memasang tanda peringatan (lantai basah) saat proses pembersihan dilakukan untuk menghindari kecelakaan kerja.`,
    referensi: "",
  },
  {
    kode: "3",
    judul: "Penerimaan & Admin",
    kategori: "Penerimaan & Penyimpanan",
    tujuan:
      "Memastikan penerimaan bahan baku berjalan tepat waktu sesuai kualitas dan kuantitas, serta menjaga tertib administrasi, dokumentasi, dan pengawasan seluruh divisi SPPG.",
    ruang_lingkup:
      "Proses penerimaan bahan baku, verifikasi dokumen pengiriman, pelabelan FIFO, administrasi logistik, absensi relawan, stok opname, dan koordinasi antar divisi.",
    penanggung_jawab: "Petugas Penerimaan & Admin",
    prosedur: `1. Ketepatan Waktu: Memastikan jam kedatangan bahan baku tepat waktu.
2. Kontrol Kualitas & Kuantitas: Memastikan kualitas dan kuantitas bahan baku yang datang terjaga dengan baik.
3. Pengawasan Kinerja: Memastikan kinerja setiap divisi di SPPG berjalan semestinya.
4. Penegakan Aturan: Menegakkan SOP di SPPG untuk semua divisi tanpa terkecuali.
5. Akurasi Produksi: Memastikan jumlah produksi dengan tepat sesuai kebutuhan.
6. Administrasi Logistik: Membuat draf penerimaan bahan baku sebagai bukti kontrol.
7. Manajemen SDM: Membuat absensi seluruh relawan di SPPG.
8. Kerapian Fasilitas: Memastikan seluruh alat dan fasilitas dikembalikan serta berada pada tempatnya.
9. Manajemen Alsintor: Memastikan fasilitas dan fungsi Alsintor (Alat Mesin Kantor) seperti tinta, kertas, dan lainnya terjaga serta tercukupi dengan baik.
10. Budaya Kerja: Menjaga hubungan yang harmonis antar tim maupun anggota dan menghindari adanya kubu-kubuan (geng).
11. Standar Atribut: Memakai perlengkapan kerja sesuai SOP ketika berada di area dapur.
12. Verifikasi Dokumen Pengiriman: Mencocokkan surat jalan dari supplier dengan pesanan (Pre-Order) sebelum menandatangani bukti terima.
13. Manajemen Label & Kadaluwarsa: Memberikan label tanggal terima pada bahan baku yang masuk (sistem FIFO - First In First Out) untuk menjaga kesegaran.
14. Arsip Dokumentasi: Mengarsipkan seluruh nota, surat jalan, dan laporan harian secara rapi agar mudah diakses saat audit keuangan.
15. Koordinasi Retur: Segera menghubungi supplier dan bagian keuangan jika ditemukan bahan baku yang tidak sesuai spesifikasi atau rusak saat penerimaan.
16. Laporan Inventaris Berkala: Melakukan stok opname (pengecekan jumlah fisik) alat dapur dan perlengkapan kantor secara rutin setiap minggu/bulan.
17. Komunikasi Antar Divisi: Menginformasikan kepada bagian Gizi dan Persiapan segera setelah bahan baku sampai agar proses pengolahan tidak tertunda.`,
    referensi: "Sistem FIFO (First In First Out); Surat Jalan; Pre-Order (PO)",
  },
  {
    kode: "4",
    judul: "Persiapan",
    kategori: "Pengolahan",
    tujuan:
      "Menyiapkan bahan baku secara bersih, higienis, dan sesuai standar gramasi agar siap diolah tepat waktu tanpa penumpukan kerja.",
    ruang_lingkup:
      "Proses persiapan bahan baku di ruang persiapan: pembersihan, pemotongan (mise en place), pencegahan kontaminasi silang, penyimpanan sementara, dan pengecekan kualitas.",
    penanggung_jawab: "Petugas Persiapan",
    prosedur: `1. Kesiapan Bahan: Mempersiapkan bahan baku agar siap diolah.
2. Kebersihan Ruang: Menjaga kebersihan di seluruh ruangan persiapan.
3. Higienitas Detail: Memastikan dengan sangat detail bahwa setiap bahan baku sudah bersih dan higienis.
4. Instruksi Kerja: Menerima tugas kerja langsung dari bagian Gizi.
5. Pelaporan Berkala: Memberikan laporan berkala kepada bagian Ahli Gizi mengenai progres persiapan.
6. Garis Komando: Bertanggung jawab penuh secara struktural kepada Ahli Gizi.
7. Budaya Kerja: Menjaga hubungan yang harmonis antar tim maupun anggota dan tidak membuat kelompok-kelompok (geng).
8. Atribut Kerja: Wajib memakai perlengkapan kerja sesuai SOP ketika berada di area dapur.
9. Teknik Pemotongan (Mise en Place): Memastikan bahan baku dipotong sesuai dengan standar gramasi dan jenis menu yang ditentukan oleh Ahli Gizi.
10. Pencegahan Kontaminasi Silang: Menggunakan talenan dan pisau yang berbeda untuk bahan mentah (seperti daging) dan bahan sayuran/buah.
11. Manajemen Waktu Persiapan: Memastikan seluruh bahan sudah siap 30 menit sebelum jadwal proses pengolahan dimulai agar tidak terjadi penumpukan kerja.
12. Penyimpanan Sementara: Menyimpan bahan yang sudah dibersihkan/dipotong ke dalam wadah tertutup atau chiller jika tidak langsung diolah.
13. Pengecekan Kualitas Akhir: Melaporkan segera kepada Ahli Gizi jika ditemukan bahan baku yang layu, busuk, atau tidak layak pakai saat proses pembersihan.
14. Efisiensi Bahan: Meminimalisir sisa kupasan atau potongan yang terbuang (waste management) untuk menjaga efisiensi biaya produksi.`,
    referensi: "",
  },
  {
    kode: "5",
    judul: "Pengolahan",
    kategori: "Pengolahan",
    tujuan:
      "Mengolah bahan baku menjadi masakan yang matang sempurna, berkualitas, dan aman konsumsi sesuai resep standar serta tepat waktu.",
    ruang_lingkup:
      "Proses memasak di ruang pengolahan: kontrol rasa dan kualitas, manajemen suhu dan kematangan, standar resep, food sampling, keamanan alat masak, dan penanganan masakan matang.",
    penanggung_jawab: "Juru Masak",
    prosedur: `1. Penerimaan Bahan Siap Olah: Menerima bahan baku yang sudah disiapkan dengan takaran dan jumlah yang tepat.
2. Kontrol Rasa & Kualitas: Memastikan rasa dan kualitas hasil olahan dengan baik tanpa merusak tekstur atau kandungan olahan tersebut.
3. Kebersihan Area: Menjaga kebersihan seluruh ruangan pengolahan dan alat kerja yang digunakan.
4. Manajemen Waktu: Memastikan waktu pengolahan dilakukan dengan tepat agar jadwal distribusi tidak terlambat.
5. Pelaporan: Memberikan laporan berkala mengenai proses memasak kepada bagian Ahli Gizi.
6. Garis Komando: Bertanggung jawab penuh secara langsung kepada Ahli Gizi.
7. Harmonisasi Tim: Menjaga hubungan yang harmonis antar tim maupun anggota dan tidak diperbolehkan ada pengelompokan (geng).
8. Atribut Kerja: Wajib memakai perlengkapan kerja sesuai SOP (seperti celemek, masker, penutup kepala) ketika berada di dapur.
9. Pengecekan Kematangan Sempurna: Memastikan suhu inti masakan (terutama daging dan unggas) mencapai titik aman untuk membunuh bakteri merugikan.
10. Standar Resep: Mengikuti panduan bumbu dan metode memasak (resep standar) secara konsisten agar rasa makanan tidak berubah setiap harinya.
11. Pengambilan Sampel (Food Sampling): Menyisihkan sedikit hasil masakan setiap menu untuk diserahkan kepada Ahli Gizi sebagai sampel uji atau arsip sampling produksi.
12. Manajemen Suhu: Memastikan api dan suhu alat masak sesuai dengan jenis masakan guna menjaga nutrisi bahan baku agar tidak rusak akibat panas berlebih.
13. Keamanan Alat Masak: Memastikan kompor, blender, dan alat elektronik lainnya dalam kondisi bersih dan aman digunakan sebelum serta sesudah proses memasak.
14. Penanganan Masakan Matang: Memindahkan masakan yang sudah matang ke wadah bersih dan tertutup untuk menghindari kontaminasi udara sebelum masuk ke bagian pemorsian.`,
    referensi: "",
  },
  {
    kode: "6",
    judul: "Pemorsian",
    kategori: "Pengolahan",
    tujuan:
      "Membagi dan mengemas hasil olahan ke dalam ompreng secara tepat porsi, higienis, dan sesuai jumlah penerima manfaat sebelum diserahkan ke tim distribusi.",
    ruang_lingkup:
      "Proses penghitungan dan pemorsian olahan ke dalam ompreng (food tray): penggunaan alat ukur gramasi, kontrol kontaminasi, pelabelan porsi khusus, dan pengecekan akhir jumlah.",
    penanggung_jawab: "Petugas Pemorsian",
    prosedur: `1. Akurasi Kuantitas: Menghitung kuantitas seluruh olahan dengan tepat.
2. Ketepatan Pembagian: Membagi setiap olahan ke dalam ompreng dengan tepat.
3. Standar Higienis: Menjaga kualitas olahan dengan higienis.
4. Manajemen Sisa: Mengembalikan sisa pemorsian kepada bidang gizi.
5. Pelaporan: Memberikan laporan berkala kepada bagian Gizi.
6. Keharmonisan Tim: Menjaga hubungan yang harmonis antar tim maupun anggota (tidak ada geng).
7. Atribut Kerja: Memakai perlengkapan kerja sesuai SOP ketika di dapur.
8. Pengecekan Kebersihan Wadah: Memastikan setiap wadah/ompreng (food tray) dalam keadaan benar-benar kering dan tidak berbau sebelum diisi makanan.
9. Penggunaan Alat Ukur (Gramasi): Menggunakan sendok takar atau timbangan sesuai instruksi Ahli Gizi untuk memastikan konsistensi porsi antar penerima manfaat.
10. Urutan Pengisian: Melakukan pengisian lauk secara sistematis untuk efisiensi waktu dan kerapihan presentasi.
11. Kontrol Kontaminasi: Menggunakan sarung tangan plastik sekali pakai dan masker secara ketat selama proses pemorsian berlangsung untuk mencegah paparan kuman ke makanan matang.
12. Penyegelan & Labeling: Memastikan wadah tertutup rapat setelah diisi dan memberikan label jika ada porsi khusus (misal: ompreng kecil tali merah, ompreng besar tali hitam) sesuai data dari administrasi.
13. Pengecekan Akhir (Final Check): Melakukan verifikasi jumlah total ompreng yang sudah siap dengan data jumlah penerima manfaat sebelum diserahkan ke tim Driver/Distribusi.`,
    referensi: "",
  },
  {
    kode: "7",
    judul: "Cuci Ompreng",
    kategori: "Higiene & Sanitasi",
    tujuan:
      "Memastikan seluruh food tray (ompreng) tercuci higienis, kering sempurna, dan bebas kontaminasi melalui prosedur pencucian serta sanitasi yang benar.",
    ruang_lingkup:
      "Proses pencucian ompreng dengan prosedur 3 bak (washing, rinsing, sanitizing), pengeringan, pengelolaan sisa makanan dan limbah, serta sanitasi alat cuci.",
    penanggung_jawab: "Petugas Cuci Ompreng",
    prosedur: `1. Standar Higienis: Memastikan seluruh dan semua food tray tercuci dengan higienis.
2. Pengeringan Sempurna: Memastikan seluruh food tray kering tanpa ada sisa air dan noda.
3. Pengelolaan Sisa Makanan: Mengumpulkan sisa makanan dan dipilah sesuai jenis serta membuangnya pada tempat yang telah ditentukan.
4. Administrasi Limbah: Mengisi form limbah.
5. Garis Komando: Bertanggung jawab kepada Asisten Lapangan.
6. Keharmonisan Tim: Menjaga hubungan yang harmonis antar tim maupun anggota dan tidak diperbolehkan ada pengelompokan (geng).
7. Atribut Kerja: Memakai perlengkapan kerja sesuai SOP ketika berada di area dapur.
8. Prosedur 3 Bak (Washing, Rinsing, Sanitizing): Menerapkan tahap pencucian dengan sabun, pembilasan dengan air bersih, dan perendaman/pembilasan akhir dengan air hangat atau larutan sanitasi aman pangan.
9. Pembersihan Sela-Sela Wadah: Memastikan setiap sudut dan sela karet tutup ompreng disikat dengan detail untuk mencegah penumpukan jamur atau sisa lemak.
10. Penggunaan Alat Gosok yang Tepat: Menggunakan spons yang tidak merusak permukaan food tray (anti-gores) agar tidak menjadi sarang bakteri di kemudian hari.
11. Sirkulasi Udara Pengeringan: Menyusun ompreng di rak pengering dengan posisi miring/terbalik di area dengan sirkulasi udara baik, bukan ditumpuk saat masih basah.
12. Pengecekan Bau: Memastikan wadah yang sudah kering tidak meninggalkan bau amis atau bau sabun yang menyengat sebelum disimpan kembali.
13. Sanitasi Alat Cuci: Membersihkan area bak cuci, spons, dan sikat setiap kali selesai digunakan agar alat pencuci tidak menjadi sumber kontaminasi silang.`,
    referensi: "Prosedur 3 Bak (Washing, Rinsing, Sanitizing)",
  },
  {
    kode: "8",
    judul: "Driver / Distribusi",
    kategori: "Distribusi",
    tujuan:
      "Mendistribusikan makanan ke penerima manfaat secara tepat sasaran, tepat waktu, higienis, dan dengan pelayanan yang ramah serta profesional.",
    ruang_lingkup:
      "Proses pemuatan, pengiriman, dan serah terima food tray ke penerima manfaat, sanitasi kendaraan, keamanan muatan, dokumentasi (BAST/Surat Jalan), dan logistik balik ompreng kotor.",
    penanggung_jawab: "Driver",
    prosedur: `1. Akurasi Data: Memastikan data distribusi tepat sasaran dan tepat hitungan.
2. Ketepatan Waktu: Memastikan jam pengiriman dilakukan dengan tepat.
3. Perawatan Kendaraan: Menjaga dan memelihara fasilitas kendaraan dengan baik.
4. Koordinasi Penerima: Mengkoordinasikan waktu pengambilan food tray dengan penerima manfaat.
5. Garis Komando: Bertanggung jawab kepada Asisten Lapangan.
6. Keharmonisan Tim: Menjaga hubungan yang harmonis antar tim maupun anggota (tidak ada geng).
7. Atribut Kerja: Memakai perlengkapan kerja sesuai SOP (Sepatu, Celana Panjang, Baju Kemeja/Kerah Rapih, potong rambut rapih) karena wajah semua karyawan SPPG ada di driver sebagai penghubung dapur dengan penerima manfaat.
8. Sanitasi Kendaraan: Membersihkan area kabin dan kargo mobil sebelum memuat makanan agar debu atau kotoran kendaraan tidak mengontaminasi food tray.
9. Keamanan Muatan (Securing Load): Menyusun dan mengikat tumpukan food tray dengan aman di dalam kendaraan agar tidak tumpah atau terguncang saat melewati jalan rusak.
10. Dokumentasi Serah Terima: Membawa dan meminta tanda tangan pada Surat Jalan atau BAST (Berita Acara Serah Terima) saat menyerahkan makanan kepada penerima manfaat sebagai bukti sah pengiriman.
11. Logistik Balik (Reverse Logistics): Mengangkut kembali food tray kotor dari pengiriman sebelumnya untuk dibawa ke area Cuci Ompreng di dapur pusat.
12. Pengecekan Rute: Memantau kondisi lalu lintas atau mencari jalur alternatif sebelum berangkat untuk menghindari keterlambatan fatal.
13. Sikap Pelayanan: Bersikap ramah dan sopan saat bertemu dengan penerima manfaat karena Driver adalah "wajah" pelayanan SPPG di lapangan.`,
    referensi: "Surat Jalan; BAST (Berita Acara Serah Terima)",
  },
  {
    kode: "9",
    judul: "Supplier",
    kategori: "Penerimaan & Penyimpanan",
    tujuan:
      "Memastikan pasokan bahan baku ke SPPG tepat jumlah, bermutu terbaik, tepat waktu, higienis, dan didukung dokumen pengiriman yang lengkap.",
    ruang_lingkup:
      "Proses pengiriman (dropping) bahan baku ke SPPG: jaminan mutu, akurasi jumlah, kelengkapan dokumen (Surat Jalan & Invoice), rantai dingin, sanitasi pengiriman, dan kebijakan retur.",
    penanggung_jawab: "Supplier / Pemasok Bahan Baku",
    prosedur: `1. Pendampingan Pengiriman: Mendampingi secara langsung proses dropping (penurunan) bahan baku di lokasi.
2. Akurasi Jumlah: Memberikan hitungan yang tepat dan akurat untuk setiap bahan baku yang dikirim.
3. Jaminan Mutu: Memberikan kualitas terbaik untuk seluruh bahan baku yang disuplai.
4. Keharmonisan Mitra: Menjaga hubungan yang harmonis antar tim maupun anggota (tidak ada geng).
5. Standar Atribut: Memakai perlengkapan kerja sesuai SOP ketika berada di area dapur (jika masuk ke area produksi).
6. Kelengkapan Dokumen: Wajib menyertakan Surat Jalan dan Invoice/Faktur rangkap yang jelas saat pengiriman untuk diverifikasi oleh tim Penerimaan & Admin.
7. Kebijakan Retur Cepat: Bersedia mengganti (replace) secara langsung atau memotong tagihan di tempat jika ditemukan bahan baku yang busuk, rusak, atau tidak sesuai spesifikasi saat pengecekan (Quality Control).
8. Ketepatan Jadwal: Mengirimkan bahan baku sesuai dengan "Jendela Waktu" (Time Slot) yang telah disepakati agar tidak mengganggu jadwal persiapan masak.
9. Sanitasi Pengiriman: Memastikan kendaraan pengangkut dan wadah bahan baku (keranjang/boks) dalam keadaan bersih, tidak berbau, dan bebas dari kontaminasi kimia/hama.
10. Rantai Dingin (Cold Chain): Khusus untuk supplier daging, ikan, atau produk beku, wajib menjaga suhu bahan baku tetap stabil (dingin/beku) selama perjalanan hingga diterima oleh tim dapur.
11. Responsivitas: Mudah dihubungi dan responsif jika terjadi kebutuhan mendesak atau komplain terkait kualitas bahan baku.`,
    referensi: "Surat Jalan; Invoice/Faktur",
  },
  {
    kode: "11",
    judul: "Penata Layanan Operasional Keuangan",
    kategori: "Administrasi",
    tujuan:
      "Mengelola keuangan SPPG secara transparan, akuntabel, dan tepat waktu mulai dari perencanaan belanja, pembayaran, pembukuan, hingga pengarsipan bukti transaksi.",
    ruang_lingkup:
      "Administrasi keuangan SPPG: kontrak kerja sama, pembayaran supplier dan operasional, kas kecil (petty cash), payroll relawan, verifikasi 3 arah, rekonsiliasi bank, dan pelaporan keuangan.",
    penanggung_jawab: "Penata Layanan Operasional Keuangan",
    prosedur: `1. Administrasi Serah Terima: Membuat Surat Berita Acara Serah Terima (BAST) SPPG ke penerima manfaat.
2. Manajemen Kontrak: Membuat kontrak kerja sama dengan semua pihak yang berkaitan dengan SPPG.
3. Likuiditas Keuangan: Memastikan sisa saldo dalam akun virtual keuangan SPPG terjaga aman untuk operasional 12 hari ke depan.
4. Eksekusi Pembayaran: Memastikan dan melaksanakan pembayaran kepada supplier, biaya operasional, dan insentif fasilitas terpenuhi tepat waktu.
5. Perencanaan Belanja: Membuat resume Pre-Order (PO) kepada supplier berdasarkan kebutuhan.
6. Koleksi Tagihan: Memastikan invoice (tagihan) dari supplier diterima setiap hari untuk direkap.
7. Pembukuan: Membuat laporan keuangan dengan baik, rapi, dan transparan.
8. Payroll Relawan: Membuat draf gaji/insentif untuk seluruh relawan di SPPG.
9. Pelaporan: Memberikan laporan berkala kepada Kepala SPPG (KA-SPPG).
10. Koordinasi Lintas Divisi: Berkoordinasi aktif dengan Asisten Lapangan dan Ahli Gizi terkait kebutuhan dana dan logistik.
11. Manajemen Vendor: Memastikan jumlah supplier terpenuhi dan mencukupi kebutuhan atas sepengetahuan KA-SPPG.
12. Keharmonisan Tim: Menjaga hubungan yang harmonis antar tim maupun anggota (tidak ada geng).
13. Standar Atribut: Memakai baju kerja sesuai hari saat di kantor.
14. Verifikasi 3 Arah (3-Way Matching): Melakukan pencocokan data antara Purchase Order (Pesanan), Goods Receipt Note (Bukti Barang Masuk dari Admin), dan Invoice (Tagihan Supplier) sebelum melakukan pembayaran.
15. Pengelolaan Kas Kecil (Petty Cash): Mengelola dana taktis tunai untuk pembelian mendesak (seperti plastik, tali, atau kekurangan bahan tiba-tiba) dengan pencatatan bon yang ketat.
16. Rekonsiliasi Bank: Melakukan pencocokan catatan keuangan internal dengan mutasi rekening koran/virtual account secara berkala (mingguan/bulanan) untuk mendeteksi selisih.
17. Analisis Harga Pasar: Melakukan survei harga berkala untuk memastikan harga dari supplier tetap kompetitif dan sesuai kontrak.
18. Pengarsipan Digital: Memindai (scan) dan menyimpan bukti transaksi (kwitansi/faktur) dalam format digital sebagai cadangan data (backup) selain arsip fisik.
19. Pajak & Kepatuhan: Memastikan dokumen perpajakan (jika ada) terkait pembelian atau jasa vendor telah lengkap dan sesuai aturan.`,
    referensi: "BAST; Pre-Order (PO); Verifikasi 3 Arah (3-Way Matching)",
  },
  {
    kode: "12",
    judul: "Penata Layanan Operasional Gizi",
    kategori: "Pengolahan",
    tujuan:
      "Merencanakan menu bergizi, menghitung kebutuhan dan kandungan gizi, serta mengontrol kualitas proses pengolahan makanan agar sesuai standar gizi dan aman dikonsumsi.",
    ruang_lingkup:
      "Perencanaan menu 12 hari, perhitungan pesanan bahan baku, analisis gizi dan gramasi, uji organoleptik, manajemen sampel produksi, pendampingan tim produksi, dan koordinasi lintas divisi.",
    penanggung_jawab: "Ahli Gizi",
    prosedur: `1. Perencanaan Menu: Membuat draf menu untuk 12 hari ke depan.
2. Manajemen Pesanan: Menghitung jumlah pesanan setiap bahan baku berdasarkan kebutuhan menu.
3. Koordinasi Anggaran: Menyerahkan hitungan kebutuhan bahan baku kepada bagian Akuntansi/Keuangan.
4. Instruksi Kerja: Membuat tugas kerja untuk divisi Persiapan, Pengolahan, dan Pemorsian setiap hari produksi.
5. Kontrol Proses: Memastikan setiap bahan baku diolah dengan teknik yang baik dan benar.
6. Uji Organoleptik: Melaksanakan fungsi organoleptik (menilai rasa, warna, aroma, dan tekstur masakan) sebelum didistribusikan.
7. Analisis Gizi: Menghitung kandungan gizi, kalori, dan gramasi pada setiap porsi makanan.
8. Manajemen Sampel: Membuat sampling produksi (makanan cadangan) untuk disimpan minimal selama 4 hari sebagai prosedur keamanan jika terjadi hal yang tidak diinginkan.
9. Pendampingan Lapangan: Mendampingi secara langsung tim Persiapan, Pengolahan, dan Pemorsian saat bekerja.
10. Koordinasi Lintas Divisi: Berkoordinasi dengan bagian Akuntansi dan Asisten Lapangan.
11. Pelaporan: Memberikan laporan berkala kepada Kepala SPPG (KA-SPPG).
12. Budaya Kerja: Menjaga hubungan yang harmonis antar tim maupun anggota (tidak ada geng).
13. Atribut Kerja: Wajib memakai perlengkapan kerja sesuai SOP ketika berada di dapur.`,
    referensi: "",
  },
  {
    kode: "13",
    judul: "Media SPPG",
    kategori: "Umum",
    tujuan:
      "Mengelola media sosial dan dokumentasi SPPG untuk membangun citra, transparansi, dan kepercayaan publik terhadap program bantuan gizi.",
    ruang_lingkup:
      "Pengelolaan akun media sosial resmi, dokumentasi foto/video proses kerja, penyusunan kalender konten dan caption edukatif, prosedur persetujuan konten, etika privasi, dan interaksi audiens.",
    penanggung_jawab: "Petugas Media SPPG",
    prosedur: `1. Pengelolaan Media Sosial: Bertanggung jawab penuh dalam mengurus dan mengelola akun media sosial resmi SPPG.
2. Pelaporan Visual: Mengirimkan foto rekap menu dan foto penerima manfaat kepada Kepala SPPG (KA-SPPG).
3. Koordinasi Konten: Berkoordinasi secara aktif dengan Ahli Gizi terkait informasi menu yang akan diunggah.
4. Prosedur Persetujuan (Approval): Seluruh konten wajib mendapatkan persetujuan dari KA-SPPG sebelum diunggah/dipublikasikan.
5. Keharmonisan Tim: Menjaga hubungan yang harmonis antar tim maupun anggota (tidak ada geng).
6. Atribut Kerja: Memakai perlengkapan kerja sesuai SOP ketika berada di area dapur (untuk menjaga citra profesional saat pengambilan konten).
7. Dokumentasi Higienitas: Mengambil foto atau video proses kerja yang menunjukkan kebersihan (seperti penggunaan masker, sarung tangan, dan pencucian bahan) untuk membangun kepercayaan publik.
8. Penyusunan Kalender Konten: Membuat jadwal unggahan rutin (misal: menu harian, edukasi gizi mingguan, dan testimoni penerima manfaat).
9. Caption Edukatif: Membuat keterangan foto (caption) yang tidak hanya menarik tetapi juga informatif, seperti manfaat kesehatan dari menu hari itu (berdasarkan data dari Ahli Gizi).
10. Arsip Dokumentasi: Mengelola penyimpanan file foto dan video mentah (raw files) secara rapi di cloud storage atau hardisk eksternal sebagai arsip lembaga.
11. Privasi Penerima Manfaat: Memastikan pengambilan foto penerima manfaat dilakukan secara sopan dan tidak merendahkan martabat (etika dokumentasi sosial).
12. Interaksi Audiens: Memantau komentar atau pertanyaan di media sosial dan mengoordinasikan jawabannya dengan pihak terkait (KA-SPPG atau Ahli Gizi).
13. Live Reporting: Jika diperlukan, melakukan siaran langsung atau story saat proses distribusi untuk menunjukkan transparansi penyaluran bantuan gizi.`,
    referensi: "",
  },
];
