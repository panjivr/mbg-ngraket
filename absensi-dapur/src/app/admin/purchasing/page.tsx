"use client";

/**
 * Generator Purchase — Kebutuhan Bahan.
 *
 * Tab "Generator Menu" (utama): rakit menu sendiri dari komponen (karbohidrat,
 * protein hewani/nabati, sayur, buah, bumbu…). Tiap komponen dipilih dari
 * hidangan/bahan yang pernah dipakai (katalog RAB nyata), lalu isi gramasi per
 * porsi (besar & kecil) + jumlah porsi → daftar belanja bahan terkonsolidasi +
 * estimasi biaya. Semua nilai adalah saran & bisa diedit; admin dapat menyimpan
 * koreksi katalog (nama/satuan/per-porsi/harga) agar berlaku seterusnya.
 *
 * Tab "Paket Historis": lihat paket menu harian nyata (referensi) & skalakan.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";

/* ------------------------------------------------------------------ util */
const rupiah = (n: number) => "Rp " + Math.round(n || 0).toLocaleString("id-ID");
const fmtQ = (n: number) => (Number.isInteger(n) ? String(n) : (Math.round(n * 1000) / 1000).toString());
const isWeight = (s: string) => ["kg", "liter", "l"].includes(s.trim().toLowerCase());
/** satuan input yang ditampilkan ke user untuk per-porsi. */
const inputUnit = (s: string) => (isWeight(s) ? (s.trim().toLowerCase().startsWith("l") ? "ml" : "g") : s || "pcs");
/** faktor konversi input→satuan asli (berat pakai gram, dibagi 1000). */
const factor = (s: string) => (isWeight(s) ? 0.001 : 1);

const KAT_LABEL: Record<string, string> = {
  karbo: "Karbohidrat", hewani: "Protein Hewani", nabati: "Protein Nabati",
  sayur: "Sayur", buah: "Buah", bumbu: "Bumbu & Penyedap", susu: "Susu & Minuman",
  pelengkap: "Pelengkap / Snack", lain: "Lainnya",
};
const SECTIONS = ["karbo", "hewani", "nabati", "sayur", "buah", "bumbu", "susu", "pelengkap"] as const;

/* ------------------------------------------------------------------ types */
interface BahanKat { n: string; key: string; s: string; kat: string; pp: number | null; h: number | null; obs: number; diedit: boolean }
interface KomU { n: string; key: string; s: string; pp: number | null; h: number | null }
interface Kom { n: string; kat: string; f: number; u: KomU | null }
interface Catalog { meta: { sumber: string; bahan: number; komponen: number; komponenTerpetakan: number }; kategori: string[]; bahan: BahanKat[]; komponen: Kom[] }

interface Row {
  id: number;
  kat: string;
  label: string; // nama hidangan / label bebas
  key: string; // kunci katalog bahan (untuk override); "" = bebas
  nama: string; // nama bahan yang dibeli
  satuan: string;
  gBesar: string; // per porsi (unit input)
  gKecil: string;
  harga: string;
}

let RID = 1;

/* ================================================================== page */
const TABS: { k: "resep" | "kerja" | "bebas" | "paket"; label: string }[] = [
  { k: "resep", label: "Generator Resep" },
  { k: "kerja", label: "Pembagian Kerja" },
  { k: "bebas", label: "Komponen Bebas" },
  { k: "paket", label: "Paket Historis" },
];
export interface Shared {
  picked: string[]; setPicked: Dispatch<SetStateAction<string[]>>;
  serdikK: string; setSerdikK: (v: string) => void;
  serdikB: string; setSerdikB: (v: string) => void;
  cadangan: string; setCadangan: (v: string) => void;
}
export default function PurchasingPage() {
  const [tab, setTab] = useState<"resep" | "kerja" | "bebas" | "paket">("resep");
  // State dibagi antara Generator Resep & Pembagian Kerja (menu + jumlah porsi nyambung otomatis).
  const [picked, setPicked] = useState<string[]>([]);
  const [serdikK, setSerdikK] = useState("500");
  const [serdikB, setSerdikB] = useState("500");
  const [cadangan, setCadangan] = useState("2");
  const shared: Shared = { picked, setPicked, serdikK, setSerdikK, serdikB, setSerdikB, cadangan, setCadangan };
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Generator Purchase — Kebutuhan Bahan</h1>
        <p className="text-sm text-slate-400">Pilih resep per kategori → kebutuhan bahan <b>+ bumbunya</b> terhitung otomatis, lengkap dengan estimasi biaya.</p>
      </div>
      <div className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1 w-fit">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={"rounded-lg px-4 py-1.5 text-sm font-medium transition " + (tab === t.k ? "bg-gold-500/15 text-gold-400" : "text-slate-400 hover:text-slate-100")}>{t.label}</button>
        ))}
      </div>
      {tab === "resep" ? <RecipeGenerator shared={shared} /> : tab === "kerja" ? <JobdeskGenerator shared={shared} onGoMenu={() => setTab("resep")} /> : tab === "bebas" ? <Composer /> : <PaketHistoris />}
    </div>
  );
}

/* ======================================================= pembagian kerja */
interface JBom { id: string; n: string; s: string; k: number; yp: number; ed: number; ym: number; mk: number }
interface JResep { id: string; kat: string; n: string; gramK: number; gramB: number; yieldGab: number; metode?: string; buahPotong?: number; menitBatch?: number; kgAlatBatch?: number; prepAlat?: string; bom?: JBom[] }
interface Alat { n: string; jumlah: number; slot: number; kap: number; sat: string; menit: number; ket: string }
interface Langkah { t: string; l: string; a: string; k: string; p: string }
// HACCP — titik kendali kritis (CCP) rantai dapur MBG (standar keamanan pangan).
const HACCP_CCP: { ccp: string; judul: string; isi: string }[] = [
  { ccp: "CCP-1", judul: "Penerimaan barang", isi: "Cek suhu saat datang: beku ≤ -18 °C, dingin ≤ 4 °C, kering utuh & tidak apek. Cek tanggal, kemasan, jumlah vs PURCHASE. Tolak lot rusak/berbau/menetes; catat suhu & ukuran riil." },
  { ccp: "CCP-2", judul: "Penyimpanan & zona", isi: "Pisah zona: protein mentah (paling bawah), sayur, buah, dan matang (paling atas). Kulkas ≤ 4 °C, freezer ≤ -18 °C. FIFO/FEFO. Wadah tertutup & berlabel tanggal." },
  { ccp: "CCP-3", judul: "Persiapan (anti kontaminasi silang)", isi: "Talenan & pisau berkode warna: MERAH=protein mentah, HIJAU=sayur/buah, PUTIH=matang/siap saji. Cuci tangan 20 dtk tiap ganti bahan. Jangan campur protein mentah dengan buah siap makan." },
  { ccp: "CCP-4", judul: "Pemasakan (suhu inti)", isi: "Suhu inti minimum: unggas/ayam 74 °C, ikan/lele 63 °C, telur & olahan matang menyeluruh 71 °C, daging sapi 71 °C, tahu/tempe/sayur matang menyeluruh. Ukur bagian tertebal dengan termometer." },
  { ccp: "CCP-5", judul: "Holding (jaga suhu)", isi: "Zona bahaya 5–60 °C maksimal 2 jam (kumulatif 4 jam). Panas tahan ≥ 60 °C; buah potong dingin ≤ 5 °C. Jangan diamkan matang di suhu ruang menunggu porsi." },
  { ccp: "CCP-6", judul: "Pemorsian", isi: "Petugas sarung tangan/alat bersih, tidak sakit. Timbang gramasi K/B; QC jumlah, tutup & label waktu. Simpan sampel makanan 2×24 jam (≥100 g/menu) di kulkas untuk uji bila perlu." },
  { ccp: "CCP-7", judul: "Distribusi", isi: "Ompreng tertutup rapat, wadah bersih. Catat jam matang & jam kirim; total waktu masak→makan sesuai batas holding. Jaga suhu selama transport." },
];
// Suhu inti & catatan keamanan per resep, berdasarkan bahan utama & kategori.
function foodSafety(namaResep: string, kat: string, bahanUtama?: string): { suhu: string; note: string } {
  const s = (bahanUtama || namaResep).toLowerCase();
  if (/ayam|unggas|bebek|puyuh/.test(s)) return { suhu: "74 °C", note: "Unggas: tusuk bagian tertebal, tidak ada bagian merah/berdarah." };
  if (/lele|ikan|nila|patin|tongkol|bandeng|udang|cumi/.test(s)) return { suhu: "63 °C", note: "Ikan/seafood: daging opaque & mudah terurai; jaga rantai dingin sebelum olah." };
  if (/telur/.test(s)) return { suhu: "71 °C", note: "Telur: putih & kuning set (tidak berair) untuk sajian anak." };
  if (/sapi|daging|rendang|empal/.test(s)) return { suhu: "71 °C", note: "Daging: empuk, cairan bening bukan merah." };
  if (kat === "Buah") return { suhu: "≤ 5 °C", note: "Tanpa masak — cuci air mengalir, kupas dengan alat bersih, simpan dingin ≤ 5 °C, sajikan < 4 jam." };
  if (kat === "Sayur") return { suhu: "matang menyeluruh", note: "Sayur: matang merata tapi tidak lembek berlebih; tiriskan, jangan rendam air lama." };
  if (/tahu|tempe|kacang/.test(s)) return { suhu: "matang menyeluruh", note: "Nabati: goreng/masak hingga matang penuh; minyak bersih." };
  if (kat === "Karbohidrat") return { suhu: "≥ 74 °C", note: "Nasi/karbo: matang merata; holding panas ≥ 60 °C, jangan tambah air ke nasi matang." };
  return { suhu: "matang menyeluruh", note: "Masak hingga matang penuh; ukur bagian tertebal." };
}

const TAHAP_TONE: Record<string, string> = {
  Persiapan: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  Bumbu: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  "Bangun kuah": "border-amber-500/30 bg-amber-500/10 text-amber-300",
  "Masak bertahap": "border-orange-500/30 bg-orange-500/10 text-orange-300",
  "Muat tray": "border-orange-500/30 bg-orange-500/10 text-orange-300",
  Selesaikan: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  Pemorsian: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

function JobdeskGenerator({ shared, onGoMenu }: { shared: Shared; onGoMenu: () => void }) {
  const { picked, serdikK, serdikB, cadangan } = shared;
  const bankPicked = useMemo(() => picked.filter((id) => !id.startsWith("C")), [picked]);
  const [resep, setResep] = useState<JResep[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [orang, setOrang] = useState({ persiapan: 6, pengolahan: 10, pemorsian: 9 });
  const [alat, setAlat] = useState<Alat[]>([]);
  const [steps, setSteps] = useState<Record<string, Langkah[]>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [expandAll, setExpandAll] = useState(false);
  const [jam, setJam] = useState({ persiapan: "18:00", pengolahan: "23:00", pemorsian: "03:00" });
  const [istirahat, setIstirahat] = useState({ persiapan: "0", pengolahan: "0", pemorsian: "0" });
  const [exporting, setExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/admin/resep", { cache: "no-store" }).then((r) => r.json())
      .then((d) => { if (d.error) { setMsg(d.error); return; } setResep(d.resep || []); }).catch(() => setMsg("Gagal memuat resep."));
    fetch("/api/admin/resep/sop?ids=", { cache: "no-store" }).then((r) => r.json())
      .then((d) => { if (!d.error) { setAlat(d.alat || []); if (d.divisi) setOrang({ persiapan: d.divisi.persiapan || 6, pengolahan: d.divisi.pengolahan || 10, pemorsian: d.divisi.pemorsian || 9 }); } }).catch(() => {});
  }, []);

  // ambil SOP tiap kali pilihan berubah (hanya resep bank)
  useEffect(() => {
    if (bankPicked.length === 0) { setSteps({}); return; }
    fetch(`/api/admin/resep/sop?ids=${bankPicked.join(",")}`, { cache: "no-store" }).then((r) => r.json())
      .then((d) => { if (!d.error) setSteps(d.steps || {}); }).catch(() => {});
  }, [bankPicked]);

  const K = Math.max(0, parseInt(serdikK, 10) || 0);
  const B = Math.max(0, parseInt(serdikB, 10) || 0);
  const cad = Math.max(0, parseFloat(cadangan.replace(",", ".")) || 0) / 100;
  const resepMap = useMemo(() => new Map(resep.map((r) => [r.id, r])), [resep]);

  const utamaMentah = useCallback((r: JResep) => {
    const t = (K * r.gramK + B * r.gramB) * (1 + cad) / 1000;
    return r.yieldGab > 0 ? t / r.yieldGab : 0;
  }, [K, B, cad]);

  const komporAktif = useMemo(() => alat.find((a) => /kompor/i.test(a.n))?.jumlah || 0, [alat]);
  const komporKap = useMemo(() => alat.find((a) => /kompor/i.test(a.n))?.kap || 0, [alat]);

  // ringkasan per resep: batch & durasi olah
  const perResep = useMemo(() => picked.map((id) => {
    const r = resepMap.get(id); if (!r) return null;
    const mentah = utamaMentah(r);
    const kapBatch = r.kgAlatBatch && r.kgAlatBatch > 0 ? r.kgAlatBatch : (komporKap || 10);
    const batch = mentah > 0 ? Math.max(1, Math.ceil(mentah / kapBatch)) : 0;
    const durasi = batch * (r.menitBatch || 0);
    return { id, r, mentah, batch, durasi };
  }).filter(Boolean) as { id: string; r: JResep; mentah: number; batch: number; durasi: number }[], [picked, resepMap, utamaMentah, komporKap]);

  const totalMentah = perResep.reduce((a, x) => a + x.mentah, 0);
  const totalBatch = perResep.reduce((a, x) => a + x.batch, 0);
  const totalPorsi = K + B;
  // estimasi kasar
  const prepKgPerMenit = 0.35 * orang.persiapan;
  const waktuPrep = prepKgPerMenit > 0 ? Math.ceil(totalMentah / prepKgPerMenit) : 0;
  const gelombang = komporAktif > 0 ? Math.ceil(totalBatch / komporAktif) : totalBatch;
  const avgMenitBatch = perResep.length ? Math.round(perResep.reduce((a, x) => a + (x.r.menitBatch || 0), 0) / perResep.length) : 0;
  const waktuOlah = gelombang * avgMenitBatch;
  const ompRate = 12 * Math.max(1, Math.round(orang.pemorsian / 3)); // ompreng/menit (asumsi 7 stasiun)
  const waktuPorsi = ompRate > 0 ? Math.ceil(totalPorsi / ompRate) : 0;

  const setAlatVal = (i: number, key: keyof Alat, v: string) =>
    setAlat((a) => a.map((x, j) => j === i ? { ...x, [key]: key === "n" || key === "sat" || key === "ket" ? v : (parseFloat(v.replace(",", ".")) || 0) } : x));

  // ---- jadwal berkesinambungan (jam datang tiap divisi + istirahat) ----
  const toMin = (t: string) => { const [h, m] = t.split(":").map((x) => parseInt(x, 10)); return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0); };
  const fmtJam = (min: number) => { const m = ((min % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
  const istP = parseInt(istirahat.persiapan, 10) || 0, istO = parseInt(istirahat.pengolahan, 10) || 0, istM = parseInt(istirahat.pemorsian, 10) || 0;
  const jadwal = {
    persiapan: { mulai: toMin(jam.persiapan), selesai: toMin(jam.persiapan) + waktuPrep + istP, durasi: waktuPrep, ist: istP },
    pengolahan: { mulai: toMin(jam.pengolahan), selesai: toMin(jam.pengolahan) + waktuOlah + istO, durasi: waktuOlah, ist: istO },
    pemorsian: { mulai: toMin(jam.pemorsian), selesai: toMin(jam.pemorsian) + waktuPorsi + istM, durasi: waktuPorsi, ist: istM },
  };
  // jadwal batch pengolahan: susun berurutan per lane kompor dari jam datang pengolahan
  const jadwalOlah = useMemo(() => {
    const lanes = Math.max(1, komporAktif || 1);
    const laneEnd = new Array(lanes).fill(jadwal.pengolahan.mulai);
    // resep protein/lama dulu
    const order = [...perResep].sort((a, b) => (b.r.menitBatch || 0) - (a.r.menitBatch || 0));
    return order.map((x) => {
      const li = laneEnd.indexOf(Math.min(...laneEnd));
      const mulai = laneEnd[li];
      const selesai = mulai + x.durasi;
      laneEnd[li] = selesai;
      return { ...x, lane: li + 1, mulai, selesai };
    });
  }, [perResep, komporAktif, jadwal.pengolahan.mulai]);

  // ---- saran bentuk potongan (standar dapur, DRAF) ----
  function saranPotong(nama: string, metode?: string): string | null {
    const n = nama.toLowerCase(); const m = (metode || "").toLowerCase();
    const tumis = /tumis|oseng|saute|cah|gongso|tumus/.test(m);
    const sup = /sop|sup|kuah|soto|kari|gulai|bening/.test(m);
    if (/wortel/.test(n)) return tumis ? "korek api (julienne) ± 4 cm" : sup ? "dadu 1,5 cm" : "korek api / dadu sesuai olahan";
    if (/kentang/.test(n)) return /perkedel/.test(m) ? "rebus lalu haluskan" : sup ? "dadu 2 cm" : "dadu / stik 1 cm";
    if (/buncis/.test(n)) return "serong 3 cm";
    if (/kacang panjang/.test(n)) return "potong 3–4 cm";
    if (/kubis|kol\b|kobis/.test(n)) return "iris kasar 2 cm";
    if (/sawi|pakcoy|pokcoy|caisim/.test(n)) return "potong 3–4 cm";
    if (/bayam|kangkung/.test(n)) return "petik daun + batang muda";
    if (/labu|terong|gambas|oyong/.test(n)) return "dadu / setengah bulan 1,5 cm";
    if (/timun/.test(n)) return "iris tipis (lalapan)";
    if (/tomat/.test(n)) return "belah 6–8 (wedges)";
    if (/tahu/.test(n)) return "dadu 2–3 cm atau segitiga";
    if (/tempe/.test(n)) return "iris tipis 0,5 cm atau dadu";
    if (/bawang (merah|putih)|bombay/.test(n)) return "kupas → haluskan/iris";
    if (/caba?i|cabe/.test(n)) return "iris serong / haluskan sesuai resep";
    if (/daun bawang|seledri|pre\b/.test(n)) return "iris halus";
    if (/ayam/.test(n)) return "potong sesuai porsi (8–12 potong/kg)";
    if (/lele|ikan|nila|patin|tongkol|bandeng/.test(n)) return "siangi, kerat badan; utuh/potong sesuai porsi";
    if (/telur/.test(n)) return "rebus/kocok sesuai resep";
    if (/jahe|lengkuas|kunyit|kencur/.test(n)) return "kupas → geprek/haluskan";
    if (/serai|sereh/.test(n)) return "geprek, utuh (aromatik)";
    if (/daun (salam|jeruk)/.test(n)) return "utuh (aromatik)";
    return null;
  }

  // Render seluruh detail (buka semua) sebelum capture agar tak ada yang ke-hide.
  async function withAllExpanded<T>(fn: () => Promise<T>): Promise<T> {
    setExpandAll(true);
    await new Promise((r) => setTimeout(r, 350)); // tunggu render & muat langkah
    try { return await fn(); } finally { setExpandAll(false); }
  }
  async function snapshot() {
    const { toPng } = await import("html-to-image");
    const el = cardRef.current!;
    return toPng(el, { backgroundColor: "#0b1120", pixelRatio: 2, cacheBust: true, width: el.scrollWidth, height: el.scrollHeight });
  }
  async function exportPNG() {
    if (!cardRef.current) return; setExporting(true);
    try {
      const url = await withAllExpanded(snapshot);
      const a = document.createElement("a"); a.href = url; a.download = `jobdesk-${totalPorsi}porsi.png`; a.click();
    } catch { setMsg("Gagal membuat gambar."); } finally { setExporting(false); }
  }
  async function exportPDF() {
    if (!cardRef.current) return; setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const url = await withAllExpanded(snapshot);
      const img = new Image(); img.src = url; await new Promise((r) => { img.onload = r; });
      // Bagi ke halaman A4 potret agar konten panjang tidak terpotong.
      const pw = 595, ph = 842, margin = 24, cw = pw - margin * 2;
      const scaled = (cw / img.width) * img.height;
      const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      let y = margin, remaining = scaled;
      // gambar penuh, lalu geser viewport per halaman
      const pageContent = ph - margin * 2;
      let srcY = 0;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const ratio = img.width / cw;
      while (remaining > 0) {
        const sliceH = Math.min(pageContent, remaining) * ratio;
        canvas.width = img.width; canvas.height = sliceH;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, srcY, img.width, sliceH, 0, 0, img.width, sliceH);
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, y, cw, sliceH / ratio);
        remaining -= pageContent; srcY += sliceH;
        if (remaining > 0) { pdf.addPage(); y = margin; }
      }
      pdf.save(`jobdesk-${totalPorsi}porsi.pdf`);
    } catch { setMsg("Gagal membuat PDF."); } finally { setExporting(false); }
  }
  const waJobdesk = () => {
    const lines = [`*JOBDESK DAPUR MBG* — ${totalPorsi} porsi (${B} besar / ${K} kecil)`, ""];
    lines.push(`PERSIAPAN (${orang.persiapan} org) ${fmtJam(jadwal.persiapan.mulai)}–${fmtJam(jadwal.persiapan.selesai)}`);
    lines.push(`PENGOLAHAN (${orang.pengolahan} org) ${fmtJam(jadwal.pengolahan.mulai)}–${fmtJam(jadwal.pengolahan.selesai)}`);
    for (const x of jadwalOlah) {
      const fs = foodSafety(x.r.n, x.r.kat, x.r.bom?.find((l) => l.mk === 1)?.n);
      lines.push(`  • ${x.r.n}: ${x.batch} batch, kompor ${x.lane}, ${fmtJam(x.mulai)}–${fmtJam(x.selesai)} (suhu inti ${fs.suhu})`);
    }
    lines.push(`PEMORSIAN (${orang.pemorsian} org) ${fmtJam(jadwal.pemorsian.mulai)}–${fmtJam(jadwal.pemorsian.selesai)}`);
    lines.push("", "*HACCP:* pisah talenan protein/sayur/buah · masak sampai suhu inti · holding panas ≥60°C, buah ≤5°C · simpan sampel 2×24 jam · label waktu.");
    return `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
  };

  const menuList = perResep.map((x) => x.r);

  return (
    <div className="space-y-5">
      {msg && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">{msg}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-2.5">
        <p className="text-xs text-sky-200">
          Menu &amp; jumlah porsi <b>otomatis dari tab Generator Resep</b> ({B} besar / {K} kecil · {menuList.length} menu). Di sini cukup isi jam kerja, jumlah orang &amp; alat.
        </p>
        <button onClick={onGoMenu} className="btn-ghost shrink-0 text-xs">Ubah menu di Generator Resep →</button>
      </div>

      {menuList.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-500">Belum ada menu. Buka tab <b>Generator Resep</b>, pilih resep per kategori, lalu kembali ke sini.</div>
      ) : (
        <>
          {/* Jam kerja + orang + alat */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-4">
              <p className="mb-2 text-sm font-semibold text-slate-100">Jam datang &amp; istirahat per divisi</p>
              <div className="space-y-2">
                {([["persiapan", "Persiapan"], ["pengolahan", "Pengolahan"], ["pemorsian", "Pemorsian"]] as const).map(([k, lbl]) => (
                  <div key={k} className="flex flex-wrap items-end gap-2">
                    <div className="w-24 text-sm text-slate-300">{lbl}</div>
                    <div><label className="label">Jam datang</label><input type="time" className="input w-28" value={jam[k]} onChange={(e) => setJam({ ...jam, [k]: e.target.value })} /></div>
                    <div><label className="label">Istirahat (mnt)</label><input type="number" min={0} className="input w-20" value={istirahat[k]} onFocus={(e) => e.target.select()} onChange={(e) => setIstirahat({ ...istirahat, [k]: e.target.value })} /></div>
                    <div><label className="label">Orang</label><input type="number" min={0} className="input w-16" value={orang[k]} onFocus={(e) => e.target.select()} onChange={(e) => setOrang({ ...orang, [k]: parseInt(e.target.value, 10) || 0 })} /></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card overflow-hidden p-0">
              <p className="border-b border-white/5 p-4 text-sm font-semibold text-slate-100">Alat dapur (bisa diedit)</p>
              <div className="scroll-x max-h-[220px] overflow-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead className="sticky top-0 bg-ink-900 text-left text-[11px] uppercase text-slate-400"><tr className="border-b border-white/5">
                    <th className="px-3 py-2">Alat</th><th className="px-2 py-2 text-right">Jml</th><th className="px-2 py-2 text-right">Kapasitas</th><th className="px-2 py-2 text-right">Mnt</th>
                  </tr></thead>
                  <tbody className="divide-y divide-white/5">
                    {alat.map((a, i) => (
                      <tr key={a.n}>
                        <td className="px-3 py-1 text-slate-200">{a.n} <span className="text-[10px] text-slate-500">{a.sat}</span></td>
                        <td className="px-2 py-1"><input className="input w-14 py-0.5 text-right" value={a.jumlah} onFocus={(e) => e.target.select()} onChange={(e) => setAlatVal(i, "jumlah", e.target.value)} /></td>
                        <td className="px-2 py-1"><input className="input w-16 py-0.5 text-right" value={a.kap} onFocus={(e) => e.target.select()} onChange={(e) => setAlatVal(i, "kap", e.target.value)} /></td>
                        <td className="px-2 py-1"><input className="input w-12 py-0.5 text-right" value={a.menit} onFocus={(e) => e.target.select()} onChange={(e) => setAlatVal(i, "menit", e.target.value)} /></td>
                      </tr>
                    ))}
                    {alat.length === 0 && <tr><td colSpan={4} className="px-4 py-4 text-center text-slate-500">Memuat…</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Tombol ekspor */}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={exportPNG} disabled={exporting} className="btn-gold text-sm">{exporting ? "Menyiapkan…" : "Unduh Gambar (PNG)"}</button>
            <button onClick={exportPDF} disabled={exporting} className="btn-ghost text-sm">Unduh PDF</button>
            <a href={waJobdesk()} target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm">Bagikan WhatsApp</a>
            <button onClick={() => setExpandAll((v) => !v)} className="btn-ghost text-sm">{expandAll ? "Tutup semua langkah" : "Buka semua langkah"}</button>
            {exporting && <span className="text-xs text-slate-400">menyiapkan seluruh detail…</span>}
          </div>

          {/* KARTU HASIL (yang diekspor) */}
          <div ref={cardRef} className="space-y-4 rounded-2xl bg-ink-950 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-slate-100">Pembagian Kerja Dapur MBG</p>
                <p className="text-xs text-slate-400">{totalPorsi} porsi ({B} besar / {K} kecil) · {menuList.length} menu · cadangan {cadangan || 0}%</p>
              </div>
              <p className="text-right text-[11px] text-slate-500">Menu:<br />{menuList.map((r) => r.n).join(" · ")}</p>
            </div>

            {/* 3 divisi + jam */}
            <div className="grid gap-3 sm:grid-cols-3">
              {([
                ["persiapan", "Persiapan", "rounded-2xl border p-4 border-sky-500/20 bg-gradient-to-br from-sky-500/15 to-transparent", "text-[11px] font-semibold uppercase tracking-wide text-sky-300/80", `${fmtQ(Math.round(totalMentah * 10) / 10)} kg disiangi/potong/timbang`],
                ["pengolahan", "Pengolahan", "rounded-2xl border p-4 border-orange-500/20 bg-gradient-to-br from-orange-500/15 to-transparent", "text-[11px] font-semibold uppercase tracking-wide text-orange-300/80", `${totalBatch} batch · ${komporAktif} kompor · ${gelombang} gelombang`],
                ["pemorsian", "Pemorsian", "rounded-2xl border p-4 border-rose-500/20 bg-gradient-to-br from-rose-500/15 to-transparent", "text-[11px] font-semibold uppercase tracking-wide text-rose-300/80", `${totalPorsi} ompreng · ${menuList.length} komponen/porsi`],
              ] as const).map(([k, lbl, box, lblCls, sub]) => (
                <div key={k} className={box}>
                  <p className={lblCls}>{lbl} · {orang[k]} orang</p>
                  <p className="mt-0.5 text-xl font-bold text-slate-100">{fmtJam(jadwal[k].mulai)} – {fmtJam(jadwal[k].selesai)}</p>
                  <p className="text-[11px] text-slate-500">± {jadwal[k].durasi} mnt kerja{jadwal[k].ist ? ` + ${jadwal[k].ist} mnt istirahat` : ""}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>
                </div>
              ))}
            </div>

            {/* Jadwal pengolahan per kompor */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-orange-300/80">Jadwal masak per kompor (mulai {fmtJam(jadwal.pengolahan.mulai)})</p>
              <div className="space-y-1">
                {jadwalOlah.map((x) => (
                  <div key={x.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate text-slate-200"><span className="mr-1 inline-block rounded bg-orange-500/15 px-1.5 text-orange-300">Kompor {x.lane}</span>{x.r.n}</span>
                    <span className="shrink-0 tabular-nums text-slate-400">{x.batch} batch · {fmtJam(x.mulai)}–{fmtJam(x.selesai)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* HACCP — titik kendali kritis (selalu tampil) */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-300/80">HACCP — Titik Kendali Kritis (keamanan pangan)</p>
              <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
                {HACCP_CCP.map((c) => (
                  <div key={c.ccp} className="text-[11px]">
                    <span className="font-semibold text-emerald-300">{c.ccp} · {c.judul}. </span>
                    <span className="text-slate-400">{c.isi}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Detail per resep: keamanan + potongan persiapan + langkah SOP */}
            <div className="space-y-3">
              {perResep.map(({ id, r, mentah, batch, durasi }) => {
                const st = steps[id] || [];
                const open = expandAll || openId === id;
                const potong = (r.bom || []).filter((l) => saranPotong(l.n, r.metode)).slice(0, 14);
                const utamaNama = r.bom?.find((l) => l.mk === 1)?.n;
                const fs = foodSafety(r.n, r.kat, utamaNama);
                return (
                  <div key={id} className="card overflow-hidden">
                    <button onClick={() => setOpenId(openId === id ? null : id)} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-white/[0.02]">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-100">{r.n} <span className="text-xs font-normal text-slate-500">· {r.kat} · {r.metode || "olah"}</span></p>
                        <p className="text-[11px] text-slate-400">{fmtQ(Math.round(mentah * 10) / 10)} kg bahan utama · {batch} batch × {r.menitBatch || 0} mnt ≈ {durasi} mnt · <span className="text-emerald-300/90">suhu inti {fs.suhu}</span></p>
                      </div>
                      <span className={"shrink-0 text-xs " + (open ? "text-gold-400" : "text-slate-500")}>{open ? "tutup ▲" : "detail ▼"}</span>
                    </button>
                    {open && (
                      <div className="space-y-3 border-t border-white/5 p-4">
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-xs">
                          <span className="font-semibold text-emerald-300">Keamanan pangan: </span>
                          <span className="text-slate-300">Suhu inti target <b>{fs.suhu}</b>. {fs.note}</span>
                          {r.prepAlat ? <span className="text-slate-400"> · Bumbu dihaluskan pakai {r.prepAlat.toLowerCase()}.</span> : null}
                        </div>
                        {potong.length > 0 && (
                          <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.06] p-3">
                            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-sky-300/80">Persiapan — bentuk potongan (saran)</p>
                            <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                              {potong.map((l) => (
                                <div key={l.id} className="flex justify-between gap-2 text-xs">
                                  <span className="text-slate-300">{l.n}</span>
                                  <span className="shrink-0 text-slate-400">{saranPotong(l.n, r.metode)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {st.length === 0 ? <p className="text-sm text-slate-500">Memuat langkah…</p> : st.map((s, i) => (
                          <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                            <div className="mb-1 flex items-center gap-2">
                              <span className={"badge border " + (TAHAP_TONE[s.t] || "border-slate-500/30 bg-slate-500/10 text-slate-300")}>{i + 1}. {s.t}</span>
                            </div>
                            <p className="text-sm text-slate-200">{s.l}</p>
                            {s.a && <p className="mt-1 text-xs text-amber-300/90"><b>Api/durasi:</b> {s.a}</p>}
                            {s.k && <p className="mt-0.5 text-xs text-emerald-300/80"><b>Kriteria selesai:</b> {s.k}</p>}
                            {s.p && <p className="mt-0.5 text-xs text-slate-500"><b>Alat/catatan:</b> {s.p}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500">Jadwal berkesinambungan: prep → olah → porsi mengikuti jam datang. Estimasi waktu kasar (prep 0,35 kg/org/mnt; ± {ompRate} ompreng/mnt). Bentuk potongan = saran standar dapur, sesuaikan resep &amp; hasil uji.</p>
          </div>
        </>
      )}
    </div>
  );
}

/* ========================================================= generator resep */
interface RBahan { id: string; n: string; s: string; h: number | null; hsrc: string | null; ou: string; oi: number; okl: number; ppk: number; min: number; max: number; dia: number; diedit?: boolean }
interface RBom { id: string; n: string; s: string; k: number; yp: number; ed: number; ym: number; mk: number }
interface CItem { n: string; s: string; q: number; h: number }
interface RResep { id: string; kat: string; n: string; gramK: number; gramB: number; yieldGab: number; status: string; bom: RBom[]; metode?: string; buahPotong?: number; custom?: boolean; porsiBasis?: number; items?: CItem[] }
interface PorsiKB { kat: string; gramK: number; gramB: number }
interface KemasT { n: string; perPack: number }
interface RData { meta: { sumber: string; resep: number; bahan: number; hargaTerisi: number; hargaKosong: number; status: string }; kategori: string[]; porsiKB: PorsiKB[]; kemasTambahan: KemasT[]; resep: RResep[]; bahan: RBahan[] }
interface CustomRow { id: number; kategori: string; nama: string; porsi_basis: number; items: CItem[]; catatan: string; oleh: string }
interface Builder { id: number | null; kategori: string; nama: string; porsi_basis: string; catatan: string; items: { n: string; s: string; q: string; h: string }[] }

function RecipeGenerator({ shared }: { shared: Shared }) {
  const { picked, setPicked, serdikK, setSerdikK, serdikB, setSerdikB, cadangan, setCadangan } = shared;
  const [data, setData] = useState<RData | null>(null);
  const [custom, setCustom] = useState<CustomRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [gramOv, setGramOv] = useState<Record<string, { k: string; b: string }>>({}); // override gramasi per resep
  const [editId, setEditId] = useState<string | null>(null);
  const [ef, setEf] = useState({ nama: "", harga: "" });
  const [builder, setBuilder] = useState<Builder | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<RResep | null>(null); // resep untuk modal penjelasan mentah→matang

  const load = useCallback(() => {
    fetch("/api/admin/resep", { cache: "no-store" }).then((r) => r.json())
      .then((d) => (d.error ? setMsg(d.error) : setData(d))).catch(() => setMsg("Gagal memuat resep."));
    fetch("/api/admin/resep/custom", { cache: "no-store" }).then((r) => r.json())
      .then((d) => { if (!d.error) setCustom(d.resep || []); }).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  // Resep custom → bentuk RResep agar seragam dengan resep bank (skala linear).
  const customAsResep = useMemo<RResep[]>(() => custom.map((c) => ({
    id: "C" + c.id, kat: c.kategori, n: c.nama, gramK: 0, gramB: 0, yieldGab: 1,
    status: "RESEP DAPUR", bom: [], custom: true, porsiBasis: c.porsi_basis, items: c.items,
  })), [custom]);
  const allResep = useMemo<RResep[]>(() => [...(data?.resep || []), ...customAsResep], [data, customAsResep]);

  const K = Math.max(0, parseInt(serdikK, 10) || 0);
  const B = Math.max(0, parseInt(serdikB, 10) || 0);
  const cad = Math.max(0, parseFloat(cadangan.replace(",", ".")) || 0) / 100;

  const bahanMap = useMemo(() => new Map((data?.bahan || []).map((b) => [b.id, b])), [data]);
  const resepMap = useMemo(() => new Map(allResep.map((r) => [r.id, r])), [allResep]);
  // gramasi K/B efektif sebuah resep (override user > default resep).
  const gramOf = useCallback((r: RResep) => {
    const ov = gramOv[r.id];
    const gk = ov && ov.k !== "" ? parseFloat(ov.k.replace(",", ".")) : r.gramK;
    const gb = ov && ov.b !== "" ? parseFloat(ov.b.replace(",", ".")) : r.gramB;
    return { gk: Number.isFinite(gk) ? gk : 0, gb: Number.isFinite(gb) ? gb : 0 };
  }, [gramOv]);

  /* utama mentah siap-olah (kg) sebuah resep bank untuk K/B serdik saat ini. */
  const utamaMentahKg = useCallback((r: RResep) => {
    const { gk, gb } = gramOf(r);
    const target = (K * gk + B * gb) * (1 + cad) / 1000; // kg matang total
    return r.yieldGab > 0 ? target / r.yieldGab : 0;
  }, [K, B, cad, gramOf]);

  /* hitung 1 resep → baris kebutuhan.
     Bank: beli = utama mentah × koef ÷ yield persiapan (satuan bahan).
     Custom: skala linear jumlah total (untuk porsi basis) × (total serdik / basis). */
  const hitung = useCallback((r: RResep) => {
    const f = 1 + cad;
    if (r.custom) {
      const skala = (r.porsiBasis && r.porsiBasis > 0 ? (K + B) / r.porsiBasis : 0) * f;
      return (r.items || []).filter((it) => it.n).map((it) => ({
        id: "c:" + it.n.trim().toLowerCase(), nama: it.n, satuan: it.s, qty: (it.q || 0) * skala, hargaInline: it.h > 0 ? it.h : null as number | null,
      }));
    }
    const utama = utamaMentahKg(r);
    return r.bom.map((l) => ({
      id: l.id, nama: l.n, satuan: l.s, qty: l.yp > 0 ? utama * l.k / l.yp : 0, hargaInline: null as number | null,
    }));
  }, [K, B, cad, utamaMentahKg]);

  /* konsolidasi seluruh resep terpilih per bahan + konversi satuan order (kemasan) */
  const belanja = useMemo(() => {
    const map = new Map<string, { id: string; nama: string; satuan: string; qty: number; hargaInline: number | null }>();
    const add = (id: string, nama: string, satuan: string, qty: number, hargaInline: number | null) => {
      const cur = map.get(id);
      if (cur) { cur.qty += qty; if (cur.hargaInline == null) cur.hargaInline = hargaInline; }
      else map.set(id, { id, nama, satuan, qty, hargaInline });
    };
    for (const rid of picked) {
      const r = resepMap.get(rid); if (!r) continue;
      for (const line of hitung(r)) add(line.id, line.nama, line.satuan, line.qty, line.hargaInline);
      // Kemasan tambahan: buah potong → 1 pcs OPP per porsi.
      if (r.buahPotong) for (const kt of (data?.kemasTambahan || [])) add("kemas:" + kt.n, kt.n, "pcs", (K + B) * (1 + cad) * kt.perPack, null);
    }
    return [...map.values()].map((x) => {
      const b = bahanMap.get(x.id);
      const harga = b?.h ?? x.hargaInline ?? null;
      // order unit (botol/kardus/pcs/renteng/balok/kg)
      let order: string | null = null;
      if (b && b.ou && b.oi > 0 && b.ou.toLowerCase() !== x.satuan.toLowerCase()) {
        const kl = b.okl > 0 ? b.okl : 1;
        const o = Math.ceil(x.qty / b.oi / kl) * kl;
        order = `${fmtQ(o)} ${b.ou}`;
      } else if (x.id.startsWith("kemas:")) {
        order = `${fmtQ(Math.ceil(x.qty))} pcs`;
      }
      return { id: x.id, nama: b?.n || x.nama, satuan: x.satuan, qty: x.qty, order, harga, biaya: harga != null ? x.qty * harga : 0, noHarga: harga == null && !x.id.startsWith("kemas:") };
    }).sort((a, b) => b.biaya - a.biaya);
  }, [picked, resepMap, bahanMap, hitung, data, K, B, cad]);
  const total = belanja.reduce((a, b) => a + b.biaya, 0);
  const unpriced = belanja.filter((b) => b.noHarga).length;

  /* ringkasan per resep: biaya, mentah kg, matang g/porsi K/B */
  const perResep = useMemo(() => picked.map((rid) => {
    const r = resepMap.get(rid); if (!r) return null;
    let biaya = 0;
    for (const l of hitung(r)) { const h = bahanMap.get(l.id)?.h ?? l.hargaInline; if (h != null) biaya += l.qty * h; }
    const g = gramOf(r);
    return { id: rid, nama: r.n, kat: r.kat, biaya, porsi: K + B, custom: !!r.custom, mentah: r.custom ? null : utamaMentahKg(r), gk: g.gk, gb: g.gb };
  }).filter(Boolean) as { id: string; nama: string; kat: string; biaya: number; porsi: number; custom: boolean; mentah: number | null; gk: number; gb: number }[], [picked, resepMap, bahanMap, hitung, K, B, gramOf, utamaMentahKg]);

  async function saveHarga(bahanNama: string) {
    const r = await fetch("/api/admin/purchasing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bahan: bahanNama, harga: ef.harga, nama: ef.nama }) });
    if (r.status === 403) { setMsg("Koreksi harga hanya untuk Admin penuh."); return; }
    if (!r.ok) { setMsg("Gagal menyimpan harga."); return; }
    setEditId(null); setMsg(null); load();
  }

  /* ---- builder resep custom ---- */
  function bukaBuilderBaru() { setMsg(null); setBuilder({ id: null, kategori: data?.kategori[0] || "Protein Hewani", nama: "", porsi_basis: "1000", catatan: "", items: [{ n: "", s: "kg", q: "", h: "" }] }); }
  function editCustom(c: CustomRow) { setMsg(null); setBuilder({ id: c.id, kategori: c.kategori, nama: c.nama, porsi_basis: String(c.porsi_basis), catatan: c.catatan, items: c.items.length ? c.items.map((i) => ({ n: i.n, s: i.s, q: String(i.q), h: i.h ? String(i.h) : "" })) : [{ n: "", s: "kg", q: "", h: "" }] }); }
  async function simpanBuilder() {
    if (!builder) return;
    if (!builder.nama.trim()) { setMsg("Nama resep wajib."); return; }
    const items = builder.items.map((i) => ({ n: i.n.trim(), s: i.s.trim() || "kg", q: parseFloat(i.q.replace(",", ".")) || 0, h: parseFloat(i.h.replace(",", ".")) || 0 })).filter((i) => i.n);
    if (items.length === 0) { setMsg("Minimal 1 bahan."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/resep/custom", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: builder.id, kategori: builder.kategori, nama: builder.nama, porsi_basis: builder.porsi_basis, catatan: builder.catatan, items }) });
      const d = await res.json().catch(() => ({}));
      if (res.status === 403) { setMsg("Buat resep hanya untuk Admin penuh."); return; }
      if (!res.ok) { setMsg(d.error || "Gagal menyimpan resep."); return; }
      setBuilder(null); load();
    } finally { setBusy(false); }
  }
  async function hapusCustom(c: CustomRow) {
    if (!confirm(`Hapus resep "${c.nama}"?`)) return;
    await fetch(`/api/admin/resep/custom?id=${c.id}`, { method: "DELETE" });
    setPicked((p) => p.filter((x) => x !== "C" + c.id)); load();
  }

  function unduhCSV() {
    if (belanja.length === 0) return;
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const head = ["Bahan", "Kebutuhan", "Satuan", "Beli (kemasan)", "Harga satuan", "Estimasi biaya"];
    const body = belanja.map((b) => [b.nama, fmtQ(b.qty), b.satuan, b.order || "", b.harga != null ? Math.round(b.harga) : "", Math.round(b.biaya)].map(esc).join(","));
    const csv = "﻿" + [head.map(esc).join(","), ...body].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `kebutuhan-resep-${K + B}porsi.csv`; a.click(); URL.revokeObjectURL(url);
  }
  const waText = useMemo(() => {
    if (belanja.length === 0) return "";
    const menu = picked.map((id) => resepMap.get(id)?.n).filter(Boolean).join(", ");
    const baris = belanja.map((b) => `• ${b.nama}: ${b.order || `${fmtQ(b.qty)} ${b.satuan}`}`);
    return `Kebutuhan Bahan (+ bumbu)\nMenu: ${menu}\nSerdik besar ${B} · kecil ${K}${cad ? ` (+${cadangan}% cadangan)` : ""}\n\n${baris.join("\n")}\n\nEstimasi biaya: ${rupiah(total)}`;
  }, [belanja, picked, resepMap, K, B, cad, cadangan, total]);

  if (!data) return <div className="card p-8 text-center text-slate-400">{msg || "Memuat resep…"}</div>;

  return (
    <div className="space-y-5">
      {msg && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">{msg}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3">
        <p className="text-xs text-sky-200">
          <b>{data.meta.resep} resep bank</b> + <b>{custom.length} resep dapur</b>. Gramasi <b>matang</b>/porsi (kecil &amp; besar) → kebutuhan bahan baku (mentah) &amp; bumbu dihitung mundur otomatis. Bumbu ikut terhitung.
        </p>
        <button onClick={bukaBuilderBaru} className="btn-gold shrink-0 text-sm">+ Buat Resep Sendiri</button>
      </div>

      {/* Resep dapur (custom) tersimpan */}
      {custom.length > 0 && (
        <div className="card p-4">
          <p className="mb-2 text-sm font-semibold text-slate-100">Resep dapur tersimpan ({custom.length})</p>
          <div className="flex flex-wrap gap-2">
            {custom.map((c) => (
              <div key={c.id} className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-xs">
                <span className="font-medium text-emerald-200">{c.nama}</span>
                <span className="text-slate-500">· {c.kategori} · {c.items.length} bahan / {fmtQ(c.porsi_basis)} porsi</span>
                <button onClick={() => editCustom(c)} className="text-sky-300 hover:text-sky-200">edit</button>
                <button onClick={() => hapusCustom(c)} className="text-red-300 hover:text-red-200">hapus</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Jumlah penerima (serdik) */}
      <div className="card p-4">
        <p className="mb-2 text-sm font-semibold text-slate-100">Jumlah penerima &amp; cadangan</p>
        <div className="flex flex-wrap items-end gap-3">
          <div><label className="label">Serdik besar</label><input type="number" min={0} inputMode="numeric" className="input w-28" value={serdikB} onFocus={(e) => e.target.select()} onChange={(e) => setSerdikB(e.target.value)} /></div>
          <div><label className="label">Serdik kecil</label><input type="number" min={0} inputMode="numeric" className="input w-28" value={serdikK} onFocus={(e) => e.target.select()} onChange={(e) => setSerdikK(e.target.value)} /></div>
          <div><label className="label">Cadangan (%)</label><input type="number" min={0} step="0.5" className="input w-24" value={cadangan} onFocus={(e) => e.target.select()} onChange={(e) => setCadangan(e.target.value)} /></div>
          <p className="text-xs text-slate-500">Total {K + B} porsi. Gramasi matang/porsi (kecil &amp; besar) diatur per resep di kartu kategori — kebutuhan bahan baku &amp; bumbu dihitung mundur dari situ.</p>
        </div>
      </div>

      {/* Ringkasan langsung */}
      {picked.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: "Porsi", val: (K + B).toLocaleString("id-ID"), sub: `${B} besar · ${K} kecil`, grad: "from-sky-500/20" },
            { label: "Resep dipilih", val: String(picked.length), sub: `${belanja.length} bahan belanja`, grad: "from-violet-500/20" },
            { label: "Estimasi biaya", val: rupiah(total), sub: unpriced > 0 ? `${unpriced} bahan belum berharga` : "semua bahan berharga", grad: "from-emerald-500/20" },
            { label: "Biaya / porsi", val: rupiah(K + B ? total / (K + B) : 0), sub: `cadangan ${cadangan || 0}%`, grad: "from-gold-500/20" },
          ].map((s) => (
            <div key={s.label} className={"rounded-2xl border border-white/10 bg-gradient-to-br to-transparent p-4 " + s.grad}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-100">{s.val}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pilih resep per kategori */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {data.kategori.map((kat) => {
          const bankOpts = allResep.filter((r) => r.kat === kat && !r.custom).sort((a, b) => a.n.localeCompare(b.n));
          const custOpts = allResep.filter((r) => r.kat === kat && r.custom).sort((a, b) => a.n.localeCompare(b.n));
          const chosen = picked.map((id) => resepMap.get(id)).filter((r): r is RResep => !!r && r.kat === kat);
          const def = data.porsiKB.find((p) => p.kat === kat);
          return (
            <div key={kat} className="card p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-100">{kat}</p>
                <span className="text-xs text-slate-500">{def ? `${def.gramK}/${def.gramB} g` : chosen.length}</span>
              </div>
              <select className="input mb-2 text-sm" value="" onChange={(e) => { const v = e.target.value; if (v && !picked.includes(v)) setPicked((p) => [...p, v]); e.currentTarget.value = ""; }}>
                <option value="">+ tambah resep… ({bankOpts.length + custOpts.length})</option>
                {custOpts.length > 0 && <optgroup label="Resep dapur">{custOpts.map((r) => <option key={r.id} value={r.id} disabled={picked.includes(r.id)}>★ {r.n}</option>)}</optgroup>}
                <optgroup label="Resep bank">{bankOpts.map((r) => <option key={r.id} value={r.id} disabled={picked.includes(r.id)}>{r.n}</option>)}</optgroup>
              </select>
              <div className="space-y-1.5">
                {chosen.length === 0 ? <p className="py-1 text-center text-xs text-slate-600">—</p> : chosen.map((r) => {
                  const g = gramOf(r);
                  return (
                    <div key={r.id} className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5 text-sm text-slate-200">
                          {r.custom && <span className="badge bg-emerald-500/15 text-emerald-300">dapur</span>}
                          <span className="truncate">{r.n}</span>
                          {!r.custom && (
                            <button onClick={() => setInfo(r)} title="Kenapa mentah→matang segini?" aria-label="Penjelasan mentah ke matang"
                              className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-sky-400/15 text-[10px] font-bold leading-none text-sky-300/80 ring-1 ring-inset ring-sky-400/20 transition hover:bg-sky-400/30 hover:text-sky-200">!</button>
                          )}
                        </span>
                        <button onClick={() => setPicked((p) => p.filter((x) => x !== r.id))} className="shrink-0 text-xs text-slate-500 hover:text-red-300">×</button>
                      </div>
                      {r.custom ? (
                        <p className="mt-0.5 text-[10px] text-slate-500">{r.items?.length || 0} bahan · basis {fmtQ(r.porsiBasis || 0)} porsi (skala otomatis)</p>
                      ) : (
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="text-[10px] uppercase text-slate-500">matang g/porsi</span>
                          <input className="input w-14 px-1.5 py-0.5 text-center text-xs" title="gram matang porsi kecil" value={gramOv[r.id]?.k ?? String(r.gramK)} onFocus={(e) => e.target.select()} onChange={(e) => setGramOv((o) => ({ ...o, [r.id]: { k: e.target.value, b: o[r.id]?.b ?? String(r.gramB) } }))} />
                          <span className="text-[10px] text-slate-500">K</span>
                          <input className="input w-14 px-1.5 py-0.5 text-center text-xs" title="gram matang porsi besar" value={gramOv[r.id]?.b ?? String(r.gramB)} onFocus={(e) => e.target.select()} onChange={(e) => setGramOv((o) => ({ ...o, [r.id]: { k: o[r.id]?.k ?? String(r.gramK), b: e.target.value } }))} />
                          <span className="text-[10px] text-slate-500">B</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ringkasan per resep */}
      {perResep.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {perResep.map((p) => (
            <div key={p.id} className="stat-card">
              <p className="stat-label truncate">{p.nama}</p>
              <p className="stat-value text-lg">{rupiah(p.biaya)}</p>
              <p className="text-[11px] text-slate-500">≈ {rupiah(p.porsi ? p.biaya / p.porsi : 0)}/porsi</p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {p.custom ? "resep dapur (skala)" : <>matang {fmtQ(p.gk)}/{fmtQ(p.gb)} g · baku {fmtQ(p.mentah || 0)} kg</>}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Daftar belanja */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-100">Daftar belanja (+ bumbu) — {belanja.length} bahan · {K + B} porsi</p>
            {unpriced > 0 && <p className="text-xs text-amber-300">{unpriced} bahan belum ada harga (klik &quot;Perbaiki harga&quot; untuk melengkapi).</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={unduhCSV} disabled={belanja.length === 0} className="btn-ghost">Unduh CSV</button>
            <a href={belanja.length ? `https://wa.me/?text=${encodeURIComponent(waText)}` : undefined} target="_blank" rel="noopener noreferrer" className={"btn-gold" + (belanja.length ? "" : " pointer-events-none opacity-40")}>Bagikan WhatsApp</a>
          </div>
        </div>
        <div className="scroll-x overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs uppercase text-slate-400"><tr className="border-b border-white/5">
              <th className="px-4 py-2.5">Bahan</th><th className="px-4 py-2.5">Kebutuhan</th>
              <th className="px-4 py-2.5">Beli (kemasan)</th><th className="px-4 py-2.5 text-right">Harga</th>
              <th className="px-4 py-2.5 text-right">Estimasi</th><th className="px-4 py-2.5 text-right">Koreksi</th>
            </tr></thead>
            <tbody className="divide-y divide-white/5">
              {belanja.map((b) => editId === b.id ? (
                <tr key={b.id} className="bg-white/5">
                  <td className="px-4 py-1.5"><input className="input py-1" value={ef.nama} onChange={(e) => setEf({ ...ef, nama: e.target.value })} /></td>
                  <td className="px-4 py-1.5 text-slate-400">{fmtQ(b.qty)} {b.satuan}</td>
                  <td className="px-4 py-1.5 text-slate-400">{b.order || "—"}</td>
                  <td className="px-4 py-1.5"><input className="input w-28 py-1 text-right" value={ef.harga} onFocus={(e) => e.target.select()} onChange={(e) => setEf({ ...ef, harga: e.target.value })} placeholder="Rp/satuan" /></td>
                  <td className="px-4 py-1.5" />
                  <td className="px-4 py-1.5"><div className="flex justify-end gap-1.5">
                    <button onClick={() => saveHarga(b.nama)} className="btn-gold px-2.5 py-1 text-xs">Simpan</button>
                    <button onClick={() => setEditId(null)} className="btn-ghost px-2.5 py-1 text-xs">Batal</button>
                  </div></td>
                </tr>
              ) : (
                <tr key={b.id} className={b.noHarga ? "bg-amber-500/[0.05]" : undefined}>
                  <td className="px-4 py-2 font-medium">{b.nama}</td>
                  <td className="px-4 py-2 tabular-nums text-slate-300">{fmtQ(b.qty)} <span className="text-slate-500">{b.satuan}</span></td>
                  <td className="px-4 py-2 font-semibold tabular-nums text-sky-200">{b.order || <span className="text-slate-600">—</span>}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-400">{b.harga != null ? rupiah(b.harga) : (b.id.startsWith("kemas:") ? "—" : <span className="badge bg-amber-500/15 text-amber-300">kosong</span>)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-emerald-300">{b.harga != null ? rupiah(b.biaya) : "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => { setEditId(b.id); setEf({ nama: b.nama, harga: b.harga != null ? String(Math.round(b.harga)) : "" }); }} className="btn-ghost px-2 py-0.5 text-xs">Perbaiki harga</button>
                  </td>
                </tr>
              ))}
              {belanja.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Pilih resep per kategori di atas untuk melihat kebutuhan bahan &amp; bumbu.</td></tr>}
            </tbody>
            {belanja.length > 0 && <tfoot><tr className="border-t border-white/10 font-bold">
              <td className="px-4 py-2.5" colSpan={4}>Total estimasi biaya{unpriced > 0 ? " (sebagian bahan belum berharga)" : ""}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-emerald-300">{rupiah(total)}</td><td />
            </tr></tfoot>}
          </table>
        </div>
      </div>
      <p className="text-[11px] text-slate-500">
        Target matang (kg) = (serdik K × gram K + serdik B × gram B) × (1+cadangan) ÷ 1000. Bahan baku mentah siap-olah = target matang ÷ yield gabungan resep.
        Beli tiap bahan = mentah × koefisien ÷ yield persiapan, lalu dikonversi ke satuan kemasan nyata (mis. kecap → botol, minyak → kardus 12 L, lele/telur/tahu → pcs/balok, buah → per buah, bumbu sachet → renteng). Buah potong otomatis ditambah plastik OPP per porsi. Harga blanko tidak dihitung ke total. Sumber: {data.meta.sumber}.
      </p>

      {/* Modal penjelasan ilmiah mentah → matang */}
      {info && (() => {
        const r = info;
        const g = gramOf(r);
        const utama = utamaMentahKg(r);
        const mains = r.bom.filter((l) => l.mk === 1);
        const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
        const targetMatang = (K * g.gk + B * g.gb) * (1 + cad) / 1000;
        return (
          <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4" onClick={() => setInfo(null)}>
            <div className="card flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden p-0" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-3 bg-gradient-to-br from-sky-500/20 via-sky-500/5 to-transparent p-5">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-300/80">Ilmu di balik angka · {r.kat}</p>
                  <h2 className="truncate text-lg font-bold text-slate-100">{r.n}</h2>
                  <p className="mt-0.5 text-xs text-slate-400">Target sajian matang: <b className="text-slate-200">{fmtQ(g.gk)} g</b> (kecil) &amp; <b className="text-slate-200">{fmtQ(g.gb)} g</b> (besar) per porsi.</p>
                </div>
                <button onClick={() => setInfo(null)} className="shrink-0 rounded-lg px-2 py-1 text-slate-400 hover:bg-white/10 hover:text-slate-100">✕</button>
              </div>
              <div className="flex flex-col gap-4 overflow-y-auto px-5 pb-5 pt-1">
                <p className="text-sm text-slate-300">Kebutuhan bahan baku dihitung <b>mundur</b> dari berat matang yang ingin disajikan — karena tiap bahan menyusut (atau mengembang) melewati tahap <i>persiapan</i> dan <i>memasak</i>.</p>

                {mains.map((l) => {
                  const edible = l.ed, ym = l.ym, yp = l.yp;
                  const notes: string[] = [];
                  if (yp < 1) notes.push(`Susut persiapan ${pct(1 - yp)}: dikupas/disiangi/dicuci-tiris sebelum diolah (kulit, akar, bagian rusak dibuang).`);
                  if (edible < 1) notes.push(`Bagian tak termakan ${pct(1 - edible)}: tulang, cangkang, kulit keras, atau biji yang tidak ikut disajikan.`);
                  if (ym < 1) notes.push(`Susut masak ${pct(1 - ym)}: air menguap dan protein/serat mengkerut saat dipanaskan (rebus, tumis, goreng).`);
                  else if (ym > 1) notes.push(`Mengembang ${pct(ym - 1)}: bahan menyerap air saat dimasak (mis. beras menjadi nasi).`);
                  const kontribusi = l.k * edible * ym;
                  return (
                    <div key={l.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="mb-2 text-sm font-semibold text-slate-100">{l.n}</p>
                      {/* alur visual */}
                      <div className="flex items-stretch gap-1 text-center text-[10px]">
                        {[
                          { lbl: "Beli", val: "100%", tone: "text-slate-300" },
                          { lbl: "Siap olah", val: pct(yp), tone: "text-amber-300" },
                          { lbl: "Bisa dimakan", val: pct(yp * edible), tone: "text-orange-300" },
                          { lbl: "Matang", val: pct(yp * edible * ym), tone: "text-emerald-300" },
                        ].map((s, i) => (
                          <div key={s.lbl} className="flex flex-1 items-center gap-1">
                            <div className="flex-1 rounded-lg bg-white/5 py-1.5">
                              <p className={"text-xs font-bold " + s.tone}>{s.val}</p>
                              <p className="text-slate-500">{s.lbl}</p>
                            </div>
                            {i < 3 && <span className="text-slate-600">→</span>}
                          </div>
                        ))}
                      </div>
                      <ul className="mt-2.5 space-y-1">
                        {notes.map((n, i) => <li key={i} className="flex gap-1.5 text-xs text-slate-400"><span className="text-sky-400">•</span><span>{n}</span></li>)}
                      </ul>
                      <p className="mt-2 rounded-lg bg-sky-500/10 px-2.5 py-1.5 text-[11px] text-sky-200">Kesimpulan: <b>1 kg</b> {l.n.toLowerCase()} yang dibeli ≈ <b>{fmtQ(kontribusi / (l.k || 1))} kg</b> siap saji. Untuk {fmtQ(g.gb)} g/porsi besar, itu ± {fmtQ((g.gb / 1000) / (edible * ym))} kg bahan mentah siap-olah per porsi.</p>
                    </div>
                  );
                })}

                {/* ringkasan batch saat ini */}
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300/80">Untuk pesanan sekarang ({K + B} porsi)</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div><p className="text-slate-400 text-xs">Total sajian matang</p><p className="font-bold text-slate-100">{fmtQ(Math.round(targetMatang * 100) / 100)} kg</p></div>
                    <div><p className="text-slate-400 text-xs">Bahan utama mentah siap-olah</p><p className="font-bold text-slate-100">{fmtQ(Math.round(utama * 100) / 100)} kg</p></div>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">Yield gabungan resep <b className="text-slate-200">{pct(r.yieldGab)}</b> — artinya tiap 1 kg bahan utama mentah siap-olah menghasilkan {fmtQ(Math.round(r.yieldGab * 100) / 100)} kg komponen kategori matang.</p>
                </div>

                <p className="text-[11px] text-slate-500">Angka susut adalah asumsi DRAF (mengikuti profil bahan), bukan hasil timbang aktual. Kalibrasi lewat uji dapur: timbang bruto → siap-olah → matang, lalu perbarui faktor per resep.</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal builder resep custom */}
      {builder && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4" onClick={() => setBuilder(null)}>
          <div className="card flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden p-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 bg-gradient-to-br from-gold-500/15 to-transparent p-5">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gold-300">{builder.id ? "Ubah Resep Dapur" : "Buat Resep Dapur"}</h2>
                <p className="mt-0.5 text-sm text-slate-300">Masukkan bahan &amp; bumbu untuk sejumlah porsi basis. Saat generate, otomatis diskalakan ke porsi target.</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto px-5 pb-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label">Nama resep</label><input className="input" value={builder.nama} onChange={(e) => setBuilder({ ...builder, nama: e.target.value })} placeholder="mis. Sayur asem Jakarta" /></div>
                <div><label className="label">Kategori</label>
                  <select className="input" value={builder.kategori} onChange={(e) => setBuilder({ ...builder, kategori: e.target.value })}>
                    {(data.kategori.includes(builder.kategori) ? data.kategori : [builder.kategori, ...data.kategori]).map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label">Porsi basis (acuan takaran)</label><input type="number" min={1} className="input" value={builder.porsi_basis} onFocus={(e) => e.target.select()} onChange={(e) => setBuilder({ ...builder, porsi_basis: e.target.value })} /></div>
                <div><label className="label">Catatan (opsional)</label><input className="input" value={builder.catatan} onChange={(e) => setBuilder({ ...builder, catatan: e.target.value })} placeholder="mis. resep chef, dari uji dapur" /></div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between"><label className="label mb-0">Bahan &amp; bumbu (jumlah untuk {fmtQ(parseFloat(builder.porsi_basis) || 0)} porsi)</label>
                  <button onClick={() => setBuilder({ ...builder, items: [...builder.items, { n: "", s: "kg", q: "", h: "" }] })} className="btn-ghost px-2 py-1 text-xs">+ baris</button></div>
                <div className="space-y-1.5">
                  <div className="hidden grid-cols-[1fr_5rem_5rem_6rem_1.5rem] gap-1.5 px-1 text-[10px] uppercase text-slate-500 sm:grid"><span>Nama bahan</span><span>Satuan</span><span className="text-right">Jumlah</span><span className="text-right">Harga/sat</span><span /></div>
                  {builder.items.map((it, i) => (
                    <div key={i} className="grid grid-cols-2 gap-1.5 sm:grid-cols-[1fr_5rem_5rem_6rem_1.5rem]">
                      <input className="input py-1 text-sm" value={it.n} onChange={(e) => { const items = [...builder.items]; items[i] = { ...it, n: e.target.value }; setBuilder({ ...builder, items }); }} placeholder="mis. Asam jawa" />
                      <input className="input py-1 text-sm" value={it.s} onChange={(e) => { const items = [...builder.items]; items[i] = { ...it, s: e.target.value }; setBuilder({ ...builder, items }); }} placeholder="kg" />
                      <input className="input py-1 text-right text-sm" value={it.q} onFocus={(e) => e.target.select()} onChange={(e) => { const items = [...builder.items]; items[i] = { ...it, q: e.target.value }; setBuilder({ ...builder, items }); }} placeholder="jml" />
                      <input className="input py-1 text-right text-sm" value={it.h} onFocus={(e) => e.target.select()} onChange={(e) => { const items = [...builder.items]; items[i] = { ...it, h: e.target.value }; setBuilder({ ...builder, items }); }} placeholder="Rp" />
                      <button onClick={() => setBuilder({ ...builder, items: builder.items.filter((_, j) => j !== i) })} className="text-slate-500 hover:text-red-300" title="hapus baris">×</button>
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">Contoh: untuk 1000 porsi sayur asem → Labu siam 20 kg, Kacang panjang 10 kg, Asam jawa 2 kg, Gula merah 3 kg, dst. Generate 2500 porsi → otomatis ×2,5.</p>
              </div>
              {msg && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{msg}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setBuilder(null)} className="btn-ghost flex-1">Batal</button>
                <button onClick={simpanBuilder} disabled={busy} className="btn-gold flex-1">{busy ? "Menyimpan…" : "Simpan Resep"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================== composer */
function Composer() {
  const [cat, setCat] = useState<Catalog | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [porsiBesar, setPorsiBesar] = useState("500");
  const [porsiKecil, setPorsiKecil] = useState("500");
  const [cadangan, setCadangan] = useState("0");
  const [rows, setRows] = useState<Row[]>([]);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [ef, setEf] = useState({ nama: "", satuan: "", per_porsi: "", harga: "" });

  const loadCatalog = useCallback(() => {
    fetch("/api/admin/purchasing", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => (d.error ? setMsg(d.error) : setCat(d)))
      .catch(() => setMsg("Gagal memuat katalog."));
  }, []);
  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const pB = Math.max(0, parseInt(porsiBesar, 10) || 0);
  const pK = Math.max(0, parseInt(porsiKecil, 10) || 0);
  const cad = Math.max(0, parseFloat(cadangan.replace(",", ".")) || 0) / 100;

  function addFromSelect(kat: string, value: string) {
    if (!value || !cat) return;
    const [type, idx] = value.split(":");
    if (type === "k") {
      const k = cat.komponen[Number(idx)];
      if (!k) return;
      const u = k.u;
      addRow({
        kat, label: k.n,
        key: u?.key ?? "", nama: u?.n ?? "", satuan: u?.s ?? "",
        pp: u?.pp ?? null, harga: u?.h ?? null,
      });
    } else if (type === "b") {
      const b = cat.bahan[Number(idx)];
      if (!b) return;
      addRow({ kat, label: b.n, key: b.key, nama: b.n, satuan: b.s, pp: b.pp, harga: b.h });
    }
  }
  function addRow(o: { kat: string; label: string; key: string; nama: string; satuan: string; pp: number | null; harga: number | null }) {
    const inp = o.pp != null ? String(Math.round((o.pp / factor(o.satuan)) * 1000) / 1000) : "";
    setRows((rs) => [...rs, {
      id: RID++, kat: o.kat, label: o.label, key: o.key, nama: o.nama, satuan: o.satuan,
      gBesar: inp, gKecil: inp, harga: o.harga != null ? String(o.harga) : "",
    }]);
  }
  const patchRow = (id: number, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const delRow = (id: number) => setRows((rs) => rs.filter((r) => r.id !== id));

  /* konsolidasi kebutuhan per bahan (gabung baris bahan sama) */
  const belanja = useMemo(() => {
    const map = new Map<string, { nama: string; satuan: string; key: string; qty: number; harga: number; diedit: boolean }>();
    for (const r of rows) {
      const nama = r.nama.trim(); if (!nama) continue;
      const gB = parseFloat(r.gBesar.replace(",", ".")) || 0;
      const gK = parseFloat(r.gKecil.replace(",", ".")) || 0;
      const f = factor(r.satuan);
      const qty = (gB * pB + gK * pK) * f * (1 + cad);
      if (qty <= 0) continue;
      const harga = parseFloat(r.harga.replace(",", ".")) || 0;
      const key = (nama.toLowerCase() + "|" + r.satuan.toLowerCase());
      const cur = map.get(key);
      if (cur) { cur.qty += qty; }
      else map.set(key, { nama, satuan: r.satuan, key: r.key, qty, harga, diedit: false });
    }
    return [...map.values()].map((x) => ({ ...x, biaya: x.qty * x.harga }));
  }, [rows, pB, pK, cad]);
  const total = belanja.reduce((a, b) => a + b.biaya, 0);

  /* koreksi katalog (admin) */
  async function saveOverride(patch: Record<string, unknown>) {
    const r = await fetch("/api/admin/purchasing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    if (r.status === 403) { setMsg("Koreksi katalog hanya untuk Admin penuh."); return false; }
    if (!r.ok) { const d = await r.json().catch(() => ({})); setMsg(d.error || "Gagal menyimpan."); return false; }
    loadCatalog(); setMsg(null); return true;
  }

  function unduhCSV() {
    if (belanja.length === 0) return;
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const head = ["Bahan", "Satuan", "Qty beli", "Harga satuan", "Estimasi biaya"];
    const body = belanja.map((b) => [b.nama, b.satuan, fmtQ(b.qty), Math.round(b.harga), Math.round(b.biaya)].map(esc).join(","));
    const csv = "﻿" + [head.map(esc).join(","), ...body].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `kebutuhan-bahan-${pB + pK}porsi.csv`; a.click(); URL.revokeObjectURL(url);
  }
  const waText = useMemo(() => {
    if (belanja.length === 0) return "";
    const baris = belanja.map((b) => `• ${b.nama}: ${fmtQ(b.qty)} ${b.satuan}`);
    return `Kebutuhan Bahan\nPorsi besar: ${pB} · kecil: ${pK}${cad ? ` (+${cadangan}% cadangan)` : ""}\n\n${baris.join("\n")}\n\nEstimasi biaya: ${rupiah(total)}`;
  }, [belanja, pB, pK, cad, cadangan, total]);

  if (!cat) return <div className="card p-8 text-center text-slate-400">{msg || "Memuat katalog…"}</div>;

  return (
    <div className="space-y-5">
      {msg && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">{msg}</p>}

      {/* Porsi global */}
      <div className="card p-4">
        <p className="mb-2 text-sm font-semibold text-slate-100">Jumlah porsi &amp; cadangan</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Porsi besar</label>
            <input type="number" min={0} inputMode="numeric" className="input w-32" value={porsiBesar} onFocus={(e) => e.target.select()} onChange={(e) => setPorsiBesar(e.target.value)} />
          </div>
          <div>
            <label className="label">Porsi kecil</label>
            <input type="number" min={0} inputMode="numeric" className="input w-32" value={porsiKecil} onFocus={(e) => e.target.select()} onChange={(e) => setPorsiKecil(e.target.value)} />
          </div>
          <div>
            <label className="label">Cadangan (%)</label>
            <input type="number" min={0} step="0.5" inputMode="decimal" className="input w-28" value={cadangan} onFocus={(e) => e.target.select()} onChange={(e) => setCadangan(e.target.value)} />
          </div>
          <p className="text-xs text-slate-500">Total {pB + pK} porsi. Gramasi per porsi diatur per komponen di bawah.</p>
        </div>
      </div>

      {/* Seksi komponen */}
      <div className="grid gap-4 lg:grid-cols-2">
        {SECTIONS.map((kat) => {
          const koms = cat.komponen.filter((k) => k.kat === kat);
          const bahans = cat.bahan.filter((b) => b.kat === kat);
          const secRows = rows.filter((r) => r.kat === kat);
          return (
            <div key={kat} className="card p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-100">{KAT_LABEL[kat]}</p>
                <span className="text-xs text-slate-500">{secRows.length} dipilih</span>
              </div>
              <select
                className="input mb-3 text-sm"
                value=""
                onChange={(e) => { addFromSelect(kat, e.target.value); e.currentTarget.value = ""; }}
              >
                <option value="">+ tambah {KAT_LABEL[kat].toLowerCase()}…</option>
                {koms.length > 0 && (
                  <optgroup label="Hidangan (dari menu)">
                    {koms.map((k, i) => (
                      <option key={"k" + i} value={"k:" + cat.komponen.indexOf(k)}>{k.n}{k.u ? ` → ${k.u.n}` : " (pilih bahan)"}</option>
                    ))}
                  </optgroup>
                )}
                {bahans.length > 0 && (
                  <optgroup label="Bahan langsung">
                    {bahans.map((b, i) => (
                      <option key={"b" + i} value={"b:" + cat.bahan.indexOf(b)}>{b.n} [{b.s}]</option>
                    ))}
                  </optgroup>
                )}
              </select>

              {secRows.length === 0 ? (
                <p className="py-3 text-center text-xs text-slate-600">Belum ada komponen.</p>
              ) : (
                <div className="space-y-2">
                  {secRows.map((r) => (
                    <div key={r.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                      <div className="mb-1.5 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-100">{r.label}</p>
                          {r.nama !== r.label && <p className="truncate text-xs text-slate-500">bahan: {r.nama || "—"}</p>}
                        </div>
                        <button onClick={() => delRow(r.id)} className="shrink-0 text-xs text-slate-500 hover:text-red-300">hapus</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <label className="block">
                          <span className="text-[10px] uppercase text-slate-500">Bahan</span>
                          <input className="input py-1 text-sm" value={r.nama} onChange={(e) => patchRow(r.id, { nama: e.target.value })} placeholder="nama bahan" />
                        </label>
                        <label className="block">
                          <span className="text-[10px] uppercase text-slate-500">Satuan</span>
                          <input className="input py-1 text-sm" value={r.satuan} onChange={(e) => patchRow(r.id, { satuan: e.target.value })} placeholder="kg/pcs" />
                        </label>
                        <label className="block">
                          <span className="text-[10px] uppercase text-slate-500">/porsi besar ({inputUnit(r.satuan)})</span>
                          <input className="input py-1 text-right text-sm" value={r.gBesar} onFocus={(e) => e.target.select()} onChange={(e) => patchRow(r.id, { gBesar: e.target.value })} />
                        </label>
                        <label className="block">
                          <span className="text-[10px] uppercase text-slate-500">/porsi kecil ({inputUnit(r.satuan)})</span>
                          <input className="input py-1 text-right text-sm" value={r.gKecil} onFocus={(e) => e.target.select()} onChange={(e) => patchRow(r.id, { gKecil: e.target.value })} />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hasil: daftar belanja konsolidasi */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 p-4">
          <p className="text-sm font-semibold text-slate-100">Daftar belanja — {belanja.length} bahan · {pB + pK} porsi</p>
          <div className="flex gap-2">
            <button onClick={unduhCSV} disabled={belanja.length === 0} className="btn-ghost">Unduh CSV</button>
            <a href={belanja.length ? `https://wa.me/?text=${encodeURIComponent(waText)}` : undefined} target="_blank" rel="noopener noreferrer" className={"btn-gold" + (belanja.length ? "" : " pointer-events-none opacity-40")}>Bagikan WhatsApp</a>
          </div>
        </div>
        <div className="scroll-x overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr className="border-b border-white/5">
                <th className="px-4 py-2.5">Bahan</th>
                <th className="px-4 py-2.5">Satuan</th>
                <th className="px-4 py-2.5 text-right">Qty beli</th>
                <th className="px-4 py-2.5 text-right">Harga</th>
                <th className="px-4 py-2.5 text-right">Estimasi</th>
                <th className="px-4 py-2.5 text-right">Koreksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {belanja.map((b) => editKey === b.key && b.key ? (
                <tr key={b.key} className="bg-white/5">
                  <td className="px-4 py-1.5"><input className="input py-1" value={ef.nama} onChange={(e) => setEf({ ...ef, nama: e.target.value })} /></td>
                  <td className="px-4 py-1.5"><input className="input w-20 py-1" value={ef.satuan} onChange={(e) => setEf({ ...ef, satuan: e.target.value })} /></td>
                  <td className="px-4 py-1.5 text-right text-slate-500" title="per porsi (satuan asli)"><input className="input w-24 py-1 text-right" value={ef.per_porsi} onFocus={(e) => e.target.select()} onChange={(e) => setEf({ ...ef, per_porsi: e.target.value })} placeholder="pp" /></td>
                  <td className="px-4 py-1.5"><input className="input w-24 py-1 text-right" value={ef.harga} onFocus={(e) => e.target.select()} onChange={(e) => setEf({ ...ef, harga: e.target.value })} /></td>
                  <td className="px-4 py-1.5" />
                  <td className="px-4 py-1.5">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={async () => { if (await saveOverride({ bahan: b.key, nama: ef.nama, satuan: ef.satuan, per_porsi: ef.per_porsi, harga: ef.harga })) setEditKey(null); }} className="btn-gold px-2.5 py-1 text-xs">Simpan</button>
                      <button onClick={() => setEditKey(null)} className="btn-ghost px-2.5 py-1 text-xs">Batal</button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={b.key || b.nama + b.satuan}>
                  <td className="px-4 py-2 font-medium">{b.nama}</td>
                  <td className="px-4 py-2 text-slate-400">{b.satuan}</td>
                  <td className="px-4 py-2 text-right font-semibold tabular-nums">{fmtQ(b.qty)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-400">{rupiah(b.harga)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-emerald-300">{rupiah(b.biaya)}</td>
                  <td className="px-4 py-2 text-right">
                    {b.key ? (
                      <button
                        onClick={() => { setEditKey(b.key); const src = cat.bahan.find((x) => x.key === b.key); setEf({ nama: b.nama, satuan: b.satuan, per_porsi: src?.pp != null ? String(src.pp) : "", harga: String(Math.round(b.harga)) }); }}
                        className="btn-ghost px-2 py-0.5 text-xs" title="Perbaiki nilai default bahan ini (disimpan per dapur)"
                      >Perbaiki katalog</button>
                    ) : <span className="text-xs text-slate-600">—</span>}
                  </td>
                </tr>
              ))}
              {belanja.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Tambahkan komponen di atas & isi porsi untuk melihat kebutuhan bahan.</td></tr>}
            </tbody>
            {belanja.length > 0 && (
              <tfoot>
                <tr className="border-t border-white/10 font-bold">
                  <td className="px-4 py-2.5" colSpan={4}>Total estimasi biaya</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-emerald-300">{rupiah(total)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      <p className="text-[11px] text-slate-500">
        Qty beli = (gramasi/porsi besar × porsi besar + gramasi/porsi kecil × porsi kecil) × (1 + cadangan), dikonsolidasi per bahan.
        Nilai per-porsi &amp; harga adalah median historis dari RAB nyata ({cat.meta.komponen} hidangan, {cat.meta.bahan} bahan) —
        saran perencanaan, silakan sesuaikan dengan resep dapur. &quot;Perbaiki katalog&quot; menyimpan koreksi per dapur tanpa mengubah data sumber.
      </p>
    </div>
  );
}

/* ========================================================= paket historis */
interface PaketRingkas { id: string; tanggal: string | null; menu: string; porsi: number; jml: number }
interface BahanP { bahan: string; nama: string; satuan: string; per_porsi: number; harga: number; flag: number; diedit: boolean }
interface PaketDetail { id: string; tanggal: string | null; menu: string; porsi: number; besar: number; kecil: number; balita: number; bumil: number }

function PaketHistoris() {
  const [pakets, setPakets] = useState<PaketRingkas[]>([]);
  const [q, setQ] = useState("");
  const [selId, setSelId] = useState("");
  const [paket, setPaket] = useState<PaketDetail | null>(null);
  const [bahan, setBahan] = useState<BahanP[]>([]);
  const [porsi, setPorsi] = useState("");
  const [cadangan, setCadangan] = useState("0");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return; loaded.current = true;
    fetch("/api/admin/bank-menu", { cache: "no-store" }).then((r) => r.json())
      .then((d) => setPakets(d.pakets || [])).catch(() => setMsg("Gagal memuat daftar paket."));
  }, []);

  const loadPaket = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true); setMsg(null);
    try {
      const r = await fetch(`/api/admin/bank-menu?paket=${encodeURIComponent(id)}`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) { setMsg(d.error || "Gagal memuat paket."); return; }
      setPaket(d.paket); setBahan(d.bahan || []); setPorsi(String(d.paket?.porsi || ""));
    } finally { setLoading(false); }
  }, []);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? pakets.filter((p) => p.menu.toLowerCase().includes(s) || (p.tanggal || "").includes(s)) : pakets;
    return list.slice(0, 300);
  }, [pakets, q]);

  const targetPorsi = Math.max(0, parseInt(porsi, 10) || 0);
  const cad = Math.max(0, parseFloat(cadangan.replace(",", ".")) || 0) / 100;
  const rows = useMemo(() => bahan.map((b) => { const qtyBeli = b.per_porsi * targetPorsi * (1 + cad); return { ...b, qtyBeli, biaya: qtyBeli * b.harga }; }), [bahan, targetPorsi, cad]);
  const totalBiaya = rows.reduce((a, r) => a + r.biaya, 0);

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">Referensi paket menu harian nyata (Feb–Jul 2026). Untuk merakit menu baru, gunakan tab <b>Generator Menu</b>.</p>
      {msg && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">{msg}</p>}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className="label">Cari menu / tanggal</label>
            <input className="input" placeholder="mis. ayam, 2026-03…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="min-w-[240px] flex-[2]">
            <label className="label">Paket ({shown.length})</label>
            <select className="input" value={selId} onChange={(e) => { setSelId(e.target.value); loadPaket(e.target.value); }}>
              <option value="">— pilih paket —</option>
              {shown.map((p) => <option key={p.id} value={p.id}>{(p.tanggal || p.id)} · {p.menu.slice(0, 70)}</option>)}
            </select>
          </div>
        </div>
      </div>
      {loading ? <div className="card p-8 text-center text-slate-400">Memuat…</div> : paket ? (
        <>
          <div className="card p-4">
            <p className="text-sm font-semibold text-slate-100">{paket.menu}</p>
            <p className="mt-0.5 text-xs text-slate-400">{paket.tanggal} · basis {paket.porsi} porsi · Besar {paket.besar} · Kecil {paket.kecil} · Balita {paket.balita} · Bumil/Busui {paket.bumil}</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div><label className="label">Porsi target</label><input type="number" min={0} className="input w-36" value={porsi} onFocus={(e) => e.target.select()} onChange={(e) => setPorsi(e.target.value)} /></div>
              <div><label className="label">Cadangan (%)</label><input type="number" min={0} step="0.5" className="input w-28" value={cadangan} onFocus={(e) => e.target.select()} onChange={(e) => setCadangan(e.target.value)} /></div>
            </div>
          </div>
          <div className="card overflow-hidden">
            <div className="scroll-x overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs uppercase text-slate-400"><tr className="border-b border-white/5">
                  <th className="px-4 py-2.5">Bahan</th><th className="px-4 py-2.5">Satuan</th>
                  <th className="px-4 py-2.5 text-right">Per porsi</th><th className="px-4 py-2.5 text-right">Qty beli</th><th className="px-4 py-2.5 text-right">Estimasi</th>
                </tr></thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map((r) => (
                    <tr key={r.bahan} className={r.flag ? "bg-red-500/[0.06]" : undefined}>
                      <td className="px-4 py-2 font-medium">{r.nama}{r.flag ? <span className="badge ml-1.5 bg-red-500/15 text-red-300">perlu koreksi</span> : null}</td>
                      <td className="px-4 py-2 text-slate-400">{r.satuan}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-400">{fmtQ(r.per_porsi)}</td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums">{fmtQ(r.qtyBeli)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-emerald-300">{rupiah(r.biaya)}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Tidak ada bahan.</td></tr>}
                </tbody>
                {rows.length > 0 && <tfoot><tr className="border-t border-white/10 font-bold"><td className="px-4 py-2.5" colSpan={4}>Total · {targetPorsi} porsi</td><td className="px-4 py-2.5 text-right tabular-nums text-emerald-300">{rupiah(totalBiaya)}</td></tr></tfoot>}
              </table>
            </div>
          </div>
        </>
      ) : <div className="card p-8 text-center text-sm text-slate-500">Pilih paket untuk melihat rincian bahan historis.</div>}
    </div>
  );
}
