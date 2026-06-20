// chaldean.ts — Numerologi Chaldean / Planetary. Zero-dependency, siap pakai di Next.js 15 + TS.
// Sumber data: Cheiro, The Book of Numbers (1926/1935).

// ---------- 1. HURUF -> ANGKA ----------
const LETTER_MAP: Record<string, number> = {
  A:1,I:1,J:1,Q:1,Y:1,
  B:2,K:2,R:2,
  C:3,G:3,L:3,S:3,
  D:4,M:4,T:4,
  E:5,H:5,N:5,X:5,
  U:6,V:6,W:6,
  O:7,Z:7,
  F:8,P:8,
};

// ---------- 2. DATA PLANET / ANGKA TUNGGAL ----------
export interface PlanetInfo {
  num: number; planet: string; vedic: string; element: string; // Wu Xing
  trait: string; positive: string; negative: string;
  days: string[]; colors: string[]; gems: string[];
}
export const PLANETS: Record<number, PlanetInfo> = {
  1:{num:1,planet:"Matahari (Sun)",vedic:"Surya",element:"Api/Yang",trait:"Pemimpin, ego, kemauan, originalitas",positive:"Kreatif, original, tegas, mandiri",negative:"Keras kepala, bossy, egois, tidak sabaran",days:["Minggu","Senin"],colors:["emas","kuning","oranye","perunggu"],gems:["topaz","amber","ruby kuning"]},
  2:{num:2,planet:"Bulan (Moon)",vedic:"Chandra",element:"Air/Yin",trait:"Feminin, intuitif, lembut, imajinatif",positive:"Diplomatis, pendamai, sensitif, kooperatif",negative:"Plin-plan, kurang PD, mudah sedih, terlalu sensitif",days:["Senin","Jumat"],colors:["putih","krem","hijau pucat"],gems:["mutiara","moonstone","jade"]},
  3:{num:3,planet:"Jupiter",vedic:"Brihaspati",element:"Kayu (木)",trait:"Ambisi, disiplin, otoritas, ekspansi",positive:"Bertanggung jawab, fokus, percaya diri, naik posisi",negative:"Sombong, otoriter, suka memerintah, keras",days:["Kamis"],colors:["ungu","violet","mauve","biru","merah ros"],gems:["amethyst"]},
  4:{num:4,planet:"Uranus (Rahu)",vedic:"Rahu",element:"Bayangan/Udara",trait:"Pemberontak, tak terduga, reformis, unik",positive:"Original, adil, revolusioner, beda",negative:"Tertutup, penuh rahasia, sering konflik, terisolasi",days:["Sabtu","Minggu"],colors:["abu-abu","electric blue","setengah-warna"],gems:["blue sapphire"]},
  5:{num:5,planet:"Merkurius (Mercury)",vedic:"Budha",element:"Air (水)",trait:"Cerdas, lincah, komunikatif, dagang",positive:"Adaptif, cepat, multitalenta, supel",negative:"Gelisah, impulsif, gampang bosan, sembrono soal uang",days:["Rabu","Jumat"],colors:["abu terang","putih","warna mengkilap"],gems:["berlian","perak"]},
  6:{num:6,planet:"Venus",vedic:"Shukra",element:"Logam (金)",trait:"Cinta, harmoni, seni, pesona, materi",positive:"Penyayang, setia, estetik, magnetik",negative:"Posesif, keras kepala soal cinta, hedonis",days:["Jumat","Selasa","Kamis"],colors:["biru","pink","ros"],gems:["turquoise","emerald"]},
  7:{num:7,planet:"Neptunus (Ketu)",vedic:"Ketu",element:"Bayangan/Air",trait:"Mistik, spiritual, imajinatif, pengembara",positive:"Intuitif, bijak, original, filosofis",negative:"Penyendiri, gelisah, tidak praktis, sulit soal uang",days:["Minggu","Senin"],colors:["hijau","kuning","putih berkilau"],gems:["moonstone","cat's eye","mutiara"]},
  8:{num:8,planet:"Saturnus (Saturn)",vedic:"Shani",element:"Tanah (土)",trait:"Karma, kerja keras, tanggung jawab, ujian",positive:"Kuat, ulet, adil, bijak, sukses lewat perjuangan",negative:"Berat/penuh ujian, kesepian, jatuh-bangun",days:["Sabtu"],colors:["hitam","abu gelap","biru tua","ungu"],gems:["black sapphire","amethyst","black pearl"]},
  9:{num:9,planet:"Mars",vedic:"Mangala",element:"Api (火)",trait:"Energi, keberanian, pejuang, gairah",positive:"Kuat, tangguh, dermawan, idealis",negative:"Agresif, impulsif, suka bertengkar, gegabah",days:["Selasa","Kamis","Jumat"],colors:["merah","crimson","ros"],gems:["ruby","garnet","bloodstone"]},
};

// ---------- 3. COMPOUND NUMBER 10-52 ----------
export interface CompoundInfo { num:number; symbol:string; meaning:string; verdict:"baik"|"buruk"|"netral"|"hati-hati"; }
// "= X" pada Cheiro sudah di-resolve ke makna konkret di bawah.
export const COMPOUNDS: Record<number, CompoundInfo> = {
  10:{num:10,symbol:"Wheel of Fortune (Roda Keberuntungan)",meaning:"Kehormatan, keyakinan diri, naik-turun. Nama dikenal (baik/buruk sesuai niat); rencana cenderung terwujud.",verdict:"baik"},
  11:{num:11,symbol:"Clenched Hand / Lion Muzzled",meaning:"Peringatan bahaya tersembunyi, ujian, dan pengkhianatan; banyak rintangan untuk dilawan.",verdict:"hati-hati"},
  12:{num:12,symbol:"The Sacrifice / The Victim",meaning:"Penderitaan & kecemasan pikiran; jadi korban rencana/intrik orang lain.",verdict:"buruk"},
  13:{num:13,symbol:"Death / Skeleton",meaning:"Perubahan, pergolakan, kuasa & kehancuran. 'Yang paham 13 diberi kuasa'. Bukan sekadar sial; kuasa bila dipakai benar.",verdict:"hati-hati"},
  14:{num:14,symbol:"Movement",meaning:"Gerakan, kombinasi orang/hal, bahaya alam (badai/air/api). Hoki untuk uang & spekulasi, tapi penuh risiko.",verdict:"baik"},
  15:{num:15,symbol:"The Magician",meaning:"Magic, misteri, pesona, retorika, seni & musik. Hoki dapat uang/hadiah. Bisa 'gelap' bila dipasangkan 4/8.",verdict:"baik"},
  16:{num:16,symbol:"Shattered Citadel / Tower Struck by Lightning",meaning:"Kejatuhan fatal, kecelakaan, rencana gagal. Peringatan keras; siapkan rencana cadangan.",verdict:"buruk"},
  17:{num:17,symbol:"Star of the Magi (8-pointed Star of Venus)",meaning:"Sangat spiritual: Damai & Cinta. Keabadian — nama hidup setelah mati. Hoki kecuali dipasangkan 4/8.",verdict:"baik"},
  18:{num:18,symbol:"Bleeding Moon",meaning:"Materialisme melawan spiritual; pertengkaran, perang, revolusi, tipu daya, bahaya elemen. Sangat hati-hati.",verdict:"buruk"},
  19:{num:19,symbol:"The Sun / Prince of Heaven",meaning:"Kebahagiaan, sukses, penghargaan, kehormatan. Sangat menjanjikan.",verdict:"baik"},
  20:{num:20,symbol:"The Awakening / Judgment",meaning:"Panggilan tujuan/ambisi baru untuk misi besar/spiritual. Bukan angka materi; lancar lewat sisi spiritual.",verdict:"netral"},
  21:{num:21,symbol:"The Universe / Crown of the Magi",meaning:"Kemajuan, kehormatan, kenaikan, sukses setelah perjuangan panjang.",verdict:"baik"},
  22:{num:22,symbol:"Good Man Blinded by Folly",meaning:"Ilusi & delusi; hidup di dunia khayal, salah menilai karena pengaruh orang.",verdict:"buruk"},
  23:{num:23,symbol:"Royal Star of the Lion",meaning:"Sukses, bantuan atasan, perlindungan dari yang berkuasa. Salah satu paling hoki.",verdict:"baik"},
  24:{num:24,symbol:"Royal Aid",meaning:"Bantuan & relasi orang berpangkat; untung lewat cinta/lawan jenis.",verdict:"baik"},
  25:{num:25,symbol:"Strength from Experience",meaning:"Kuat lewat ujian & observasi; sukses setelah perjuangan di awal hidup.",verdict:"netral"},
  26:{num:26,symbol:"Grave Warnings",meaning:"Bencana lewat relasi buruk; rugi karena spekulasi, partner, dan nasihat salah.",verdict:"buruk"},
  27:{num:27,symbol:"The Sceptre",meaning:"Otoritas, kuasa, komando; intelek produktif menuai hasil. Jalankan ide sendiri.",verdict:"baik"},
  28:{num:28,symbol:"Contradiction",meaning:"Banyak potensi tapi mudah hilang; rugi karena percaya orang, harus mulai dari nol berulang.",verdict:"buruk"},
  29:{num:29,symbol:"Uncertainty & Treachery",meaning:"Pengkhianatan, tipu daya, teman tak andal, duka dari lawan jenis.",verdict:"buruk"},
  30:{num:30,symbol:"Mental Superiority",meaning:"Superior secara mental & reflektif; menyingkirkan hal materi atas kemauan sendiri. Bisa amat kuat atau acuh.",verdict:"netral"},
  31:{num:31,symbol:"The Recluse",meaning:"Mirip 30 tapi lebih terisolasi & kesepian. Kurang hoki secara materi.",verdict:"buruk"},
  32:{num:32,symbol:"Magic Power",meaning:"Daya magis seperti 5/14/23; kombinasi orang/bangsa. Hoki bila pegang pendapat sendiri.",verdict:"baik"},
  33:{num:33,symbol:"= 24 (Royal Aid)",meaning:"Tanpa potensi sendiri; sama dengan 24: bantuan orang berpangkat, untung lewat cinta.",verdict:"baik"},
  34:{num:34,symbol:"= 25",meaning:"Sama dengan 25: kuat lewat pengalaman & ujian.",verdict:"netral"},
  35:{num:35,symbol:"= 26",meaning:"Sama dengan 26: peringatan rugi lewat relasi/partner buruk.",verdict:"buruk"},
  36:{num:36,symbol:"= 27 (The Sceptre)",meaning:"Sama dengan 27: otoritas & kuasa, jalankan ide sendiri.",verdict:"baik"},
  37:{num:37,symbol:"Friendship",meaning:"Persahabatan & cinta beruntung; kemitraan baik dengan lawan jenis.",verdict:"baik"},
  38:{num:38,symbol:"= 29",meaning:"Sama dengan 29: pengkhianatan & ketidakpastian.",verdict:"buruk"},
  39:{num:39,symbol:"= 30",meaning:"Sama dengan 30: superioritas mental.",verdict:"netral"},
  40:{num:40,symbol:"= 31",meaning:"Sama dengan 31: terisolasi, kurang hoki materi.",verdict:"buruk"},
  41:{num:41,symbol:"= 32",meaning:"Sama dengan 32: daya magis, pegang pendapat sendiri.",verdict:"baik"},
  42:{num:42,symbol:"= 24",meaning:"Sama dengan 24: bantuan bangsawan, untung lewat cinta.",verdict:"baik"},
  43:{num:43,symbol:"Revolution",meaning:"Pemberontakan, pergolakan, kegagalan, halangan.",verdict:"buruk"},
  44:{num:44,symbol:"= 26",meaning:"Sama dengan 26: peringatan rugi lewat relasi buruk.",verdict:"buruk"},
  45:{num:45,symbol:"= 27",meaning:"Sama dengan 27: otoritas & kuasa.",verdict:"baik"},
  46:{num:46,symbol:"= 37",meaning:"Sama dengan 37: persahabatan & kemitraan beruntung.",verdict:"baik"},
  47:{num:47,symbol:"= 29",meaning:"Sama dengan 29: pengkhianatan & ketidakpastian.",verdict:"buruk"},
  48:{num:48,symbol:"= 30",meaning:"Sama dengan 30: superioritas mental.",verdict:"netral"},
  49:{num:49,symbol:"= 31",meaning:"Sama dengan 31: terisolasi.",verdict:"buruk"},
  50:{num:50,symbol:"= 32",meaning:"Sama dengan 32: daya magis.",verdict:"baik"},
  51:{num:51,symbol:"The Warrior",meaning:"Daya kuat: sifat prajurit, kemajuan mendadak, baik untuk militer/pemimpin; tapi ancaman musuh & bahaya.",verdict:"hati-hati"},
  52:{num:52,symbol:"= 43 (Revolution)",meaning:"Sama dengan 43: pergolakan & kegagalan.",verdict:"buruk"},
};

// ---------- 4. FUNGSI INTI ----------
const reduceToSingle = (n: number): number => {
  while (n > 9) n = String(n).split("").reduce((a,d)=>a+(+d),0);
  return n;
};
const cleanLetters = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, "");

/** Resolusi compound > 52: jumlahkan digit sampai masuk 10-52 atau jadi tunggal. */
function resolveCompound(sum: number): number {
  let n = sum;
  while (n > 52) n = String(n).split("").reduce((a,d)=>a+(+d),0);
  return n;
}

export interface NameResult {
  name: string;
  compound: number;
  root: number;
  compoundInfo?: CompoundInfo;
  planet: PlanetInfo;
  breakdown: { letter: string; value: number }[];
}

/** Analisa nama (Destiny/Expression Number). */
export function analyzeName(name: string): NameResult {
  const letters = cleanLetters(name).split("");
  const breakdown = letters.map(l => ({ letter: l, value: LETTER_MAP[l] ?? 0 }));
  const sum = breakdown.reduce((a, b) => a + b.value, 0);
  const compound = resolveCompound(sum);
  const root = reduceToSingle(sum);
  return {
    name,
    compound,
    root,
    compoundInfo: COMPOUNDS[compound],
    planet: PLANETS[root],
    breakdown,
  };
}

/** Birth/Psychic Number dari tanggal lahir (hanya tanggal 1-31). */
export function analyzeBirthDay(day: number) {
  const root = reduceToSingle(day);
  return { day, root, planet: PLANETS[root] };
}

/** Life Path dari tanggal lahir lengkap (YYYY-MM-DD). */
export function analyzeLifePath(dateISO: string) {
  const digits = dateISO.replace(/[^0-9]/g, "").split("").map(Number);
  const sum = digits.reduce((a, b) => a + b, 0);
  return { root: reduceToSingle(sum), compound: resolveCompound(sum), planet: PLANETS[reduceToSingle(sum)] };
}

// ---------- 5. KOMPATIBILITAS ----------
// 1=harmonis, 0=netral, -1=menantang
const COMPAT: Record<number, Record<number, number>> = {
  1:{1:1,2:1,3:0,4:1,5:1,6:0,7:1,8:-1,9:0},
  2:{1:1,2:1,3:0,4:1,5:1,6:1,7:1,8:0,9:0},
  3:{1:0,2:0,3:1,4:0,5:1,6:1,7:0,8:0,9:1},
  4:{1:1,2:1,3:0,4:1,5:1,6:0,7:1,8:1,9:0},
  5:{1:1,2:1,3:1,4:1,5:1,6:1,7:1,8:1,9:1},
  6:{1:0,2:1,3:1,4:0,5:1,6:1,7:0,8:0,9:1},
  7:{1:1,2:1,3:0,4:1,5:1,6:0,7:1,8:1,9:0},
  8:{1:-1,2:0,3:0,4:1,5:1,6:0,7:1,8:1,9:0},
  9:{1:0,2:0,3:1,4:0,5:1,6:1,7:0,8:0,9:1},
};
export function compatibility(a: number, b: number) {
  const score = COMPAT[a]?.[b] ?? 0;
  const label = score === 1 ? "Harmonis" : score === -1 ? "Menantang" : "Netral";
  return { a, b, score, label };
}

// ---------- 6. PROFIL GABUNGAN (untuk integrasi Shio + Fengsui) ----------
export interface FullProfile {
  name: NameResult;
  birth?: ReturnType<typeof analyzeBirthDay>;
  lifePath?: ReturnType<typeof analyzeLifePath>;
  nameVsBirth?: ReturnType<typeof compatibility>;
  luckyColors: string[];
  luckyDays: string[];
  luckyGems: string[];
  wuXingElement: string; // jembatan ke Fengsui/Shio
}
export function buildProfile(name: string, dateISO?: string): FullProfile {
  const nameRes = analyzeName(name);
  const p = nameRes.planet;
  const profile: FullProfile = {
    name: nameRes,
    luckyColors: p.colors,
    luckyDays: p.days,
    luckyGems: p.gems,
    wuXingElement: p.element,
  };
  if (dateISO) {
    const day = new Date(dateISO).getDate();
    profile.birth = analyzeBirthDay(day);
    profile.lifePath = analyzeLifePath(dateISO);
    profile.nameVsBirth = compatibility(nameRes.root, profile.birth.root);
  }
  return profile;
}

/* CONTOH PAKAI:
import { buildProfile } from "./chaldean";
const profil = buildProfile("Panji Vatorrohman", "2002-05-23");
console.log(profil.name.compound, profil.name.root, profil.wuXingElement);
*/
