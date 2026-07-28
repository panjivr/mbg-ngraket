// Integrasi harga pasar SISKAPERBAPO (Disperindag Jawa Timur).
// Situs tak punya API resmi; data tabel dimuat lewat endpoint internal
// `/harga/tabel.nodesign/` (HTML). Kita ambil & parse di server (tanpa CORS),
// dengan cache pendek + degradasi anggun bila situs tak bisa diakses.

const BASE = "https://siskaperbapo.jatimprov.go.id/harga/tabel.nodesign/";

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

/** Ambil baris komoditas (nama, satuan, harga sekarang) dari HTML tabel.nodesign. */
export function parseTabel(html: string): KomoditasPasar[] {
  const re =
    /data-commodity-id='(\d+)'>([^<]+)<\/span>\s*<\/td>\s*<td>([^<]*)<\/td>[\s\S]*?sekarang">([\d.]+)</g;
  const out: KomoditasPasar[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const nama = m[2].trim();
    const satuan = m[3].trim();
    const harga = parseRupiah(m[4]);
    if (nama && harga > 0) out.push({ id: m[1], nama, satuan, harga });
  }
  return out;
}

const cache = new Map<string, { at: number; val: KomoditasPasar[] }>();
const TTL_MS = 60 * 60 * 1000; // 1 jam

/**
 * Ambil harga pasar untuk kab/kota + tanggal tertentu. Mengembalikan null bila
 * situs tak bisa diakses / tak ada data (pemanggil menangani fallback manual).
 */
export async function ambilHargaPasar(
  kabkota: string,
  tanggal: string,
): Promise<HargaPasar | null> {
  const kab = isKabkotaValid(kabkota) ? kabkota : "";
  const key = `${kab}|${tanggal}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return { tanggal, kabkota: kab, label: labelKabkota(kab), komoditas: hit.val, sumber: "cache" };
  }

  const url = `${BASE}?tanggal=${encodeURIComponent(tanggal)}&kabkota=${encodeURIComponent(kab)}&pasar=`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const komoditas = parseTabel(html);
    if (komoditas.length === 0) return null;
    cache.set(key, { at: Date.now(), val: komoditas });
    return { tanggal, kabkota: kab, label: labelKabkota(kab), komoditas, sumber: "live" };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
