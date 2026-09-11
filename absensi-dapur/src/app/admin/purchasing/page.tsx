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
export default function PurchasingPage() {
  const [tab, setTab] = useState<"gen" | "paket">("gen");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Generator Purchase — Kebutuhan Bahan</h1>
        <p className="text-sm text-slate-400">Rakit menu dari komponen, isi porsi &amp; gramasi → daftar belanja bahan otomatis dari data RAB nyata 6 bulan.</p>
      </div>
      <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1 w-fit">
        <button onClick={() => setTab("gen")} className={"rounded-lg px-4 py-1.5 text-sm font-medium transition " + (tab === "gen" ? "bg-gold-500/15 text-gold-400" : "text-slate-400 hover:text-slate-100")}>Generator Menu</button>
        <button onClick={() => setTab("paket")} className={"rounded-lg px-4 py-1.5 text-sm font-medium transition " + (tab === "paket" ? "bg-gold-500/15 text-gold-400" : "text-slate-400 hover:text-slate-100")}>Paket Historis</button>
      </div>
      {tab === "gen" ? <Composer /> : <PaketHistoris />}
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
