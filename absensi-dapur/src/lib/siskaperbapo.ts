// Integrasi harga pasar SISKAPERBAPO (Disperindag Jawa Timur).
// Situs tak punya API resmi; data tabel dimuat lewat endpoint internal
// `/harga/tabel.nodesign/` (HTML). Kita ambil & parse di server (tanpa CORS),
// dengan cache pendek + degradasi anggun bila situs tak bisa diakses.

// Situs bisa mengubah markup/endpoint sewaktu-waktu. Coba beberapa varian
// endpoint berurutan agar integrasi tetap hidup "apapun caranya".
const BASES = [
  // Varian tanpa trailing-slash didahulukan supaya lolos 301 redirect (lebih cepat).
  "https://siskaperbapo.jatimprov.go.id/harga/tabel.nodesign",
  "https://siskaperbapo.jatimprov.go.id/harga/tabel.nodesign/",
  "https://siskaperbapo.jatimprov.go.id/harga/tabel",
  "https://siskaperbapo.jatimprov.go.id/harga/tabel/",
  "https://siskaperbapo.jatimprov.go.id/harga/",
];

/** 38 kabupaten/kota Jawa Timur (value = parameter `kabkota`). "" = rata-rata provinsi. */
export const KABKOTA_JATIM: { value: string; label: string }[] = [
  { value: "", label: "Rata-rata Provinsi Jawa Timur" },
  { value: "bangkalankab", label: "Kabupaten Bangkalan" },
  { value: "banyuwangikab", label: "Kabupaten Banyuwangi" },
  { value: "blitarkab", label: "Kabupaten Blitar" },
  { value: "bojonegorokab", label: "Kabupaten Bojonegoro" },
  { value: "bondowosokab", label: "Kabupaten Bondowoso" },
  { value: "gresikkab", label: "Kabupaten Gresik" },
  { value: "jemberkab", label: "Kabupaten Jember" },
  { value: "jombangkab", label: "Kabupaten Jombang" },
  { value: "kedirikab", label: "Kabupaten Kediri" },
  { value: "lamongankab", label: "Kabupaten Lamongan" },
  { value: "lumajangkab", label: "Kabupaten Lumajang" },
  { value: "madiunkab", label: "Kabupaten Madiun" },
  { value: "magetankab", label: "Kabupaten Magetan" },
  { value: "malangkab", label: "Kabupaten Malang" },
  { value: "mojokertokab", label: "Kabupaten Mojokerto" },
  { value: "nganjukkab", label: "Kabupaten Nganjuk" },
  { value: "ngawikab", label: "Kabupaten Ngawi" },
  { value: "pacitankab", label: "Kabupaten Pacitan" },
  { value: "pamekasankab", label: "Kabupaten Pamekasan" },
  { value: "pasuruankab", label: "Kabupaten Pasuruan" },
  { value: "ponorogokab", label: "Kabupaten Ponorogo" },
  { value: "probolinggokab", label: "Kabupaten Probolinggo" },
  { value: "sampangkab", label: "Kabupaten Sampang" },
  { value: "sidoarjokab", label: "Kabupaten Sidoarjo" },
  { value: "situbondokab", label: "Kabupaten Situbondo" },
  { value: "sumenepkab", label: "Kabupaten Sumenep" },
  { value: "trenggalekkab", label: "Kabupaten Trenggalek" },
  { value: "tubankab", label: "Kabupaten Tuban" },
  { value: "tulungagungkab", label: "Kabupaten Tulungagung" },
  { value: "batukota", label: "Kota Batu" },
  { value: "blitarkota", label: "Kota Blitar" },
  { value: "kedirikota", label: "Kota Kediri" },
  { value: "madiunkota", label: "Kota Madiun" },
  { value: "malangkota", label: "Kota Malang" },
  { value: "mojokertokota", label: "Kota Mojokerto" },
  { value: "pasuruankota", label: "Kota Pasuruan" },
  { value: "probolinggokota", label: "Kota Probolinggo" },
  { value: "surabayakota", label: "Kota Surabaya" },
];

const KABKOTA_SET = new Set(KABKOTA_JATIM.map((k) => k.value));
export function isKabkotaValid(v: string): boolean {
  return KABKOTA_SET.has(v);
}
export function labelKabkota(v: string): string {
  return KABKOTA_JATIM.find((k) => k.value === v)?.label || "Rata-rata Provinsi Jawa Timur";
}

export interface KomoditasPasar {
  id: string;
  nama: string;
  satuan: string;
  harga: number; // Rupiah (harga "sekarang")
}

export interface HargaPasar {
  tanggal: string;
  kabkota: string;
  label: string;
  komoditas: KomoditasPasar[];
  sumber: "live" | "cache";
}

/** Ubah "126.250" / "14.991" (format ribuan Indonesia) → number. */
function parseRupiah(s: string): number {
  const n = parseInt(s.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}
const SATUAN_RE = /\b(kg|gram|ons|liter|ltr|butir|ikat|buah|ekor|bungkus|sisir|papan|pack|sachet|botol|bh|100\s?gram)\b/i;

/** Fallback generik: baca baris <tr> tabel apa pun (tahan perubahan markup). */
function parseGenerik(html: string): KomoditasPasar[] {
  const out: KomoditasPasar[] = [];
  const seen = new Set<string>();
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  for (const row of rows) {
    const cells = (row.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || []).map(stripTags);
    if (cells.length < 2) continue;
    const nama = cells.find(
      (c) => c.length > 2 && c.length < 60 && /[a-zA-Z]/.test(c) && parseRupiah(c) === 0 && !SATUAN_RE.test(c),
    );
    if (!nama || /komoditas|nama|satuan|harga|no\.?$|perubahan/i.test(nama)) continue;
    let harga = 0;
    for (const c of cells) {
      const v = parseRupiah(c);
      if (v >= 100 && v > harga) harga = v;
    }
    if (harga === 0) continue;
    const key = nama.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const satuan = (cells.find((c) => SATUAN_RE.test(c))?.match(SATUAN_RE)?.[0] ?? "").toLowerCase();
    out.push({ id: String(out.length + 1), nama, satuan, harga });
    if (out.length >= 200) break;
  }
  return out;
}

/** Ambil baris komoditas (nama, satuan, harga sekarang) dari HTML SISKAPERBAPO. */
export function parseTabel(html: string): KomoditasPasar[] {
  // 1) Pola spesifik SISKAPERBAPO — atribut bisa pakai kutip ' maupun ".
  const re =
    /data-commodity-id=['"](\d+)['"][^>]*>([^<]+)<\/span>\s*<\/td>\s*<td>([^<]*)<\/td>[\s\S]*?sekarang["']?\s*>?\s*([\d.]+)/g;
  const out: KomoditasPasar[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const nama = m[2].trim();
    const satuan = m[3].trim();
    const harga = parseRupiah(m[4]);
    if (nama && harga > 0) out.push({ id: m[1], nama, satuan, harga });
  }
  if (out.length > 0) return out;
  // 2) Fallback generik bila pola spesifik gagal (markup berubah).
  return parseGenerik(html);
}

const cache = new Map<string, { at: number; val: KomoditasPasar[]; tanggal: string }>();
const TTL_MS = 60 * 60 * 1000; // 1 jam
const MAX_MUNDUR = 4; // coba tanggal diminta + hingga 3 hari sebelumnya (libur/data belum tayang)

/** Mundur `hari` dari tanggal "YYYY-MM-DD"; kembalikan format sama. */
function mundurHari(tanggal: string, hari: number): string {
  const d = new Date(`${tanggal}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return tanggal;
  d.setUTCDate(d.getUTCDate() - hari);
  return d.toISOString().slice(0, 10);
}

interface HasilAmbil {
  reachable: boolean; // true bila minimal satu endpoint merespons (res.ok)
  komoditas: KomoditasPasar[];
}

/** Ambil data untuk satu tanggal, mencoba semua varian endpoint berurutan. */
async function ambilUntukTanggal(kab: string, tanggal: string): Promise<HasilAmbil> {
  const params = `?tanggal=${encodeURIComponent(tanggal)}&kabkota=${encodeURIComponent(kab)}&pasar=`;
  let reachable = false;
  for (const base of BASES) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    try {
      const res = await fetch(base + params, {
        signal: ctrl.signal,
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
        cache: "no-store",
      });
      if (!res.ok) continue;
      reachable = true;
      const html = await res.text();
      const komoditas = parseTabel(html);
      if (komoditas.length === 0) continue;
      return { reachable: true, komoditas };
    } catch {
      // coba endpoint berikutnya
    } finally {
      clearTimeout(timer);
    }
  }
  return { reachable, komoditas: [] };
}

/**
 * Ambil harga pasar untuk kab/kota + tanggal tertentu. Bila tanggal diminta
 * kosong (mis. data hari ini belum tayang / akhir pekan) tapi situs bisa diakses,
 * mundur beberapa hari otomatis. Mengembalikan null hanya bila situs tak bisa
 * diakses sama sekali / tak ada data (pemanggil menangani fallback manual).
 * Field `tanggal` pada hasil = tanggal data yang benar-benar ditemukan.
 */
export async function ambilHargaPasar(
  kabkota: string,
  tanggal: string,
): Promise<HargaPasar | null> {
  const kab = isKabkotaValid(kabkota) ? kabkota : "";
  const key = `${kab}|${tanggal}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return {
      tanggal: hit.tanggal,
      kabkota: kab,
      label: labelKabkota(kab),
      komoditas: hit.val,
      sumber: "cache",
    };
  }

  for (let i = 0; i < MAX_MUNDUR; i++) {
    const tgl = i === 0 ? tanggal : mundurHari(tanggal, i);
    const { reachable, komoditas } = await ambilUntukTanggal(kab, tgl);
    if (komoditas.length > 0) {
      cache.set(key, { at: Date.now(), val: komoditas, tanggal: tgl });
      return { tanggal: tgl, kabkota: kab, label: labelKabkota(kab), komoditas, sumber: "live" };
    }
    // Situs tak bisa diakses sama sekali → mundur tanggal tak akan menolong, hentikan.
    if (!reachable) break;
  }
  return null;
}
