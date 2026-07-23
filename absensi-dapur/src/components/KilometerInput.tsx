"use client";

import { useCallback, useEffect, useState } from "react";
import { compressImage } from "@/lib/image";
import { kmTerpakai, literTerpakai, type Kendaraan, type KilometerEntri } from "@/lib/kilometer";
import type { ChangeEvent } from "react";

const TESS_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";

type TesseractNS = { recognize: (img: string, lang: string, opts?: unknown) => Promise<{ data: { text: string } }> };

function loadTesseract(): Promise<TesseractNS | null> {
  return new Promise((resolve) => {
    const w = window as unknown as { Tesseract?: TesseractNS };
    if (w.Tesseract) return resolve(w.Tesseract);
    const existing = document.querySelector<HTMLScriptElement>("script[data-tesseract]");
    if (existing) { existing.addEventListener("load", () => resolve(w.Tesseract || null)); existing.addEventListener("error", () => resolve(null)); return; }
    const s = document.createElement("script");
    s.src = TESS_CDN; s.async = true; s.dataset.tesseract = "1";
    s.onload = () => resolve(w.Tesseract || null);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
}

/** Ambil deret angka terpanjang dari hasil OCR (perkiraan angka odometer). */
function longestDigits(text: string): string {
  const groups = (text.match(/\d+/g) || []).sort((a, b) => b.length - a.length);
  return groups[0] || "";
}

function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Satu slot foto+angka (didefinisikan di modul agar tidak remount saat ketik). */
function Slot({ label, foto, onFile, km, setKm, busy }: {
  label: string; foto: string; onFile: (f: File | undefined) => void; km: number; setKm: (n: number) => void; busy: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 p-3">
      <p className="mb-2 text-sm font-semibold text-gold-400">{label}</p>
      <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded bg-black/20">
        {foto
          ? // eslint-disable-next-line @next/next/no-img-element
            <img src={foto} alt={label} className="h-full w-full object-cover" />
          : <span className="text-xs text-slate-500">Belum ada foto</span>}
      </div>
      <input type="file" accept="image/*" capture="environment"
        className="mt-2 block w-full text-xs text-slate-400 file:mr-2 file:rounded file:border-0 file:bg-gold-500/20 file:px-2 file:py-1 file:text-gold-300"
        onChange={(e: ChangeEvent<HTMLInputElement>) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="mt-2">
        <label className="label">Angka (KM) {busy && <span className="text-amber-300">· membaca AI…</span>}</label>
        <input type="number" min={0} className="input" value={km}
          onChange={(e) => setKm(Math.max(0, parseInt(e.target.value) || 0))} />
      </div>
    </div>
  );
}

export default function KilometerInput({ compact = false }: { compact?: boolean }) {
  const [tanggal, setTanggal] = useState(jakartaToday());
  const [kendaraan, setKendaraan] = useState<Kendaraan[]>([]);
  const [kid, setKid] = useState<number | null>(null);
  const [kmB, setKmB] = useState<number>(0);
  const [kmP, setKmP] = useState<number>(0);
  const [fotoB, setFotoB] = useState("");
  const [fotoP, setFotoP] = useState("");
  const [ocr, setOcr] = useState<"" | "b" | "p">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setMsg(null);
    try {
      const res = await fetch(`/api/kilometer?tanggal=${tanggal}`, { cache: "no-store" });
      const d = await res.json();
      const list: Kendaraan[] = (d.kendaraan || []).filter((k: Kendaraan) => k.aktif);
      setKendaraan(list);
      const curId = kid ?? list[0]?.id ?? null;
      setKid(curId);
      const e: KilometerEntri | undefined = (d.entri || []).find((x: KilometerEntri) => x.kendaraan_id === curId);
      setKmB(e?.km_berangkat || 0); setKmP(e?.km_pulang || 0);
      setFotoB(e?.foto_berangkat || ""); setFotoP(e?.foto_pulang || "");
    } finally { setLoading(false); }
  }, [tanggal, kid]);
  useEffect(() => { load(); }, [load]);

  async function onFoto(which: "b" | "p", file: File | undefined) {
    if (!file) return;
    setMsg(null);
    let dataUrl = "";
    try { dataUrl = await compressImage(file, 1200, 0.7); }
    catch { setMsg("Gagal memproses foto."); return; }
    if (which === "b") setFotoB(dataUrl); else setFotoP(dataUrl);
    // OCR otomatis (best-effort).
    setOcr(which);
    try {
      const T = await loadTesseract();
      if (T) {
        const { data } = await T.recognize(dataUrl, "eng");
        const digits = longestDigits(data.text || "");
        if (digits) { if (which === "b") setKmB(parseInt(digits, 10)); else setKmP(parseInt(digits, 10)); }
        else setMsg("AI tidak menemukan angka — isi manual ya.");
      } else setMsg("AI OCR tidak tersedia — isi angka manual.");
    } catch { setMsg("Gagal membaca angka otomatis — isi manual."); }
    finally { setOcr(""); }
  }

  async function simpan() {
    if (!kid) { setMsg("Pilih kendaraan dulu."); return; }
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/kilometer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tanggal, kendaraan_id: kid, km_berangkat: kmB, km_pulang: kmP, foto_berangkat: fotoB, foto_pulang: fotoP }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(d.error || "Gagal menyimpan."); return; }
      setMsg("✓ Data kilometer tersimpan.");
    } catch { setMsg("Tidak dapat terhubung ke server."); }
    finally { setSaving(false); }
  }

  const veh = kendaraan.find((k) => k.id === kid);
  const used = kmTerpakai({ km_berangkat: kmB, km_pulang: kmP });
  const liter = literTerpakai(used, veh?.konsumsi || 0);

  return (
    <div className="space-y-4">
      <div className={"card grid gap-3 p-4 " + (compact ? "" : "sm:grid-cols-2")}>
        <div>
          <label className="label">Tanggal</label>
          <input type="date" className="input" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </div>
        <div>
          <label className="label">Kendaraan</label>
          <select className="input" value={kid ?? ""} onChange={(e) => setKid(parseInt(e.target.value, 10) || null)}>
            {kendaraan.length === 0 && <option value="">(belum ada kendaraan)</option>}
            {kendaraan.map((k) => <option key={k.id} value={k.id}>{k.nama || k.nopol || `Kendaraan ${k.id}`}{k.nopol && k.nama ? ` · ${k.nopol}` : ""}</option>)}
          </select>
        </div>
      </div>

      {msg && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{msg}</p>}

      {loading ? (
        <div className="card p-6 text-center text-slate-400">Memuat…</div>
      ) : kendaraan.length === 0 ? (
        <div className="card p-6 text-center text-sm text-slate-400">Belum ada kendaraan. Admin menambahkan kendaraan dulu di menu Data Kilometer.</div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Slot label="📷 KM Berangkat (sebelum dipakai)" foto={fotoB} onFile={(f) => onFoto("b", f)} km={kmB} setKm={setKmB} busy={ocr === "b"} />
            <Slot label="📷 KM Pulang (sesudah dipakai)" foto={fotoP} onFile={(f) => onFoto("p", f)} km={kmP} setKm={setKmP} busy={ocr === "p"} />
          </div>
          <div className="card flex flex-wrap items-center gap-4 p-4 text-sm">
            <span>KM terpakai hari ini: <b className="text-gold-400">{used} km</b></span>
            {veh?.konsumsi ? <span>≈ <b className="text-emerald-300">{liter} liter</b> (konsumsi {veh.konsumsi} km/L)</span> : null}
          </div>
          <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-ink-900/90 p-3 backdrop-blur">
            <button onClick={simpan} className="btn-gold" disabled={saving}>{saving ? "Menyimpan…" : "💾 Simpan"}</button>
            <span className="text-xs text-slate-400">Foto otomatis dibaca AI; angka bisa dikoreksi manual.</span>
          </div>
        </>
      )}
    </div>
  );
}
