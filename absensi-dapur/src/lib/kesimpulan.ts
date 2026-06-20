/**
 * Ringkasan "mistik" singkat untuk kartu pegawai: memadukan Weton (Jawa),
 * Shio & elemen (Tionghoa), dan Numerologi Chaldean (nama) menjadi badge
 * ringkas + satu kesimpulan kepribadian (cocok sebagai pemimpin/anggota,
 * bidang yang sesuai). Dipakai di KartuPegawai (kartu yang bisa dibagikan).
 */
import { hitungWeton } from "./weton";
import { analisaShioFengshui } from "./shioFengshui";
import { analyzeName } from "./chaldean";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const SHIO_EMOJI: Record<string, string> = {
  tikus: "🐀", kerbau: "🐂", macan: "🐅", kelinci: "🐇", naga: "🐉", ular: "🐍",
  kuda: "🐎", kambing: "🐐", monyet: "🐒", ayam: "🐓", anjing: "🐕", babi: "🐖",
};
// Shio & angka yang condong berjiwa pemimpin (heuristik).
const LEADER_SHIO = new Set(["naga", "macan", "kuda", "monyet"]);
const LEADER_ANGKA = new Set([1, 3, 8, 9]);

export interface KartuMistik {
  weton: string | null; // "Jumat Wage"
  neptu: number | null;
  shio: string | null; // "Kuda"
  shioEmoji: string | null;
  elemen: string | null; // "Air"
  headline: string | null; // "Kuda Air"
  angka: number | null; // root numerologi
  planet: string | null; // "Venus"
  peran: string; // "Cocok jadi Pemimpin" / "Andal sebagai Anggota Tim"
  bidang: string; // "sales, travel, hiburan"
  kekuatan: string; // sifat unggulan singkat
  ringkas: string; // kesimpulan satu kalimat
}

/** Ambil 3 bidang pertama dari kalimat karier shio ("Cocok di a, b, c, ..."). */
function bidangSingkat(karier: string): string {
  let s = karier.replace(/^Cocok\s+(di|jadi|menjadi)\s+/i, "");
  s = s.replace(/\.$/, "").replace(/\s+dan\s+/gi, ", ");
  const parts = s.split(",").map((x) => x.trim()).filter(Boolean);
  return parts.slice(0, 3).join(", ");
}

export function kartuMistik(
  nama: string | null | undefined,
  tgl: string | null | undefined,
  _jk?: string | null,
): KartuMistik | null {
  if (!tgl || !DATE_RE.test(tgl)) return null;

  const w = hitungWeton(tgl);

  let shioId: string | null = null;
  let shio: string | null = null;
  let elemen: string | null = null;
  let headline: string | null = null;
  let positif0 = "";
  let karier = "";
  try {
    const sf = analisaShioFengshui((nama || "").trim() || "—", tgl, null) as {
      shio: { id: string; nama: string; positif: string[]; karier: string };
      elemenTahun: { nama: string };
      headline: string;
    };
    shioId = sf.shio.id;
    shio = sf.shio.nama;
    elemen = sf.elemenTahun.nama;
    headline = sf.headline;
    positif0 = sf.shio.positif?.[0] || "";
    karier = sf.shio.karier || "";
  } catch {
    /* abaikan bila gagal */
  }

  let angka: number | null = null;
  let planet: string | null = null;
  const bersih = (nama || "").trim();
  if (bersih && /[A-Za-z]/.test(bersih)) {
    const n = analyzeName(bersih);
    angka = n.root;
    planet = n.planet.planet.replace(/\s*\(.*\)$/, ""); // "Venus", "Matahari"
  }

  let score = 0;
  if (w && w.neptu >= 13) score++;
  if (shioId && LEADER_SHIO.has(shioId)) score++;
  if (angka && LEADER_ANGKA.has(angka)) score++;
  const peran =
    score >= 2
      ? "Cocok jadi Pemimpin"
      : score === 1
      ? "Cocok jadi Koordinator"
      : "Andal sebagai Anggota Tim";

  const bidang = karier ? bidangSingkat(karier) : "";
  const kekuatan = positif0;
  const ringkas =
    `${peran}` +
    (bidang ? ` · unggul di bidang ${bidang}` : "") +
    (kekuatan ? ` · kekuatan: ${kekuatan.toLowerCase()}` : "") +
    ".";

  return {
    weton: w ? w.weton : null,
    neptu: w ? w.neptu : null,
    shio,
    shioEmoji: shioId ? SHIO_EMOJI[shioId] ?? null : null,
    elemen,
    headline,
    angka,
    planet,
    peran,
    bidang,
    kekuatan,
    ringkas,
  };
}
