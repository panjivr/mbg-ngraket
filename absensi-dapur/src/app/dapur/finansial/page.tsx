"use client";

/**
 * Simulator Keuangan karyawan — gaya "kertas" laporan keuangan seperti papan
 * permainan CASHFLOW (Rich Dad). Tujuannya edukasi agar bisa keluar dari
 * "rat race": pemasukan pasif >= pengeluaran.
 *
 * Tab:
 *  1) Neraca (Laporan) — laporan keuangan kertas + rincian cicilan per relawan,
 *     indikator keluar dari rat race, ekspor PDF.
 *  2) Anggaran — 50/30/20 dari pemasukan.
 *  3) Investasi — bunga majemuk.
 *  4) Merdeka — aturan 4% (FI number).
 *  5) Belajar — Cashflow Quadrant (E/S/B/I), aset vs liabilitas, langkah keluar
 *     rat race, kumpulan quote keuangan.
 *  6) Game Keputusan — kuis skor.
 *
 * PENYIMPANAN: disimpan di AKUN (database) lewat /api/finansial (JSONB), jadi
 * sinkron di perangkat mana pun & privat per akun. localStorage = cache instan.
 * Angka hasil investasi hanya asumsi edukasi, bukan jaminan.
 */
import { useEffect, useMemo, useRef, useState } from "react";

const rp = (n: number) => "Rp " + Math.round(Math.max(0, n || 0)).toLocaleString("id-ID");
const juta = (n: number) => (n >= 1_000_000 ? (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + " jt" : Math.round(n / 1000) + " rb");
const uid = () => Math.random().toString(36).slice(2, 9);
const num = (v: unknown, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

/** Nilai akhir investasi: modal awal L + setoran bulanan S selama `bulan`, bunga i/bulan. */
function futureValue(L: number, S: number, i: number, bulan: number): number {
  const g = Math.pow(1 + i, bulan);
  return L * g + (i > 0 ? S * ((g - 1) / i) : S * bulan);
}

/* ---------------- Input angka (scope modul, identitas tetap antar-render) ----------------
 * Diletakkan di scope modul supaya <input> TIDAK di-remount tiap ketik → keyboard
 * HP tidak tertutup. Saat nilai 0, kolom dikosongkan (placeholder "0"). Enter → blur. */
function NumInput({
  value, onChange, step = 50000, className = "input", placeholder = "0", max,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  className?: string;
  placeholder?: string;
  max?: number;
}) {
  const [text, setText] = useState<string>(value ? String(value) : "");
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(value ? String(value) : "");
  }, [value]);

  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      step={step}
      value={text}
      placeholder={placeholder}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
        setText(value ? String(value) : "");
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        let n = Math.max(0, Number(raw) || 0);
        if (max != null) n = Math.min(max, n);
        onChange(n);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className={className}
    />
  );
}

function Num({ label, value, onChange, suffix = "Rp", step = 50000, max }: {
  label: string; value: number; onChange: (v: number) => void; suffix?: string; step?: number; max?: number;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="flex items-center gap-2">
        {suffix === "Rp" && <span className="text-sm text-slate-400">Rp</span>}
        <NumInput value={value} onChange={onChange} step={step} max={max} />
        {suffix !== "Rp" && <span className="shrink-0 text-sm text-slate-400">{suffix}</span>}
      </div>
    </label>
  );
}

/* ---------------- Profil keuangan bersama (tersimpan per akun) ---------------- */
const FIN_KEY = "mbg-finansial-pribadi";

interface PasifItem { id: string; nama: string; nilai: number }
interface AsetItem { id: string; nama: string; nilai: number }
interface UtangItem {
  id: string;
  nama: string;
  jenis: string;
  sisaPokok: number; // sisa total pokok yang belum lunas
  cicilan: number; // cicilan per bulan
  sisaBulan: number; // berapa bulan lagi
}

interface FinData {
  // Pemasukan
  gaji: number; sampingan: number; pasif: PasifItem[];
  // Pengeluaran (cicilan dihitung otomatis dari daftar utang)
  kebutuhan: number; pajak: number; sekolah: number; perawatan: number; gayaHidup: number; lain: number;
  // Neraca
  aset: AsetItem[]; utang: UtangItem[];
  // Asumsi alat
  angKebutuhanPct: number; angKeinginanPct: number;
  invSetoran: number; invRate: number; invTahun: number;
  merRate: number; merSetoran: number;
}

const FIN_AWAL: FinData = {
  gaji: 0, sampingan: 0, pasif: [],
  kebutuhan: 0, pajak: 0, sekolah: 0, perawatan: 0, gayaHidup: 0, lain: 0,
  aset: [], utang: [],
  angKebutuhanPct: 50, angKeinginanPct: 30,
  invSetoran: 200_000, invRate: 8, invTahun: 10,
  merRate: 8, merSetoran: 300_000,
};

/**
 * Migrasi data lama (model skalar) → model daftar (list) yang baru, supaya data
 * yang sudah tersimpan tidak hilang & pemanggilan .reduce() tidak error.
 */
function normalize(raw: unknown): FinData {
  const r = (raw ?? {}) as Record<string, unknown>;
  const out: FinData = { ...FIN_AWAL };

  out.gaji = num(r.gaji);
  out.sampingan = num(r.sampingan);
  out.kebutuhan = num(r.kebutuhan);
  out.pajak = num(r.pajak);
  out.sekolah = num(r.sekolah);
  out.perawatan = num(r.perawatan);
  out.gayaHidup = num(r.gayaHidup);
  out.lain = num(r.lain);
  out.angKebutuhanPct = num(r.angKebutuhanPct, 50);
  out.angKeinginanPct = num(r.angKeinginanPct, 30);
  out.invSetoran = num(r.invSetoran, 200_000);
  out.invRate = num(r.invRate, 8);
  out.invTahun = num(r.invTahun, 10);
  out.merRate = num(r.merRate, 8);
  out.merSetoran = num(r.merSetoran, 300_000);

  // Pemasukan pasif
  if (Array.isArray(r.pasif)) {
    out.pasif = (r.pasif as Record<string, unknown>[]).map((p) => ({
      id: typeof p.id === "string" ? p.id : uid(),
      nama: typeof p.nama === "string" ? p.nama : "Pemasukan pasif",
      nilai: num(p.nilai),
    }));
  } else if (num(r.pasif) > 0) {
    out.pasif = [{ id: uid(), nama: "Pemasukan pasif", nilai: num(r.pasif) }];
  }

  // Aset — model lama menyimpan tunai/danaDarurat/investasi sebagai skalar
  if (Array.isArray(r.aset)) {
    out.aset = (r.aset as Record<string, unknown>[]).map((a) => ({
      id: typeof a.id === "string" ? a.id : uid(),
      nama: typeof a.nama === "string" ? a.nama : "Aset",
      nilai: num(a.nilai),
    }));
  } else {
    const seed: AsetItem[] = [];
    if (num(r.tunai) > 0) seed.push({ id: uid(), nama: "Uang tunai / tabungan", nilai: num(r.tunai) });
    if (num(r.danaDarurat) > 0) seed.push({ id: uid(), nama: "Dana darurat", nilai: num(r.danaDarurat) });
    if (num(r.investasi) > 0) seed.push({ id: uid(), nama: "Investasi", nilai: num(r.investasi) });
    out.aset = seed;
  }

  // Utang
  if (Array.isArray(r.utang)) {
    out.utang = (r.utang as Record<string, unknown>[]).map((u) => ({
      id: typeof u.id === "string" ? u.id : uid(),
      nama: typeof u.nama === "string" ? u.nama : "Utang",
      jenis: typeof u.jenis === "string" ? u.jenis : "lain",
      sisaPokok: num(u.sisaPokok),
      cicilan: num(u.cicilan),
      sisaBulan: num(u.sisaBulan),
    }));
  } else if (num(r.utang) > 0 || num(r.cicilan) > 0) {
    out.utang = [{
      id: uid(), nama: "Utang", jenis: "lain",
      sisaPokok: num(r.utang), cicilan: num(r.cicilan), sisaBulan: 0,
    }];
  }

  return out;
}

interface Derived {
  aktif: number; pasif: number; pemasukan: number;
  cicilan: number; pengeluaran: number; arusKas: number;
  totalAset: number; totalUtang: number; kekayaan: number;
  bebas: boolean;
}

function hitung(f: FinData): Derived {
  const aktif = f.gaji + f.sampingan;
  const pasif = f.pasif.reduce((s, p) => s + p.nilai, 0);
  const pemasukan = aktif + pasif;
  const cicilan = f.utang.reduce((s, u) => s + u.cicilan, 0);
  const pengeluaran = f.kebutuhan + f.pajak + f.sekolah + f.perawatan + f.gayaHidup + f.lain + cicilan;
  const arusKas = pemasukan - pengeluaran;
  const totalAset = f.aset.reduce((s, a) => s + a.nilai, 0);
  const totalUtang = f.utang.reduce((s, u) => s + u.sisaPokok, 0);
  const kekayaan = totalAset - totalUtang;
  const bebas = pasif >= pengeluaran && pengeluaran > 0;
  return { aktif, pasif, pemasukan, cicilan, pengeluaran, arusKas, totalAset, totalUtang, kekayaan, bebas };
}

interface FinStore {
  data: FinData;
  d: Derived;
  patch: (p: Partial<FinData>) => void;
  reset: () => void;
  loaded: boolean;
  saving: boolean;
  /** Bulan laporan aktif "YYYY-MM". */
  bulan: string;
  setBulan: (b: string) => void;
  /** Salin isi bulan sebelumnya (yang ada datanya) ke bulan aktif. */
  salinBulanLalu: () => void;
}

/** Bulan sekarang "YYYY-MM" (zona Asia/Jakarta). */
function bulanIni(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" }).format(new Date());
}

interface StoreShape { bulan: string; months: Record<string, FinData> }

/** Migrasi data tersimpan → model per-bulan. Data lama (satu profil) → bulan berjalan. */
function normalizeStore(raw: unknown): StoreShape {
  const cur = bulanIni();
  const r = raw as Record<string, unknown> | null;
  if (r && typeof r === "object" && r.months && typeof r.months === "object") {
    const months: Record<string, FinData> = {};
    for (const [k, v] of Object.entries(r.months as Record<string, unknown>)) {
      if (/^\d{4}-\d{2}$/.test(k)) months[k] = normalize(v);
    }
    if (Object.keys(months).length === 0) months[cur] = { ...FIN_AWAL };
    let bulan = typeof r.bulan === "string" && /^\d{4}-\d{2}$/.test(r.bulan) ? r.bulan : cur;
    if (!months[bulan]) bulan = Object.keys(months).sort().reverse()[0] || cur;
    if (!months[bulan]) months[bulan] = { ...FIN_AWAL };
    return { bulan, months };
  }
  // Format lama (satu FinData datar) → taruh di bulan berjalan.
  return { bulan: cur, months: { [cur]: normalize(r) } };
}

function useFinStore(): FinStore {
  const [store, setStore] = useState<StoreShape>(() => ({ bulan: bulanIni(), months: { [bulanIni()]: { ...FIN_AWAL } } }));
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FIN_KEY);
      if (raw) setStore(normalizeStore(JSON.parse(raw)));
    } catch {
      /* localStorage tak tersedia — abaikan */
    }
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/finansial", { cache: "no-store" });
        if (res.ok) {
          const j = (await res.json()) as { data?: unknown };
          if (alive && j?.data && typeof j.data === "object") setStore(normalizeStore(j.data));
        }
      } catch {
        /* offline — pakai cache lokal */
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(FIN_KEY, JSON.stringify(store));
    } catch {
      /* kuota penuh / mode privat — abaikan */
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSaving(true);
      fetch("/api/finansial", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: store }),
      })
        .catch(() => {
          /* gagal simpan ke server — data tetap aman di cache lokal */
        })
        .finally(() => setSaving(false));
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [store, loaded]);

  const bulan = store.bulan;
  const data = store.months[bulan] ?? FIN_AWAL;
  const patch = (p: Partial<FinData>) =>
    setStore((s) => ({ ...s, months: { ...s.months, [s.bulan]: { ...(s.months[s.bulan] ?? FIN_AWAL), ...p } } }));
  const reset = () => setStore((s) => ({ ...s, months: { ...s.months, [s.bulan]: { ...FIN_AWAL } } }));
  const setBulan = (b: string) =>
    setStore((s) => (/^\d{4}-\d{2}$/.test(b) ? { bulan: b, months: s.months[b] ? s.months : { ...s.months, [b]: { ...FIN_AWAL } } } : s));
  const salinBulanLalu = () =>
    setStore((s) => {
      const prev = Object.keys(s.months).filter((b) => b < s.bulan).sort().reverse()[0];
      return prev ? { ...s, months: { ...s.months, [s.bulan]: { ...s.months[prev] } } } : s;
    });
  const d = useMemo(() => hitung(data), [data]);
  return { data, d, patch, reset, loaded, saving, bulan, setBulan, salinBulanLalu };
}

/* ---------------- Quote keuangan (melek finansial untuk semua) ---------------- */
const QUOTES: { teks: string; oleh: string }[] = [
  { teks: "Orang kaya membeli aset. Orang miskin hanya punya pengeluaran. Kelas menengah membeli liabilitas yang dikira aset.", oleh: "Robert Kiyosaki" },
  { teks: "Bukan seberapa banyak uang yang kamu hasilkan, tapi seberapa banyak yang kamu simpan.", oleh: "Robert Kiyosaki" },
  { teks: "Jangan menabung dari sisa belanja. Belanjalah dari sisa menabung.", oleh: "Warren Buffett" },
  { teks: "Aturan No. 1: jangan pernah rugi. Aturan No. 2: jangan lupakan aturan No. 1.", oleh: "Warren Buffett" },
  { teks: "Investasi terbaik adalah pada dirimu sendiri — ilmu yang tak bisa diambil siapa pun.", oleh: "Warren Buffett" },
  { teks: "Risiko datang karena kamu tidak tahu apa yang kamu lakukan.", oleh: "Warren Buffett" },
  { teks: "Uang adalah pelayan yang baik, tapi tuan yang buruk. Suruh uang bekerja untukmu.", oleh: "Pepatah keuangan" },
  { teks: "Bunga majemuk adalah keajaiban dunia kedelapan. Yang paham, mendapatkannya; yang tidak, membayarnya.", oleh: "Albert Einstein (dikaitkan)" },
  { teks: "Kebebasan finansial bukan tentang kaya, tapi tentang punya pilihan.", oleh: "Pepatah keuangan" },
  { teks: "Menunda kesenangan hari ini adalah harga kebebasan di hari esok.", oleh: "Pepatah keuangan" },
  { teks: "Kalau kamu tidak menemukan cara menghasilkan uang saat tidur, kamu akan bekerja sampai mati.", oleh: "Warren Buffett" },
  { teks: "Utang konsumtif adalah menukar kebebasan masa depan dengan gaya hidup hari ini.", oleh: "Pepatah keuangan" },
];

function QuoteBanner() {
  const [i, setI] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const q = QUOTES[i];
  return (
    <button
      onClick={() => setI((x) => (x + 1) % QUOTES.length)}
      className="block w-full rounded-xl border border-gold-500/30 bg-gradient-to-br from-gold-500/10 to-transparent p-3 text-left transition hover:border-gold-500/50"
      title="Ketuk untuk quote berikutnya"
    >
      <p className="text-sm italic text-gold-100">“{q.teks}”</p>
      <p className="mt-1 text-[11px] text-gold-400/80">— {q.oleh} · ketuk untuk lainnya</p>
    </button>
  );
}

/* ---------------- Jenis utang ---------------- */
const JENIS_UTANG = [
  { v: "rumah", label: "🏠 KPR / Rumah" },
  { v: "mobil", label: "🚗 Mobil" },
  { v: "motor", label: "🏍️ Motor" },
  { v: "hp", label: "📱 HP / Gadget" },
  { v: "paylater", label: "🛒 Paylater" },
  { v: "kartu", label: "💳 Kartu kredit" },
  { v: "koperasi", label: "🏦 Koperasi / Bank" },
  { v: "lain", label: "📦 Lainnya" },
];
const labelJenis = (v: string) => JENIS_UTANG.find((x) => x.v === v)?.label ?? "📦 Lainnya";

/* ---------------- Ekspor PDF (kertas → PDF A4) ---------------- */
async function exportPdf(node: HTMLElement, filename: string) {
  const [{ toPng }, jspdf] = await Promise.all([import("html-to-image"), import("jspdf")]);
  const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: "#efe6d4", cacheBust: true });
  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("gagal render gambar"));
    img.src = dataUrl;
  });
  const jsPDF = jspdf.jsPDF ?? jspdf.default;
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const maxW = pw - margin * 2;
  const maxH = ph - margin * 2;
  const ratio = Math.min(maxW / img.width, maxH / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  pdf.addImage(dataUrl, "PNG", (pw - w) / 2, margin, w, h);
  pdf.save(filename);
}

const TABS = [
  { k: "neraca", label: "📄 Laporan Kertas" },
  { k: "anggaran", label: "🧮 Anggaran" },
  { k: "investasi", label: "📈 Investasi" },
  { k: "merdeka", label: "🦁 Merdeka" },
  { k: "belajar", label: "🎓 Belajar" },
  { k: "game", label: "🎮 Game" },
] as const;
type TabKey = (typeof TABS)[number]["k"];

export default function FinansialPage() {
  const [tab, setTab] = useState<TabKey>("neraca");
  const store = useFinStore();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">💰 Laporan Keuangan Pribadi</h1>
        <p className="text-sm text-slate-400">
          Laporan keuangan gaya kertas (seperti papan permainan <i>CASHFLOW</i>). Isi angkamu, lihat
          apakah kamu sudah bisa <b>keluar dari rat race</b>, lalu unduh jadi PDF. Semua tab memakai
          angka yang sama & tersimpan di akunmu.
        </p>
      </div>

      <div className="card flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
        <label className="text-sm font-medium text-slate-300">🗓️ Bulan laporan</label>
        <input
          type="month"
          value={store.bulan}
          onChange={(e) => store.setBulan(e.target.value)}
          className="input w-auto"
        />
        <button onClick={store.salinBulanLalu} className="btn-ghost px-3 py-1.5 text-xs">
          Salin dari bulan lalu
        </button>
        <span className="text-xs text-slate-500">
          Tiap bulan disimpan &amp; dihitung terpisah.{store.saving ? " Menyimpan…" : ""}
        </span>
      </div>

      <QuoteBanner />

      <div className="scroll-x flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/5 p-1">
        {TABS.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={
              "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition " +
              (tab === t.k ? "bg-gold-500/20 text-gold-300" : "text-slate-400 hover:bg-white/5")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "neraca" && <Neraca store={store} />}
      {tab === "anggaran" && <Anggaran store={store} />}
      {tab === "investasi" && <Investasi store={store} />}
      {tab === "merdeka" && <Merdeka store={store} />}
      {tab === "belajar" && <Belajar />}
      {tab === "game" && <GameKeputusan />}

      <p className="text-center text-[11px] text-slate-500">
        *Perkiraan hasil investasi hanya asumsi untuk edukasi, bukan jaminan. Selalu pelajari risiko
        tiap instrumen.
      </p>
    </div>
  );
}

/* ---------------- Blok "kertas" ---------------- */
function PaperSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div
        className="border-b-[3px] border-double px-1 pb-0.5 text-[13px] font-bold uppercase tracking-wide"
        style={{ color: "#3a2f5c", borderColor: "#7c6a9c" }}
      >
        {title}
      </div>
      <div className="mt-1 space-y-0.5">{children}</div>
    </div>
  );
}

function PaperRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[13px]" style={{ color: "#2b2440" }}>
      <span className="min-w-0">
        {label}
        {sub && <span className="block text-[10px]" style={{ color: "#6b5f88" }}>{sub}</span>}
      </span>
      <span className="shrink-0 font-semibold tabular-nums" style={{ borderBottom: "1px dotted #b3a8c9", minWidth: 96, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

function PaperStat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className="flex items-baseline justify-between gap-2 px-1 py-1"
      style={{ background: strong ? "#e0d6ef" : "transparent", color: "#2b2440", borderTop: "1px solid #b3a8c9" }}
    >
      <span className={"text-[13px] " + (strong ? "font-extrabold uppercase" : "font-semibold")}>{label}</span>
      <span className={"tabular-nums " + (strong ? "text-base font-extrabold" : "font-bold")}>{value}</span>
    </div>
  );
}

/* ---------------- Editor daftar (pasif & aset) ---------------- */
function ListMoney({
  items, onChange, placeholder, contoh,
}: {
  items: (PasifItem | AsetItem)[];
  onChange: (items: (PasifItem | AsetItem)[]) => void;
  placeholder: string;
  contoh: string;
}) {
  const upd = (id: string, p: Partial<PasifItem>) => onChange(items.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const del = (id: string) => onChange(items.filter((x) => x.id !== id));
  const add = () => onChange([...items, { id: uid(), nama: "", nilai: 0 }]);
  return (
    <div className="space-y-2">
      {items.length === 0 && <p className="text-[11px] text-slate-500">Belum ada. Contoh: {contoh}</p>}
      {items.map((x) => (
        <div key={x.id} className="flex items-center gap-2">
          <input
            value={x.nama}
            onChange={(e) => upd(x.id, { nama: e.target.value })}
            placeholder={placeholder}
            className="input min-w-0 flex-1"
          />
          <span className="text-xs text-slate-500">Rp</span>
          <NumInput value={x.nilai} onChange={(v) => upd(x.id, { nilai: v })} className="input w-28 text-right" />
          <button onClick={() => del(x.id)} className="shrink-0 rounded-lg px-2 py-1 text-rose-300 hover:bg-rose-500/10" title="Hapus">✕</button>
        </div>
      ))}
      <button onClick={add} className="btn-ghost w-full text-xs">+ Tambah baris</button>
    </div>
  );
}

/* ---------------- Editor utang (cicilan detail per relawan) ---------------- */
function UtangEditor({ items, onChange }: { items: UtangItem[]; onChange: (items: UtangItem[]) => void }) {
  const upd = (id: string, p: Partial<UtangItem>) => onChange(items.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const del = (id: string) => onChange(items.filter((x) => x.id !== id));
  const add = () => onChange([...items, { id: uid(), nama: "", jenis: "motor", sisaPokok: 0, cicilan: 0, sisaBulan: 0 }]);
  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-[11px] text-slate-500">
          Belum ada cicilan. Contoh: cicilan mobil, KPR rumah, HP/paylater — tiap barang isi cicilan per
          bulan & sisa berapa bulan.
        </p>
      )}
      {items.map((u) => {
        const lunasBulan = u.sisaBulan > 0 ? u.sisaBulan : (u.cicilan > 0 ? Math.ceil(u.sisaPokok / u.cicilan) : 0);
        return (
          <div key={u.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2">
              <input
                value={u.nama}
                onChange={(e) => upd(u.id, { nama: e.target.value })}
                placeholder="Nama (mis. Mobil Avanza, HP Oppo)"
                className="input min-w-0 flex-1"
              />
              <button onClick={() => del(u.id)} className="shrink-0 rounded-lg px-2 py-1 text-rose-300 hover:bg-rose-500/10" title="Hapus">✕</button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="label">Jenis</span>
                <select
                  value={u.jenis}
                  onChange={(e) => upd(u.id, { jenis: e.target.value })}
                  className="input"
                >
                  {JENIS_UTANG.map((j) => <option key={j.v} value={j.v}>{j.label}</option>)}
                </select>
              </label>
              <Num label="Cicilan / bulan" value={u.cicilan} onChange={(v) => upd(u.id, { cicilan: v })} step={50000} />
              <Num label="Sisa pokok utang" value={u.sisaPokok} onChange={(v) => upd(u.id, { sisaPokok: v })} />
              <Num label="Sisa berapa bulan" value={u.sisaBulan} onChange={(v) => upd(u.id, { sisaBulan: v })} suffix="bln" step={1} max={600} />
            </div>
            {(u.cicilan > 0 || u.sisaBulan > 0) && (
              <p className="mt-2 text-[11px] text-slate-400">
                {lunasBulan > 0 ? <>Perkiraan lunas dalam <b>{lunasBulan}</b> bulan (± {(lunasBulan / 12).toFixed(1)} tahun). </> : null}
                Cicilan ini menambah pengeluaran tetap <b>{rp(u.cicilan)}</b>/bulan.
              </p>
            )}
          </div>
        );
      })}
      <button onClick={add} className="btn-ghost w-full text-xs">+ Tambah cicilan / utang</button>
    </div>
  );
}

/* ---------------- 1. Neraca (laporan kertas) ---------------- */
function Neraca({ store }: { store: FinStore }) {
  const { data: f, d, patch, reset, saving } = store;
  const paperRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const progressBebas = d.pengeluaran > 0 ? Math.min(100, (d.pasif / d.pengeluaran) * 100) : 0;

  const unduh = async () => {
    if (!paperRef.current) return;
    setBusy(true);
    try {
      await exportPdf(paperRef.current, `laporan-keuangan-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      alert("Maaf, gagal membuat PDF. Coba lagi ya.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* KERTAS laporan keuangan */}
      <div
        ref={paperRef}
        className="rounded-xl p-4 shadow-lg"
        style={{ background: "#efe6d4", fontFamily: "Georgia, 'Times New Roman', serif", color: "#2b2440" }}
      >
        <div className="text-center">
          <p className="text-lg font-extrabold tracking-wide" style={{ color: "#3a2f5c" }}>LAPORAN KEUANGAN</p>
          <p className="text-[11px]" style={{ color: "#6b5f88" }}>Financial Statement · MBG · {new Date().toLocaleDateString("id-ID")}</p>
        </div>

        <div className="mt-3 grid gap-x-5 sm:grid-cols-2">
          {/* Kolom kiri: arus kas */}
          <div>
            <PaperSection title="Pemasukan / bln">
              <PaperRow label="Gaji" value={rp(f.gaji)} />
              <PaperRow label="Sampingan" value={rp(f.sampingan)} />
              {f.pasif.map((p) => <PaperRow key={p.id} label={p.nama || "Pemasukan pasif"} value={rp(p.nilai)} sub="pasif" />)}
              <PaperStat label="Total Pemasukan" value={rp(d.pemasukan)} />
              <PaperStat label="↳ Pasif" value={rp(d.pasif)} />
            </PaperSection>

            <PaperSection title="Pengeluaran / bln">
              <PaperRow label="Kebutuhan pokok" value={rp(f.kebutuhan)} />
              <PaperRow label="Pajak (kendaraan dll)" value={rp(f.pajak)} />
              <PaperRow label="Biaya sekolah anak" value={rp(f.sekolah)} />
              <PaperRow label="Perawatan / servis" value={rp(f.perawatan)} />
              <PaperRow label="Gaya hidup" value={rp(f.gayaHidup)} />
              <PaperRow label="Lain-lain" value={rp(f.lain)} />
              {f.utang.map((u) => u.cicilan > 0 && (
                <PaperRow key={u.id} label={`Cicilan ${u.nama || labelJenis(u.jenis)}`} value={rp(u.cicilan)} sub={u.sisaBulan > 0 ? `sisa ${u.sisaBulan} bln` : undefined} />
              ))}
              <PaperStat label="Total Pengeluaran" value={rp(d.pengeluaran)} />
            </PaperSection>

            <PaperStat label={d.arusKas >= 0 ? "ARUS KAS (PAYDAY)" : "ARUS KAS (defisit)"} value={(d.arusKas >= 0 ? "+" : "−") + rp(Math.abs(d.arusKas))} strong />
          </div>

          {/* Kolom kanan: neraca */}
          <div>
            <PaperSection title="Aset (menghasilkan / bernilai)">
              {f.aset.length === 0 && <PaperRow label="—" value={rp(0)} />}
              {f.aset.map((a) => <PaperRow key={a.id} label={a.nama || "Aset"} value={rp(a.nilai)} />)}
              <PaperStat label="Total Aset" value={rp(d.totalAset)} />
            </PaperSection>

            <PaperSection title="Liabilitas (utang)">
              {f.utang.length === 0 && <PaperRow label="—" value={rp(0)} />}
              {f.utang.map((u) => <PaperRow key={u.id} label={u.nama || labelJenis(u.jenis)} value={rp(u.sisaPokok)} sub={labelJenis(u.jenis)} />)}
              <PaperStat label="Total Liabilitas" value={rp(d.totalUtang)} />
            </PaperSection>

            <PaperStat label="KEKAYAAN BERSIH" value={(d.kekayaan >= 0 ? "" : "−") + rp(Math.abs(d.kekayaan))} strong />

            <div className="mt-3 rounded-lg p-2 text-center" style={{ background: d.bebas ? "#d5 efd9" : "#efe0d6", border: "1px solid #b3a8c9" }}>
              <p className="text-[11px] font-semibold uppercase" style={{ color: "#3a2f5c" }}>Passive Income vs Pengeluaran</p>
              <p className="text-sm font-bold" style={{ color: d.bebas ? "#1f7a3d" : "#8a5a2b" }}>
                {rp(d.pasif)} / {rp(d.pengeluaran)} = {progressBebas.toFixed(0)}%
              </p>
              <p className="text-[12px] font-extrabold" style={{ color: d.bebas ? "#1f7a3d" : "#8a5a2b" }}>
                {d.bebas ? "🦁 KELUAR DARI RAT RACE!" : "🏃 Masih di dalam Rat Race"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={unduh} disabled={busy} className="btn-gold flex-1">
          {busy ? "Membuat PDF…" : "⬇️ Unduh laporan (PDF)"}
        </button>
        {saving && <span className="shrink-0 text-[10px] text-slate-400">menyimpan…</span>}
      </div>

      {/* Indikator rat race */}
      <div className="card space-y-2 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">🦁 Menuju keluar dari Rat Race</p>
          <p className="text-xs text-slate-400">{progressBebas.toFixed(0)}%</p>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-gold-400" style={{ width: progressBebas + "%" }} />
        </div>
        <p className="text-xs text-slate-400">
          Kamu <b>keluar dari rat race</b> saat <b>pemasukan pasif</b> ({rp(d.pasif)}) sudah menutup
          seluruh <b>pengeluaran</b> ({rp(d.pengeluaran)}). Saat itu kamu tak wajib bekerja demi uang.
        </p>
      </div>

      {/* Privasi */}
      <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 p-3">
        <p className="flex items-center gap-1.5 text-sm font-bold text-sky-200">🔒 Privasi laporan ini</p>
        <ul className="mt-1.5 space-y-1 text-xs text-sky-100/90">
          <li>✅ Tersimpan aman di <b>akunmu</b> — muncul lagi saat login di HP mana pun.</li>
          <li>✅ <b>Hanya kamu</b> yang bisa melihatnya setelah login.</li>
          <li>✅ <b>Tidak ditampilkan</b> di panel admin/manajemen.</li>
        </ul>
        <p className="mt-1.5 text-xs text-sky-200">Jadi <b>isi sejujurnya</b> — ini catatan pribadi untuk membantu dirimu sendiri.</p>
      </div>

      {/* Editor pemasukan */}
      <div className="card space-y-3 p-4">
        <p className="text-sm font-semibold text-emerald-300">⬇️ Pemasukan (uang masuk / bulan)</p>
        <div className="grid grid-cols-2 gap-3">
          <Num label="Gaji bulanan" value={f.gaji} onChange={(v) => patch({ gaji: v })} />
          <Num label="Sampingan" value={f.sampingan} onChange={(v) => patch({ sampingan: v })} />
        </div>
        <div>
          <p className="label">Pemasukan pasif (uang bekerja untukmu)</p>
          <ListMoney
            items={f.pasif}
            onChange={(items) => patch({ pasif: items as PasifItem[] })}
            placeholder="mis. Sewa kontrakan, bagi hasil"
            contoh="sewa, bagi hasil ternak, bunga deposito, royalti"
          />
        </div>
      </div>

      {/* Editor pengeluaran */}
      <div className="card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-rose-300">⬆️ Pengeluaran (uang keluar / bulan)</p>
          <p className="text-sm font-bold tabular-nums">{rp(d.pengeluaran)}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Num label="Kebutuhan pokok" value={f.kebutuhan} onChange={(v) => patch({ kebutuhan: v })} />
          <Num label="Pajak kendaraan dll" value={f.pajak} onChange={(v) => patch({ pajak: v })} />
          <Num label="Biaya sekolah anak" value={f.sekolah} onChange={(v) => patch({ sekolah: v })} />
          <Num label="Perawatan / servis" value={f.perawatan} onChange={(v) => patch({ perawatan: v })} />
          <Num label="Gaya hidup" value={f.gayaHidup} onChange={(v) => patch({ gayaHidup: v })} />
          <Num label="Lain-lain" value={f.lain} onChange={(v) => patch({ lain: v })} />
        </div>
        <p className="text-[11px] text-slate-500">
          💡 <b>Cicilan</b> otomatis dihitung dari daftar utang di bawah — jadi tidak perlu diisi lagi di sini.
          Total cicilan saat ini: <b>{rp(d.cicilan)}</b>/bulan.
        </p>
      </div>

      {/* Editor aset */}
      <div className="card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gold-300">💎 Aset yang kamu punya</p>
          <p className="text-sm font-bold tabular-nums">{rp(d.totalAset)}</p>
        </div>
        <ListMoney
          items={f.aset}
          onChange={(items) => patch({ aset: items as AsetItem[] })}
          placeholder="mis. Tabungan, emas, ternak"
          contoh="tabungan, dana darurat, emas, reksa dana, ternak, tanah"
        />
        <p className="text-[11px] text-slate-500">
          Aset = barang yang <b>bernilai atau menghasilkan uang</b>. Lihat tab <b>🎓 Belajar</b> untuk beda aset vs liabilitas.
        </p>
      </div>

      {/* Editor utang / cicilan detail */}
      <div className="card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-rose-300">🧾 Utang & cicilan (detail)</p>
          <p className="text-sm font-bold tabular-nums">{rp(d.totalUtang)}</p>
        </div>
        <UtangEditor items={f.utang} onChange={(items) => patch({ utang: items })} />
      </div>

      <button
        onClick={() => { if (confirm("Kosongkan semua angka laporan ini?")) reset(); }}
        className="btn-ghost w-full text-xs text-slate-400"
      >
        Reset laporan
      </button>
    </div>
  );
}

/* ---------------- 2. Anggaran ---------------- */
function Anggaran({ store }: { store: FinStore }) {
  const { data: f, d, patch } = store;

  const gaji = d.pemasukan;
  const pKebutuhan = f.angKebutuhanPct;
  const pKeinginan = f.angKeinginanPct;
  const pTabung = Math.max(0, 100 - pKebutuhan - pKeinginan);

  const kebutuhan = (gaji * pKebutuhan) / 100;
  const keinginan = (gaji * pKeinginan) / 100;
  const tabung = (gaji * pTabung) / 100;
  const danaDarurat = d.pengeluaran * 6;
  const bulanDD = tabung > 0 ? Math.ceil(danaDarurat / tabung) : 0;

  const bar = (label: string, val: number, pct: number, cls: string) => (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-300">{label} <span className="text-slate-500">· {pct}%</span></span>
        <span className="tabular-nums font-semibold">{rp(val)}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5">
        <div className={"h-full rounded-full " + cls} style={{ width: pct + "%" }} />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-4">
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <p className="text-[11px] text-slate-400">Total pemasukan / bulan (dari Laporan)</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-300">{rp(gaji)}</p>
          {gaji === 0 && <p className="mt-0.5 text-[10px] text-amber-300/90">Isi pemasukanmu dulu di tab <b>📄 Laporan Kertas</b>.</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Num label="% Kebutuhan" value={pKebutuhan} onChange={(v) => patch({ angKebutuhanPct: Math.min(100, v) })} suffix="%" step={5} max={100} />
          <Num label="% Keinginan" value={pKeinginan} onChange={(v) => patch({ angKeinginanPct: Math.min(100, v) })} suffix="%" step={5} max={100} />
        </div>
        <p className="text-xs text-slate-500">Sisanya {pTabung}% otomatis untuk <b>Tabungan &amp; Investasi</b>. Kaidah sehat: 50/30/20.</p>
      </div>

      <div className="card space-y-3 p-4">
        {bar("Kebutuhan (makan, kos, transport)", kebutuhan, pKebutuhan, "bg-sky-400/80")}
        {bar("Keinginan (jajan, hiburan)", keinginan, pKeinginan, "bg-amber-400/80")}
        {bar("Tabungan & Investasi", tabung, pTabung, "bg-emerald-400/80")}
      </div>

      <div className="card space-y-2 p-4">
        <p className="text-sm font-semibold">🛡️ Dana Darurat</p>
        <p className="text-sm text-slate-300">Target aman: <b>{rp(danaDarurat)}</b> (6× pengeluaran bulanan).</p>
        <p className="text-sm text-slate-400">
          Dengan menyisihkan {rp(tabung)}/bulan, dana darurat penuh dalam ± <b>{bulanDD || "—"}</b> bulan.
          Kumpulkan ini <b>dulu</b> sebelum investasi berisiko.
        </p>
        <p className="text-xs text-slate-500">💡 “Bayar diri sendiri dulu” — sisihkan tabungan di <b>awal</b> gajian, bukan dari sisa akhir bulan.</p>
      </div>
    </div>
  );
}

/* ---------------- 3. Investasi ---------------- */
const INSTRUMEN = [
  { nama: "Tabungan", r: 2 },
  { nama: "Deposito", r: 5 },
  { nama: "Emas", r: 8 },
  { nama: "Reksa Saham", r: 11 },
];

function Investasi({ store }: { store: FinStore }) {
  const { data: f, d, patch } = store;

  const modal = d.totalAset; // total aset saat ini sebagai modal awal
  const setoran = f.invSetoran;
  const rate = f.invRate;
  const tahun = f.invTahun;

  const i = rate / 1200;
  const bulan = tahun * 12;
  const nilai = futureValue(modal, setoran, i, bulan);
  const disetor = modal + setoran * bulan;
  const hasil = nilai - disetor;

  const perTahun = useMemo(
    () => Array.from({ length: tahun }, (_, y) => futureValue(modal, setoran, i, (y + 1) * 12)),
    [modal, setoran, i, tahun],
  );
  const maxV = Math.max(...perTahun, 1);

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-4">
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <p className="text-[11px] text-slate-400">Modal awal = total aset di Laporan</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-gold-300">{rp(modal)}</p>
        </div>
        <Num label="Setoran rutin per bulan" value={setoran} onChange={(v) => patch({ invSetoran: v })} step={50000} />
        <div className="grid grid-cols-2 gap-3">
          <Num label="Perkiraan hasil / tahun" value={rate} onChange={(v) => patch({ invRate: Math.min(60, v) })} suffix="%" step={1} max={60} />
          <Num label="Lama (tahun)" value={tahun} onChange={(v) => patch({ invTahun: Math.min(40, Math.max(1, v)) })} suffix="thn" step={1} max={40} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {INSTRUMEN.map((x) => (
            <button key={x.nama} onClick={() => patch({ invRate: x.r })}
              className={"rounded-lg px-2.5 py-1 text-xs " + (rate === x.r ? "bg-gold-500/20 text-gold-300" : "bg-white/5 text-slate-400 hover:bg-white/10")}>
              {x.nama} ~{x.r}%
            </button>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div><p className="text-[11px] text-slate-400">Total disetor</p><p className="mt-0.5 font-bold tabular-nums">{rp(disetor)}</p></div>
          <div><p className="text-[11px] text-slate-400">Hasil bunga</p><p className="mt-0.5 font-bold tabular-nums text-emerald-300">{rp(hasil)}</p></div>
          <div><p className="text-[11px] text-slate-400">Nilai akhir</p><p className="mt-0.5 font-bold tabular-nums text-gold-300">{rp(nilai)}</p></div>
        </div>

        <div className="mt-4">
          <svg viewBox={`0 0 100 44`} preserveAspectRatio="none" className="h-32 w-full">
            {perTahun.map((v, idx) => {
              const bw = 100 / perTahun.length;
              const h = (v / maxV) * 40;
              return <rect key={idx} x={idx * bw + bw * 0.15} y={42 - h} width={bw * 0.7} height={h} rx={0.6} className="fill-gold-500/70" />;
            })}
            <line x1="0" y1="42" x2="100" y2="42" className="stroke-white/15" strokeWidth="0.4" />
          </svg>
          <div className="mt-1 flex justify-between text-[10px] text-slate-500">
            <span>Thn 1</span><span>Thn {tahun}</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Uang {rp(setoran)}/bulan bisa jadi <b>{rp(nilai)}</b> dalam {tahun} tahun berkat <b>bunga
          majemuk</b>. Ingat inflasi ±4%/tahun — pilih instrumen yang hasilnya di atas inflasi.
        </p>
      </div>
    </div>
  );
}

/* ---------------- 4. Merdeka Finansial ---------------- */
function Merdeka({ store }: { store: FinStore }) {
  const { data: f, d, patch } = store;

  const pengeluaran = d.pengeluaran;
  const aset = d.totalAset;
  const setoran = f.merSetoran;
  const rate = f.merRate;
  const wd = 4;

  const fiNumber = (pengeluaran * 12) / (wd / 100);
  const pasifNow = (aset * (wd / 100)) / 12;
  const progress = Math.min(100, (aset / fiNumber) * 100 || 0);

  const tahunMerdeka = useMemo(() => {
    const i = rate / 1200;
    let a = aset;
    let m = 0;
    while (a < fiNumber && m < 1200) {
      a = a * (1 + i) + setoran;
      m++;
    }
    return m >= 1200 ? null : m / 12;
  }, [aset, setoran, rate, fiNumber]);

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-4">
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <p className="text-[11px] text-slate-400">Pengeluaran / bulan (dari Laporan)</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-rose-300">{rp(pengeluaran)}</p>
          {pengeluaran === 0 && <p className="mt-0.5 text-[10px] text-amber-300/90">Isi pengeluaranmu di tab <b>📄 Laporan Kertas</b>.</p>}
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <p className="text-[11px] text-slate-400">Aset saat ini (dari Laporan)</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-gold-300">{rp(aset)}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Num label="Setoran investasi / bulan" value={setoran} onChange={(v) => patch({ merSetoran: v })} step={50000} />
          <Num label="Perkiraan hasil / tahun" value={rate} onChange={(v) => patch({ merRate: Math.min(30, v) })} suffix="%" step={1} max={30} />
        </div>
      </div>

      <div className="card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">🎯 Angka Merdeka Finansial</p>
          <p className="text-lg font-bold tabular-nums text-gold-300">{rp(fiNumber)}</p>
        </div>
        <p className="text-xs text-slate-500">
          = 25× pengeluaran tahunan (aturan 4%). Saat asetmu segini, hasilnya bisa menutup seluruh
          pengeluaran — kamu <b>tak wajib bekerja lagi</b>.
        </p>

        <div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Progress kebebasan</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <div className="mt-1 h-3 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-gold-400" style={{ width: progress + "%" }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-[11px] text-slate-400">Passive income sekarang</p>
            <p className="mt-0.5 font-bold tabular-nums text-emerald-300">{rp(pasifNow)}<span className="text-xs font-normal text-slate-400">/bln</span></p>
            <p className="text-[10px] text-slate-500">dari {rp(pengeluaran)} kebutuhan</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-[11px] text-slate-400">Perkiraan merdeka</p>
            <p className="mt-0.5 font-bold tabular-nums text-gold-300">
              {tahunMerdeka == null ? "> 100 thn" : "± " + tahunMerdeka.toFixed(1) + " thn"}
            </p>
            <p className="text-[10px] text-slate-500">bila rutin nabung {juta(setoran)}/bln</p>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          💡 Naikkan setoran & pilih hasil di atas inflasi → makin cepat merdeka. Beli <b>aset</b> yang
          menghasilkan (reksa dana, emas, ternak), kurangi <b>utang konsumtif</b>.
        </p>
      </div>
    </div>
  );
}

/* ---------------- 5. Belajar (Cashflow Quadrant + edukasi) ---------------- */
const QUADRAN = [
  { k: "E", nama: "Employee (Pegawai)", warna: "text-sky-300", ket: "Bekerja untuk sistem/orang lain. Pemasukan berhenti saat berhenti kerja.", ciri: "Cari rasa aman & gaji tetap." },
  { k: "S", nama: "Self-employed (Wiraswasta)", warna: "text-amber-300", ket: "Bekerja untuk diri sendiri. Kamu ADALAH pekerjaannya — berhenti, pemasukan berhenti.", ciri: "Pedagang, tukang, ojek, freelancer." },
  { k: "B", nama: "Business (Pemilik Sistem)", warna: "text-emerald-300", ket: "Punya sistem/tim yang bekerja untukmu. Uang tetap masuk walau kamu tidak hadir.", ciri: "Punya usaha yang jalan tanpamu." },
  { k: "I", nama: "Investor", warna: "text-gold-300", ket: "Uang bekerja untukmu. Pemasukan dari aset: bagi hasil, sewa, dividen.", ciri: "Uang menghasilkan uang." },
];

function Belajar() {
  return (
    <div className="space-y-4">
      <QuoteBanner />

      <div className="card space-y-3 p-4">
        <p className="text-sm font-bold text-gold-300">🧭 Cashflow Quadrant (E · S · B · I)</p>
        <p className="text-xs text-slate-400">
          Robert Kiyosaki membagi sumber pemasukan jadi 4 kuadran. Kebanyakan orang ada di kiri (E &amp; S) —
          menukar <b>waktu</b> dengan uang. Kebebasan finansial ada di kanan (B &amp; I) — <b>aset &amp; sistem</b>
          yang bekerja untukmu. Targetnya: pelan-pelan pindah ke kanan.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {QUADRAN.map((q) => (
            <div key={q.k} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className={"text-2xl font-black " + q.warna}>{q.k}</p>
              <p className="text-xs font-semibold text-slate-200">{q.nama}</p>
              <p className="mt-1 text-[11px] text-slate-400">{q.ket}</p>
              <p className="mt-1 text-[10px] italic text-slate-500">{q.ciri}</p>
            </div>
          ))}
        </div>
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200">
          🎯 <b>Financial freedom</b> = saat pemasukan dari kuadran <b>B &amp; I</b> menutup seluruh
          pengeluaranmu. Kamu tetap boleh jadi pegawai (E), tapi <b>sisihkan sebagian</b> untuk membangun
          aset di kanan.
        </p>
      </div>

      {/* Aset vs Liabilitas */}
      <div className="card space-y-3 p-4">
        <p className="text-sm font-bold">💎 Aset vs 🧾 Liabilitas — apa bedanya?</p>
        <p className="text-xs text-slate-400">
          Aturan sederhana Kiyosaki: <b>Aset memasukkan uang ke kantongmu. Liabilitas mengeluarkan uang
          dari kantongmu.</b>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-sm font-semibold text-emerald-300">💎 Aset (menambah uang)</p>
            <ul className="mt-1 space-y-1 text-[11px] text-slate-300">
              <li>• Tabungan &amp; dana darurat</li>
              <li>• Emas, reksa dana, deposito</li>
              <li>• Ternak / sawah yang menghasilkan</li>
              <li>• Kontrakan / kios yang disewakan</li>
              <li>• Warung / usaha yang jalan</li>
              <li>• Keterampilan yang dibayar</li>
            </ul>
          </div>
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
            <p className="text-sm font-semibold text-rose-300">🧾 Liabilitas (mengurangi uang)</p>
            <ul className="mt-1 space-y-1 text-[11px] text-slate-300">
              <li>• Cicilan mobil / motor</li>
              <li>• Cicilan HP / paylater</li>
              <li>• <b>Pajak kendaraan</b> tiap tahun</li>
              <li>• <b>Perawatan / servis</b> rutin</li>
              <li>• <b>Biaya sekolah anak</b></li>
              <li>• Kartu kredit yang menunggak</li>
            </ul>
          </div>
        </div>
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
          ⚠️ Contoh yang sering keliru: <b>mobil pribadi</b> terasa seperti aset, padahal tiap bulan minta
          cicilan, bensin, pajak, dan servis — itu <b>liabilitas</b>. Ia baru jadi aset kalau dipakai
          mencari uang (mis. disewakan / usaha).
        </p>
      </div>

      {/* Langkah keluar rat race */}
      <div className="card space-y-2 p-4">
        <p className="text-sm font-bold text-gold-300">🚪 5 Langkah Keluar dari Rat Race</p>
        <ol className="space-y-2 text-xs text-slate-300">
          <li><b>1. Catat jujur</b> — isi Laporan Kertas: pemasukan, pengeluaran, aset, utang. Sadar posisi dulu.</li>
          <li><b>2. Amankan dana darurat</b> — kumpulkan 6× pengeluaran sebelum ambil risiko.</li>
          <li><b>3. Lunasi utang konsumtif</b> — cicilan HP/paylater/kartu paling menggerus. Bereskan yang bunganya besar dulu.</li>
          <li><b>4. Beli aset, bukan gaya hidup</b> — tiap gaji naik, tambah aset (emas, reksa dana, ternak), bukan cicilan baru.</li>
          <li><b>5. Perbesar pemasukan pasif</b> — sampai pasif ≥ pengeluaran. Saat itu kamu <b>bebas</b>. 🦁</li>
        </ol>
      </div>

      {/* Semua quote */}
      <div className="card space-y-2 p-4">
        <p className="text-sm font-bold">💬 Kumpulan Quote Keuangan</p>
        <div className="space-y-2">
          {QUOTES.map((q, k) => (
            <div key={k} className="rounded-lg border border-white/5 bg-white/5 p-2">
              <p className="text-xs italic text-slate-200">“{q.teks}”</p>
              <p className="mt-0.5 text-[10px] text-slate-500">— {q.oleh}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- 6. Game Keputusan ---------------- */
interface Opsi { teks: string; poin: number; umpan: string }
const SKENARIO: { situasi: string; opsi: Opsi[] }[] = [
  {
    situasi: "Kamu dapat THR / bonus Rp 3.000.000. Apa yang kamu lakukan?",
    opsi: [
      { teks: "Sisihkan sebagian besar untuk tabungan/investasi", poin: 3, umpan: "Mantap! Bayar diri sendiri dulu — uang bekerja untukmu." },
      { teks: "Beli HP baru tunai", poin: 1, umpan: "Boleh sesekali, tapi utamakan sisihkan dulu sebelum belanja." },
      { teks: "Kredit motor baru (cicilan)", poin: -2, umpan: "Hati-hati: utang konsumtif menambah pengeluaran tetap tiap bulan." },
    ],
  },
  {
    situasi: "Kamu belum punya dana darurat. Ada TV diskon 50%.",
    opsi: [
      { teks: "Lewati, kumpulkan dana darurat dulu", poin: 3, umpan: "Tepat. Dana darurat = pelindung saat keadaan mendesak." },
      { teks: "Beli, mumpung murah", poin: -1, umpan: "Diskon bukan alasan menunda perlindungan keuanganmu." },
    ],
  },
  {
    situasi: "Ada teman menawari 'investasi' untung pasti 30% per bulan.",
    opsi: [
      { teks: "Tolak — return tak wajar itu ciri penipuan", poin: 3, umpan: "Benar! Untung 'pasti' & besar = waspada investasi bodong." },
      { teks: "Ikut sedikit dulu untuk coba", poin: -1, umpan: "Coba-coba pun berisiko hilang. Cek legalitas (OJK) dulu." },
      { teks: "Ikut besar-besaran", poin: -3, umpan: "Sangat berisiko. Banyak yang kehilangan tabungan begini." },
    ],
  },
  {
    situasi: "Gajimu naik Rp 500.000. Sikapmu?",
    opsi: [
      { teks: "Naikkan setoran investasi", poin: 3, umpan: "Hebat! Hindari 'lifestyle inflation' — kenaikan gaya hidup ikut naik." },
      { teks: "Naikkan gaya hidup semuanya", poin: -1, umpan: "Kalau semua naik, sulit menabung meski gaji naik." },
    ],
  },
  {
    situasi: "Punya uang nganggur Rp 5.000.000.",
    opsi: [
      { teks: "Taruh di deposito / reksa dana", poin: 2, umpan: "Bagus, minimal kalahkan inflasi." },
      { teks: "Biarkan di dompet/ATM", poin: 0, umpan: "Aman, tapi nilainya tergerus inflasi tiap tahun." },
    ],
  },
  {
    situasi: "Butuh beli barang & mampu bayar tunai, tapi ada paylater 0%.",
    opsi: [
      { teks: "Bayar tunai", poin: 2, umpan: "Aman dari risiko lupa bayar & denda." },
      { teks: "Pakai paylater walau mampu", poin: 0, umpan: "Utang tetap risiko: telat = denda & catatan kredit buruk." },
    ],
  },
  {
    situasi: "Kapan kamu menyisihkan uang untuk masa depan?",
    opsi: [
      { teks: "Di awal gajian (10–20% langsung)", poin: 3, umpan: "Inilah kunci: 'pay yourself first'." },
      { teks: "Dari sisa akhir bulan kalau ada", poin: -1, umpan: "Biasanya habis duluan. Sisihkan di depan lebih ampuh." },
    ],
  },
];
const MAKS = SKENARIO.reduce((a, s) => a + Math.max(...s.opsi.map((o) => o.poin)), 0);

function GameKeputusan() {
  const [idx, setIdx] = useState(0);
  const [skor, setSkor] = useState(0);
  const [pilih, setPilih] = useState<Opsi | null>(null);
  const selesai = idx >= SKENARIO.length;

  const pilihOpsi = (o: Opsi) => {
    if (pilih) return;
    setPilih(o);
    setSkor((s) => s + o.poin);
  };
  const lanjut = () => { setPilih(null); setIdx((i) => i + 1); };
  const ulang = () => { setIdx(0); setSkor(0); setPilih(null); };

  if (selesai) {
    const kategori =
      skor >= MAKS * 0.75 ? { emo: "🦁", teks: "Pejuang Merdeka Finansial!", warna: "text-gold-300" }
      : skor >= MAKS * 0.4 ? { emo: "🌱", teks: "Sudah di jalan yang benar, teruskan!", warna: "text-emerald-300" }
      : { emo: "🐣", teks: "Ayo mulai atur keuangan pelan-pelan.", warna: "text-sky-300" };
    return (
      <div className="card space-y-3 p-6 text-center">
        <p className="text-4xl">{kategori.emo}</p>
        <p className={"text-lg font-bold " + kategori.warna}>{kategori.teks}</p>
        <p className="text-sm text-slate-300">Skor kamu: <b>{skor}</b> dari {MAKS}</p>
        <p className="text-xs text-slate-500">Kebiasaan kecil yang benar tiap gajian membawamu keluar dari <i>rat race</i>. 💪</p>
        <button onClick={ulang} className="btn-gold mx-auto">Main lagi</button>
      </div>
    );
  }

  const s = SKENARIO[idx];
  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Skenario {idx + 1}/{SKENARIO.length}</span>
        <span>Skor: <b className="text-gold-300">{skor}</b></span>
      </div>
      <p className="text-sm font-semibold">{s.situasi}</p>
      <div className="space-y-2">
        {s.opsi.map((o, k) => {
          const dipilih = pilih === o;
          const nonaktif = pilih !== null;
          return (
            <button
              key={k}
              onClick={() => pilihOpsi(o)}
              disabled={nonaktif}
              className={
                "block w-full rounded-xl border px-3 py-2 text-left text-sm transition " +
                (dipilih
                  ? (o.poin > 0 ? "border-emerald-500/50 bg-emerald-500/10" : o.poin < 0 ? "border-rose-500/50 bg-rose-500/10" : "border-sky-500/40 bg-sky-500/10")
                  : "border-white/10 hover:bg-white/5 " + (nonaktif ? "opacity-50" : ""))
              }
            >
              {o.teks}
              {dipilih && (
                <span className="mt-1 block text-xs text-slate-300">
                  {o.poin > 0 ? "✅ " : o.poin < 0 ? "⚠️ " : "ℹ️ "}
                  {o.umpan} <b>({o.poin > 0 ? "+" : ""}{o.poin})</b>
                </span>
              )}
            </button>
          );
        })}
      </div>
      {pilih && (
        <button onClick={lanjut} className="btn-gold w-full">
          {idx + 1 < SKENARIO.length ? "Lanjut →" : "Lihat hasil"}
        </button>
      )}
    </div>
  );
}
