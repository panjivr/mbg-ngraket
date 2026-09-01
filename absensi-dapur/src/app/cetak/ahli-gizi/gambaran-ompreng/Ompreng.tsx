"use client";

import { useRef, useState } from "react";

/**
 * Gambaran Ompreng — visualisasi nampan makan 5 sekat untuk presentasi menu
 * (mis. menyodorkan rencana menu ke Kepala Dapur). Menu tiap sekat bisa
 * diganti bebas; ilustrasi makanan otomatis menyesuaikan jenis menu. Hasil
 * bisa diunduh sebagai PNG / JPG.
 *
 * Client component — pakai state + html-to-image (dynamic import) untuk ekspor.
 */

// ————————————————————————————————————————————————————————————————
// Kategori makanan + warna ilustrasi
// ————————————————————————————————————————————————————————————————

type Kategori = "nasi" | "hewani" | "nabati" | "sayur" | "buah" | "lain";

const ROLE_LABEL: Record<Kategori, string> = {
  nasi: "Karbohidrat",
  hewani: "Lauk Hewani",
  nabati: "Lauk Nabati",
  sayur: "Sayur",
  buah: "Buah",
  lain: "Pelengkap",
};

// Warna dasar tiap kategori (untuk kategori non-buah).
const WARNA_KATEGORI: Record<Exclude<Kategori, "buah">, string> = {
  nasi: "#f6f4ec",
  hewani: "#c67a2b",
  nabati: "#cda45c",
  sayur: "#3f9a4f",
  lain: "#b7ada0",
};

// Warna & biji khusus per buah (buah naga = magenta berbiji hitam, dst).
const WARNA_BUAH: { kw: string[]; color: string; seeds?: boolean }[] = [
  { kw: ["naga"], color: "#d1387a", seeds: true },
  { kw: ["semangka"], color: "#e5384e", seeds: true },
  { kw: ["jeruk"], color: "#f39c12" },
  { kw: ["pisang"], color: "#f2c744" },
  { kw: ["apel", "apple"], color: "#d94141" },
  { kw: ["melon"], color: "#9fd47f" },
  { kw: ["pepaya", "papaya"], color: "#f07c33" },
  { kw: ["mangga"], color: "#f6b93b" },
  { kw: ["anggur"], color: "#7d4fb0" },
  { kw: ["nanas"], color: "#f4c430" },
  { kw: ["salak"], color: "#8a5a2b" },
  { kw: ["kelengkeng", "rambutan"], color: "#c98a4b" },
];

const KW: Record<Exclude<Kategori, "lain">, string[]> = {
  nasi: ["nasi", "beras", "bubur", "lontong", "kentang", "jagung", "mie", "bihun", "roti"],
  hewani: [
    "ayam", "ikan", "lele", "tongkol", "tuna", "telur", "telor", "daging", "sapi",
    "udang", "bakso", "rendang", "semur", "empal", "nugget", "sosis", "hati", "cumi",
  ],
  nabati: ["tahu", "tempe", "bacem", "oncom", "kacang"],
  sayur: [
    "sayur", "bayam", "kangkung", "sop", "capcay", "cap cay", "tumis", "buncis",
    "wortel", "brokoli", "terong", "sawi", "urap", "lalapan", "kacang panjang",
    "labu", "toge", "tauge", "gado",
  ],
  buah: ["buah", "naga", "semangka", "jeruk", "pisang", "apel", "melon", "pepaya",
    "papaya", "mangga", "anggur", "nanas", "salak", "kelengkeng", "rambutan"],
};

function deteksiKategori(nama: string): Kategori {
  const s = nama.toLowerCase();
  const cocok = (list: string[]) => list.some((k) => s.includes(k));
  // Urutan penting: buah dulu (agar "sayur asem" tidak ketukar), lalu spesifik.
  if (cocok(KW.buah)) return "buah";
  if (cocok(KW.nabati)) return "nabati";
  if (cocok(KW.hewani)) return "hewani";
  if (cocok(KW.sayur)) return "sayur";
  if (cocok(KW.nasi)) return "nasi";
  return "lain";
}

function warnaBuah(nama: string): { color: string; seeds: boolean } {
  const s = nama.toLowerCase();
  for (const b of WARNA_BUAH) {
    if (b.kw.some((k) => s.includes(k))) return { color: b.color, seeds: !!b.seeds };
  }
  return { color: "#ef8f2e", seeds: false };
}

// ————————————————————————————————————————————————————————————————
// Ilustrasi makanan (SVG) per kategori
// ————————————————————————————————————————————————————————————————

function FoodArt({ nama, kategori }: { nama: string; kategori: Kategori }) {
  if (kategori === "nasi") {
    // Gundukan nasi putih.
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <ellipse cx="50" cy="66" rx="34" ry="20" fill="#ffffff" stroke="rgba(0,0,0,.10)" />
        <ellipse cx="50" cy="52" rx="26" ry="16" fill="#fdfdfb" stroke="rgba(0,0,0,.06)" />
        <ellipse cx="50" cy="42" rx="16" ry="11" fill="#ffffff" stroke="rgba(0,0,0,.05)" />
        {Array.from({ length: 10 }).map((_, i) => (
          <line
            key={i}
            x1={28 + i * 4.5}
            y1={50 + (i % 3) * 5}
            x2={30 + i * 4.5}
            y2={53 + (i % 3) * 5}
            stroke="rgba(0,0,0,.12)"
            strokeWidth="1"
            strokeLinecap="round"
          />
        ))}
      </svg>
    );
  }

  if (kategori === "buah") {
    const { color, seeds } = warnaBuah(nama);
    // Tiga potong buah (irisan setengah lingkaran).
    const slices = [
      { x: 34, y: 58, r: 18, rot: -12 },
      { x: 62, y: 54, r: 16, rot: 18 },
      { x: 50, y: 40, r: 14, rot: 4 },
    ];
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        {slices.map((s, i) => (
          <g key={i} transform={`rotate(${s.rot} ${s.x} ${s.y})`}>
            <path
              d={`M ${s.x - s.r} ${s.y} A ${s.r} ${s.r} 0 0 1 ${s.x + s.r} ${s.y} Z`}
              fill={color}
              stroke="rgba(0,0,0,.12)"
            />
            <path
              d={`M ${s.x - s.r + 3} ${s.y} A ${s.r - 3} ${s.r - 3} 0 0 1 ${s.x + s.r - 3} ${s.y} Z`}
              fill="rgba(255,255,255,.28)"
            />
            {seeds &&
              Array.from({ length: 7 }).map((_, j) => (
                <circle
                  key={j}
                  cx={s.x - s.r + 5 + ((j * (2 * s.r - 10)) / 6)}
                  cy={s.y - 3 - (j % 2) * 3}
                  r="1.3"
                  fill="#1c1c1c"
                />
              ))}
          </g>
        ))}
      </svg>
    );
  }

  if (kategori === "sayur") {
    // Kuntum sayur hijau + sedikit wortel oranye.
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        {[
          { x: 38, y: 56, r: 13, c: "#3f9a4f" },
          { x: 60, y: 60, r: 11, c: "#2f7d3d" },
          { x: 52, y: 44, r: 12, c: "#4bae5b" },
          { x: 66, y: 46, r: 8, c: "#57bd67" },
        ].map((v, i) => (
          <circle key={i} cx={v.x} cy={v.y} r={v.r} fill={v.c} stroke="rgba(0,0,0,.10)" />
        ))}
        <rect x="30" y="58" width="16" height="6" rx="3" transform="rotate(-18 38 61)" fill="#e8892f" />
        <rect x="56" y="66" width="14" height="5" rx="2.5" transform="rotate(12 63 68)" fill="#e8892f" />
      </svg>
    );
  }

  // hewani / nabati / lain — beberapa potongan lauk.
  const c = WARNA_KATEGORI[(kategori === "lain" ? "lain" : kategori) as Exclude<Kategori, "buah">];
  const pieces = [
    { x: 36, y: 58, w: 30, h: 22, rot: -8 },
    { x: 54, y: 50, w: 26, h: 20, rot: 12 },
    { x: 48, y: 66, w: 22, h: 16, rot: 4 },
  ];
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      {pieces.map((p, i) => (
        <g key={i} transform={`rotate(${p.rot} ${p.x} ${p.y})`}>
          <rect
            x={p.x - p.w / 2}
            y={p.y - p.h / 2}
            width={p.w}
            height={p.h}
            rx={p.h / 3}
            fill={c}
            stroke="rgba(0,0,0,.16)"
          />
          <rect
            x={p.x - p.w / 2 + 3}
            y={p.y - p.h / 2 + 3}
            width={p.w - 6}
            height={(p.h - 6) / 2}
            rx={p.h / 5}
            fill="rgba(255,255,255,.22)"
          />
        </g>
      ))}
    </svg>
  );
}

// ————————————————————————————————————————————————————————————————
// Satu sekat ompreng
// ————————————————————————————————————————————————————————————————

function Sekat({
  nama,
  kategori,
  besar = false,
}: {
  nama: string;
  kategori: Kategori;
  besar?: boolean;
}) {
  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-[14px]"
      style={{
        background: "linear-gradient(160deg,#eef1f4,#dbe0e6 55%,#eef1f4)",
        boxShadow: "inset 0 2px 6px rgba(0,0,0,.16), inset 0 -1px 3px rgba(255,255,255,.7)",
        border: "1px solid rgba(120,130,140,.45)",
        gridRow: besar ? "span 2" : undefined,
      }}
    >
      {/* Label menu (di atas) */}
      <div className="px-2 pt-2 text-center">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
          {ROLE_LABEL[kategori]}
        </p>
        <p
          className={`font-bold leading-tight text-slate-800 ${
            besar ? "text-[15px]" : "text-[12px]"
          }`}
        >
          {nama || "—"}
        </p>
      </div>
      {/* Ilustrasi makanan */}
      <div className="min-h-0 flex-1 px-2 pb-1">
        <FoodArt nama={nama} kategori={kategori} />
      </div>
    </div>
  );
}

// ————————————————————————————————————————————————————————————————
// Komponen utama
// ————————————————————————————————————————————————————————————————

interface Comp {
  nama: string;
  /** override kategori; "" = auto-deteksi dari nama. */
  ovr: Kategori | "";
}

const DEFAULT: Comp[] = [
  { nama: "Nasi Putih", ovr: "" },
  { nama: "Ayam Goreng", ovr: "" },
  { nama: "Tahu Bacem", ovr: "" },
  { nama: "Tumis Sayur", ovr: "" },
  { nama: "Buah Naga Potong", ovr: "" },
];

const OPSI_KATEGORI: { v: Kategori | ""; t: string }[] = [
  { v: "", t: "Otomatis" },
  { v: "nasi", t: "Karbohidrat" },
  { v: "hewani", t: "Lauk Hewani" },
  { v: "nabati", t: "Lauk Nabati" },
  { v: "sayur", t: "Sayur" },
  { v: "buah", t: "Buah" },
  { v: "lain", t: "Pelengkap" },
];

function kategoriDari(c: Comp): Kategori {
  return c.ovr || deteksiKategori(c.nama);
}

export default function Ompreng() {
  const hariIni = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const [judul, setJudul] = useState("Menu Makan Bergizi Gratis");
  const [subjudul, setSubjudul] = useState(hariIni);
  const [comps, setComps] = useState<Comp[]>(DEFAULT);
  const [sibuk, setSibuk] = useState(false);
  const trayRef = useRef<HTMLDivElement>(null);

  const ubah = (i: number, patch: Partial<Comp>) =>
    setComps((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  async function unduh(format: "png" | "jpg") {
    const node = trayRef.current;
    if (!node) return;
    setSibuk(true);
    try {
      const lib = await import("html-to-image");
      const opts = { pixelRatio: 2.5, cacheBust: true, backgroundColor: "#ffffff" };
      const url =
        format === "png"
          ? await lib.toPng(node, opts)
          : await lib.toJpeg(node, { ...opts, quality: 0.95 });
      const a = document.createElement("a");
      const slug = judul.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      a.download = `ompreng-${slug || "menu"}.${format}`;
      a.href = url;
      a.click();
    } catch (err) {
      console.error("Gagal ekspor gambar ompreng:", err);
      alert("Gagal membuat gambar. Coba lagi.");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* ————— Panel editor (tidak ikut diekspor) ————— */}
      <div className="no-print mb-5 rounded-xl border border-slate-300 bg-slate-50 p-4">
        <p className="mb-3 text-sm font-semibold text-slate-700">
          Atur judul & isi tiap sekat — gambar makanan menyesuaikan otomatis.
        </p>
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          <label className="block text-xs font-medium text-slate-600">
            Judul
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Sub-judul / Tanggal
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              value={subjudul}
              onChange={(e) => setSubjudul(e.target.value)}
            />
          </label>
        </div>
        <div className="space-y-2">
          {comps.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-center text-xs font-bold text-slate-400">
                {i + 1}
              </span>
              <input
                className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                placeholder={`Menu sekat ${i + 1}`}
                value={c.nama}
                onChange={(e) => ubah(i, { nama: e.target.value })}
              />
              <select
                className="shrink-0 rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                value={c.ovr}
                onChange={(e) => ubah(i, { ovr: e.target.value as Kategori | "" })}
                title="Jenis makanan (untuk warna ilustrasi)"
              >
                {OPSI_KATEGORI.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.t}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => unduh("png")}
            disabled={sibuk}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {sibuk ? "Memproses…" : "Unduh PNG"}
          </button>
          <button
            type="button"
            onClick={() => unduh("jpg")}
            disabled={sibuk}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {sibuk ? "Memproses…" : "Unduh JPG"}
          </button>
        </div>
      </div>

      {/* ————— Kartu ompreng (target ekspor) ————— */}
      <div
        ref={trayRef}
        className="mx-auto rounded-2xl p-6"
        style={{ background: "#ffffff", width: 720, maxWidth: "100%" }}
      >
        <div className="mb-4 text-center">
          <h2 className="text-2xl font-extrabold uppercase tracking-wide text-slate-800">
            {judul}
          </h2>
          <p className="text-sm font-medium text-slate-500">{subjudul}</p>
        </div>

        {/* Nampan ompreng */}
        <div
          className="rounded-[22px] p-3"
          style={{
            background: "linear-gradient(135deg,#e9ecef,#c9ced5 45%,#eef1f4 62%,#c4c9d0)",
            boxShadow: "0 10px 24px rgba(0,0,0,.18), inset 0 1px 2px rgba(255,255,255,.8)",
            border: "1px solid rgba(150,158,168,.6)",
          }}
        >
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: "1.35fr 1fr 1fr",
              gridTemplateRows: "1fr 1fr",
              aspectRatio: "16 / 10",
            }}
          >
            <Sekat nama={comps[0].nama} kategori={kategoriDari(comps[0])} besar />
            <Sekat nama={comps[1].nama} kategori={kategoriDari(comps[1])} />
            <Sekat nama={comps[2].nama} kategori={kategoriDari(comps[2])} />
            <Sekat nama={comps[3].nama} kategori={kategoriDari(comps[3])} />
            <Sekat nama={comps[4].nama} kategori={kategoriDari(comps[4])} />
          </div>
        </div>

        <p className="mt-3 text-center text-[11px] text-slate-400">
          Gambaran porsi ompreng 5 sekat • Ilustrasi non-skala untuk presentasi menu
        </p>
      </div>
    </div>
  );
}
