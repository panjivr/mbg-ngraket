/**
 * Data awal lembaga penerima insentif PIC (mengikuti "Database Laporan Insentif
 * PM"). Dipakai sebagai isian default pada halaman BA Insentif Penerima Manfaat
 * (`/cetak/akuntan/insentif-pm`). Semua bidang bisa diubah di halaman; PM & hari
 * biasanya diisi per periode. Nominal = insentif per PM; Total = PM × hari × nominal.
 */
export interface LembagaPM {
  nama: string;
  /** Nominal insentif per penerima manfaat (angka rupiah). */
  nominal: number;
  /** Nama PIC / penanggung jawab yang menerima insentif. */
  pic: string;
  bank: string;
  rekening: string;
}

export const LEMBAGA_PM_DEFAULT: LembagaPM[] = [
  { nama: "PG WIJAYA NGRAKET", nominal: 20000, pic: "Elik Ernawati", bank: "BNI", rekening: "2028197570" },
  { nama: "KB PERMATA NUSANTARA DADAPAN", nominal: 20000, pic: "Fifi Aida Nur Rohmah", bank: "BRI", rekening: "811401011150538" },
  { nama: "KB AL FATTAH SINGKIL", nominal: 20000, pic: "Rima Kusumawaty", bank: "BRI", rekening: "650101041414531" },
  { nama: "KB PKK MELATI", nominal: 20000, pic: "Sri Sulichah", bank: "BNI", rekening: "1472606890" },
  { nama: "PG NGAMBAR ARUM", nominal: 20000, pic: "Ayu Riska Yesi Anggraini", bank: "BNI", rekening: "2029813851" },
  { nama: "TK DHARMA WANITA NGRAKET", nominal: 20000, pic: "Ika Nur Layly Rindia Rahmawati", bank: "Bank Jatim", rekening: "1796010157" },
  { nama: "TK DHARMA WANITA SEDARAT", nominal: 20000, pic: "Sulistiyah", bank: "Bank Jatim", rekening: "202380743" },
  { nama: "TK DHARMA WANITA DADAPAN", nominal: 20000, pic: "Mariana Ulfa", bank: "BRI", rekening: "220401006368505" },
  { nama: "TK DHARMA WANITA SINGKIL", nominal: 20000, pic: "Tutik Nurwanti Akson", bank: "BRI", rekening: "811401000182534" },
  { nama: "RA MUSLIMAT NU 059 SINGKIL", nominal: 20000, pic: "Sri Wahyuni", bank: "BNI", rekening: "341972365" },
  { nama: "TK DHARMA WANITA PURWOREJO", nominal: 20000, pic: "Sindhi Pratiwi", bank: "BRI", rekening: "650101029910535" },
  { nama: "RA TERPADU AL MADINAH", nominal: 30000, pic: "Titik Prasetyawati", bank: "BRI", rekening: "811401001912534" },
  { nama: "SD NEGERI NGRAKET", nominal: 20000, pic: "Bayu Sulistiono", bank: "BRI", rekening: "7001073698504" },
  { nama: "SD NEGERI DADAPAN", nominal: 20000, pic: "Yopi Muklison", bank: "Bank Jatim", rekening: "1792217041" },
  { nama: "SD NEGERI SINGKIL", nominal: 30000, pic: "Ahmad Nurhadi", bank: "BNI", rekening: "1799080183" },
  { nama: "SD NEGERI PURWOREJO", nominal: 30000, pic: "Retno Sujarwatiningsih, S.Pd", bank: "BRI", rekening: "7001013999538" },
  { nama: "SD NEGERI JALEN", nominal: 20000, pic: "Rani Mei Wulandari", bank: "Bank Jatim", rekening: "512113290" },
  { nama: "MIS HIDAYATUL MUBTADI-IN", nominal: 30000, pic: "Solikin", bank: "BRI", rekening: "650101029013537" },
  { nama: "MTS MIFTAHUL ULUM", nominal: 30000, pic: "Dianing Marikayanti", bank: "BSI", rekening: "1035368578" },
  { nama: "MAS MIFTAHUL ULUM", nominal: 20000, pic: "Laela Uswatun Khasanah", bank: "BRI", rekening: "811401002697501" },
  { nama: "SMP NEGERI 2 BALONG", nominal: 50000, pic: "Ristya Widyaswari (Bendahara)", bank: "Mandiri", rekening: "1710015341723" },
  { nama: "POSYANDU NGRAKET", nominal: 1000, pic: "Elik Ernawati", bank: "BNI", rekening: "2028197570" },
  { nama: "POSYANDU PANDAK", nominal: 1000, pic: "Yulianingsih", bank: "Bank Jatim", rekening: "1796025448" },
  { nama: "POSYANDU BULAK", nominal: 1000, pic: "Eny Setyo Rahayu", bank: "Bank Jatim", rekening: "0202322788" },
  { nama: "POSYANDU SEDARAT", nominal: 1000, pic: "Tumijem", bank: "BRI", rekening: "650101004893538" },
  { nama: "POSYANDU DADAPAN", nominal: 1000, pic: "Diyah Ernawati", bank: "Bank Jatim", rekening: "1792023599" },
  { nama: "POSYANDU SINGKIL", nominal: 1000, pic: "Sukartini", bank: "BNI", rekening: "915872587" },
  { nama: "POSYANDU BULUKIDUL", nominal: 1000, pic: "Lina Agus Triwulandari", bank: "Bank Jatim", rekening: "202371566" },
];

/** Format angka ke ribuan gaya Indonesia (mis. 20000 → "20.000"). */
export function fmtRibuan(n: number): string {
  return (Number.isFinite(n) ? n : 0).toLocaleString("id-ID");
}

/** Ambil digit dari string bebas (mis. "20.000" → 20000). */
export function angka(s: string | number): number {
  if (typeof s === "number") return s;
  const n = Number(String(s).replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
