"use client";

/**
 * Komponen khusus formulir Ahli Gizi (di atas primitif bersama akuntan).
 * - GridBulanan: tabel monitoring bulanan (kolom tanggal 1–31) yang barisnya
 *   bisa ditambah/dihapus, sel memakai contentEditable (isi-lalu-cetak).
 * - TabelGizi: tabel zat gizi (menu + kolom gizi) dengan baris rekap.
 * - TTDGizi: blok tanda tangan 2 kolom untuk dokumen gizi.
 * Semua kontrol tambah/hapus baris ber-kelas `.no-print` sehingga tidak ikut
 * tersimpan/tercetak (PrintFrame membuang elemen .no-print saat menyimpan).
 */
import { useEffect, useRef, useState } from "react";
import { Ed, Tgl, useTanggalISO } from "../akuntan/_components";
import { AREA_KEBERSIHAN } from "@/lib/ahli-gizi";
import { getSasaran, MEAL_FRACTION } from "@/lib/gizi-nutrisi";
import GeneratorGizi from "./generator-gizi/GeneratorGizi";

/** Angka tanggal 1..31 untuk header grid bulanan. */
export const DAYS: number[] = Array.from({ length: 31 }, (_, i) => i + 1);

const th =
  "border border-black px-1 py-0.5 text-center font-bold align-middle";
const cell = "border border-black px-1 py-0.5 align-top";

/**
 * Tabel monitoring bulanan: satu kolom label + 31 kolom tanggal + opsional Ket.
 * Cocok untuk checklist kebersihan, monitoring suhu harian, dsb.
 */
export function GridBulanan({
  labelKolom,
  barisAwal,
  editLabel = false,
  ket = false,
  bisaTambah = false,
  nomor = false,
  fontSize = "text-[8px]",
}: {
  /** Judul kolom pertama (label baris). */
  labelKolom: string;
  /** Teks label untuk tiap baris awal. */
  barisAwal: string[];
  /** Bila true, label baris bisa diedit (contentEditable). */
  editLabel?: boolean;
  /** Tambah kolom "Ket" (keterangan) di ujung kanan. */
  ket?: boolean;
  /** Tampilkan tombol tambah baris. */
  bisaTambah?: boolean;
  /** Tampilkan kolom nomor urut di paling kiri. */
  nomor?: boolean;
  fontSize?: string;
}) {
  const [rows, setRows] = useState<{ id: number; label: string }[]>(() =>
    barisAwal.map((label, i) => ({ id: i, label })),
  );
  const nextId = useRef(barisAwal.length);
  // Rentang tanggal kolom yang ditampilkan (default 1–31, bisa diatur).
  const [dari, setDari] = useState(1);
  const [sampai, setSampai] = useState(31);
  const hariTampil = DAYS.filter((d) => d >= dari && d <= sampai);
  const clampHari = (v: number) => Math.min(31, Math.max(1, v || 1));

  return (
    <div>
      <div className="no-print mb-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
        <span>Rentang tanggal kolom:</span>
        <input
          type="number"
          min={1}
          max={31}
          value={dari}
          onChange={(e) => setDari(clampHari(parseInt(e.target.value, 10)))}
          className="w-16 rounded border border-gray-300 px-2 py-1"
        />
        <span>s.d</span>
        <input
          type="number"
          min={1}
          max={31}
          value={sampai}
          onChange={(e) => setSampai(clampHari(parseInt(e.target.value, 10)))}
          className="w-16 rounded border border-gray-300 px-2 py-1"
        />
        <span className="italic">(atur tanggal berapa sampai berapa yang ditampilkan)</span>
      </div>
      <table className={`w-full border-collapse ${fontSize}`}>
        <thead>
          <tr style={{ backgroundColor: "#D9E1F2" }}>
            {nomor && <th className={th + " w-[3%]"}>No</th>}
            <th className={th + " min-w-[110px] text-left"}>{labelKolom}</th>
            {hariTampil.map((d) => (
              <th key={d} className={th}>
                {d}
              </th>
            ))}
            {ket && <th className={th + " min-w-[60px]"}>Ket</th>}
            {bisaTambah && (
              <th className="no-print border border-black px-1 text-center">
                ·
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.id}>
              {nomor && <td className={cell + " text-center"}>{idx + 1}</td>}
              <td className={cell + " text-left"}>
                {editLabel ? <Ed>{r.label}</Ed> : r.label}
              </td>
              {hariTampil.map((d) => (
                <td key={d} className={cell + " text-center"}>
                  <Ed block />
                </td>
              ))}
              {ket && (
                <td className={cell}>
                  <Ed block />
                </td>
              )}
              {bisaTambah && (
                <td className="no-print border border-black text-center">
                  <button
                    type="button"
                    onClick={() =>
                      setRows((s) => s.filter((x) => x.id !== r.id))
                    }
                    className="px-1 text-red-600"
                    title="Hapus baris"
                  >
                    ×
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {bisaTambah && (
        <button
          type="button"
          onClick={() => {
            const id = nextId.current++;
            setRows((s) => [...s, { id, label: "" }]);
          }}
          className="no-print mt-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
        >
          ＋ Tambah baris
        </button>
      )}
    </div>
  );
}

// ————————————————————————————————————————————————————————————————
// Data gizi harian (dari GET /api/admin/ahli-gizi/gizi-harian).
// Struktur mengikuti envelope FLAT endpoint: { tanggal, reguler, b3 }.

/** Sasaran distribusi menu pada jadwal. */
type SasaranMenu = "reguler" | "b3";

interface BahanGiziRow {
  nama: string;
  beratG: number;
  energi: number;
  protein: number;
  lemak: number;
  karbo: number;
  serat: number;
  terhitung: boolean;
}
interface MenuGiziRow {
  nama: string;
  waktu: string;
  bahan: BahanGiziRow[];
}
interface SasaranGiziData {
  menus: MenuGiziRow[];
  total: { energi: number; protein: number; lemak: number; karbo: number; serat: number };
}

/** Bulatkan 1 desimal, buang trailing nol → "12.5" / "40". */
function f1(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isFinite(r) ? String(r) : "";
}

/**
 * Tabel zat gizi untuk Laporan Harian (Rencana Standar Porsi Menu).
 * Kolom: Waktu | Menu | Sumber Pangan | Berat (g) | URT | Energi | Protein |
 * Lemak | KH | Serat. Ada 3 baris rekap (Total / Kebutuhan 30% / %Pemenuhan).
 *
 * Bila `sasaran` diisi, tabel OTOMATIS memuat rincian gizi seluruh menu yang
 * dijadwalkan pada tanggal dokumen (dari TanggalContext) untuk sasaran tsb,
 * per bahan (sumber pangan) beserta total & % pemenuhan terhadap AKG `akgKey`
 * (target 30% per waktu makan). Semua sel tetap contentEditable agar ahli gizi
 * bisa menyunting sebelum cetak. Tanpa props → mode manual (baris kosong).
 */
export function TabelGizi({
  barisAwal,
  sasaran,
  akgKey,
}: {
  barisAwal?: number;
  /** Kelompok distribusi menu; mengaktifkan auto-load bila diisi. */
  sasaran?: SasaranMenu;
  /** Kunci AKG (mis. "sd13", "balita") untuk baris kebutuhan & % pemenuhan. */
  akgKey?: string;
}) {
  const iso = useTanggalISO();
  // Mode auto (sasaran diisi) mulai tanpa baris manual; mode manual → 5 baris.
  const barisManual = barisAwal ?? (sasaran ? 0 : 5);
  const [rows, setRows] = useState<number[]>(() =>
    Array.from({ length: barisManual }, (_, i) => i),
  );
  const nextId = useRef(barisManual);
  const [data, setData] = useState<SasaranGiziData | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-load gizi menu terjadwal pada tanggal dokumen untuk sasaran ini.
  useEffect(() => {
    if (!sasaran || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      setData(null);
      return;
    }
    let batal = false;
    setLoading(true);
    fetch(`/api/admin/ahli-gizi/gizi-harian?tanggal=${iso}`)
      .then(async (res) => {
        const j = await res.json().catch(() => ({}));
        if (batal) return;
        if (res.ok && j && j[sasaran]) setData(j[sasaran] as SasaranGiziData);
        else setData(null);
      })
      .catch(() => {
        if (!batal) setData(null);
      })
      .finally(() => {
        if (!batal) setLoading(false);
      });
    return () => {
      batal = true;
    };
  }, [iso, sasaran]);

  const HEAD = [
    "Waktu",
    "Menu",
    "Sumber Pangan",
    "Berat (g)",
    "URT",
    "Energi (kkal)",
    "Protein (g)",
    "Lemak (g)",
    "KH (g)",
    "Serat (g)",
  ];

  const akg = akgKey ? getSasaran(akgKey) : undefined;
  const menus = data?.menus ?? [];
  const adaData = menus.length > 0;
  // Key stabil supaya sel Ed (contentEditable, tak terkontrol) ikut remount
  // dengan isi baru saat tanggal/sasaran/data berubah.
  const dataKey = `${iso}:${sasaran ?? ""}:${menus.length}`;

  // Baris rekap: nilai gizi per kolom (Energi, Protein, Lemak, KH, Serat).
  const total = data?.total ?? { energi: 0, protein: 0, lemak: 0, karbo: 0, serat: 0 };
  const keb = akg
    ? {
        energi: akg.energi * MEAL_FRACTION,
        protein: akg.protein * MEAL_FRACTION,
        lemak: akg.lemak * MEAL_FRACTION,
        karbo: akg.karbo * MEAL_FRACTION,
        serat: akg.serat * MEAL_FRACTION,
      }
    : null;
  const pct = (nilai: number, target: number): string =>
    target > 0 ? `${f1((nilai / target) * 100)}%` : "";

  const rekapCells = (label: string): (string | undefined)[] => {
    if (label.startsWith("Total")) {
      return adaData
        ? [f1(total.energi), f1(total.protein), f1(total.lemak), f1(total.karbo), f1(total.serat)]
        : [undefined, undefined, undefined, undefined, undefined];
    }
    if (label.startsWith("Kebutuhan")) {
      return keb
        ? [f1(keb.energi), f1(keb.protein), f1(keb.lemak), f1(keb.karbo), f1(keb.serat)]
        : [undefined, undefined, undefined, undefined, undefined];
    }
    // % Pemenuhan
    return adaData && keb
      ? [
          pct(total.energi, keb.energi),
          pct(total.protein, keb.protein),
          pct(total.lemak, keb.lemak),
          pct(total.karbo, keb.karbo),
          pct(total.serat, keb.serat),
        ]
      : [undefined, undefined, undefined, undefined, undefined];
  };

  const REKAP = [
    "Total Zat Gizi",
    "Kebutuhan Zat Gizi (30%)",
    "% Pemenuhan Zat Gizi",
  ];

  return (
    <div>
      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr style={{ backgroundColor: "#D9E1F2" }}>
            {HEAD.map((h) => (
              <th key={h} className={th}>
                {h}
              </th>
            ))}
            <th className="no-print border border-black px-1 text-center">·</th>
          </tr>
        </thead>
        <tbody>
          {/* Baris otomatis dari menu terjadwal (per bahan). */}
          {adaData &&
            menus.map((m, mi) =>
              m.bahan.map((b, bi) => (
                <tr key={`${dataKey}:${mi}:${bi}`}>
                  {bi === 0 ? (
                    <>
                      <td className={cell} rowSpan={m.bahan.length}>
                        <Ed block>{m.waktu}</Ed>
                      </td>
                      <td className={cell} rowSpan={m.bahan.length}>
                        <Ed block>{m.nama}</Ed>
                      </td>
                    </>
                  ) : null}
                  <td className={cell}>
                    <Ed block>{b.nama}</Ed>
                  </td>
                  <td className={cell + " text-center"}>
                    <Ed block>{b.beratG > 0 ? f1(b.beratG) : ""}</Ed>
                  </td>
                  <td className={cell}>
                    <Ed block />
                  </td>
                  <td className={cell + " text-center"}>
                    <Ed block>{b.terhitung ? f1(b.energi) : ""}</Ed>
                  </td>
                  <td className={cell + " text-center"}>
                    <Ed block>{b.terhitung ? f1(b.protein) : ""}</Ed>
                  </td>
                  <td className={cell + " text-center"}>
                    <Ed block>{b.terhitung ? f1(b.lemak) : ""}</Ed>
                  </td>
                  <td className={cell + " text-center"}>
                    <Ed block>{b.terhitung ? f1(b.karbo) : ""}</Ed>
                  </td>
                  <td className={cell + " text-center"}>
                    <Ed block>{b.terhitung ? f1(b.serat) : ""}</Ed>
                  </td>
                  <td className="no-print border border-black" />
                </tr>
              )),
            )}

          {/* Baris manual (mode tanpa data / tambahan). */}
          {rows.map((id) => (
            <tr key={id}>
              {HEAD.map((_, c) => (
                <td key={c} className={cell}>
                  <Ed block />
                </td>
              ))}
              <td className="no-print border border-black text-center">
                <button
                  type="button"
                  onClick={() => setRows((s) => s.filter((x) => x !== id))}
                  className="px-1 text-red-600"
                  title="Hapus baris"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}

          {REKAP.map((label) => {
            const vals = rekapCells(label);
            return (
              <tr key={`${dataKey}:${label}`} style={{ backgroundColor: "#F2F2F2" }}>
                <td className={th + " text-left"} colSpan={5}>
                  {label}
                </td>
                {/* Energi, Protein, Lemak, KH, Serat */}
                {vals.map((v, c) => (
                  <td key={c} className={cell + " text-center font-semibold"}>
                    <Ed block>{v}</Ed>
                  </td>
                ))}
                <td className="no-print border border-black" />
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="no-print mt-1 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            const id = nextId.current++;
            setRows((s) => [...s, id]);
          }}
          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
        >
          ＋ Tambah baris menu
        </button>
        {sasaran ? (
          <span className="text-xs text-gray-400">
            {loading
              ? "Memuat gizi menu terjadwal…"
              : adaData
                ? `Terisi otomatis dari ${menus.length} menu terjadwal (${iso}).`
                : `Belum ada menu terjadwal untuk sasaran ini pada ${iso || "tanggal dipilih"}.`}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Blok tanda tangan 2 kolom (peran + nama, keduanya bisa diedit). */
export function TTDGizi({
  kiri,
  kanan,
}: {
  kiri: { peran: string; nama: string };
  kanan: { peran: string; nama: string };
}) {
  const Kolom = ({ peran, nama }: { peran: string; nama: string }) => (
    <td className="w-1/2 text-center align-top">
      <p className="whitespace-pre-line">
        <Ed>{peran}</Ed>
      </p>
      <div className="h-14" />
      <p className="font-bold underline">
        <Ed>{nama}</Ed>
      </p>
    </td>
  );
  return (
    <table className="mt-6 w-full text-sm">
      <tbody>
        <tr>
          <Kolom {...kiri} />
          <Kolom {...kanan} />
        </tr>
      </tbody>
    </table>
  );
}

/**
 * Tabel "Daftar Penerima MBG" untuk laporan mingguan. Mengambil daftar sekolah/
 * posyandu dari master distribusi (GET /api/admin/penerima). Tiap baris punya
 * checklist "masuk" (default tercentang) untuk memilih sekolah mana yang ikut;
 * baris yang tidak dicentang ditandai .no-print sehingga tidak ikut tercetak /
 * tersimpan. Kolom Kab/Kota, Alamat, dan Jumlah bisa diedit (isi-lalu-cetak).
 */
interface BarisPenerima {
  id: number;
  nama: string;
  jenjang: string;
  jumlah: number;
}

export function DaftarPenerima() {
  const [rows, setRows] = useState<BarisPenerima[] | null>(null);
  const [inc, setInc] = useState<Set<number>>(new Set());
  const [err, setErr] = useState("");

  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/penerima");
        const data = (await res.json().catch(() => ({}))) as {
          penerima?: Array<Record<string, unknown>>;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || "Gagal memuat penerima.");
        const list = (data.penerima ?? [])
          .filter((p) => p.aktif !== false)
          .map((p) => ({
            id: Number(p.id),
            nama: String(p.nama ?? ""),
            jenjang: String(p.jenjang ?? ""),
            jumlah:
              (Number(p.besar) || 0) +
              (Number(p.kecil) || 0) +
              (Number(p.b3) || 0) +
              (Number(p.pj) || 0),
          }));
        if (!batal) {
          setRows(list);
          setInc(new Set(list.map((m) => m.id)));
        }
      } catch (e) {
        if (!batal) setErr(e instanceof Error ? e.message : "Gagal memuat.");
      }
    })();
    return () => {
      batal = true;
    };
  }, []);

  if (err)
    return <p className="text-[11px] italic text-red-600">{err}</p>;
  if (!rows)
    return <p className="text-[11px] italic text-gray-500">Memuat data sekolah…</p>;

  const toggle = (id: number) =>
    setInc((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const total = rows.reduce((a, r) => (inc.has(r.id) ? a + r.jumlah : a), 0);

  let no = 0;
  return (
    <table className="w-full border-collapse text-[10px]">
      <thead>
        <tr style={{ backgroundColor: "#D9E1F2" }}>
          <th className="no-print border border-black px-1 py-0.5 text-center">
            ✓
          </th>
          <th className={th + " w-[6%]"}>No.</th>
          <th className={th + " w-[16%]"}>Kabupaten / Kota</th>
          <th className={th}>Nama Sekolah / Posyandu</th>
          <th className={th + " w-[26%]"}>Alamat</th>
          <th className={th + " w-[14%]"}>Jumlah Penerima</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const on = inc.has(r.id);
          if (on) no += 1;
          return (
            <tr key={r.id} className={on ? "" : "no-print opacity-40"}>
              <td className="no-print border border-black text-center">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(r.id)}
                />
              </td>
              <td className={cell + " text-center"}>{on ? no : "–"}</td>
              <td className={cell}>
                <Ed>Ponorogo</Ed>
              </td>
              <td className={cell}>
                {r.nama}
                {r.jenjang ? (
                  <span className="text-gray-500"> ({r.jenjang})</span>
                ) : null}
              </td>
              <td className={cell}>
                <Ed block />
              </td>
              <td className={cell + " text-center"}>
                <Ed>{String(r.jumlah)}</Ed>
              </td>
            </tr>
          );
        })}
        <tr style={{ backgroundColor: "#F2F2F2" }} className="font-bold">
          <td className="no-print border border-black" />
          <td className={cell + " text-right"} colSpan={4}>
            TOTAL Keseluruhan
          </td>
          <td className={cell + " text-center"}>
            <Ed>{String(total)}</Ed> Penerima manfaat
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/**
 * Tabel "Jenis Menu MBG" mingguan. Bila diberi tanggal mulai, menu & jumlah
 * penerima manfaat (PM) tiap hari diambil dari master distribusi
 * (GET /api/admin/distribusi?tanggal=YYYY-MM-DD) untuk 5 hari kerja berturut.
 * Semua sel tetap contentEditable (isi-lalu-cetak) agar bisa disesuaikan.
 */
interface BarisMenu {
  tanggal: string;
  hari: string;
  menu: string;
  pm: number | null;
}

const HARI_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const isoLokal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

/**
 * Ambil menu & jumlah PM 5 hari kerja berturut mulai dari `start` (YYYY-MM-DD)
 * dari master distribusi. Dipakai bersama oleh tabel menu & dokumentasi harian.
 */
async function ambilMenu5Hari(start: string): Promise<BarisMenu[]> {
  const base = new Date(start + "T00:00:00");
  const out: BarisMenu[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const iso = isoLokal(d);
    let menu = "";
    let pm: number | null = null;
    try {
      const res = await fetch(`/api/admin/distribusi?tanggal=${iso}`);
      const j = (await res.json().catch(() => ({}))) as {
        distribusi?: { menu?: string };
        total?: { porsi?: number };
      };
      if (res.ok) {
        menu = String(j?.distribusi?.menu ?? "");
        pm = typeof j?.total?.porsi === "number" ? j.total.porsi : null;
      }
    } catch {
      /* biarkan kosong bila gagal memuat satu hari */
    }
    out.push({ tanggal: iso, hari: HARI_ID[d.getDay()], menu, pm });
  }
  return out;
}

export function TabelMenuMingguan() {
  const [mulai, setMulai] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<BarisMenu[]>(() =>
    Array.from({ length: 5 }, () => ({
      tanggal: "",
      hari: "",
      menu: "",
      pm: null,
    })),
  );

  const muat = async (start: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return;
    setLoading(true);
    setRows(await ambilMenu5Hari(start));
    setLoading(false);
  };

  return (
    <div>
      <div className="no-print mb-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
        <span>Muat menu &amp; jumlah PM dari distribusi mulai tanggal:</span>
        <input
          type="date"
          value={mulai}
          onChange={(e) => setMulai(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1"
        />
        <button
          type="button"
          onClick={() => muat(mulai)}
          disabled={loading}
          className="rounded border border-emerald-400 bg-emerald-50 px-2 py-1 font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
        >
          {loading ? "Memuat…" : "Muat 5 hari"}
        </button>
        <span className="italic">
          (Senin–Jumat berurutan; nilai tetap bisa diedit)
        </span>
      </div>
      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr style={{ backgroundColor: "#D9E1F2" }}>
            <th className={th + " w-[6%]"}>No.</th>
            <th className={th + " w-[24%]"}>Hari / Tanggal</th>
            <th className={th}>Menu MBG</th>
            <th className={th + " w-[16%]"}>Jumlah PM</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${i}-${r.tanggal}-${r.menu.length}-${r.pm ?? ""}`}>
              <td className={cell + " text-center"}>{i + 1}</td>
              <td className={cell}>
                <Ed>{r.hari ? `${r.hari}, ${r.tanggal}` : "………"}</Ed>
              </td>
              <td className={cell}>
                <Ed block>{r.menu || "………"}</Ed>
              </td>
              <td className={cell + " text-center"}>
                <Ed>{r.pm != null ? String(r.pm) : "…"}</Ed>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Satu kotak foto potret 4:5. File dipilih lalu dikompres di sisi klien
 * (canvas 288×360, crop tengah ke rasio 4:5, JPEG 0.6) supaya ukuran base64
 * kecil dan aman disimpan di konten_html. Kontrol pilih berkelas .no-print.
 */
export function KotakFoto() {
  const [src, setSrc] = useState("");

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      // Target potret 4:5 (lebar:tinggi = 4/5 = 0.8).
      const W = 288;
      const H = 360;
      const RATIO = W / H;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Crop tengah ke rasio 4:5 dari sumber.
        let cw = img.width;
        let ch = img.width / RATIO;
        if (ch > img.height) {
          ch = img.height;
          cw = img.height * RATIO;
        }
        const sx = (img.width - cw) / 2;
        const sy = (img.height - ch) / 2;
        ctx.drawImage(img, sx, sy, cw, ch, 0, 0, W, H);
        setSrc(canvas.toDataURL("image/jpeg", 0.6));
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded border border-black bg-gray-50">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Dokumentasi" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
          Foto
        </div>
      )}
      <label className="no-print absolute inset-x-0 bottom-0 cursor-pointer bg-black/60 px-1 py-0.5 text-center text-[10px] text-white">
        {src ? "Ganti foto" : "Pilih foto"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFile}
        />
      </label>
    </div>
  );
}

/**
 * Blok dokumentasi satu hari pemberian: nomor pemberian, hari/tanggal & menu
 * (bisa diedit) + 2 kotak foto 1:1 bersebelahan.
 */
/** Format ISO (YYYY-MM-DD) → "31 Juli 2026". Kosong bila tak valid. */
const tglIndo = (iso: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const bln = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  return `${d} ${bln[m - 1]} ${y}`;
};

export function DokHari({
  ke,
  hari,
  tanggal = "",
  menu = "………",
}: {
  ke: string;
  hari: string;
  /** ISO YYYY-MM-DD; ditampilkan sebagai "31 Juli 2026". */
  tanggal?: string;
  menu?: string;
}) {
  return (
    <div className="mt-3 break-inside-avoid">
      <p className="font-semibold">
        Pemberian Ke-{ke} — <Ed>{hari}</Ed>, <Ed>{tglIndo(tanggal) || "………"}</Ed>
      </p>
      <p className="text-[12px]">
        Menu: <Ed block>{menu || "………"}</Ed>
      </p>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <KotakFoto />
        <KotakFoto />
      </div>
    </div>
  );
}

/**
 * Blok dokumentasi 5 hari (Senin–Jumat) untuk BAB II.C laporan mingguan.
 * Sama seperti TabelMenuMingguan: pilih tanggal awal → "Muat 5 hari" mengisi
 * hari, tanggal, dan menu otomatis dari distribusi. Tiap hari punya 2 kotak foto.
 * Blok di-remount lewat `key` agar isi Ed ikut ter-refresh setelah data dimuat.
 */
export function DokumentasiMingguan() {
  const [mulai, setMulai] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<BarisMenu[]>(() =>
    ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"].map((hari) => ({
      tanggal: "",
      hari,
      menu: "",
      pm: null,
    })),
  );

  const muat = async (start: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return;
    setLoading(true);
    setRows(await ambilMenu5Hari(start));
    setLoading(false);
  };

  return (
    <div>
      <div className="no-print mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-emerald-400 bg-emerald-50 px-3 py-2 text-[12px]">
        <span className="font-semibold text-emerald-800">Muat dokumentasi:</span>
        <input
          type="date"
          value={mulai}
          onChange={(e) => setMulai(e.target.value)}
          className="rounded border border-emerald-300 px-2 py-1"
        />
        <button
          type="button"
          onClick={() => muat(mulai)}
          disabled={loading || !mulai}
          className="rounded bg-emerald-600 px-3 py-1 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Memuat…" : "Muat 5 hari"}
        </button>
        <span className="text-emerald-700">
          Tanggal &amp; menu terisi otomatis dari distribusi (Senin–Jumat).
        </span>
      </div>
      {rows.map((r, i) => (
        <DokHari
          key={`${i}-${r.tanggal}-${r.menu.length}`}
          ke={String(i + 1).padStart(2, "0")}
          hari={r.hari}
          tanggal={r.tanggal}
          menu={r.menu}
        />
      ))}
    </div>
  );
}

/**
 * Blok tanda tangan Ahli Gizi dengan nama Kepala SPPG & Ahli Gizi terisi
 * OTOMATIS dari Pengaturan dapur (GET /api/admin/distribusi/pengaturan) — tak
 * perlu ketik nama tiap dokumen. Nama tetap bisa diedit bila perlu.
 */
export function TTDGiziAuto({
  kiriPeran = "Mengetahui,\nKepala SPPG",
  kananPeran = "Ahli Gizi SPPG",
}: {
  kiriPeran?: string;
  kananPeran?: string;
}) {
  const [kepala, setKepala] = useState("");
  const [ahli, setAhli] = useState("");
  useEffect(() => {
    let batal = false;
    fetch("/api/admin/distribusi/pengaturan")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (batal || !d?.pengaturan) return;
        setKepala(String(d.pengaturan.kepala_sppg || ""));
        setAhli(String(d.pengaturan.ahli_gizi || ""));
      })
      .catch(() => {});
    return () => {
      batal = true;
    };
  }, []);
  const Kolom = ({ peran, nama }: { peran: string; nama: string }) => (
    <td className="w-1/2 text-center align-top">
      <p className="min-h-[2.6em] whitespace-pre-line">
        <Ed>{peran}</Ed>
      </p>
      <div className="h-14" />
      <p className="font-bold underline">
        <Ed>{nama ? `(${nama})` : "(………………………)"}</Ed>
      </p>
    </td>
  );
  return (
    <table className="mt-6 w-full text-sm">
      <tbody>
        <tr>
          <Kolom peran={kiriPeran} nama={kepala} />
          <Kolom peran={kananPeran} nama={ahli} />
        </tr>
      </tbody>
    </table>
  );
}

/**
 * Formulir monitoring kebersihan per area: pilih area → daftar kegiatan otomatis
 * (dari AREA_KEBERSIHAN) + grid tanggal 1–31 (Sebelum/Sesudah). Bulan & tahun
 * mengikuti tanggal dokumen. Cetak per area (ulangi untuk area lain).
 */
export function MonitorKebersihanArea() {
  const [areaKey, setAreaKey] = useState(AREA_KEBERSIHAN[0].key);
  const area = AREA_KEBERSIHAN.find((a) => a.key === areaKey) || AREA_KEBERSIHAN[0];
  return (
    <div>
      <div className="no-print mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-gray-700">Pilih Area:</span>
        <select
          value={areaKey}
          onChange={(e) => setAreaKey(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1"
        >
          {AREA_KEBERSIHAN.map((a) => (
            <option key={a.key} value={a.key}>
              {a.nama}
            </option>
          ))}
        </select>
        <span className="italic text-gray-500">(pilih area lalu cetak; ulangi untuk area lain)</span>
      </div>

      <p className="mb-2 text-center text-[13px] font-bold uppercase">Area: {area.nama}</p>

      <div className="mb-2 flex flex-wrap gap-x-8 gap-y-1 text-[12px]">
        <span>
          Bulan: <Tgl mode="bulan" />
        </span>
        <span>
          Tahun: <Tgl mode="tahun" />
        </span>
        <span>
          Lokasi: <Ed>…………………………</Ed>
        </span>
      </div>

      <GridBulanan
        key={areaKey}
        labelKolom="Kegiatan"
        barisAwal={area.kegiatan}
        editLabel
        nomor
        bisaTambah
      />

      <p className="mt-2 text-[10px] italic">
        Keterangan: ✔ = Sudah dilakukan · ✘ = Belum/tidak dilakukan. Centang tiap
        tanggal bila kegiatan sudah dilakukan.
      </p>
    </div>
  );
}

/**
 * Tabel Pengecekan Suhu Makanan Matang & Diporsi. Tombol "Muat" mengisi kolom
 * Tanggal & Menu otomatis dari master distribusi untuk rentang tanggal terpilih;
 * kolom suhu/waktu/paraf tetap diisi manual. Semua sel bisa diedit.
 */
export function TabelSuhuMakanan() {
  const HEAD = [
    "No",
    "Tanggal",
    "Menu",
    "Suhu Matang (℃)",
    "Waktu Cek",
    "Suhu Diporsi (℃)",
    "Waktu Porsi",
    "Paraf",
  ];
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<{ id: number; tanggal: string; menu: string }[]>(
    () => Array.from({ length: 8 }, (_, i) => ({ id: i, tanggal: "", menu: "" })),
  );
  const nextId = useRef(8);

  const muat = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dari) || !/^\d{4}-\d{2}-\d{2}$/.test(sampai) || dari > sampai)
      return;
    setLoading(true);
    const out: { id: number; tanggal: string; menu: string }[] = [];
    let d = new Date(dari + "T00:00:00Z");
    const end = new Date(sampai + "T00:00:00Z");
    let guard = 0;
    let id = 0;
    while (d <= end && guard < 40) {
      const iso = d.toISOString().slice(0, 10);
      let menu = "";
      try {
        const r = await fetch(`/api/admin/distribusi?tanggal=${iso}`);
        const j = (await r.json().catch(() => ({}))) as { distribusi?: { menu?: string } };
        if (r.ok) menu = String(j?.distribusi?.menu ?? "");
      } catch {
        /* biarkan kosong bila satu hari gagal dimuat */
      }
      out.push({ id: id++, tanggal: iso, menu });
      d.setUTCDate(d.getUTCDate() + 1);
      guard++;
    }
    nextId.current = id;
    setRows(out);
    setLoading(false);
  };

  return (
    <div>
      <div className="no-print mb-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
        <span>Muat tanggal &amp; menu dari distribusi:</span>
        <input
          type="date"
          value={dari}
          onChange={(e) => setDari(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1"
        />
        <span>s.d</span>
        <input
          type="date"
          value={sampai}
          onChange={(e) => setSampai(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1"
        />
        <button
          type="button"
          onClick={muat}
          disabled={loading || !dari || !sampai}
          className="rounded border border-emerald-400 bg-emerald-50 px-2 py-1 font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
        >
          {loading ? "Memuat…" : "Muat"}
        </button>
        <span className="italic">(menu terisi otomatis; tetap bisa diedit)</span>
      </div>
      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr style={{ backgroundColor: "#D9E1F2" }}>
            {HEAD.map((h) => (
              <th key={h} className={th}>
                {h}
              </th>
            ))}
            <th className="no-print border border-black px-1 text-center">·</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.id}>
              <td className={cell + " text-center"}>{idx + 1}</td>
              <td className={cell}>
                <Ed>{r.tanggal ? tglIndo(r.tanggal) : ""}</Ed>
              </td>
              <td className={cell}>
                <Ed block>{r.menu}</Ed>
              </td>
              <td className={cell}>
                <Ed block />
              </td>
              <td className={cell}>
                <Ed block />
              </td>
              <td className={cell}>
                <Ed block />
              </td>
              <td className={cell}>
                <Ed block />
              </td>
              <td className={cell}>
                <Ed block />
              </td>
              <td className="no-print border border-black text-center">
                <button
                  type="button"
                  onClick={() => setRows((s) => s.filter((x) => x.id !== r.id))}
                  className="px-1 text-red-600"
                  title="Hapus baris"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={() => {
          const id = nextId.current++;
          setRows((s) => [...s, { id, tanggal: "", menu: "" }]);
        }}
        className="no-print mt-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
      >
        ＋ Tambah baris
      </button>
    </div>
  );
}

/**
 * Empat kelompok sasaran (B3/balita, SD 1–3, SD 4–6, SMP/SMA) masing-masing
 * dengan TabelGizi yang OTOMATIS memuat menu terjadwal pada tanggal dokumen.
 * Dipakai sebagai sumber data "Menu Terjadwal" di dalam SumberGiziSwitch.
 */
const KELOMPOK_GIZI: { label: string; sasaran: SasaranMenu; akgKey: string }[] = [
  { label: "Balita, Ibu Hamil & Menyusui (B3)", sasaran: "b3", akgKey: "balita" },
  { label: "SD Kelas 1–3", sasaran: "reguler", akgKey: "sd13" },
  { label: "SD Kelas 4–6", sasaran: "reguler", akgKey: "sd46" },
  { label: "SMP & SMA", sasaran: "reguler", akgKey: "smp" },
];

export function BlokGiziKelompok() {
  return (
    <>
      {KELOMPOK_GIZI.map((k) => (
        <div key={k.label} className="mt-5 break-inside-avoid">
          <p className="mb-1 text-sm font-bold uppercase">
            Kelompok: <Ed>{k.label}</Ed>
          </p>
          <TabelGizi sasaran={k.sasaran} akgKey={k.akgKey} />
        </div>
      ))}
    </>
  );
}

/**
 * Pemilih sumber data gizi (2 pilihan) untuk laporan ahli gizi:
 *  - "jadwal"    → BlokGiziKelompok: agregasi otomatis dari menu terjadwal
 *                  (jadwal_menu) via /api/admin/ahli-gizi/gizi-harian.
 *  - "generator" → GeneratorGizi: kalkulator manual berbasis TKPI
 *                  (bahan + gram → makro/mikro + %AKG), lepas dari jadwal.
 * Tombol pemilih ber-kelas .no-print sehingga tidak ikut tercetak/tersimpan;
 * hanya konten sumber terpilih yang muncul di hasil cetak.
 */
export function SumberGiziSwitch() {
  const [mode, setMode] = useState<"jadwal" | "generator">("jadwal");
  const tab = (aktif: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-semibold transition ${
      aktif
        ? "bg-amber-500 text-slate-900 shadow"
        : "text-slate-300 hover:text-white"
    }`;
  return (
    <div>
      <div className="no-print mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 p-1.5">
        <span className="px-1 text-xs font-medium text-slate-400">
          Sumber data gizi:
        </span>
        <button type="button" onClick={() => setMode("jadwal")} className={tab(mode === "jadwal")}>
          Menu Terjadwal
        </button>
        <button
          type="button"
          onClick={() => setMode("generator")}
          className={tab(mode === "generator")}
        >
          Generator Kandungan Gizi
        </button>
      </div>
      {mode === "jadwal" ? <BlokGiziKelompok /> : <GeneratorGizi />}
    </div>
  );
}
