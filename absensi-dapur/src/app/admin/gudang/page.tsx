"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  KATEGORI_LABEL, KATEGORI_INFO, KATEGORI_LIST, statusStok, statusKadaluarsa,
  type Barang, type Kategori, type Mutasi, type TipeMutasi,
} from "@/lib/gudang";
import DashboardGudang from "@/components/gudang/DashboardGudang";
import KartuStok from "@/components/gudang/KartuStok";

function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
// Bulatkan artefak float (mis. 0.30000000004) ke maksimal 3 desimal, lalu tampilkan
// tanpa nol berlebih. Cocok untuk satuan pecahan seperti kg (0.5, 0.25).
const fmtNum = (n: number) => String(Math.round((n || 0) * 1000) / 1000);
const fmtRp = (n: number) => "Rp " + Math.round(n || 0).toLocaleString("id-ID");

// Angka boleh diketik pakai titik ATAU koma (0.5 / 0,5). Field angka disimpan sebagai
// STRING selama diketik agar desimal setengah-jadi ("0.", "1,") tidak "lompat" —
// ini bug klasik input type=number yang di-parse ke number tiap ketikan. Baru
// dikonversi ke number saat disimpan.
const parseNum = (s: string): number => {
  const n = parseFloat(String(s).replace(",", ".").trim());
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};
const NUM_RE = /^[0-9]*[.,]?[0-9]*$/; // izinkan kosong, "0", "0.", "0,5", "12.75"
// Terapkan penambahan/pengurangan cepat (mis. ±0.5 kg) pada nilai string, hasil bersih.
const bumpNum = (s: string, delta: number): string => fmtNum(Math.max(0, parseNum(s) + delta));

type BForm = { id: number | null; nama: string; kategori: Kategori; satuan: string; stok_min: string; harga: string; kode_akun: string; catatan: string; aktif: boolean; tanggal_kadaluarsa: string };
const emptyB: BForm = { id: null, nama: "", kategori: "bahan_kering", satuan: "pcs", stok_min: "0", harga: "0", kode_akun: "", catatan: "", aktif: true, tanggal_kadaluarsa: "" };
const KAD_BADGE: Record<string, string> = { kadaluarsa: "bg-red-500/15 text-red-300", segera: "bg-amber-500/15 text-amber-300" };
const KAD_LABEL: Record<string, string> = { kadaluarsa: "Kadaluarsa", segera: "Segera exp" };
type MForm = { barang: Barang; tipe: TipeMutasi; jumlah: string; keterangan: string; tanggal: string };

const STATUS_BADGE: Record<string, string> = {
  habis: "bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-500/25",
  menipis: "bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/25",
  aman: "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/25",
};
const STATUS_LABEL: Record<string, string> = { habis: "Habis", menipis: "Menipis", aman: "Aman" };
const STATUS_DOT: Record<string, string> = { habis: "bg-red-400", menipis: "bg-amber-400", aman: "bg-emerald-400" };

// Aksen warna per tipe mutasi — dipakai di header modal & badge tombol.
const TIPE_ACCENT: Record<TipeMutasi, { ring: string; text: string; bg: string; grad: string; label: string }> = {
  masuk: { ring: "ring-emerald-500/30", text: "text-emerald-300", bg: "bg-emerald-500/15", grad: "from-emerald-500/20", label: "Barang Masuk" },
  keluar: { ring: "ring-sky-500/30", text: "text-sky-300", bg: "bg-sky-500/15", grad: "from-sky-500/20", label: "Barang Keluar" },
  opname: { ring: "ring-amber-500/30", text: "text-amber-300", bg: "bg-amber-500/15", grad: "from-amber-500/20", label: "Stok Opname" },
};

// Ikon SVG (stroke seragam 1.75) — pengganti emoji/simbol teks agar tampil profesional.
type IconProps = { className?: string };
const Ic = (d: string) => ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={d} />
  </svg>
);
const IconPlus = Ic("M12 5v14M5 12h14");
const IconMinus = Ic("M5 12h14");
const IconClipboardCheck = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <rect x="8" y="3" width="8" height="4" rx="1" /><path d="M9 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3" /><path d="m9 14 2 2 4-4" />
  </svg>
);
const IconHistory = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" />
  </svg>
);
const IconPencil = Ic("M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z");
const IconTrash = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
  </svg>
);
const IconWarn = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4M12 17h.01" />
  </svg>
);
const IconInfo = ({ className = "h-3.5 w-3.5" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
  </svg>
);
const IconSearch = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
  </svg>
);
const IconTrend = ({ className = "h-4 w-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M23 6l-9.5 9.5-5-5L1 18" /><path d="M17 6h6v6" />
  </svg>
);

export default function GudangPage() {
  const [list, setList] = useState<Barang[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Kategori>("all");
  const [bForm, setBForm] = useState<BForm | null>(null);
  const [mForm, setMForm] = useState<MForm | null>(null);
  const [riwayat, setRiwayat] = useState<{ barang: Barang; rows: Mutasi[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [infoKat, setInfoKat] = useState<Kategori | null>(null);
  const [tab, setTab] = useState<"dashboard" | "kelola" | "kartu">("dashboard");
  const [belanja, setBelanja] = useState(false);
  const [copied, setCopied] = useState(false);
  const [q, setQ] = useState("");
  const [hanyaKad, setHanyaKad] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/gudang/barang", { cache: "no-store" });
      const d = await res.json();
      setList(d.barang || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const today = jakartaToday();
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return list.filter(
      (b) =>
        (filter === "all" || b.kategori === filter) &&
        (needle === "" || b.nama.toLowerCase().includes(needle) || b.catatan.toLowerCase().includes(needle)) &&
        (!hanyaKad || (() => { const k = statusKadaluarsa(b.tanggal_kadaluarsa, today); return k === "kadaluarsa" || k === "segera"; })()),
    );
  }, [list, filter, q, hanyaKad, today]);
  const grup = useMemo(() => {
    const m = new Map<Kategori, Barang[]>();
    for (const b of shown) { if (!m.has(b.kategori)) m.set(b.kategori, []); m.get(b.kategori)!.push(b); }
    return [...m.entries()];
  }, [shown]);
  const stat = useMemo(() => {
    let habis = 0, menipis = 0, nilai = 0;
    for (const b of list) {
      const s = statusStok(b);
      if (s === "habis") habis++; else if (s === "menipis") menipis++;
      nilai += (b.stok || 0) * (b.harga || 0);
    }
    return { total: list.length, habis, menipis, nilai };
  }, [list]);

  // Peringatan kadaluarsa (FEFO): barang kadaluarsa / akan kadaluarsa ≤ 7 hari.
  const kadaluarsa = useMemo(
    () =>
      list
        .map((b) => ({ b, k: statusKadaluarsa(b.tanggal_kadaluarsa, today) }))
        .filter((x) => x.k === "kadaluarsa" || x.k === "segera")
        .sort((a, b) => (a.k === b.k ? 0 : a.k === "kadaluarsa" ? -1 : 1)),
    [list, today],
  );

  // Daftar belanja: barang habis/menipis + saran jumlah beli (stok_min − stok)
  // + estimasi biaya (saran × harga satuan).
  const perluBeli = useMemo(
    () =>
      list
        .map((b) => {
          const saran = Math.max(0, b.stok_min - b.stok);
          return { b, s: statusStok(b), saran, biaya: saran * (b.harga || 0) };
        })
        .filter((x) => x.s !== "aman")
        .sort((a, b) => (a.s === b.s ? 0 : a.s === "habis" ? -1 : 1)),
    [list],
  );
  const totalBiaya = useMemo(() => perluBeli.reduce((s, x) => s + x.biaya, 0), [perluBeli]);
  const belanjaTeks = useMemo(() => {
    if (perluBeli.length === 0) return "";
    const tgl = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" }).format(new Date());
    const baris = perluBeli.map(({ b, s, saran, biaya }) => {
      const beli = saran > 0 ? `beli ±${fmtNum(saran)} ${b.satuan}` : `stok habis`;
      const est = biaya > 0 ? ` ≈ ${fmtRp(biaya)}` : "";
      return `• ${b.nama} — ${beli}${est} (sisa ${fmtNum(b.stok)} ${b.satuan}${s === "habis" ? ", HABIS" : ""})`;
    });
    const footer = totalBiaya > 0 ? `\nEstimasi total belanja: ${fmtRp(totalBiaya)}` : "";
    return `🛒 Daftar Belanja Gudang · ${tgl}\n\n${baris.join("\n")}\n\nTotal ${perluBeli.length} barang perlu dibeli.${footer}`;
  }, [perluBeli, totalBiaya]);

  async function salinBelanja() {
    try { await navigator.clipboard.writeText(belanjaTeks); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  }

  // Ekspor daftar barang (mengikuti filter kategori aktif) ke CSV.
  function unduhCSV() {
    const head = ["Kategori", "Nama", "Satuan", "Stok", "Stok Min", "Status", "Harga Satuan", "Nilai Persediaan", "Kadaluarsa"];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = shown.map((b) =>
      [KATEGORI_LABEL[b.kategori], b.nama, b.satuan, fmtNum(b.stok), fmtNum(b.stok_min), STATUS_LABEL[statusStok(b)], Math.round(b.harga || 0), Math.round((b.stok || 0) * (b.harga || 0)), b.tanggal_kadaluarsa || "-"]
        .map(esc)
        .join(","),
    );
    const csv = "﻿" + [head.map(esc).join(","), ...rows].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `stok-gudang-${jakartaToday()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function simpanBarang() {
    if (!bForm) return;
    if (!bForm.nama.trim()) { setMsg("Nama barang wajib diisi."); return; }
    setBusy(true); setMsg(null);
    try {
      const isEdit = bForm.id !== null;
      // Field angka disimpan sebagai string di form (agar desimal enak diketik) —
      // konversi ke number saat kirim; koma otomatis jadi titik lewat parseNum.
      const payload = { ...bForm, stok_min: parseNum(bForm.stok_min), harga: parseNum(bForm.harga) };
      const res = await fetch(isEdit ? `/api/admin/gudang/barang/${bForm.id}` : "/api/admin/gudang/barang", {
        method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(d.error || "Gagal menyimpan."); return; }
      setBForm(null); await load();
    } finally { setBusy(false); }
  }
  async function hapusBarang(b: Barang) {
    if (!confirm(`Hapus barang "${b.nama}"? Semua riwayat mutasinya ikut terhapus.`)) return;
    const res = await fetch(`/api/admin/gudang/barang/${b.id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error || "Gagal menghapus."); return; }
    await load();
  }
  async function simpanMutasi() {
    if (!mForm) return;
    const jumlah = parseNum(mForm.jumlah);
    if (mForm.tipe !== "opname" && jumlah <= 0) { setMsg("Jumlah harus lebih dari 0."); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/admin/gudang/mutasi", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barang_id: mForm.barang.id, tipe: mForm.tipe, jumlah, keterangan: mForm.keterangan, tanggal: mForm.tanggal }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(d.error || "Gagal menyimpan mutasi."); return; }
      setMForm(null); await load();
    } finally { setBusy(false); }
  }
  async function bukaRiwayat(b: Barang) {
    const res = await fetch(`/api/admin/gudang/mutasi?barang_id=${b.id}`, { cache: "no-store" });
    const d = await res.json();
    setRiwayat({ barang: b, rows: d.mutasi || [] });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Gudang</h1>
          <p className="text-sm text-slate-400">Dashboard nilai persediaan, kelola stok (masuk/keluar/opname), &amp; kartu stok bertanggal.</p>
        </div>
        {tab === "kelola" && (
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={unduhCSV} disabled={shown.length === 0} className="btn-ghost">Unduh CSV</button>
            <button onClick={() => setBelanja(true)} className="btn-ghost">
              Daftar Belanja
              {perluBeli.length > 0 && (
                <span className="ml-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-amber-300">{perluBeli.length}</span>
              )}
            </button>
            <button onClick={() => { setMsg(null); setBForm({ ...emptyB }); }} className="btn-gold">+ Tambah Barang</button>
          </div>
        )}
      </div>

      <div className="scroll-x flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-ink-900/50 p-1">
        {([["dashboard", "Dashboard"], ["kelola", "Kelola Stok"], ["kartu", "Kartu Stok"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={"shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition " + (tab === k ? "bg-gold-500/20 text-gold-300" : "text-slate-400 hover:bg-white/5")}>
            {l}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <DashboardGudang />}
      {tab === "kartu" && <KartuStok />}

      {tab === "kelola" && (
      <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="stat-card"><p className="stat-label">Total Barang</p><p className="stat-value">{stat.total}</p></div>
        <div className="stat-card"><span className="absolute inset-y-0 left-0 w-0.5 bg-amber-400" /><p className="stat-label">Menipis</p><p className="stat-value text-amber-300">{stat.menipis}</p></div>
        <div className="stat-card"><span className="absolute inset-y-0 left-0 w-0.5 bg-red-400" /><p className="stat-label">Habis</p><p className="stat-value text-red-300">{stat.habis}</p></div>
        <div className="stat-card"><span className="absolute inset-y-0 left-0 w-0.5 bg-emerald-400" /><p className="stat-label">Nilai Persediaan</p><p className="stat-value !text-lg text-emerald-300">{fmtRp(stat.nilai)}</p></div>
      </div>

      {msg && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{msg}</p>}

      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama barang…"
          className="input pl-9"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        <span className="mr-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">Kategori</span>
        {(["all", ...KATEGORI_LIST] as const).map((k) => (
          <button key={k} onClick={() => setFilter(k)}
            title={k === "all" ? "Semua kategori" : KATEGORI_INFO[k]}
            className={"rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " + (filter === k ? "border-gold-500/40 bg-gold-500/15 text-gold-300" : "border-white/10 text-slate-400 hover:border-white/20 hover:bg-white/5")}>
            {k === "all" ? "Semua" : KATEGORI_LABEL[k]}
          </button>
        ))}
        <button
          onClick={() => setHanyaKad((v) => !v)}
          title="Tampilkan hanya barang kadaluarsa / akan kadaluarsa"
          className={"inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " + (hanyaKad ? "border-red-500/40 bg-red-500/15 text-red-300" : "border-white/10 text-slate-400 hover:border-white/20 hover:bg-white/5")}
        >
          <IconWarn className="h-3.5 w-3.5" /> Kadaluarsa{kadaluarsa.length > 0 ? ` (${kadaluarsa.length})` : ""}
        </button>
      </div>

      {kadaluarsa.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
          <p className="font-semibold text-red-300">⚠️ Peringatan kadaluarsa ({kadaluarsa.length})</p>
          <p className="mt-0.5 text-red-200/80">
            {kadaluarsa.slice(0, 6).map(({ b, k }) => `${b.nama} (${k === "kadaluarsa" ? "lewat" : "≤7 hari"}: ${b.tanggal_kadaluarsa})`).join(" · ")}
            {kadaluarsa.length > 6 ? ` … +${kadaluarsa.length - 6} lagi` : ""}
          </p>
        </div>
      )}

      {loading ? (
        <div className="card p-6 text-center text-slate-400">Memuat…</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="scroll-x overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr className="border-b border-white/5">
                  <th className="px-3 py-2.5">Nama</th><th className="px-3 py-2.5">Satuan</th>
                  <th className="px-3 py-2.5">Stok</th><th className="px-3 py-2.5">Min</th>
                  <th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {grup.map(([kat, rows]) => (
                  <Fragment key={kat}>
                    <tr className="bg-white/5">
                      <td colSpan={6} className="px-3 py-1.5">
                        <button
                          type="button"
                          onClick={() => setInfoKat(infoKat === kat ? null : kat)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-gold-400 hover:underline"
                          title="Klik untuk lihat contoh isi"
                        >
                          {KATEGORI_LABEL[kat]} <IconInfo className="h-3.5 w-3.5 text-slate-500" />
                        </button>
                        {infoKat === kat && (
                          <span className="ml-2 text-[11px] font-normal text-slate-400">
                            Contoh: {KATEGORI_INFO[kat]}
                          </span>
                        )}
                      </td>
                    </tr>
                    {rows.map((b) => {
                      const st = statusStok(b);
                      return (
                        <tr key={b.id} className="border-b border-white/5">
                          <td className="px-3 py-1.5 font-medium">
                            {b.nama}{b.catatan && <span className="ml-1 text-xs text-slate-500">· {b.catatan}</span>}
                            {(() => {
                              const k = statusKadaluarsa(b.tanggal_kadaluarsa, today);
                              return k === "kadaluarsa" || k === "segera" ? (
                                <span className={"badge ml-1.5 " + KAD_BADGE[k]} title={`Kadaluarsa ${b.tanggal_kadaluarsa}`}>{KAD_LABEL[k]}</span>
                              ) : null;
                            })()}
                          </td>
                          <td className="px-3 py-1.5 text-slate-400">{b.satuan}</td>
                          <td className="px-3 py-1.5 font-semibold">{fmtNum(b.stok)}</td>
                          <td className="px-3 py-1.5 text-slate-400">{fmtNum(b.stok_min)}</td>
                          <td className="px-3 py-1.5"><span className={"badge " + STATUS_BADGE[st]}>{STATUS_LABEL[st]}</span></td>
                          <td className="px-3 py-1.5">
                            <div className="flex flex-wrap items-center justify-end gap-1">
                              <button onClick={() => setMForm({ barang: b, tipe: "masuk", jumlah: "", keterangan: "", tanggal: jakartaToday() })} title="Barang masuk" className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20"><IconPlus className="h-3.5 w-3.5" /> Masuk</button>
                              <button onClick={() => setMForm({ barang: b, tipe: "keluar", jumlah: "", keterangan: "", tanggal: jakartaToday() })} title="Barang keluar" className="inline-flex items-center gap-1 rounded-lg border border-sky-500/25 bg-sky-500/10 px-2 py-1 text-xs font-medium text-sky-300 transition-colors hover:bg-sky-500/20"><IconMinus className="h-3.5 w-3.5" /> Keluar</button>
                              <button onClick={() => setMForm({ barang: b, tipe: "opname", jumlah: fmtNum(b.stok), keterangan: "", tanggal: jakartaToday() })} title="Stok opname" className="inline-flex items-center gap-1 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/20"><IconClipboardCheck className="h-3.5 w-3.5" /> Opname</button>
                              <span className="mx-0.5 h-4 w-px bg-white/10" aria-hidden="true" />
                              <button onClick={() => bukaRiwayat(b)} title="Riwayat mutasi" className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-white/5"><IconHistory className="h-3.5 w-3.5" /> Riwayat</button>
                              <button onClick={() => setBForm({ id: b.id, nama: b.nama, kategori: b.kategori, satuan: b.satuan, stok_min: fmtNum(b.stok_min), harga: fmtNum(b.harga), kode_akun: b.kode_akun, catatan: b.catatan, aktif: b.aktif, tanggal_kadaluarsa: b.tanggal_kadaluarsa ?? "" })} title="Edit barang" aria-label="Edit barang" className="inline-flex items-center justify-center rounded-lg border border-white/10 p-1.5 text-slate-300 transition-colors hover:bg-white/5"><IconPencil className="h-3.5 w-3.5" /></button>
                              <button onClick={() => hapusBarang(b)} title="Hapus barang" aria-label="Hapus barang" className="inline-flex items-center justify-center rounded-lg border border-red-500/25 p-1.5 text-red-300 transition-colors hover:bg-red-500/15"><IconTrash className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
                {shown.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">{q.trim() || filter !== "all" ? "Tidak ada barang yang cocok." : "Belum ada barang."}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </>
      )}

      {/* Modal tambah/edit barang */}
      {bForm && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4" onClick={() => setBForm(null)}>
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">{bForm.id ? "Edit" : "Tambah"} Barang</h2>
            <div className="mt-4 space-y-3">
              <div><label className="label">Nama Barang</label><input className="input" value={bForm.nama} onChange={(e) => setBForm({ ...bForm, nama: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Kategori</label>
                  <select className="input" value={bForm.kategori} onChange={(e) => setBForm({ ...bForm, kategori: e.target.value as Kategori })}>
                    {KATEGORI_LIST.map((k) => <option key={k} value={k}>{KATEGORI_LABEL[k]}</option>)}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500">Contoh: {KATEGORI_INFO[bForm.kategori]}</p>
                </div>
                <div><label className="label">Satuan</label><input className="input" value={bForm.satuan} onChange={(e) => setBForm({ ...bForm, satuan: e.target.value })} placeholder="pcs, kg, liter, pack" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Kode Akun (opsional)</label><input className="input" value={bForm.kode_akun} onChange={(e) => setBForm({ ...bForm, kode_akun: e.target.value })} placeholder="mis. 2115" /></div>
                <div><label className="label">Harga Satuan (Rp)</label><input type="text" inputMode="decimal" className="input" value={bForm.harga} onFocus={(e) => e.target.select()} onChange={(e) => { if (NUM_RE.test(e.target.value)) setBForm({ ...bForm, harga: e.target.value }); }} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Stok Minimum (peringatan menipis)</label><input type="text" inputMode="decimal" className="input" value={bForm.stok_min} onFocus={(e) => e.target.select()} onChange={(e) => { if (NUM_RE.test(e.target.value)) setBForm({ ...bForm, stok_min: e.target.value }); }} /></div>
                <div><label className="label">Kadaluarsa (opsional)</label><input type="date" className="input" value={bForm.tanggal_kadaluarsa} onChange={(e) => setBForm({ ...bForm, tanggal_kadaluarsa: e.target.value })} /></div>
              </div>
              <div><label className="label">Catatan (opsional)</label><input className="input" value={bForm.catatan} onChange={(e) => setBForm({ ...bForm, catatan: e.target.value })} /></div>
              {bForm.id && <p className="text-xs text-slate-500">Stok saat ini diubah lewat tombol Masuk/Keluar/Opname, bukan di sini.</p>}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setBForm(null)} className="btn-ghost flex-1">Batal</button>
                <button onClick={simpanBarang} className="btn-gold flex-1" disabled={busy}>{busy ? "Menyimpan…" : "Simpan"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal mutasi (masuk/keluar/opname) */}
      {mForm && (() => {
        const acc = TIPE_ACCENT[mForm.tipe];
        const TipeIcon = mForm.tipe === "masuk" ? IconPlus : mForm.tipe === "keluar" ? IconMinus : IconClipboardCheck;
        return (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4" onClick={() => setMForm(null)}>
          <div className="card w-full max-w-md overflow-hidden p-0" onClick={(e) => e.stopPropagation()}>
            {/* Header beraksen warna sesuai tipe mutasi */}
            <div className={"flex items-start gap-3 bg-gradient-to-br to-transparent p-5 " + acc.grad}>
              <div className={"grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 ring-inset " + acc.bg + " " + acc.ring + " " + acc.text}>
                <TipeIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className={"text-lg font-bold leading-tight " + acc.text}>{acc.label}</h2>
                <p className="mt-0.5 truncate text-sm font-medium text-slate-200">{mForm.barang.nama}</p>
              </div>
            </div>
            <div className="space-y-3 px-5 pb-5 pt-1">
              {/* Pill stok sistem saat ini */}
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Stok sistem saat ini</span>
                <span className="text-sm font-bold text-slate-100">{fmtNum(mForm.barang.stok)} <span className="font-normal text-slate-400">{mForm.barang.satuan}</span></span>
              </div>
              <div><label className="label">Tanggal</label><input type="date" className="input" value={mForm.tanggal} onChange={(e) => setMForm({ ...mForm, tanggal: e.target.value })} /></div>
              <div>
                <label className="label">{mForm.tipe === "opname" ? "Jumlah fisik hasil hitung" : `Jumlah ${mForm.tipe === "masuk" ? "masuk" : "keluar"}`} ({mForm.barang.satuan})</label>
                <div className="flex items-stretch gap-1.5">
                  <button type="button" onClick={() => setMForm({ ...mForm, jumlah: bumpNum(mForm.jumlah, -1) })} className="btn-ghost shrink-0 px-2.5 text-sm" title="Kurangi 1" tabIndex={-1}>−1</button>
                  <button type="button" onClick={() => setMForm({ ...mForm, jumlah: bumpNum(mForm.jumlah, -0.5) })} className="btn-ghost shrink-0 px-2 text-xs" title="Kurangi 0,5" tabIndex={-1}>−½</button>
                  <input type="text" inputMode="decimal" autoFocus className="input flex-1 text-center text-lg font-semibold" value={mForm.jumlah} onFocus={(e) => e.target.select()} onChange={(e) => { if (NUM_RE.test(e.target.value)) setMForm({ ...mForm, jumlah: e.target.value }); }} />
                  <button type="button" onClick={() => setMForm({ ...mForm, jumlah: bumpNum(mForm.jumlah, 0.5) })} className="btn-ghost shrink-0 px-2 text-xs" title="Tambah 0,5" tabIndex={-1}>+½</button>
                  <button type="button" onClick={() => setMForm({ ...mForm, jumlah: bumpNum(mForm.jumlah, 1) })} className="btn-ghost shrink-0 px-2.5 text-sm" title="Tambah 1" tabIndex={-1}>+1</button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Boleh desimal (mis. 0,5 kg). Titik atau koma sama saja.</p>
                {mForm.tipe === "opname" && (() => {
                  const selisih = parseNum(mForm.jumlah) - mForm.barang.stok;
                  const cocok = selisih === 0;
                  const naik = selisih > 0;
                  const tone = cocok
                    ? { box: "border-slate-500/25 bg-slate-500/10 text-slate-300", label: "text-slate-400" }
                    : naik
                      ? { box: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300", label: "text-emerald-400/80" }
                      : { box: "border-red-500/30 bg-red-500/10 text-red-300", label: "text-red-400/80" };
                  return (
                    <div className={"mt-2 flex items-center gap-2.5 rounded-xl border px-3 py-2.5 " + tone.box}>
                      {cocok ? <IconClipboardCheck className="h-4 w-4 shrink-0" /> : naik ? <IconTrend className="h-4 w-4 shrink-0" /> : <IconWarn className="h-4 w-4 shrink-0" />}
                      <div className="min-w-0">
                        <p className={"text-[11px] font-medium uppercase tracking-wide " + tone.label}>Selisih vs sistem</p>
                        <p className="text-sm font-bold">
                          {cocok ? "Cocok — tidak ada selisih" : `${naik ? "+" : ""}${fmtNum(selisih)} ${mForm.barang.satuan}`}
                          {!cocok && <span className="ml-1 font-normal opacity-80">({naik ? "lebih" : "kurang"} dari sistem)</span>}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div><label className="label">Keterangan (opsional)</label><input className="input" value={mForm.keterangan} onChange={(e) => setMForm({ ...mForm, keterangan: e.target.value })} placeholder={mForm.tipe === "masuk" ? "mis. beli dari supplier X" : mForm.tipe === "keluar" ? "mis. dipakai produksi" : "mis. koreksi stok"} /></div>
              {msg && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{msg}</p>}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setMForm(null)} className="btn-ghost flex-1">Batal</button>
                <button onClick={simpanMutasi} className="btn-gold flex-1" disabled={busy}>{busy ? "Menyimpan…" : "Simpan"}</button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Modal riwayat */}
      {riwayat && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4" onClick={() => setRiwayat(null)}>
          <div className="card max-h-[85dvh] w-full max-w-lg overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Riwayat · {riwayat.barang.nama}</h2>
            {riwayat.rows.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Belum ada mutasi.</p>
            ) : (
              <table className="mt-3 w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-400"><tr className="border-b border-white/5"><th className="py-1.5">Tanggal</th><th className="py-1.5">Tipe</th><th className="py-1.5">Jumlah</th><th className="py-1.5">Sisa</th><th className="py-1.5">Ket.</th></tr></thead>
                <tbody>
                  {riwayat.rows.map((m) => (
                    <tr key={m.id} className="border-b border-white/5 align-top">
                      <td className="py-1.5 pr-2">{m.tanggal}</td>
                      <td className="py-1.5 pr-2"><span className={m.tipe === "masuk" ? "text-emerald-300" : m.tipe === "keluar" ? "text-sky-300" : "text-amber-300"}>{m.tipe}</span></td>
                      <td className="py-1.5 pr-2">{fmtNum(m.jumlah)}</td>
                      <td className="py-1.5 pr-2">{fmtNum(m.stok_sesudah)}</td>
                      <td className="py-1.5 text-xs text-slate-400">{m.keterangan}<div className="text-slate-600">{m.oleh}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="mt-4"><button onClick={() => setRiwayat(null)} className="btn-ghost w-full">Tutup</button></div>
          </div>
        </div>
      )}

      {/* Modal daftar belanja (barang habis/menipis) */}
      {belanja && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4" onClick={() => setBelanja(false)}>
          <div className="card flex max-h-[85dvh] w-full max-w-md flex-col p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Daftar Belanja</h2>
            <p className="mt-1 text-sm text-slate-400">Barang habis &amp; menipis beserta saran jumlah beli (dari stok minimum).</p>
            {perluBeli.length === 0 ? (
              <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">Semua stok aman — tidak ada yang perlu dibeli. 👍</p>
            ) : (
              <>
                <div className="scroll-x mt-4 flex-1 space-y-1.5 overflow-y-auto pr-1">
                  {perluBeli.map(({ b, s, saran, biaya }) => (
                    <div key={b.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{b.nama}</p>
                        <p className="text-[11px] text-slate-400">sisa {fmtNum(b.stok)} {b.satuan} · min {fmtNum(b.stok_min)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={"badge " + STATUS_BADGE[s]}>{STATUS_LABEL[s]}</span>
                        {saran > 0 && <p className="mt-0.5 text-[11px] font-semibold text-amber-300">beli ±{fmtNum(saran)} {b.satuan}</p>}
                        {biaya > 0 && <p className="text-[11px] text-slate-400">≈ {fmtRp(biaya)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                {totalBiaya > 0 && (
                  <div className="mt-3 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                    <span className="text-slate-400">Estimasi total belanja</span>
                    <span className="font-bold text-gold-400">{fmtRp(totalBiaya)}</span>
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  <button onClick={salinBelanja} className="btn-ghost flex-1">{copied ? "Tersalin ✓" : "Salin teks"}</button>
                  <a href={`https://wa.me/?text=${encodeURIComponent(belanjaTeks)}`} target="_blank" rel="noopener noreferrer" className="btn-gold flex-1">Bagikan ke WhatsApp</a>
                </div>
              </>
            )}
            <button onClick={() => setBelanja(false)} className="mt-2 text-xs text-slate-400 hover:text-slate-200">Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}
