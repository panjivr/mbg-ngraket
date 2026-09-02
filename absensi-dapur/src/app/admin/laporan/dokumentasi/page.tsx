"use client";

import { useCallback, useEffect, useState } from "react";
import { compressImage } from "@/lib/image";
import type { ChangeEvent } from "react";

const FOTO_MAX = 60;
const KEGIATAN_UMUM = [
  "PENERIMAAN BARANG", "PERSIAPAN", "PENGOLAHAN", "PEMORSIAN",
  "DISTRIBUSI", "CUCI OMPRENG", "PENYIMPANAN", "KEBERSIHAN",
];

function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function fmtTgl(v: string): string {
  return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(v + "T00:00:00"));
}

export default function DokumentasiPage() {
  const [tanggal, setTanggal] = useState(jakartaToday());
  const [kegiatan, setKegiatan] = useState("PENERIMAAN BARANG");
  const [foto, setFoto] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setMsg(null);
    try {
      const res = await fetch(`/api/admin/dokumentasi?tanggal=${tanggal}&kegiatan=${encodeURIComponent(kegiatan)}`, { cache: "no-store" });
      const d = await res.json();
      setFoto(d.foto || []);
    } finally { setLoading(false); }
  }, [tanggal, kegiatan]);
  useEffect(() => { load(); }, [load]);

  // Terima BANYAK foto sekaligus: tiap file dikompres lalu ditambahkan berurutan
  // sampai batas FOTO_MAX — tak perlu unggah satu per satu.
  async function addFotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const sisa = FOTO_MAX - foto.length;
    if (sisa <= 0) { setMsg(`Maksimal ${FOTO_MAX} foto.`); return; }
    const pilih = Array.from(files).slice(0, sisa);
    const olahan: string[] = [];
    for (const f of pilih) {
      try {
        // Kompres lebih ketat karena bisa sampai puluhan foto (jaga ukuran unggah).
        olahan.push(await compressImage(f, 900, 0.62));
      } catch {
        // Lewati file yang gagal diproses.
      }
    }
    if (olahan.length === 0) { setMsg("Gagal memproses foto."); return; }
    setFoto((prev) => [...prev, ...olahan].slice(0, FOTO_MAX));
    if (files.length > sisa) setMsg(`Hanya ${sisa} foto pertama ditambahkan (batas ${FOTO_MAX}).`);
  }
  function removeFoto(idx: number) { setFoto((prev) => prev.filter((_, i) => i !== idx)); }

  async function simpan() {
    setSaving(true); setMsg(null);
    try {
      // Kirim bertahap: pecah foto jadi beberapa batch agar tiap request tetap
      // di bawah batas ukuran body Vercel (~4,5 MB). Batch pertama "replace"
      // (menimpa baris), sisanya "append" (menyambung di server).
      const CHUNK_BYTES = 3_500_000;
      const chunks: string[][] = [];
      let cur: string[] = []; let curSize = 0;
      for (const f of foto) {
        if (cur.length && curSize + f.length > CHUNK_BYTES) { chunks.push(cur); cur = []; curSize = 0; }
        cur.push(f); curSize += f.length;
      }
      if (cur.length) chunks.push(cur);
      if (chunks.length === 0) chunks.push([]); // tetap kirim 1x agar bisa mengosongkan
      for (let i = 0; i < chunks.length; i++) {
        const res = await fetch("/api/admin/dokumentasi", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tanggal, kegiatan: kegiatan.trim(), foto: chunks[i], mode: i === 0 ? "replace" : "append" }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) { setMsg(d.error || `Gagal menyimpan (bagian ${i + 1}/${chunks.length}).`); return; }
        if (chunks.length > 1) setMsg(`Menyimpan… (${i + 1}/${chunks.length})`);
      }
      setMsg("✓ Dokumentasi tersimpan. Siap dicetak.");
      await load();
    } catch { setMsg("Tidak dapat terhubung ke server."); }
    finally { setSaving(false); }
  }

  const cetak = () => window.open(`/cetak/dokumentasi?tanggal=${tanggal}&kegiatan=${encodeURIComponent(kegiatan.trim())}`, "_blank");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Dokumentasi Foto Kegiatan</h1>
          <p className="text-sm text-slate-400">{fmtTgl(tanggal)} · {kegiatan || "—"}</p>
        </div>
        <button onClick={cetak} className="btn-ghost">Cetak</button>
      </div>

      <div className="card grid gap-3 p-4 sm:grid-cols-2">
        <div>
          <label className="label">Tanggal</label>
          <input type="date" className="input" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </div>
        <div>
          <label className="label">Kegiatan</label>
          <input className="input" list="kegiatan-umum" value={kegiatan} onChange={(e) => setKegiatan(e.target.value)} placeholder="mis. PENERIMAAN BARANG" />
          <datalist id="kegiatan-umum">
            {KEGIATAN_UMUM.map((k) => <option key={k} value={k} />)}
          </datalist>
        </div>
      </div>

      {msg && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{msg}</p>}

      {loading ? (
        <div className="card p-6 text-center text-slate-400">Memuat…</div>
      ) : (
        <div className="card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gold-400">Foto / Dokumentasi <span className="font-normal text-slate-500">({foto.length}/{FOTO_MAX})</span></h2>
            <p className="text-xs text-slate-500">Hingga 60 foto · pilih banyak foto sekaligus lewat kotak “+” · rasio seragam 3:4 · saat cetak otomatis 12 foto per halaman (A4/F4).</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {foto.map((src, i) => (
              <div key={i} className="group relative aspect-[3/4] overflow-hidden rounded bg-black/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                <button onClick={() => removeFoto(i)} className="absolute right-1 top-1 rounded bg-black/70 px-1.5 text-xs text-white">✕</button>
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-xs text-white">{i + 1}</span>
              </div>
            ))}
            {foto.length < FOTO_MAX && (
              <label className="grid aspect-[3/4] cursor-pointer place-items-center rounded border border-dashed border-white/20 bg-black/10 text-3xl text-slate-500 hover:bg-black/20">
                +
                <input type="file" accept="image/*" multiple className="hidden"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => { addFotos(e.target.files); e.target.value = ""; }} />
              </label>
            )}
          </div>
        </div>
      )}

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-ink-900/90 p-3 backdrop-blur">
        <button onClick={simpan} className="btn-gold" disabled={saving}>{saving ? "Menyimpan…" : "Simpan Dokumentasi"}</button>
        <button onClick={cetak} className="btn-ghost">Cetak / PDF</button>
        <span className="text-xs text-amber-300">Simpan dulu sebelum cetak agar foto terbaru ikut.</span>
      </div>
    </div>
  );
}
