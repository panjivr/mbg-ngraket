/**
 * Perhitungan Weton & Jodoh (primbon Jawa) — tanpa dependensi eksternal.
 *
 * Keilmuan diekstrak/disarikan dari aplikasi primbon Jawa (kitab Betaljemur &
 * Lukmanakim Adammakna, Bektijamal, Sabda Amerta) dan kaidah weton baku.
 * Perhitungan pasaran ditambatkan pada hari pasaran yang terdokumentasi:
 *   17 Agustus 1945 = Jumat Legi  (konsisten dengan 1 Januari 1900 = Senin Pahing).
 */

export interface HariInfo {
  nama: string;
  neptu: number;
}

const HARI: HariInfo[] = [
  { nama: "Minggu", neptu: 5 }, // getUTCDay 0
  { nama: "Senin", neptu: 4 },
  { nama: "Selasa", neptu: 3 },
  { nama: "Rabu", neptu: 7 },
  { nama: "Kamis", neptu: 8 },
  { nama: "Jumat", neptu: 6 },
  { nama: "Sabtu", neptu: 9 },
];

interface PasaranInfo {
  nama: string;
  neptu: number;
  arah: string;
  warna: string;
}

// Urutan pasaran: Legi, Pahing, Pon, Wage, Kliwon (anchor 1945-08-17 = Legi).
const PASARAN: PasaranInfo[] = [
  { nama: "Legi", neptu: 5, arah: "Timur", warna: "Putih" },
  { nama: "Pahing", neptu: 9, arah: "Selatan", warna: "Merah" },
  { nama: "Pon", neptu: 7, arah: "Barat", warna: "Kuning" },
  { nama: "Wage", neptu: 4, arah: "Utara", warna: "Hitam" },
  { nama: "Kliwon", neptu: 8, arah: "Tengah", warna: "Campuran (Manca)" },
];

const WATAK_HARI: Record<string, string> = {
  Minggu: "menyukai kebebasan, percaya diri, kreatif, dan senang tampil di depan.",
  Senin: "lembut, penuh perhatian, mudah bergaul, namun kadang ragu mengambil keputusan.",
  Selasa: "pekerja keras, ambisius, dan tegas, walau sesekali mudah tersulut emosi.",
  Rabu: "cerdas, komunikatif, pandai bicara, dan mudah menyesuaikan diri.",
  Kamis: "bijaksana, dermawan, berwibawa, dan gemar menolong sesama.",
  Jumat: "setia, religius, sederhana, dan penuh kasih sayang.",
  Sabtu: "ulet, tekun, hemat, dan teguh pendirian meski kadang keras kepala.",
};

const WATAK_PASARAN: Record<string, string> = {
  Legi: "ramah, murah hati, dan menarik simpati banyak orang.",
  Pahing: "berkemauan kuat, mandiri, gigih, dan pandai mengatur materi.",
  Pon: "cekatan, suka menolong, dan pandai bergaul.",
  Wage: "jujur, teguh pendirian, dan mandiri.",
  Kliwon: "peka, berwibawa, spiritual, dan pandai berbicara.",
};

/** Tingkat 'aura/energi' berdasarkan jumlah neptu weton. */
function tingkatAura(neptu: number): string {
  if (neptu >= 16) return "Sangat kuat — karisma besar dan pengaruh menonjol.";
  if (neptu >= 13) return "Kuat — berwibawa dan mudah dipercaya.";
  if (neptu >= 10) return "Seimbang — luwes dan mudah menyesuaikan diri.";
  return "Lembut — tenang, sabar, dan penuh ketelatenan.";
}

export interface WetonInfo {
  tanggal: string; // YYYY-MM-DD
  hari: string;
  hari_neptu: number;
  pasaran: string;
  pasaran_neptu: number;
  weton: string; // "Jumat Legi"
  neptu: number;
  aura_warna: string;
  aura_arah: string;
  aura_tingkat: string;
  watak: string;
}

const ANCHOR = Date.UTC(1945, 7, 17); // 17 Agustus 1945 = Jumat Legi (pasaran index 0)
const MS_PER_DAY = 86_400_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Hitung weton dari tanggal lahir "YYYY-MM-DD". Null bila tak valid. */
export function hitungWeton(tgl: string | null | undefined): WetonInfo | null {
  if (!tgl || !DATE_RE.test(tgl)) return null;
  const [y, m, d] = tgl.split("-").map((n) => parseInt(n, 10));
  const t = Date.UTC(y, m - 1, d);
  if (Number.isNaN(t)) return null;

  const dow = new Date(t).getUTCDay(); // 0=Minggu..6=Sabtu
  const hari = HARI[dow];

  const diff = Math.round((t - ANCHOR) / MS_PER_DAY);
  const pasaranIdx = ((diff % 5) + 5) % 5;
  const pasaran = PASARAN[pasaranIdx];

  const neptu = hari.neptu + pasaran.neptu;
  const watak =
    `Orang berweton ${hari.nama} ${pasaran.nama} umumnya ${WATAK_HARI[hari.nama]} ` +
    `Dipadu unsur ${pasaran.nama} yang ${WATAK_PASARAN[pasaran.nama]} ` +
    tingkatAura(neptu);

  return {
    tanggal: tgl,
    hari: hari.nama,
    hari_neptu: hari.neptu,
    pasaran: pasaran.nama,
    pasaran_neptu: pasaran.neptu,
    weton: `${hari.nama} ${pasaran.nama}`,
    neptu,
    aura_warna: pasaran.warna,
    aura_arah: pasaran.arah,
    aura_tingkat: tingkatAura(neptu),
    watak,
  };
}

export interface JodohInfo {
  kategori: string;
  ringkas: string;
  deskripsi: string;
  total_neptu: number;
  sisa: number;
}

// Sistem klasik: (neptu1 + neptu2) mod 7 -> 7 kategori perjodohan.
const JODOH: Array<{ kategori: string; ringkas: string; deskripsi: string }> = [
  {
    kategori: "Pegat",
    ringkas: "Rawan masalah",
    deskripsi:
      "Berpotensi menghadapi banyak ujian — soal ekonomi, kekuasaan, atau pihak ketiga — yang jika tak dikelola bisa berujung perpisahan. Butuh kesabaran dan komunikasi ekstra.",
  },
  {
    kategori: "Ratu",
    ringkas: "Sangat cocok",
    deskripsi:
      "Termasuk pasangan yang sangat serasi. Rumah tangga harmonis, dihormati dan disegani lingkungan, bahkan banyak yang mengagumi.",
  },
  {
    kategori: "Jodoh",
    ringkas: "Berjodoh",
    deskripsi:
      "Benar-benar cocok. Keduanya saling menerima kelebihan dan kekurangan, rukun dan langgeng hingga tua.",
  },
  {
    kategori: "Topo",
    ringkas: "Susah dulu, bahagia kemudian",
    deskripsi:
      "Di awal kerap menghadapi kesulitan dan perselisihan, namun setelah melewati ujian (misal punya anak atau mapan) berubah menjadi bahagia dan mapan.",
  },
  {
    kategori: "Tinari",
    ringkas: "Berlimpah rezeki",
    deskripsi:
      "Hidup berkecukupan, mudah mencari rezeki, dan sering mendapat keberuntungan serta keselamatan.",
  },
  {
    kategori: "Padu",
    ringkas: "Sering berselisih",
    deskripsi:
      "Kerap bertengkar dan berselisih paham, tetapi biasanya tidak sampai bercerai. Saling mengalah adalah kuncinya.",
  },
  {
    kategori: "Sujanan",
    ringkas: "Jaga kepercayaan",
    deskripsi:
      "Rawan pertengkaran dan persoalan kesetiaan. Diperlukan rasa saling percaya dan saling menjaga agar tetap harmonis.",
  },
];

/** Hitung kategori jodoh dari dua nilai neptu weton. */
export function hitungJodoh(neptu1: number, neptu2: number): JodohInfo {
  const total = neptu1 + neptu2;
  const sisa = total % 7; // 0..6
  // sisa 1->Pegat, 2->Ratu, ... 6->Padu, 0->Sujanan(ke-7)
  const idx = sisa === 0 ? 6 : sisa - 1;
  const j = JODOH[idx];
  return {
    kategori: j.kategori,
    ringkas: j.ringkas,
    deskripsi: j.deskripsi,
    total_neptu: total,
    sisa: sisa === 0 ? 7 : sisa,
  };
}

/** Format "YYYY-MM-DD" -> "19 Juni 2026". */
export function formatTanggalIndo(tgl: string | null | undefined): string {
  if (!tgl || !DATE_RE.test(tgl)) return "—";
  const [y, m, d] = tgl.split("-").map((n) => parseInt(n, 10));
  const bulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  return `${d} ${bulan[m - 1]} ${y}`;
}
