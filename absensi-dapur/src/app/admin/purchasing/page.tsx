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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
const TABS: { k: "resep" | "bebas" | "paket"; label: string }[] = [
  { k: "resep", label: "Generator Resep" },
  { k: "bebas", label: "Komponen Bebas" },
  { k: "paket", label: "Paket Historis" },
];
export default function PurchasingPage() {
  const [tab, setTab] = useState<"resep" | "bebas" | "paket">("resep");
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
      {tab === "resep" ? <RecipeGenerator /> : tab === "bebas" ? <Composer /> : <PaketHistoris />}
    </div>
  );
}

/* ========================================================= generator resep */
interface RBahan { id: string; n: string; s: string; h: number | null; hsrc: string | null; kemasan: number; diedit?: boolean }
interface RBom { id: string; n: string; s: string; k: number; yp: number; ed: number; ym: number; mk: number; g: number }
interface CItem { n: string; s: string; q: number; h: number }
interface RResep { id: string; kat: string; n: string; gramK: number; gramB: number; yieldGab: number; status: string; bom: RBom[]; custom?: boolean; porsiBasis?: number; items?: CItem[] }
interface PorsiKB { kat: string; gramK: number; gramB: number }
interface RData { meta: { sumber: string; resep: number; bahan: number; hargaTerisi: number; hargaKosong: number; status: string }; kategori: string[]; porsiKB: PorsiKB[]; resep: RResep[]; bahan: RBahan[] }
interface CustomRow { id: number; kategori: string; nama: string; porsi_basis: number; items: CItem[]; catatan: string; oleh: string }
interface Builder { id: number | null; kategori: string; nama: string; porsi_basis: string; catatan: string; items: { n: string; s: string; q: string; h: string }[] }

function RecipeGenerator() {
  const [data, setData] = useState<RData | null>(null);
  const [custom, setCustom] = useState<CustomRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [serdikK, setSerdikK] = useState("500");
  const [serdikB, setSerdikB] = useState("500");
  const [cadangan, setCadangan] = useState("2");
  const [picked, setPicked] = useState<string[]>([]); // resep ids
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

  /* konsolidasi seluruh resep terpilih per bahan */
  const belanja = useMemo(() => {
    const map = new Map<string, { id: string; nama: string; satuan: string; qty: number; hargaInline: number | null }>();
    for (const rid of picked) {
      const r = resepMap.get(rid); if (!r) continue;
      for (const line of hitung(r)) {
        const cur = map.get(line.id);
        if (cur) { cur.qty += line.qty; if (cur.hargaInline == null) cur.hargaInline = line.hargaInline; }
        else map.set(line.id, { id: line.id, nama: line.nama, satuan: line.satuan, qty: line.qty, hargaInline: line.hargaInline });
      }
    }
    return [...map.values()].map((x) => {
      const b = bahanMap.get(x.id);
      const harga = b?.h ?? x.hargaInline ?? null;
      return { id: x.id, nama: b?.n || x.nama, satuan: x.satuan, qty: x.qty, harga, biaya: harga != null ? x.qty * harga : 0, noHarga: harga == null };
    }).sort((a, b) => b.biaya - a.biaya);
  }, [picked, resepMap, bahanMap, hitung]);
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
    const head = ["Bahan", "Satuan", "Qty beli", "Harga satuan", "Estimasi biaya"];
    const body = belanja.map((b) => [b.nama, b.satuan, fmtQ(b.qty), b.harga != null ? Math.round(b.harga) : "", Math.round(b.biaya)].map(esc).join(","));
    const csv = "﻿" + [head.map(esc).join(","), ...body].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `kebutuhan-resep-${K + B}porsi.csv`; a.click(); URL.revokeObjectURL(url);
  }
  const waText = useMemo(() => {
    if (belanja.length === 0) return "";
    const menu = picked.map((id) => resepMap.get(id)?.n).filter(Boolean).join(", ");
    const baris = belanja.map((b) => `• ${b.nama}: ${fmtQ(b.qty)} ${b.satuan}`);
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
              <th className="px-4 py-2.5">Bahan</th><th className="px-4 py-2.5">Satuan</th>
              <th className="px-4 py-2.5 text-right">Qty beli</th><th className="px-4 py-2.5 text-right">Harga</th>
              <th className="px-4 py-2.5 text-right">Estimasi</th><th className="px-4 py-2.5 text-right">Koreksi</th>
            </tr></thead>
            <tbody className="divide-y divide-white/5">
              {belanja.map((b) => editId === b.id ? (
                <tr key={b.id} className="bg-white/5">
                  <td className="px-4 py-1.5"><input className="input py-1" value={ef.nama} onChange={(e) => setEf({ ...ef, nama: e.target.value })} /></td>
                  <td className="px-4 py-1.5 text-slate-400">{b.satuan}</td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-slate-400">{fmtQ(b.qty)}</td>
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
                  <td className="px-4 py-2 text-slate-400">{b.satuan}</td>
                  <td className="px-4 py-2 text-right font-semibold tabular-nums">{fmtQ(b.qty)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-400">{b.harga != null ? rupiah(b.harga) : <span className="badge bg-amber-500/15 text-amber-300">kosong</span>}</td>
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
        Beli tiap bahan = mentah × koefisien ÷ yield persiapan (satuan beli; kg/liter/pcs). Harga blanko tidak dihitung ke total. Sumber: {data.meta.sumber}.
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
