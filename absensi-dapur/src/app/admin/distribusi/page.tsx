"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { MenuGrup } from "@/lib/distribusi-types";

// Kunci localStorage untuk snapshot "Cetak Uji" (pratinjau tanpa simpan).
const KEY_PREVIEW = "mbg:distribusi-preview";

interface Baris {
  penerima_id: number;
  jenis: "serdik" | "b3";
  nama: string;
  jenjang: string;
  kategori: "balita" | "bumil" | "busui" | "";
  jam_kirim: string;
  besar: number;
  kecil: number;
  b3: number;
  pj: number;
  ikut: boolean;
}
interface DistData {
  tanggal: string;
  tersimpan: boolean;
  sppg: { nama: string; kepala_sppg: string; harga_besar: number; harga_kecil: number; harga_b3: number };
  distribusi: { driver: string; menu: string; catatan: string; menu_sekolah: MenuGrup[]; menu_balita: MenuGrup[]; menu_b2: MenuGrup[] };
  baris: Baris[];
  total: { besar: number; kecil: number; balita: number; bumil: number; busui: number; b3: number; porsi: number; pagu: number };
}
// Salinan lengkap form untuk modal "Cetak Uji" (independen dari state utama).
interface UjiState {
  baris: Baris[];
  driver: string;
  menu: string;
  catatan: string;
  menuSekolah: MenuGrup[];
  menuBalita: MenuGrup[];
  menuB2: MenuGrup[];
}
interface Pengaturan {
  nama_sppg: string;
  alamat: string;
  kepala_sppg: string;
  harga_besar: number;
  harga_kecil: number;
  harga_b3: number;
  ahli_gizi: string;
  koordinator: string;
}

function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function rupiah(n: number): string {
  return "Rp " + new Intl.NumberFormat("id-ID").format(n);
}
function fmtTgl(v: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(v + "T00:00:00"));
}

export default function DistribusiPage() {
  const [tanggal, setTanggal] = useState(jakartaToday());
  const [data, setData] = useState<DistData | null>(null);
  const [baris, setBaris] = useState<Baris[]>([]);
  const [driver, setDriver] = useState("");
  const [menu, setMenu] = useState("");
  const [catatan, setCatatan] = useState("");
  const [menuSekolah, setMenuSekolah] = useState<MenuGrup[]>([]);
  const [menuBalita, setMenuBalita] = useState<MenuGrup[]>([]);
  const [menuB2, setMenuB2] = useState<MenuGrup[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState(""); // pencarian penerima di tabel
  const [filterStatus, setFilterStatus] = useState<"semua" | "ikut" | "belum" | "tanpa-jam">("semua");
  const [setel, setSetel] = useState<Pengaturan | null>(null);
  const [dirty, setDirty] = useState(false); // ada perubahan belum disimpan?
  // Modal "Cetak Uji": SALINAN mandiri dari SELURUH form (pilihan lembaga +
  // menu/driver/catatan + 3 menu organoleptik). Mengubah apa pun di sini TIDAK
  // menyentuh/menimpa data yang tersimpan — murni untuk output cetak uji/audit.
  const [uji, setUji] = useState<UjiState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/distribusi?tanggal=${tanggal}`, { cache: "no-store" });
      const d: DistData = await res.json();
      setData(d);
      setBaris(d.baris || []);
      setDriver(d.distribusi?.driver || "");
      setMenu(d.distribusi?.menu || "");
      setCatatan(d.distribusi?.catatan || "");
      setMenuSekolah(d.distribusi?.menu_sekolah || []);
      setMenuBalita(d.distribusi?.menu_balita || []);
      setMenuB2(d.distribusi?.menu_b2 || []);
      setDirty(false);
    } finally {
      setLoading(false);
    }
  }, [tanggal]);

  useEffect(() => {
    load();
  }, [load]);

  // Peringatkan bila menutup/refresh tab dengan perubahan belum disimpan.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  // Pintasan Ctrl/Cmd+S untuk simpan cepat. Ref selalu memegang handler terbaru
  // agar tidak menyimpan snapshot state basi (stale closure).
  const simpanShortcutRef = useRef<() => void>(() => {});
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        simpanShortcutRef.current();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Ganti tanggal: konfirmasi dulu bila ada perubahan belum disimpan.
  function gantiTanggal(t: string) {
    if (dirty && !confirm("Ada perubahan belum disimpan. Pindah tanggal & buang perubahan?")) return;
    setTanggal(t);
  }

  function upd(id: number, patch: Partial<Baris>) {
    setBaris((prev) => prev.map((b) => (b.penerima_id === id ? { ...b, ...patch } : b)));
    setDirty(true);
  }
  function pilihSemua(v: boolean) {
    setBaris((prev) => prev.map((b) => ({ ...b, ikut: v })));
    setDirty(true);
  }
  function pilihGrup(jenjang: string, v: boolean) {
    setBaris((prev) => prev.map((b) => (b.jenjang === jenjang ? { ...b, ikut: v } : b)));
    setDirty(true);
  }
  const jmlIkut = baris.filter((b) => b.ikut).length;
  const semuaIkut = baris.length > 0 && jmlIkut === baris.length;
  const sebagianIkut = jmlIkut > 0 && jmlIkut < baris.length;
  const qq = q.trim().toLowerCase(); // query pencarian ternormalisasi
  const filterAktif = qq !== "" || filterStatus !== "semua";
  // Predikat tampil baris: gabungan pencarian nama + filter status.
  const lolos = useCallback(
    (b: Baris) => {
      if (qq && !b.nama.toLowerCase().includes(qq)) return false;
      if (filterStatus === "ikut" && !b.ikut) return false;
      if (filterStatus === "belum" && b.ikut) return false;
      if (filterStatus === "tanpa-jam" && (b.jam_kirim || "").trim() !== "") return false;
      return true;
    },
    [qq, filterStatus],
  );
  // Jaga ref pintasan Ctrl+S selalu menunjuk ke keadaan terbaru.
  simpanShortcutRef.current = () => { if (dirty && !saving) simpan(); };

  const harga = data?.sppg ?? { harga_besar: 10000, harga_kecil: 8000, harga_b3: 8000, nama: "", kepala_sppg: "" };
  const total = useMemo(() => {
    let besar = 0, kecil = 0, balita = 0, bumil = 0, busui = 0;
    for (const b of baris) {
      if (!b.ikut) continue;
      // PJ (penanggung jawab) masuk hitungan porsi besar (harga besar).
      besar += (b.besar || 0) + (b.pj || 0);
      kecil += b.kecil || 0;
      if (b.jenis === "b3") {
        // Balita / Bumil / Busui dipisah agar tidak tercampur.
        if (b.kategori === "balita") balita += b.b3 || 0;
        else if (b.kategori === "busui") busui += b.b3 || 0;
        else bumil += b.b3 || 0;
      }
    }
    const b3 = balita + bumil + busui;
    return {
      besar, kecil, balita, bumil, busui, b3,
      porsi: besar + kecil + b3,
      pagu: besar * harga.harga_besar + kecil * harga.harga_kecil + b3 * harga.harga_b3,
    };
  }, [baris, harga]);

  // Ekspor daftar distribusi (per penerima) ke CSV untuk arsip/rekap.
  function unduhCSV() {
    if (baris.length === 0) return;
    const head = ["Nama", "Jenis", "Jenjang", "Kategori", "Jam Kirim", "Besar", "Kecil", "B3", "PJ", "Ikut"];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = baris.map((b) =>
      [b.nama, b.jenis, b.jenjang, b.kategori || "-", b.jam_kirim || "-", b.besar || 0, b.kecil || 0, b.b3 || 0, b.pj || 0, b.ikut ? "ya" : "tidak"]
        .map(esc)
        .join(","),
    );
    const csv = "﻿" + [head.map(esc).join(","), ...rows].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `distribusi-${tanggal || "hari-ini"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Salin ringkasan distribusi hari ini ke clipboard (format siap WhatsApp).
  async function salinRingkasan() {
    const komp = papan.komposisi.map((s) => `${s.label} ${s.val}`).join(", ");
    const jadwalLines = papan.jadwal
      .map((s) => `• ${s.jam} — ${s.lembaga} lembaga, ${s.porsi} porsi`)
      .join("\n");
    const teks =
      `*DISTRIBUSI MBG*\n${fmtTgl(tanggal)}\n` +
      (menu ? `Menu: ${menu}\n` : "") +
      (driver ? `Driver: ${driver}\n` : "") +
      `\nLembaga terpilih: ${papan.lembagaIkut}/${papan.lembagaTotal}\n` +
      `Total porsi: ${total.porsi}${komp ? ` (${komp})` : ""}\n` +
      `Estimasi pagu: ${rupiah(total.pagu)}\n` +
      (jadwalLines ? `\n*Jadwal kirim:*\n${jadwalLines}\n` : "") +
      (catatan ? `\nCatatan: ${catatan}` : "");
    try {
      await navigator.clipboard.writeText(teks.trim());
      setMsg("✓ Ringkasan distribusi disalin — siap tempel ke WhatsApp.");
    } catch {
      setMsg("Tidak bisa menyalin otomatis (izin clipboard diblokir). Coba lewat HTTPS.");
    }
  }

  async function simpan() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/distribusi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanggal, driver, menu, catatan,
          menu_sekolah: menuSekolah, menu_balita: menuBalita, menu_b2: menuB2,
          items: baris.map((b) => ({
            penerima_id: b.penerima_id, besar: b.besar, kecil: b.kecil, b3: b.b3, ikut: b.ikut,
          })),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(d.error || "Gagal menyimpan."); return; }
      setMsg("✓ Distribusi tersimpan. Dokumen siap dicetak.");
      await load();
    } catch { setMsg("Tidak dapat terhubung ke server."); }
    finally { setSaving(false); }
  }

  async function muatMaster() {
    if (!confirm("Muat ulang porsi Besar/Kecil/B3 semua penerima dari Data Penerima?\nPorsi hari ini akan diganti dengan angka master (balita/bumil/busui ikut). Klik Simpan setelahnya.")) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/distribusi?tanggal=${tanggal}&master=1`, { cache: "no-store" });
      const d: DistData = await res.json();
      setBaris(d.baris || []);
      setDirty(true);
      setMsg("↻ Porsi dimuat dari Data Penerima. Periksa lalu klik Simpan.");
    } finally {
      setLoading(false);
    }
  }

  async function bukaSetel() {
    const res = await fetch("/api/admin/distribusi/pengaturan", { cache: "no-store" });
    const d = await res.json();
    setSetel(d.pengaturan);
  }
  async function simpanSetel() {
    if (!setel) return;
    await fetch("/api/admin/distribusi/pengaturan", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(setel),
    });
    setSetel(null);
    await load();
  }

  const grup = useMemo(() => {
    const m = new Map<string, Baris[]>();
    for (const b of baris) {
      const k = b.jenjang || "Lainnya";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(b);
    }
    return [...m.entries()];
  }, [baris]);

  // Total porsi satu baris (besar + PJ + kecil + b3) — dipakai papan & jadwal.
  const porsiOf = useCallback(
    (b: Baris) => (b.besar || 0) + (b.pj || 0) + (b.kecil || 0) + (b.b3 || 0),
    [],
  );

  // ── Papan Distribusi: cakupan lembaga, komposisi porsi, & jadwal kirim ──
  const papan = useMemo(() => {
    const ikut = baris.filter((b) => b.ikut);
    const lembagaIkut = ikut.length;
    const lembagaTotal = baris.length;
    const coverage = lembagaTotal ? Math.round((lembagaIkut / lembagaTotal) * 100) : 0;

    // Segmen proporsional komposisi porsi (hanya yang > 0).
    const komposisi = [
      { key: "besar", label: "Besar (+PJ)", val: total.besar, cls: "bg-emerald-400", dot: "text-emerald-300" },
      { key: "kecil", label: "Kecil", val: total.kecil, cls: "bg-sky-400", dot: "text-sky-300" },
      { key: "balita", label: "Balita", val: total.balita, cls: "bg-amber-400", dot: "text-amber-300" },
      { key: "bumil", label: "Bumil", val: total.bumil, cls: "bg-orange-400", dot: "text-orange-300" },
      { key: "busui", label: "Busui", val: total.busui, cls: "bg-pink-400", dot: "text-pink-300" },
    ].filter((s) => s.val > 0);

    // Jadwal pengiriman: kelompokkan lembaga terpilih per jam kirim.
    const slotMap = new Map<string, { nama: string; porsi: number }[]>();
    for (const b of ikut) {
      const jam = (b.jam_kirim || "").trim() || "Tanpa jam";
      if (!slotMap.has(jam)) slotMap.set(jam, []);
      slotMap.get(jam)!.push({ nama: b.nama, porsi: porsiOf(b) });
    }
    const jadwal = [...slotMap.entries()]
      .map(([jam, list]) => ({
        jam,
        lembaga: list.length,
        porsi: list.reduce((a, c) => a + c.porsi, 0),
      }))
      .sort((a, b) => {
        if (a.jam === "Tanpa jam") return 1; // slot tanpa jam selalu di akhir
        if (b.jam === "Tanpa jam") return -1;
        return a.jam.localeCompare(b.jam);
      });
    const maxSlotPorsi = Math.max(1, ...jadwal.map((s) => s.porsi));

    return { lembagaIkut, lembagaTotal, coverage, komposisi, jadwal, maxSlotPorsi };
  }, [baris, total, porsiOf]);

  // Cakupan per jenjang (progress terpilih/total + porsi).
  const cakupan = useMemo(
    () =>
      grup.map(([jenjang, rows]) => {
        const dipilih = rows.filter((r) => r.ikut);
        const porsi = dipilih.reduce((a, b) => a + porsiOf(b), 0);
        return {
          jenjang,
          terpilih: dipilih.length,
          total: rows.length,
          porsi,
          pct: rows.length ? Math.round((dipilih.length / rows.length) * 100) : 0,
        };
      }),
    [grup, porsiOf],
  );

  // Variabel gauge cakupan (emerald → cyan) untuk cincin di kartu hero.
  const coverageVar = { "--val": papan.coverage, "--c1": "#34d399", "--c2": "#22d3ee" } as CSSProperties;

  // Peringatan pra-cetak: temukan masalah umum sebelum dokumen dicetak.
  const peringatan = useMemo(() => {
    const out: string[] = [];
    const ikut = baris.filter((b) => b.ikut);
    if (ikut.length === 0) {
      out.push("Belum ada lembaga terpilih untuk didistribusikan.");
    } else {
      const tanpaJam = ikut.filter((b) => !(b.jam_kirim || "").trim()).length;
      const nolPorsi = ikut.filter((b) => porsiOf(b) === 0).length;
      if (tanpaJam > 0) out.push(`${tanpaJam} lembaga terpilih belum punya jam kirim.`);
      if (nolPorsi > 0) out.push(`${nolPorsi} lembaga terpilih porsinya masih 0.`);
    }
    if (!menu.trim()) out.push("Menu hari ini belum diisi.");
    if (!driver.trim()) out.push("Driver belum diisi.");
    return out;
  }, [baris, menu, driver, porsiOf]);

  // Timeline pengiriman: petakan slot jam ke sumbu waktu horizontal.
  const timeline = useMemo(() => {
    const toMin = (jam: string): number | null => {
      const m = /^(\d{1,2}):(\d{2})/.exec(jam);
      return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
    };
    const noTime = papan.jadwal.filter((s) => toMin(s.jam) === null);
    const timed = papan.jadwal
      .map((s) => ({ ...s, min: toMin(s.jam) }))
      .filter((s): s is typeof s & { min: number } => s.min !== null);
    if (timed.length === 0) return { pts: [], noTime, ticks: [] as { label: string; pct: number }[] };

    let lo = Math.floor((Math.min(...timed.map((p) => p.min)) - 30) / 60) * 60;
    let hi = Math.ceil((Math.max(...timed.map((p) => p.min)) + 30) / 60) * 60;
    if (hi - lo < 120) hi = lo + 120; // rentang minimal 2 jam agar tidak sempit
    const span = hi - lo || 1;
    const place = (min: number) => 4 + ((min - lo) / span) * 92; // sisipkan 4%..96%

    const ticks: { label: string; pct: number }[] = [];
    for (let t = lo; t <= hi; t += 60) {
      ticks.push({ label: String(Math.floor(t / 60)).padStart(2, "0") + ":00", pct: place(t) });
    }
    const maxP = Math.max(1, ...timed.map((p) => p.porsi));
    const pts = timed.map((p) => ({ ...p, pct: place(p.min), size: 20 + (p.porsi / maxP) * 26 }));
    return { pts, noTime, ticks };
  }, [papan.jadwal]);

  // Kelompok per jenjang untuk daftar centang di modal "Cetak Uji".
  const grupUji = useMemo(() => {
    if (!uji) return [];
    const m = new Map<string, Baris[]>();
    for (const b of uji.baris) {
      const k = b.jenjang || "Lainnya";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(b);
    }
    return [...m.entries()];
  }, [uji]);

  const cetak = (dok: string, urut: "dokumen" | "lembaga" = "dokumen") =>
    window.open(
      `/cetak/distribusi?tanggal=${tanggal}&dok=${dok}&urut=${urut}`,
      "_blank",
    );

  // ── Modal "Cetak Uji" ──────────────────────────────────────────────────
  // Buka modal dgn SALINAN independen dari SELURUH form saat ini (pilihan
  // lembaga + porsi + menu/driver/catatan + 3 menu organoleptik). Mengubah apa
  // pun di modal TIDAK mengubah tabel/form/data yang tersimpan.
  function bukaUji() {
    setUji({
      baris: baris.map((b) => ({ ...b })),
      driver,
      menu,
      catatan,
      menuSekolah: menuSekolah.map((g) => ({ ...g, items: [...g.items] })),
      menuBalita: menuBalita.map((g) => ({ ...g, items: [...g.items] })),
      menuB2: menuB2.map((g) => ({ ...g, items: [...g.items] })),
    });
  }
  function updUji(id: number, patch: Partial<Baris>) {
    setUji((prev) => (prev ? { ...prev, baris: prev.baris.map((b) => (b.penerima_id === id ? { ...b, ...patch } : b)) } : prev));
  }
  function pilihSemuaUji(v: boolean) {
    setUji((prev) => (prev ? { ...prev, baris: prev.baris.map((b) => ({ ...b, ikut: v })) } : prev));
  }
  function pilihGrupUji(jenjang: string, v: boolean) {
    setUji((prev) => (prev ? { ...prev, baris: prev.baris.map((b) => (b.jenjang === jenjang ? { ...b, ikut: v } : b)) } : prev));
  }
  function setUjiField<K extends keyof UjiState>(key: K, val: UjiState[K]) {
    setUji((prev) => (prev ? { ...prev, [key]: val } : prev));
  }

  // Cetak UJI (tanpa simpan): pakai SALINAN mandiri di modal sebagai snapshot
  // sementara — tidak menyentuh/menimpa data distribusi tersimpan.
  const cetakUji = (dok: string, urut: "dokumen" | "lembaga" = "dokumen") => {
    if (!uji || uji.baris.every((b) => !b.ikut)) {
      alert("Pilih minimal satu lembaga sebelum cetak uji.");
      return;
    }
    const snapshot = {
      tanggal,
      baris: uji.baris,
      distribusi: {
        driver: uji.driver, menu: uji.menu, catatan: uji.catatan,
        menu_sekolah: uji.menuSekolah, menu_balita: uji.menuBalita, menu_b2: uji.menuB2,
      },
    };
    try {
      localStorage.setItem(KEY_PREVIEW, JSON.stringify(snapshot));
    } catch {
      alert("Tidak bisa menyiapkan pratinjau (penyimpanan browser penuh/diblokir).");
      return;
    }
    window.open(
      `/cetak/distribusi?tanggal=${tanggal}&dok=${dok}&urut=${urut}&preview=1`,
      "_blank",
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Distribusi Harian</h1>
          <p className="text-sm text-slate-400">{fmtTgl(tanggal)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" className="input" value={tanggal} onChange={(e) => gantiTanggal(e.target.value)} />
          <Link href="/admin/distribusi/penerima" className="btn-ghost">Data Penerima</Link>
          <button onClick={muatMaster} className="btn-ghost">↻ Muat dari Master</button>
          <button onClick={bukaSetel} className="btn-ghost">Harga & Kepala</button>
        </div>
      </div>

      {/* ── Papan Distribusi: cakupan, komposisi porsi & jadwal kirim ── */}
      <div className="dash-stagger space-y-4">
        {/* Baris hero: cakupan (gauge) · komposisi porsi · estimasi pagu */}
        <div className="grid gap-4 lg:grid-cols-[1.05fr_1.45fr_1fr]">
          {/* Cakupan lembaga — cincin gauge pendar */}
          <div className="card grid-glow ring-glow relative overflow-hidden p-5">
            <div className="flex items-center gap-2">
              <span className="live-dot inline-block h-2 w-2 rounded-full bg-emerald-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cakupan Distribusi</p>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <div className="gauge h-28 w-28 shrink-0" style={coverageVar}>
                <div className="gauge-inner">
                  <p className="text-2xl font-bold neon-cyan">{papan.coverage}%</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">tercakup</p>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-3xl font-bold leading-none text-emerald-300">
                  {papan.lembagaIkut}
                  <span className="text-lg text-slate-500">/{papan.lembagaTotal}</span>
                </p>
                <p className="mt-0.5 text-sm text-slate-400">lembaga terpilih</p>
                <p className="mt-2 text-xs text-slate-500">
                  {papan.lembagaTotal - papan.lembagaIkut} lembaga belum masuk pilihan
                </p>
              </div>
            </div>
          </div>

          {/* Komposisi porsi — segmen proporsional pendar */}
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Komposisi Porsi</p>
            <p className="mt-1 text-3xl font-bold leading-none text-slate-100">
              {total.porsi} <span className="text-sm font-normal text-slate-400">porsi total</span>
            </p>
            <div className="bar-neon mt-4 flex h-5 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
              {papan.komposisi.map((s) => (
                <div
                  key={s.key}
                  className={"bar-grow h-full " + s.cls}
                  style={{ width: (s.val / Math.max(1, total.porsi)) * 100 + "%" }}
                  title={s.label + ": " + s.val}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {papan.komposisi.map((s) => (
                <div key={s.key} className="flex items-center gap-1.5 text-xs">
                  <span className={"inline-block h-2.5 w-2.5 rounded-sm " + s.cls} />
                  <span className="text-slate-400">{s.label}</span>
                  <span className={"font-semibold tabular-nums " + s.dot}>{s.val}</span>
                </div>
              ))}
              {papan.komposisi.length === 0 && <span className="text-xs text-slate-500">Belum ada porsi terpilih.</span>}
            </div>
          </div>

          {/* Estimasi pagu + ringkas menu/driver — kartu kilau */}
          <div className="card sheen grid-glow relative flex flex-col justify-between overflow-hidden p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Estimasi Pagu</p>
              <p className="mt-1 text-3xl font-bold leading-none neon-gold">{rupiah(total.pagu)}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-white/5 px-2.5 py-2 ring-1 ring-white/5">
                <p className="text-slate-500">Menu</p>
                <p className="truncate font-semibold text-slate-200" title={menu || "—"}>{menu || "—"}</p>
              </div>
              <div className="rounded-lg bg-white/5 px-2.5 py-2 ring-1 ring-white/5">
                <p className="text-slate-500">Driver</p>
                <p className="truncate font-semibold text-slate-200" title={driver || "—"}>{driver || "—"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Jadwal pengiriman + cakupan per jenjang */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Jadwal pengiriman — timeline sumbu waktu */}
          <div className="card grid-glow relative overflow-hidden p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-200">🕒 Jadwal Pengiriman</p>
              <span className="text-xs text-slate-500">{papan.jadwal.length} slot jam</span>
            </div>

            {timeline.pts.length > 0 ? (
              <div className="relative mx-1 mt-10 mb-4 h-28">
                {/* Garis sumbu */}
                <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />
                {/* Penanda jam */}
                {timeline.ticks.map((t) => (
                  <div key={t.label} className="absolute top-1/2 -translate-x-1/2" style={{ left: t.pct + "%" }}>
                    <div className="mx-auto h-2 w-px bg-white/15" />
                    <span className="mt-1 block text-[10px] tabular-nums text-slate-500">{t.label}</span>
                  </div>
                ))}
                {/* Lolipop tiap slot: ukuran bubble ∝ porsi */}
                {timeline.pts.map((p) => (
                  <div
                    key={p.jam}
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: p.pct + "%" }}
                  >
                    <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold tabular-nums text-sky-300">
                      {p.jam}
                    </span>
                    <div
                      className="bar-neon grid place-items-center rounded-full bg-gradient-to-br from-sky-300 to-sky-500 ring-2 ring-sky-300/40 transition-transform hover:scale-110"
                      style={{ width: p.size, height: p.size }}
                      title={`${p.jam} · ${p.lembaga} lembaga · ${p.porsi} porsi`}
                    >
                      <span className="text-[10px] font-bold text-sky-950">{p.lembaga}</span>
                    </div>
                    <span className="absolute top-full left-1/2 mt-1 -translate-x-1/2 whitespace-nowrap text-[10px] tabular-nums text-slate-400">
                      {p.porsi} porsi
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-xs text-slate-500">
                {papan.jadwal.length === 0 ? "Belum ada lembaga terpilih untuk dijadwalkan." : "Lembaga terpilih belum punya jam kirim."}
              </p>
            )}

            {/* Slot tanpa jam kirim */}
            {timeline.noTime.length > 0 && (
              <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                <span className="text-[11px] font-semibold text-slate-400">Tanpa jam:</span>
                {timeline.noTime.map((s) => (
                  <span key={s.jam} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 ring-1 ring-white/10">
                    {s.lembaga} lembaga · {s.porsi} porsi
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Cakupan per jenjang */}
          <div className="card p-5">
            <p className="text-sm font-semibold text-slate-200">📊 Cakupan per Jenjang</p>
            <div className="mt-3 space-y-2.5">
              {cakupan.map((c) => (
                <div key={c.jenjang}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">{c.jenjang}</span>
                    <span className="text-slate-400">
                      {c.terpilih}/{c.total} · <span className="font-semibold tabular-nums text-amber-300">{c.porsi} porsi</span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={"bar-grow h-full rounded-full " + (c.pct === 100 ? "bg-emerald-400" : c.pct > 0 ? "bg-amber-400" : "bg-white/10")}
                      style={{ width: c.pct + "%" }}
                    />
                  </div>
                </div>
              ))}
              {cakupan.length === 0 && <p className="py-4 text-center text-xs text-slate-500">Tidak ada data penerima.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Info hari itu */}
      <div className="card grid gap-3 p-4 sm:grid-cols-3">
        <div>
          <label className="label">Menu Hari Ini</label>
          <input className="input" value={menu} onChange={(e) => { setMenu(e.target.value); setDirty(true); }} placeholder="mis. Nasi, Ayam, Sayur, Buah" />
        </div>
        <div>
          <label className="label">Driver</label>
          <input className="input" value={driver} onChange={(e) => { setDriver(e.target.value); setDirty(true); }} />
        </div>
        <div>
          <label className="label">Catatan</label>
          <input className="input" value={catatan} onChange={(e) => { setCatatan(e.target.value); setDirty(true); }} />
        </div>
      </div>

      {/* Menu terstruktur untuk form Uji Organoleptik (bisa diisi & diganti tiap hari) */}
      <div className="grid gap-3 lg:grid-cols-3">
        <MenuEditor judul="Menu Sekolah — Uji Organoleptik" warna="text-sky-300" value={menuSekolah} onChange={(v) => { setMenuSekolah(v); setDirty(true); }} />
        <MenuEditor judul="Menu Balita — Uji Organoleptik" warna="text-amber-300" value={menuBalita} onChange={(v) => { setMenuBalita(v); setDirty(true); }} />
        <MenuEditor judul="Menu B2 (Bumil & Busui) — Uji Organoleptik" warna="text-pink-300" value={menuB2} onChange={(v) => { setMenuB2(v); setDirty(true); }} />
      </div>

      {msg && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{msg}</p>
      )}

      {/* Panel peringatan pra-cetak: cek kelengkapan sebelum dokumen dicetak */}
      {!loading && peringatan.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-200">
            <span aria-hidden>⚠️</span> Periksa sebelum cetak
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-amber-100/90">
            {peringatan.map((p) => (
              <li key={p} className="flex items-start gap-1.5">
                <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-amber-300" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Checklist pilih penerima manfaat (PM) + pencarian */}
      {!loading && baris.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-gold-500"
              ref={(el) => { if (el) el.indeterminate = sebagianIkut; }}
              checked={semuaIkut}
              onChange={(e) => pilihSemua(e.target.checked)}
            />
            <span className="font-semibold">Pilih Semua PM</span>
            <span className="text-slate-400">({jmlIkut}/{baris.length} penerima dipilih)</span>
          </label>
          <div className="flex flex-wrap items-center gap-1">
            {([["semua", "Semua"], ["ikut", "Terpilih"], ["belum", "Belum"], ["tanpa-jam", "Tanpa jam"]] as const).map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => setFilterStatus(val)}
                className={"rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition " + (filterStatus === val ? "bg-gold-500/20 text-gold-200 ring-gold-500/40" : "bg-white/5 text-slate-400 ring-white/10 hover:text-white")}
              >
                {lbl}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔎</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari lembaga…"
              className="input w-56 py-2 pl-9"
              aria-label="Cari penerima"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1 text-slate-500 hover:text-white"
                aria-label="Bersihkan pencarian"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabel penerima */}
      {loading ? (
        <div className="card p-6 text-center text-slate-400">Memuat…</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="scroll-x overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr className="border-b border-white/5">
                  <th className="px-3 py-2.5">Masuk</th>
                  <th className="px-3 py-2.5">Penerima</th>
                  <th className="px-3 py-2.5">Jam</th>
                  <th className="px-3 py-2.5 w-20">Besar</th>
                  <th className="px-3 py-2.5 w-20">Kecil</th>
                  <th className="px-3 py-2.5 w-20">B3</th>
                </tr>
              </thead>
              <tbody>
                {grup.map(([jenjang, allRows]) => {
                  // Filter tampilan per nama (pencarian) — pilih-grup & hitung tetap
                  // memakai grup penuh agar toggle & rasio konsisten.
                  const rows = filterAktif ? allRows.filter(lolos) : allRows;
                  if (rows.length === 0) return null;
                  return (
                  <Fragment key={jenjang}>
                    <tr className="bg-white/5">
                      <td className="px-3 py-1.5">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-gold-500"
                          ref={(el) => { if (el) el.indeterminate = allRows.some((r) => r.ikut) && !allRows.every((r) => r.ikut); }}
                          checked={allRows.every((r) => r.ikut)}
                          onChange={(e) => pilihGrup(jenjang, e.target.checked)}
                        />
                      </td>
                      <td colSpan={5} className="px-3 py-1.5 text-xs font-semibold text-gold-400">
                        {jenjang} <span className="font-normal text-slate-500">({allRows.filter((r) => r.ikut).length}/{allRows.length})</span>
                      </td>
                    </tr>
                    {rows.map((b) => (
                      <tr key={b.penerima_id} className={"border-b border-white/5 " + (b.ikut ? "" : "opacity-40")}>
                        <td className="px-3 py-1.5">
                          <input type="checkbox" className="h-4 w-4 accent-gold-500" checked={b.ikut}
                            onChange={(e) => upd(b.penerima_id, { ikut: e.target.checked })} />
                        </td>
                        <td className="px-3 py-1.5 font-medium">{b.nama}</td>
                        <td className="px-3 py-1.5 text-slate-400">{b.jam_kirim}</td>
                        <td className="px-3 py-1.5">
                          {b.jenis === "serdik" ? (
                            <input type="number" min={0} className="input px-2 py-1" value={b.besar}
                              onChange={(e) => upd(b.penerima_id, { besar: Math.max(0, parseInt(e.target.value) || 0) })} />
                          ) : "—"}
                        </td>
                        <td className="px-3 py-1.5">
                          {b.jenis === "serdik" ? (
                            <input type="number" min={0} className="input px-2 py-1" value={b.kecil}
                              onChange={(e) => upd(b.penerima_id, { kecil: Math.max(0, parseInt(e.target.value) || 0) })} />
                          ) : "—"}
                        </td>
                        <td className="px-3 py-1.5">
                          {b.jenis === "b3" ? (
                            <input type="number" min={0} className="input px-2 py-1" value={b.b3}
                              onChange={(e) => upd(b.penerima_id, { b3: Math.max(0, parseInt(e.target.value) || 0) })} />
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                  );
                })}
                {filterAktif && grup.every(([, r]) => !r.some(lolos)) && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">
                      Tidak ada penerima yang cocok dengan filter{q ? ` “${q}”` : ""}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Aksi */}
      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-ink-900/90 p-3 backdrop-blur">
        <button onClick={simpan} className="btn-gold" disabled={saving}>
          {saving ? "Menyimpan…" : "Simpan Distribusi"}
        </button>
        {dirty && <span className="text-xs font-semibold text-amber-300">● Ada perubahan belum disimpan</span>}
        <button
          onClick={salinRingkasan}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/20 disabled:opacity-40"
          disabled={jmlIkut === 0}
          title="Salin ringkasan distribusi ke clipboard, siap tempel ke WhatsApp"
        >
          📋 Salin Ringkasan
        </button>
        <span className="mx-1 text-xs text-slate-500">Cetak dokumen:</span>
        <button onClick={unduhCSV} className="btn-ghost text-sm" disabled={baris.length === 0}>Unduh CSV</button>
        <button onClick={() => cetak("bast")} className="btn-ghost text-sm">BAST</button>
        <button onClick={() => cetak("surat-jalan")} className="btn-ghost text-sm">Surat Jalan</button>
        <button onClick={() => cetak("organoleptik")} className="btn-ghost text-sm">Organoleptik</button>
        <button onClick={() => cetak("semua", "dokumen")} className="btn-ghost text-sm" title="Semua dokumen dikelompokkan per jenis: semua BAST, lalu semua Surat Jalan, lalu semua Organoleptik">Semua (per dokumen)</button>
        <button onClick={() => cetak("semua", "lembaga")} className="btn-ghost text-sm" title="Per lembaga berurutan: BAST → Surat Jalan → Organoleptik untuk tiap lembaga, urut nama">Semua (per lembaga)</button>
        {!data?.tersimpan && (
          <span className="text-xs text-amber-300">Simpan dulu sebelum cetak agar angka terbaru ikut.</span>
        )}

        {/* Cetak UJI — dibuka di modal terpisah, tidak menyentuh pilihan asli */}
        <div className="mt-1 flex w-full flex-wrap items-center gap-2 border-t border-white/10 pt-2.5">
          <button onClick={bukaUji} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-400/10 px-3 py-1.5 text-sm font-semibold text-sky-200 hover:bg-sky-400/20">
            🧪 Cetak Uji / Audit…
          </button>
          <span className="text-xs text-slate-400">
            Pilih lembaga di jendela terpisah lalu cetak — <b>tanpa menyimpan</b> &amp; tanpa mengubah pilihan/data yang sudah tersimpan.
          </span>
        </div>
      </div>

      {/* Modal pengaturan harga & kepala */}
      {setel && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4" onClick={() => setSetel(null)}>
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Harga Pagu & Identitas</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Nama SPPG</label>
                <input className="input" value={setel.nama_sppg} onChange={(e) => setSetel({ ...setel, nama_sppg: e.target.value })} />
              </div>
              <div>
                <label className="label">Alamat SPPG (untuk kop dokumen &amp; laporan)</label>
                <input className="input" value={setel.alamat} onChange={(e) => setSetel({ ...setel, alamat: e.target.value })} placeholder="mis. Jl. Raya … Desa … Kec. … Kab. …" />
              </div>
              <div>
                <label className="label">Kepala SPPG</label>
                <input className="input" value={setel.kepala_sppg} onChange={(e) => setSetel({ ...setel, kepala_sppg: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Ahli Gizi Dapur</label>
                  <input className="input" value={setel.ahli_gizi} onChange={(e) => setSetel({ ...setel, ahli_gizi: e.target.value })} />
                </div>
                <div>
                  <label className="label">Koordinator Lapangan</label>
                  <input className="input" value={setel.koordinator} onChange={(e) => setSetel({ ...setel, koordinator: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="label">Besar</label><input type="number" className="input" value={setel.harga_besar} onChange={(e) => setSetel({ ...setel, harga_besar: parseInt(e.target.value) || 0 })} /></div>
                <div><label className="label">Kecil</label><input type="number" className="input" value={setel.harga_kecil} onChange={(e) => setSetel({ ...setel, harga_kecil: parseInt(e.target.value) || 0 })} /></div>
                <div><label className="label">B3</label><input type="number" className="input" value={setel.harga_b3} onChange={(e) => setSetel({ ...setel, harga_b3: parseInt(e.target.value) || 0 })} /></div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setSetel(null)} className="btn-ghost flex-1">Batal</button>
                <button onClick={simpanSetel} className="btn-gold flex-1">Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal "Cetak Uji / Audit" — pilihan lembaga TERPISAH & mandiri.
          Mencentang di sini tidak mengubah tabel/data yang tersimpan. */}
      {uji && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4" onClick={() => setUji(null)}>
          <div className="card flex max-h-[90vh] w-full max-w-4xl flex-col p-0" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-sky-200">🧪 Cetak Uji / Audit</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Atur menu/driver/catatan &amp; centang lembaga, lalu pilih dokumennya. Semua di sini <b>salinan mandiri</b> — <b>hanya untuk output cetak</b>, tidak menyimpan &amp; tidak mengubah data/pilihan yang sudah tersimpan.
                </p>
              </div>
              <button onClick={() => setUji(null)} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Tutup">✕</button>
            </div>

            {/* Toolbar pilih */}
            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-5 py-2.5">
              <span className="text-xs font-semibold text-slate-300">
                Terpilih: {uji.baris.filter((b) => b.ikut).length}/{uji.baris.length}
              </span>
              <span className="mx-1 h-4 w-px bg-white/10" />
              <button onClick={() => pilihSemuaUji(true)} className="btn-ghost text-xs">Pilih semua</button>
              <button onClick={() => pilihSemuaUji(false)} className="btn-ghost text-xs">Kosongkan</button>
            </div>

            {/* Isi form: menu/driver/catatan + menu organoleptik + daftar lembaga.
                Semua ini salinan mandiri — diedit di sini tanpa mengubah data asli. */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
              {/* Info hari itu (salinan uji) */}
              <div className="mb-3 grid gap-2 sm:grid-cols-3">
                <div>
                  <label className="label">Menu Hari Ini</label>
                  <input className="input" value={uji.menu} onChange={(e) => setUjiField("menu", e.target.value)} placeholder="mis. Nasi, Ayam, Sayur, Buah" />
                </div>
                <div>
                  <label className="label">Driver</label>
                  <input className="input" value={uji.driver} onChange={(e) => setUjiField("driver", e.target.value)} />
                </div>
                <div>
                  <label className="label">Catatan</label>
                  <input className="input" value={uji.catatan} onChange={(e) => setUjiField("catatan", e.target.value)} />
                </div>
              </div>

              {/* Menu organoleptik (salinan uji) */}
              <div className="mb-4 grid gap-2 lg:grid-cols-3">
                <MenuEditor judul="Menu Sekolah — Uji Organoleptik" warna="text-sky-300" value={uji.menuSekolah} onChange={(v) => setUjiField("menuSekolah", v)} />
                <MenuEditor judul="Menu Balita — Uji Organoleptik" warna="text-amber-300" value={uji.menuBalita} onChange={(v) => setUjiField("menuBalita", v)} />
                <MenuEditor judul="Menu B2 (Bumil & Busui) — Uji Organoleptik" warna="text-pink-300" value={uji.menuB2} onChange={(v) => setUjiField("menuB2", v)} />
              </div>

              <div className="mb-2 border-t border-white/10 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Pilih lembaga</div>
              {grupUji.map(([jenjang, rows]) => {
                const terpilih = rows.filter((r) => r.ikut).length;
                return (
                  <div key={jenjang} className="mb-4">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gold-400">
                        {jenjang} <span className="font-normal text-slate-500">({terpilih}/{rows.length})</span>
                      </span>
                      <div className="flex gap-1.5">
                        <button onClick={() => pilihGrupUji(jenjang, true)} className="text-[11px] text-sky-300 hover:underline">semua</button>
                        <span className="text-slate-600">·</span>
                        <button onClick={() => pilihGrupUji(jenjang, false)} className="text-[11px] text-slate-400 hover:underline">kosong</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                      {rows.map((b) => (
                        <label key={b.penerima_id} className={"flex cursor-pointer items-center gap-2 rounded-lg border border-white/5 px-2.5 py-1.5 text-sm " + (b.ikut ? "bg-sky-400/10" : "opacity-60 hover:opacity-100")}>
                          <input type="checkbox" className="h-4 w-4 accent-sky-500" checked={b.ikut}
                            onChange={(e) => updUji(b.penerima_id, { ikut: e.target.checked })} />
                          <span className="min-w-0 flex-1 truncate font-medium">{b.nama}</span>
                          <span className="text-xs text-slate-500">{b.jam_kirim}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              {grupUji.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-500">Tidak ada data penerima untuk tanggal ini.</p>
              )}
            </div>

            {/* Footer cetak */}
            <div className="flex flex-wrap items-center gap-2 border-t border-white/10 p-4">
              <span className="text-xs font-semibold text-slate-300">Cetak uji:</span>
              <button onClick={() => cetakUji("bast")} className="btn-ghost text-sm">BAST</button>
              <button onClick={() => cetakUji("surat-jalan")} className="btn-ghost text-sm">Surat Jalan</button>
              <button onClick={() => cetakUji("organoleptik")} className="btn-ghost text-sm">Organoleptik</button>
              <button onClick={() => cetakUji("semua", "dokumen")} className="btn-ghost text-sm" title="Semua dokumen dikelompokkan per jenis">Semua (per dokumen)</button>
              <button onClick={() => cetakUji("semua", "lembaga")} className="btn-ghost text-sm" title="Per lembaga berurutan: BAST → Surat Jalan → Organoleptik">Semua (per lembaga)</button>
              <button onClick={() => setUji(null)} className="btn-ghost ml-auto text-sm">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Editor menu terstruktur: daftar grup, tiap grup punya judul + daftar item. */
function MenuEditor({
  judul, warna, value, onChange,
}: {
  judul: string;
  warna: string;
  value: MenuGrup[];
  onChange: (v: MenuGrup[]) => void;
}) {
  const setGrup = (gi: number, patch: Partial<MenuGrup>) =>
    onChange(value.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  const addGrup = () => onChange([...value, { judul: "", items: [""] }]);
  const delGrup = (gi: number) => onChange(value.filter((_, i) => i !== gi));
  const setItem = (gi: number, ii: number, v: string) =>
    setGrup(gi, { items: value[gi].items.map((it, i) => (i === ii ? v : it)) });
  const addItem = (gi: number) => setGrup(gi, { items: [...value[gi].items, ""] });
  const delItem = (gi: number, ii: number) =>
    setGrup(gi, { items: value[gi].items.filter((_, i) => i !== ii) });

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className={"text-sm font-semibold " + warna}>{judul}</h3>
        <button onClick={addGrup} className="btn-ghost px-2.5 py-1 text-xs">+ Grup</button>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Grup mis. “Menu Basah”, “Menu Jumat (Kering)”. Item = nama sampel makanan.
      </p>
      {value.length === 0 && (
        <p className="mt-3 text-xs text-slate-500">Belum ada grup menu. Klik “+ Grup”.</p>
      )}
      <div className="mt-3 space-y-3">
        {value.map((g, gi) => (
          <div key={gi} className="rounded-lg border border-white/10 p-3">
            <div className="flex items-center gap-2">
              <input className="input flex-1 text-sm" placeholder="Judul grup (mis. Menu Basah)"
                value={g.judul} onChange={(e) => setGrup(gi, { judul: e.target.value })} />
              <button onClick={() => delGrup(gi)} className="btn-danger px-2 py-1 text-xs">Hapus</button>
            </div>
            <div className="mt-2 space-y-1.5">
              {g.items.map((it, ii) => (
                <div key={ii} className="flex items-center gap-2">
                  <span className="w-5 text-right text-xs text-slate-500">{ii + 1}.</span>
                  <input className="input flex-1 px-2 py-1 text-sm" placeholder="Nama sampel makanan"
                    value={it} onChange={(e) => setItem(gi, ii, e.target.value)} />
                  <button onClick={() => delItem(gi, ii)} className="btn-ghost px-2 py-1 text-xs">✕</button>
                </div>
              ))}
              <button onClick={() => addItem(gi)} className="btn-ghost px-2.5 py-1 text-xs">+ Item</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
