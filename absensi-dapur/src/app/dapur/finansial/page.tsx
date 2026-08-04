"use client";

/**
 * Simulator Keuangan untuk karyawan — edukasi agar bisa keluar dari "rat race".
 * Semua hitungan di sisi klien (tanpa DB). 4 alat:
 *  1) Anggaran (50/30/20 + dana darurat)
 *  2) Investasi (bunga majemuk / compound)
 *  3) Merdeka Finansial (aturan 4% + berapa tahun lagi bebas)
 *  4) Game Keputusan (skenario keuangan)
 * Angka hasil investasi hanya asumsi edukasi, bukan jaminan.
 */
import { useMemo, useState } from "react";

const rp = (n: number) => "Rp " + Math.round(Math.max(0, n || 0)).toLocaleString("id-ID");
const juta = (n: number) => (n >= 1_000_000 ? (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + " jt" : Math.round(n / 1000) + " rb");

/** Nilai akhir investasi: modal awal L + setoran bulanan S selama `bulan`, bunga i/bulan. */
function futureValue(L: number, S: number, i: number, bulan: number): number {
  const g = Math.pow(1 + i, bulan);
  return L * g + (i > 0 ? S * ((g - 1) / i) : S * bulan);
}

function Num({ label, value, onChange, suffix = "Rp", step = 50000 }: {
  label: string; value: number; onChange: (v: number) => void; suffix?: string; step?: number;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="flex items-center gap-2">
        {suffix === "Rp" && <span className="text-sm text-slate-400">Rp</span>}
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={step}
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="input"
        />
        {suffix !== "Rp" && <span className="shrink-0 text-sm text-slate-400">{suffix}</span>}
      </div>
    </label>
  );
}

const TABS = [
  { k: "anggaran", label: "🧮 Anggaran" },
  { k: "investasi", label: "📈 Investasi" },
  { k: "merdeka", label: "🦁 Merdeka Finansial" },
  { k: "game", label: "🎮 Game Keputusan" },
] as const;
type TabKey = (typeof TABS)[number]["k"];

export default function FinansialPage() {
  const [tab, setTab] = useState<TabKey>("anggaran");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">💰 Simulator Keuangan</h1>
        <p className="text-sm text-slate-400">
          Alat bantu atur gaji, investasi, & rencana bebas finansial. Yuk pelan-pelan keluar dari
          <i> rat race</i> 🙂
        </p>
      </div>

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

      {tab === "anggaran" && <Anggaran />}
      {tab === "investasi" && <Investasi />}
      {tab === "merdeka" && <Merdeka />}
      {tab === "game" && <GameKeputusan />}

      <p className="text-center text-[11px] text-slate-500">
        *Perkiraan hasil investasi hanya asumsi untuk edukasi, bukan jaminan. Selalu pelajari risiko
        tiap instrumen.
      </p>
    </div>
  );
}

/* ---------------- 1. Anggaran ---------------- */
function Anggaran() {
  const [gaji, setGaji] = useState(2_500_000);
  const [pKebutuhan, setPKebutuhan] = useState(50);
  const [pKeinginan, setPKeinginan] = useState(30);
  const pTabung = Math.max(0, 100 - pKebutuhan - pKeinginan);

  const kebutuhan = (gaji * pKebutuhan) / 100;
  const keinginan = (gaji * pKeinginan) / 100;
  const tabung = (gaji * pTabung) / 100;
  const pengeluaran = kebutuhan + keinginan;
  const danaDarurat = pengeluaran * 6;
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
        <Num label="Gaji / pemasukan per bulan" value={gaji} onChange={setGaji} />
        <div className="grid grid-cols-2 gap-3">
          <Num label="% Kebutuhan" value={pKebutuhan} onChange={(v) => setPKebutuhan(Math.min(100, v))} suffix="%" step={5} />
          <Num label="% Keinginan" value={pKeinginan} onChange={(v) => setPKeinginan(Math.min(100, v))} suffix="%" step={5} />
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
        <p className="text-sm text-slate-300">
          Target aman: <b>{rp(danaDarurat)}</b> (6× pengeluaran bulanan).
        </p>
        <p className="text-sm text-slate-400">
          Dengan menyisihkan {rp(tabung)}/bulan, dana darurat penuh dalam ± <b>{bulanDD || "—"}</b> bulan.
          Kumpulkan ini <b>dulu</b> sebelum investasi berisiko.
        </p>
        <p className="text-xs text-slate-500">💡 Tips: “Bayar diri sendiri dulu” — sisihkan tabungan di <b>awal</b> gajian, bukan dari sisa akhir bulan.</p>
      </div>
    </div>
  );
}

/* ---------------- 2. Investasi (compound) ---------------- */
const INSTRUMEN = [
  { nama: "Tabungan", r: 2 },
  { nama: "Deposito", r: 5 },
  { nama: "Emas", r: 8 },
  { nama: "Reksa Saham", r: 11 },
];

function Investasi() {
  const [modal, setModal] = useState(0);
  const [setoran, setSetoran] = useState(200_000);
  const [rate, setRate] = useState(8);
  const [tahun, setTahun] = useState(10);

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
        <Num label="Modal awal (opsional)" value={modal} onChange={setModal} />
        <Num label="Setoran rutin per bulan" value={setoran} onChange={setSetoran} step={50000} />
        <div className="grid grid-cols-2 gap-3">
          <Num label="Perkiraan hasil / tahun" value={rate} onChange={(v) => setRate(Math.min(60, v))} suffix="%" step={1} />
          <Num label="Lama (tahun)" value={tahun} onChange={(v) => setTahun(Math.min(40, Math.max(1, v)))} suffix="thn" step={1} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {INSTRUMEN.map((x) => (
            <button key={x.nama} onClick={() => setRate(x.r)}
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

        {/* Grafik pertumbuhan per tahun */}
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

/* ---------------- 3. Merdeka Finansial ---------------- */
function Merdeka() {
  const [pengeluaran, setPengeluaran] = useState(2_000_000);
  const [aset, setAset] = useState(0);
  const [setoran, setSetoran] = useState(300_000);
  const [rate, setRate] = useState(8);
  const wd = 4; // aturan 4% (safe withdrawal)

  const fiNumber = (pengeluaran * 12) / (wd / 100); // = 25× pengeluaran tahunan
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
        <Num label="Pengeluaran per bulan" value={pengeluaran} onChange={setPengeluaran} />
        <Num label="Aset investasi saat ini" value={aset} onChange={setAset} />
        <div className="grid grid-cols-2 gap-3">
          <Num label="Setoran investasi / bulan" value={setoran} onChange={setSetoran} step={50000} />
          <Num label="Perkiraan hasil / tahun" value={rate} onChange={(v) => setRate(Math.min(30, v))} suffix="%" step={1} />
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
          menghasilkan (reksa dana, emas), kurangi <b>utang konsumtif</b> yang menggerus penghasilan.
        </p>
      </div>
    </div>
  );
}

/* ---------------- 4. Game Keputusan ---------------- */
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
