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
import { Ed } from "../akuntan/_components";

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
  fontSize?: string;
}) {
  const [rows, setRows] = useState<{ id: number; label: string }[]>(() =>
    barisAwal.map((label, i) => ({ id: i, label })),
  );
  const nextId = useRef(barisAwal.length);

  return (
    <div>
      <table className={`w-full border-collapse ${fontSize}`}>
        <thead>
          <tr style={{ backgroundColor: "#D9E1F2" }}>
            <th className={th + " min-w-[110px] text-left"}>{labelKolom}</th>
            {DAYS.map((d) => (
              <th key={d} className={th + " w-[2.4%]"}>
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
          {rows.map((r) => (
            <tr key={r.id}>
              <td className={cell + " text-left"}>
                {editLabel ? <Ed>{r.label}</Ed> : r.label}
              </td>
              {DAYS.map((d) => (
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

/**
 * Tabel zat gizi untuk Laporan Harian (Rencana Standar Porsi Menu).
 * Kolom: Waktu | Menu | Sumber Pangan | Berat (g) | URT | Energi | Protein |
 * Lemak | KH | Serat. Ada 3 baris rekap berlabel tetap (Total / Kebutuhan 30% /
 * %Pemenuhan) yang nilainya diisi manual (contentEditable).
 */
export function TabelGizi({ barisAwal = 5 }: { barisAwal?: number }) {
  const [rows, setRows] = useState<number[]>(() =>
    Array.from({ length: barisAwal }, (_, i) => i),
  );
  const nextId = useRef(barisAwal);

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
          {REKAP.map((label) => (
            <tr key={label} style={{ backgroundColor: "#F2F2F2" }}>
              <td className={th + " text-left"} colSpan={5}>
                {label}
              </td>
              {/* Energi, Protein, Lemak, KH, Serat */}
              {Array.from({ length: 5 }).map((_, c) => (
                <td key={c} className={cell + " text-center font-semibold"}>
                  <Ed block />
                </td>
              ))}
              <td className="no-print border border-black" />
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={() => {
          const id = nextId.current++;
          setRows((s) => [...s, id]);
        }}
        className="no-print mt-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
      >
        ＋ Tambah baris menu
      </button>
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
 * Satu kotak foto 1:1 (square). File dipilih lalu dikompres di sisi klien
 * (canvas, crop tengah ke 360px, JPEG 0.6) supaya ukuran base64 kecil dan aman
 * disimpan di konten_html. Kontrol pilih berkelas .no-print (tidak ikut cetak).
 */
export function KotakFoto() {
  const [src, setSrc] = useState("");

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const S = 360;
      const canvas = document.createElement("canvas");
      canvas.width = S;
      canvas.height = S;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const m = Math.min(img.width, img.height);
        const sx = (img.width - m) / 2;
        const sy = (img.height - m) / 2;
        ctx.drawImage(img, sx, sy, m, m, 0, 0, S, S);
        setSrc(canvas.toDataURL("image/jpeg", 0.6));
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded border border-black bg-gray-50">
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
