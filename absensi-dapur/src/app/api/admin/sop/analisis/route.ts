import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ok, route } from "@/lib/api";
import type { Sop, SopAnalisisItem, SopRekomendasi } from "@/lib/sop-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Daftar SOP standar yang sebaiknya dimiliki dapur MBG/SPPG. Setiap item
// dicocokkan dengan judul SOP yang ada (case-insensitive, substring). Bila
// tidak ada satu pun judul yang mengandung salah satu kata kunci, SOP tersebut
// direkomendasikan untuk dibuat.
interface StandarSop {
  keywords: string[];
  judul: string;
  alasan: string;
}

const STANDAR_SOP: StandarSop[] = [
  {
    keywords: ["terima", "penerimaan"],
    judul: "Penerimaan Bahan Baku",
    alasan: "Memastikan mutu & keamanan bahan saat diterima.",
  },
  {
    keywords: ["simpan", "penyimpanan"],
    judul: "Penyimpanan Bahan Makanan",
    alasan: "Mencegah kerusakan & kontaminasi bahan.",
  },
  {
    keywords: ["cuci tangan", "higiene", "hygiene", "sanitasi"],
    judul: "Higiene & Sanitasi (Cuci Tangan)",
    alasan: "Kunci mencegah kontaminasi makanan.",
  },
  {
    keywords: ["masak", "pengolahan", "memasak"],
    judul: "Pengolahan / Memasak",
    alasan: "Standar proses memasak yang aman & bergizi.",
  },
  {
    keywords: ["organoleptik", "uji", "quality", "mutu"],
    judul: "Uji Organoleptik / Kontrol Mutu",
    alasan: "Cek rasa, warna, aroma sebelum distribusi.",
  },
  {
    keywords: ["kemas", "pengemasan", "packing"],
    judul: "Pengemasan Makanan",
    alasan: "Menjaga makanan tetap higienis saat dikemas.",
  },
  {
    keywords: ["distribusi", "pengiriman"],
    judul: "Distribusi Makanan",
    alasan: "Makanan sampai tepat waktu & aman.",
  },
  {
    keywords: ["sampel", "sample", "retensi"],
    judul: "Penyimpanan Sampel Makanan (Food Sample)",
    alasan: "Wajib simpan sampel 1x24 jam untuk penelusuran.",
  },
  {
    keywords: ["limbah", "sampah", "sisa"],
    judul: "Penanganan Limbah & Sisa Makanan",
    alasan: "Kebersihan & keamanan lingkungan dapur.",
  },
  {
    keywords: ["k3", "keselamatan", "apar", "kecelakaan"],
    judul: "K3 / Keselamatan Kerja Dapur",
    alasan: "Cegah kecelakaan kerja (api, pisau, licin).",
  },
  {
    keywords: ["hama", "pest"],
    judul: "Pengendalian Hama",
    alasan: "Cegah tikus/serangga di area dapur.",
  },
  {
    keywords: ["alergi", "alergen"],
    judul: "Penanganan Alergen",
    alasan: "Lindungi penerima dengan alergi makanan.",
  },
];

// Analisa heuristik: apakah tiap SOP sudah lengkap, dan SOP standar apa yang
// masih kurang. Khusus admin (dibatasi per dapur).
export const GET = route(async () => {
  const admin = await requireAdmin();
  const rows = await query<Sop>(`SELECT * FROM sop WHERE sppg_id = $1`, [
    admin.sppg_id,
  ]);

  // Kelengkapan per-SOP.
  const perSop: SopAnalisisItem[] = rows.map((s) => {
    const kurang: string[] = [];
    if ((s.tujuan ?? "").trim().length === 0) kurang.push("Tujuan belum diisi");
    if ((s.ruang_lingkup ?? "").trim().length === 0)
      kurang.push("Ruang lingkup belum diisi");
    if ((s.penanggung_jawab ?? "").trim().length === 0)
      kurang.push("Penanggung jawab belum diisi");
    const langkah = (s.prosedur ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (langkah.length < 2)
      kurang.push("Prosedur terlalu singkat (min. 2 langkah)");
    return {
      id: s.id,
      kode: s.kode,
      judul: s.judul,
      lengkap: kurang.length === 0,
      kurang,
    };
  });

  const lengkap = perSop.filter((p) => p.lengkap).length;
  const total = rows.length;
  const skor = total === 0 ? 0 : Math.round((100 * lengkap) / total);

  // Rekomendasi SOP standar yang belum ada.
  const judulLower = rows.map((s) => (s.judul ?? "").toLowerCase());
  const rekomendasi: SopRekomendasi[] = STANDAR_SOP.filter(
    (std) => !std.keywords.some((kw) => judulLower.some((j) => j.includes(kw))),
  ).map((std) => ({ judul: std.judul, alasan: std.alasan }));

  return ok({ skor, total, lengkap, perSop, rekomendasi });
});
