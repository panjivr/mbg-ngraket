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
  return `${d} ${BULAN_INDO[m - 1]} ${y}`;
}

const BULAN_INDO = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/* =========================================================================
 * RAMALAN KEPRIBADIAN LENGKAP (gaya primbon Jawa "RamaLan Horoskop")
 * Semua perhitungan deterministik & sudah diverifikasi pada weton acuan
 * (29 Maret 2002 = Jum'at Wage, Wuku Warigalit, 14 Sura 1935 Dal/Adi,
 *  15 Muharram 1423 H, Pancasuda Sumur Sinaba, Pangarasan Aras Pepet,
 *  Mangsa Kasadasa, Bintang Aries).
 * ========================================================================= */

// ---- Wuku (pawukon, siklus 30 minggu) ----
interface WukuItem {
  nama: string;
  watak: string;
  sifat: string[];
}
const WUKU: WukuItem[] = [
  { nama: "Sinta", watak: "Penuh wibawa dan pandai membawa diri, tetapi mudah cemburu dan keras hati.", sifat: ["Berwibawa", "Pandai membawa diri", "Mudah cemburu"] },
  { nama: "Landep", watak: "Tajam pikiran dan cerdas, menyukai keindahan, pandai bergaul, kadang mudah tersinggung.", sifat: ["Cerdas / tajam pikiran", "Menyukai keindahan", "Mudah tersinggung"] },
  { nama: "Wukir", watak: "Berbudi luhur, tabah, dan suka menolong, teguh pendirian walau kadang pemurung.", sifat: ["Berbudi luhur", "Tabah & teguh pendirian", "Suka menolong"] },
  { nama: "Kurantil", watak: "Gesit dan pemberani, mudah bergaul dan suka berpindah suasana, kadang kurang sabar.", sifat: ["Gesit & pemberani", "Mudah bergaul", "Kadang kurang sabar"] },
  { nama: "Tolu", watak: "Lemah lembut dan penyayang, pandai bicara dan mudah iba, namun gampang berubah pikiran.", sifat: ["Lemah lembut & penyayang", "Pandai bicara", "Mudah berubah pikiran"] },
  { nama: "Gumbreg", watak: "Keras kemauan dan pekerja keras, mandiri serta tegas, kadang kurang luwes.", sifat: ["Keras kemauan", "Pekerja keras & mandiri", "Tegas"] },
  { nama: "Warigalit", watak: "Setia dan penuh kasih, cerdas serta mudah disukai, namun mudah cemburu dan gelisah.", sifat: ["Setia & penuh kasih sayang", "Cerdas", "Mudah disukai / disenangi kawan", "Mudah cemburu & gelisah"] },
  { nama: "Warigagung", watak: "Berwibawa dan pemurah, suka menolong dan teguh pendirian, agak boros.", sifat: ["Berwibawa", "Pemurah / dermawan", "Teguh pendirian"] },
  { nama: "Julungwangi", watak: "Berbudi halus dan menarik simpati, lembut tutur kata, beruntung dalam pergaulan.", sifat: ["Berbudi halus", "Menarik simpati", "Lembut tutur kata"] },
  { nama: "Sungsang", watak: "Pemberani dan terus terang, pekerja keras, namun mudah emosi.", sifat: ["Pemberani & terus terang", "Pekerja keras", "Mudah emosi"] },
  { nama: "Galungan", watak: "Teguh hati dan pemberani, berwibawa serta gemar menolong, pantang menyerah.", sifat: ["Teguh hati & pemberani", "Berwibawa", "Pantang menyerah"] },
  { nama: "Kuningan", watak: "Cerdik dan pandai bergaul, berwibawa dan menyukai kebersihan, kadang sombong.", sifat: ["Cerdik", "Pandai bergaul", "Berwibawa"] },
  { nama: "Langkir", watak: "Pendiriannya kuat, pemberani dan tegas, namun mudah curiga.", sifat: ["Pendirian kuat", "Pemberani & tegas", "Mudah curiga"] },
  { nama: "Mandasiya", watak: "Keras hati dan ulet, pekerja keras dan setia, kadang pendendam.", sifat: ["Ulet & pekerja keras", "Setia", "Keras hati"] },
  { nama: "Julungpujut", watak: "Tabah dan sabar, teguh pendirian serta suka menolong, agak tertutup.", sifat: ["Tabah & sabar", "Teguh pendirian", "Suka menolong"] },
  { nama: "Pahang", watak: "Cerdik dan pandai bicara, pandai mengambil hati, kadang kurang setia.", sifat: ["Cerdik", "Pandai bicara & mengambil hati", "Mudah bergaul"] },
  { nama: "Kuruwelut", watak: "Halus budi dan cerdas, berhati-hati serta pandai menyimpan rahasia.", sifat: ["Halus budi & cerdas", "Berhati-hati", "Pandai menyimpan rahasia"] },
  { nama: "Marakeh", watak: "Berwibawa dan teguh, pemberani, namun keras kepala.", sifat: ["Berwibawa & teguh", "Pemberani", "Keras kepala"] },
  { nama: "Tambir", watak: "Pandai bergaul dan luwes, mudah menyesuaikan diri, kadang plin-plan.", sifat: ["Pandai bergaul & luwes", "Mudah menyesuaikan diri", "Kadang plin-plan"] },
  { nama: "Medangkungan", watak: "Pendiam dan teliti, hati-hati dan setia, agak pencuriga.", sifat: ["Teliti & hati-hati", "Setia", "Pendiam"] },
  { nama: "Maktal", watak: "Kuat lahir batin dan pekerja keras, teguh dan pemberani, berwibawa.", sifat: ["Kuat lahir-batin", "Pekerja keras & teguh", "Berwibawa"] },
  { nama: "Wuye", watak: "Lembut hati dan penyayang, mudah iba dan suka menolong, perasa.", sifat: ["Lembut hati & penyayang", "Suka menolong", "Perasa / peka"] },
  { nama: "Manahil", watak: "Teguh pendirian, sabar dan tekun, namun keras kepala.", sifat: ["Teguh pendirian", "Sabar & tekun", "Keras kepala"] },
  { nama: "Prangbakat", watak: "Pemberani dan gesit, tegas dan pekerja keras, kadang terburu-buru.", sifat: ["Pemberani & gesit", "Tegas", "Pekerja keras"] },
  { nama: "Bala", watak: "Cerdik dan lincah, pandai bicara dan mudah bergaul, kadang kurang teguh.", sifat: ["Cerdik & lincah", "Pandai bicara", "Mudah bergaul"] },
  { nama: "Wugu", watak: "Bijaksana dan berwibawa, pandai menimbang serta suka menolong.", sifat: ["Bijaksana", "Pandai menimbang", "Suka menolong"] },
  { nama: "Wayang", watak: "Berbudi luhur dan penyabar, penyayang dan menarik hati, pandai menghibur.", sifat: ["Berbudi luhur & penyabar", "Penyayang & menarik hati", "Pandai menghibur"] },
  { nama: "Kulawu", watak: "Teguh hati dan pendiriannya kuat, berwibawa dan pemberani, agak keras.", sifat: ["Teguh hati", "Berwibawa & pemberani", "Pendirian kuat"] },
  { nama: "Dukut", watak: "Setia dan teguh, hati-hati dan hemat, namun mudah curiga.", sifat: ["Setia & teguh", "Hati-hati & hemat", "Mudah curiga"] },
  { nama: "Watugunung", watak: "Berwibawa besar dan cerdas, pemberani dan dihormati, namun keras kepala.", sifat: ["Berwibawa besar & cerdas", "Pemberani & dihormati", "Keras kepala"] },
];
const ANCHOR_WUKU = Date.UTC(2002, 1, 10); // 10 Feb 2002 (Minggu) = hari ke-1 Wuku Sinta
function hitungWuku(t: number): WukuItem {
  const dc = Math.floor((t - ANCHOR_WUKU) / MS_PER_DAY);
  const idx = (((dc % 210) + 210) % 210) / 7;
  return WUKU[Math.floor(idx)];
}

// ---- Pancasuda (neptu mod 7) ----
interface PrimbonMakna {
  nama: string;
  makna: string;
  sifat: string[];
}
const PANCASUDA: PrimbonMakna[] = [
  { nama: "Wasesa Segara", makna: "Berhati luas bagaikan samudra — pemaaf, sabar, berwibawa, dan disegani banyak orang.", sifat: ["Berhati luas & pemaaf", "Berwibawa & disegani"] },
  { nama: "Tunggak Semi", makna: "Rezekinya selalu tumbuh kembali walau pernah habis — ulet, pantang menyerah, dan tak mudah putus asa.", sifat: ["Ulet & pantang menyerah", "Rezeki mudah tumbuh kembali"] },
  { nama: "Satria Wibawa", makna: "Memperoleh kemuliaan dan kehormatan — berwibawa, dihormati, dan beruntung dalam kedudukan.", sifat: ["Berwibawa & dihormati", "Beruntung memperoleh kemuliaan"] },
  { nama: "Sumur Sinaba", makna: "Menjadi tempat orang menimba ilmu dan meminta nasihat — berilmu, dermawan, dan menjadi panutan.", sifat: ["Berilmu & dermawan", "Menjadi tempat mengadu / meminta nasihat", "Pandai menjadi pelipur lara"] },
  { nama: "Satria Wirang", makna: "Kadang menanggung malu atau kesusahan — perlu kehati-hatian dan banyak bersedekah untuk menolaknya.", sifat: ["Perlu berhati-hati menjaga nama", "Tabah menghadapi cobaan"] },
  { nama: "Bumi Kapetak", makna: "Tahan menderita dan pekerja keras seperti bumi yang dipendam — teguh, tekun, kadang pendiam dan mudah tersinggung.", sifat: ["Pekerja keras & tahan menderita", "Teguh & tekun"] },
  { nama: "Lebu Katiup Angin", makna: "Cita-cita sering belum tercapai dan mudah berpindah seperti debu tertiup angin — perlu ketekunan dan kesabaran ekstra.", sifat: ["Mudah berpindah suasana", "Perlu ketekunan menggapai cita-cita"] },
];
function hitungPancasuda(neptu: number): PrimbonMakna {
  return PANCASUDA[neptu % 7];
}

// ---- Pangarasan / Aras (calibrasi: neptu+1 mod 3) ----
const PANGARASAN: PrimbonMakna[] = [
  { nama: "Aras Kembang", makna: "Disukai dan dicintai banyak orang — wajah dan perangainya menarik simpati di mana pun berada.", sifat: ["Menarik simpati", "Disukai banyak orang"] },
  { nama: "Aras Tuding", makna: "Sering menjadi sasaran tudingan atau mudah disalahkan — perlu kesabaran dan kehati-hatian bersikap.", sifat: ["Perlu sabar menghadapi tudingan", "Hati-hati bersikap"] },
  { nama: "Aras Pepet", makna: "Rezeki dan cita-cita kadang seret/tersendat — perlu kerja keras, ketekunan, dan doa ekstra untuk membuka jalan.", sifat: ["Perlu kerja keras ekstra", "Tekun & pantang menyerah"] },
];
function hitungPangarasan(neptu: number): PrimbonMakna {
  return PANGARASAN[(neptu + 1) % 3];
}

// ---- Pranata Mangsa (12 mongso) ----
interface MongsoItem {
  nama: string;
  urutan: number;
  mulai: [number, number]; // [bulan, tgl]
  akhir: [number, number];
  watak: string;
}
const MONGSO: MongsoItem[] = [
  { nama: "Kasa", urutan: 1, mulai: [6, 22], akhir: [8, 1], watak: "Mandiri dan tahan banting, suka menata diri, kadang senang menyendiri." },
  { nama: "Karo", urutan: 2, mulai: [8, 2], akhir: [8, 24], watak: "Tegas, hemat, dan pekerja keras, tahan menghadapi kesulitan." },
  { nama: "Katelu", urutan: 3, mulai: [8, 25], akhir: [9, 18], watak: "Ulet dan telaten, pandai mencari rezeki, tekun berusaha." },
  { nama: "Kapat", urutan: 4, mulai: [9, 19], akhir: [10, 13], watak: "Ramah dan penyabar, pandai bergaul, mudah menarik simpati." },
  { nama: "Kalima", urutan: 5, mulai: [10, 14], akhir: [11, 9], watak: "Penuh harapan dan kreatif, murah hati, dan optimis." },
  { nama: "Kanem", urutan: 6, mulai: [11, 10], akhir: [12, 22], watak: "Periang dan beruntung, disukai banyak orang, hidup penuh warna." },
  { nama: "Kapitu", urutan: 7, mulai: [12, 23], akhir: [2, 3], watak: "Pemberani dan tabah, kuat menghadapi cobaan hidup." },
  { nama: "Kawolu", urutan: 8, mulai: [2, 4], akhir: [3, 1], watak: "Sabar dan telaten, penuh perhitungan, tekun menata masa depan." },
  { nama: "Kasanga", urutan: 9, mulai: [3, 2], akhir: [3, 26], watak: "Bijaksana dan dermawan, suka menolong, berhati lembut." },
  { nama: "Kasadasa", urutan: 10, mulai: [3, 27], akhir: [4, 19], watak: "Setia dan penyayang, rajin dan hidup tertata, mencintai keluarga." },
  { nama: "Desta", urutan: 11, mulai: [4, 20], akhir: [5, 12], watak: "Pemurah dan penyayang, rela berkorban demi orang yang dikasihi." },
  { nama: "Sada", urutan: 12, mulai: [5, 13], akhir: [6, 21], watak: "Teguh dan mandiri, hati-hati menjaga diri, hemat dan tertib." },
];
function fmtTgl(p: [number, number]) {
  return `${p[1]} ${BULAN_INDO[p[0] - 1]}`;
}
function hitungMongso(m: number, d: number): MongsoInfo {
  const val = m * 100 + d;
  const item =
    MONGSO.find((x) => {
      const a = x.mulai[0] * 100 + x.mulai[1];
      const b = x.akhir[0] * 100 + x.akhir[1];
      return a <= b ? val >= a && val <= b : val >= a || val <= b; // Kapitu lintas tahun
    }) ?? MONGSO[0];
  return {
    nama: item.nama,
    urutan: item.urutan,
    rentang: `${fmtTgl(item.mulai)} – ${fmtTgl(item.akhir)}`,
    watak: item.watak,
  };
}

// ---- Bintang / Zodiak (matahari) ----
interface ZodiakItem {
  nama: string;
  mulai: [number, number];
  watak: string;
}
const ZODIAK: ZodiakItem[] = [
  { nama: "Capricorn", mulai: [12, 22], watak: "Disiplin, gigih, bertanggung jawab, dan tekun mengejar tujuan." },
  { nama: "Aquarius", mulai: [1, 20], watak: "Mandiri, kreatif, humanis, dan berpikiran terbuka." },
  { nama: "Pisces", mulai: [2, 19], watak: "Peka, penuh empati, imajinatif, dan penyayang." },
  { nama: "Aries", mulai: [3, 21], watak: "Pemberani, penuh semangat, pemimpin, dan pantang menyerah." },
  { nama: "Taurus", mulai: [4, 20], watak: "Sabar, setia, pekerja keras, dan menyukai kenyamanan." },
  { nama: "Gemini", mulai: [5, 21], watak: "Cerdas, komunikatif, lincah, dan mudah menyesuaikan diri." },
  { nama: "Cancer", mulai: [6, 21], watak: "Penyayang, setia, peduli keluarga, dan penuh perasaan." },
  { nama: "Leo", mulai: [7, 23], watak: "Percaya diri, dermawan, berwibawa, dan suka tampil." },
  { nama: "Virgo", mulai: [8, 23], watak: "Teliti, rapi, analitis, dan suka menolong." },
  { nama: "Libra", mulai: [9, 23], watak: "Adil, ramah, pandai bergaul, dan menyukai keselarasan." },
  { nama: "Scorpio", mulai: [10, 23], watak: "Berkemauan kuat, setia, penuh gairah, dan tajam intuisinya." },
  { nama: "Sagitarius", mulai: [11, 22], watak: "Optimis, jujur, menyukai kebebasan, dan gemar bertualang." },
];
function hitungZodiak(m: number, d: number): ZodiakInfo {
  const val = m * 100 + d;
  let pick = ZODIAK[0]; // default Capricorn (akhir Des)
  let nextStart: [number, number] = [12, 21];
  for (let i = 0; i < ZODIAK.length; i++) {
    const cur = ZODIAK[i];
    const a = cur.mulai[0] * 100 + cur.mulai[1];
    const next = ZODIAK[(i + 1) % ZODIAK.length].mulai;
    const b = next[0] * 100 + next[1];
    if (a <= b ? val >= a && val < b : val >= a || val < b) {
      pick = cur;
      nextStart = next;
      break;
    }
  }
  const akhir: [number, number] = [
    nextStart[0],
    nextStart[1] - 1 < 1 ? 31 : nextStart[1] - 1,
  ];
  return {
    nama: pick.nama,
    rentang: `${fmtTgl(pick.mulai)} – ${fmtTgl(akhir)}`,
    watak: pick.watak,
  };
}

// ---- Kalender Jawa & Hijriah (tabular) ----
const BULAN_JAWA = [
  "Sura", "Sapar", "Mulud", "Bakda Mulud", "Jumadilawal", "Jumadilakir",
  "Rejeb", "Ruwah", "Pasa", "Sawal", "Sela", "Besar",
];
const BULAN_HIJRI = [
  "Muharram", "Safar", "Rabiul Awal", "Rabiul Akhir", "Jumadil Awal", "Jumadil Akhir",
  "Rajab", "Sya'ban", "Ramadhan", "Syawal", "Dzulqa'dah", "Dzulhijjah",
];
const TAUN_JAWA = ["Alip", "Ehe", "Jimawal", "Je", "Dal", "Be", "Wawu", "Jimakir"];
const WINDU_JAWA = ["Adi", "Kuntara", "Sangara", "Sancaya"];

function gregToJDN(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const y2 = y + 4800 - a;
  const m2 = m + 12 * a - 3;
  return (
    d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 +
    Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045
  );
}
// Konversi JDN -> tanggal Hijriah tabular (epoch Jumat, 1948440).
function jdnToHijri(jd: number): { year: number; month: number; day: number } {
  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { year, month, day };
}
function hitungKalender(y: number, m: number, d: number): KalenderInfo {
  const jd = gregToJDN(y, m, d);
  const h = jdnToHijri(jd);
  // Kalender Jawa (era Asapon) = Hijriah tabular pada JDN-1, tahun + 512.
  const jw = jdnToHijri(jd - 1);
  const taunJawa = jw.year + 512;
  const taunIdx = ((taunJawa + 5) % 8 + 8) % 8;
  const alip = taunJawa - taunIdx;
  const winduIdx = (((Math.floor((alip - 1931) / 8)) % 4) + 4) % 4;
  return {
    jawa: `${jw.day} ${BULAN_JAWA[jw.month - 1]} ${taunJawa}`,
    jawaTaun: TAUN_JAWA[taunIdx],
    jawaWindu: WINDU_JAWA[winduIdx],
    hijri: `${h.day} ${BULAN_HIJRI[h.month - 1]} ${h.year} H`,
  };
}

// ---- Sifat per hari & pasaran (untuk daftar "sifat menonjol") ----
const DINA_SIFAT: Record<string, string[]> = {
  Minggu: ["Percaya diri & senang tampil", "Kreatif dan berjiwa pemimpin", "Menyukai kebebasan"],
  Senin: ["Lembut dan penuh perhatian", "Ramah & mudah bergaul", "Kadang ragu mengambil keputusan"],
  Selasa: ["Pekerja keras dan ambisius", "Tegas dan pemberani", "Kadang mudah emosi"],
  Rabu: ["Cerdas dan komunikatif", "Pandai bicara & bernegosiasi", "Mudah menyesuaikan diri"],
  Kamis: ["Bijaksana dan berwibawa", "Dermawan / suka menolong", "Berpikir jauh ke depan"],
  Jumat: ["Setia dan penuh kasih sayang", "Religius dan sederhana", "Berbudi halus, halus tutur kata"],
  Sabtu: ["Ulet, tekun, dan hemat", "Teguh pendirian", "Kadang keras kepala"],
};
const PASARAN_SIFAT: Record<string, string[]> = {
  Legi: ["Ramah dan murah hati", "Menarik simpati banyak orang", "Penyabar"],
  Pahing: ["Berkemauan kuat dan mandiri", "Gigih mencari rezeki", "Pandai mengatur materi"],
  Pon: ["Cekatan dan suka menolong", "Pandai bergaul", "Ringan tangan"],
  Wage: ["Jujur dan teguh pendirian", "Mandiri", "Pantang mundur / keras hati"],
  Kliwon: ["Peka dan berwibawa", "Berfirasat tajam / spiritual", "Pandai berbicara"],
};
const PASARAN_ASMARA: Record<string, string> = {
  Legi: "Setia dan romantis, mudah menarik hati pasangan, namun bisa pencemburu.",
  Pahing: "Mandiri dan penuntut dalam cinta, ingin dihargai, dan setia bila dihormati.",
  Pon: "Hangat dan penuh perhatian, pandai memikat, dan mudah jatuh hati.",
  Wage: "Mencintai dengan dalam dan setia, sulit melupakan, kadang seorang pencemburu.",
  Kliwon: "Peka dan penuh perasaan, romantis, dan membutuhkan pasangan yang mengerti.",
};

function tingkatRejeki(neptu: number): string {
  if (neptu >= 14) return "Secara umum rezekinya besar dan lancar, sering mendapat kemudahan dan keberuntungan.";
  if (neptu >= 10) return "Secara umum rezekinya cukup dan stabil, naik-turun mengikuti besarnya usaha.";
  return "Rezekinya datang dari ketekunan dan kesabaran; hasil terbaik diperoleh lewat usaha yang telaten.";
}

// ---- Bio Rhythm (siklus fisik 23, emosi 28, intelek 33) ----
function faseCycle(v: number): string {
  if (v >= 70) return "Puncak (prima)";
  if (v > 15) return "Menanjak / baik";
  if (v >= -15) return "Kritis (labil)";
  if (v > -70) return "Menurun";
  return "Titik terendah";
}
const BIO_TEKS = {
  Fisik: {
    pos: ["Vitalitas, stamina, dan daya tahan tubuh sedang prima — cocok untuk aktivitas berat.", "Tubuh terasa segar dan bertenaga."],
    crit: ["Kondisi fisik sedang dalam masa peralihan / labil — jaga istirahat dan jangan memaksakan diri.", "Lebih rentan lelah dan mudah sakit bila kurang menjaga tubuh."],
    neg: ["Vitalitas dan daya tahan tubuh sedang menurun dari biasanya — perbanyak istirahat.", "Mudah lelah; sebaiknya kurangi aktivitas yang terlalu berat."],
  },
  Emosi: {
    pos: ["Suasana hati cerah dan stabil; kepekaan serta kreativitas sedang baik.", "Mudah bersikap positif, ceria, dan bersemangat."],
    crit: ["Suasana hati dan kejiwaan sedang tidak stabil / sulit ditebak — kadang baik kadang buruk.", "Mudah tersinggung; tahan diri sebelum mengambil keputusan yang emosional."],
    neg: ["Perasaan sedang sensitif dan cenderung murung dari biasanya.", "Kurang bergairah; butuh penyegaran suasana dan hiburan."],
  },
  Intelek: {
    pos: ["Daya pikir, konsentrasi, dan ingatan sedang tajam — mudah memahami dan mempelajari hal baru.", "Lebih cermat dan teliti dari biasanya — baik untuk mengambil keputusan penting."],
    crit: ["Konsentrasi dan ketelitian sedang labil — mudah keliru; periksa ulang pekerjaan penting.", "Pikiran kurang fokus; tunda keputusan rumit bila memungkinkan."],
    neg: ["Daya pikir dan konsentrasi sedang menurun dari biasanya.", "Lebih sulit fokus; sederhanakan pekerjaan yang berat."],
  },
};
function buatCycle(nama: "Fisik" | "Emosi" | "Intelek", v: number): BioCycle {
  const teks = BIO_TEKS[nama];
  const rincian = Math.abs(v) <= 15 ? teks.crit : v > 0 ? teks.pos : teks.neg;
  const kondisi =
    Math.abs(v) <= 15
      ? "labil / tidak menentu"
      : v > 0
      ? "lebih baik dari biasanya"
      : "kurang baik dari biasanya";
  return { nama, nilai: v, fase: faseCycle(v), kondisi, rincian };
}
function hitungBio(birthT: number, todayT: number): BioRhythm {
  const days = Math.round((todayT - birthT) / MS_PER_DAY);
  const pct = (n: number) => Math.round(Math.sin((2 * Math.PI * days) / n) * 100);
  const fisik = buatCycle("Fisik", pct(23));
  const emosi = buatCycle("Emosi", pct(28));
  const intelek = buatCycle("Intelek", pct(33));
  return {
    tanggal: new Date(todayT).toISOString().slice(0, 10),
    hari: days,
    fisik,
    emosi,
    intelek,
    ringkas: `Fisik ${emojiArah(fisik.nilai)} ${fisik.kondisi}, emosi ${emojiArah(
      emosi.nilai,
    )} ${emosi.kondisi}, dan intelektual ${emojiArah(intelek.nilai)} ${intelek.kondisi}.`,
  };
}
function emojiArah(v: number): string {
  if (Math.abs(v) <= 15) return "⚠️";
  return v > 0 ? "▲" : "▼";
}

// ---- Tipe hasil lengkap ----
export interface MongsoInfo {
  nama: string;
  urutan: number;
  rentang: string;
  watak: string;
}
export interface ZodiakInfo {
  nama: string;
  rentang: string;
  watak: string;
}
export interface KalenderInfo {
  jawa: string;
  jawaTaun: string;
  jawaWindu: string;
  hijri: string;
}
export interface SifatItem {
  teks: string;
  bobot: number; // 1..3 (jumlah bintang)
}
export interface BioCycle {
  nama: string;
  nilai: number; // -100..100 (%)
  fase: string;
  kondisi: string;
  rincian: string[];
}
export interface BioRhythm {
  tanggal: string;
  hari: number;
  fisik: BioCycle;
  emosi: BioCycle;
  intelek: BioCycle;
  ringkas: string;
}
export interface RamalanInfo extends WetonInfo {
  tanggalIndo: string;
  wuku: string;
  wukuWatak: string;
  pangarasan: string;
  pangarasanMakna: string;
  pancasuda: string;
  pancasudaMakna: string;
  mongso: MongsoInfo;
  zodiak: ZodiakInfo;
  kalender: KalenderInfo;
  sifat: SifatItem[];
  asmara: string[];
  rejeki: string[];
  bio: BioRhythm;
}

function gabungSifat(...kelompok: Array<{ items: string[]; bobot: number }>): SifatItem[] {
  const bobotMap = new Map<string, number>();
  const teksMap = new Map<string, string>();
  for (const { items, bobot } of kelompok) {
    for (const t of items) {
      // normalisasi agar "A & B" dan "A dan B" dianggap sama (anti-duplikat)
      const key = t
        .toLowerCase()
        .replace(/&/g, "dan")
        .replace(/[.,]+$/, "")
        .replace(/\s+/g, " ")
        .trim();
      bobotMap.set(key, Math.max(bobotMap.get(key) ?? 0, bobot));
      if (!teksMap.has(key)) teksMap.set(key, t); // teks asli, kemunculan pertama
    }
  }
  return [...bobotMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, bobot]) => ({ teks: teksMap.get(key) ?? key, bobot }));
}

/**
 * Ramalan kepribadian lengkap dari tanggal lahir.
 * @param tgl tanggal lahir "YYYY-MM-DD"
 * @param todayISO tanggal acuan untuk bio rhythm (default: hari ini)
 */
export function hitungRamalan(
  tgl: string | null | undefined,
  todayISO?: string,
): RamalanInfo | null {
  const w = hitungWeton(tgl);
  if (!w) return null;
  const [y, m, d] = (tgl as string).split("-").map((n) => parseInt(n, 10));
  const t = Date.UTC(y, m - 1, d);

  const wuku = hitungWuku(t);
  const pancasuda = hitungPancasuda(w.neptu);
  const pangarasan = hitungPangarasan(w.neptu);
  const mongso = hitungMongso(m, d);
  const zodiak = hitungZodiak(m, d);
  const kalender = hitungKalender(y, m, d);

  const sifat = gabungSifat(
    { items: wuku.sifat, bobot: 3 },
    { items: DINA_SIFAT[w.hari] ?? [], bobot: 3 },
    { items: PASARAN_SIFAT[w.pasaran] ?? [], bobot: 2 },
    { items: pancasuda.sifat, bobot: 2 },
    { items: pangarasan.sifat, bobot: 1 },
    { items: [mongso.watak.replace(/\.$/, "")], bobot: 1 },
  );

  const asmara = [
    PASARAN_ASMARA[w.pasaran] ?? "",
    w.neptu >= 13
      ? "Berwibawa di mata pasangan; cocok dengan orang yang sabar dan mau mengalah."
      : "Membutuhkan pasangan yang pengertian dan mampu menumbuhkan rasa percaya diri.",
    "Bila sudah cinta, sulit melepaskan dan selalu memikirkan keluarga.",
  ].filter(Boolean);

  const rejeki = [
    `${pancasuda.nama}: ${pancasuda.makna}`,
    `${pangarasan.nama}: ${pangarasan.makna}`,
    tingkatRejeki(w.neptu),
  ];

  const todayT = todayISO && DATE_RE.test(todayISO)
    ? Date.UTC(
        +todayISO.slice(0, 4),
        +todayISO.slice(5, 7) - 1,
        +todayISO.slice(8, 10),
      )
    : Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate(),
      );
  const bio = hitungBio(t, todayT);

  return {
    ...w,
    tanggalIndo: formatTanggalIndo(tgl),
    wuku: wuku.nama,
    wukuWatak: wuku.watak,
    pangarasan: pangarasan.nama,
    pangarasanMakna: pangarasan.makna,
    pancasuda: pancasuda.nama,
    pancasudaMakna: pancasuda.makna,
    mongso,
    zodiak,
    kalender,
    sifat,
    asmara,
    rejeki,
    bio,
  };
}
