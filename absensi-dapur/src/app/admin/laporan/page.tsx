"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FOTO_SLOTS, type LaporanIsi, type LaporanFoto, type Personel } from "@/lib/laporan";
import { compressImage } from "@/lib/image";
import type { ChangeEvent } from "react";

function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function fmtTgl(v: string): string {
  return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(v + "T00:00:00"));
}

export default function LaporanPage() {
  const [tanggal, setTanggal] = useState(jakartaToday());
  const [isi, setIsi] = useState<LaporanIsi | null>(null);
  const [foto, setFoto] = useState<LaporanFoto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setMsg(null);
    try {
      const res = await fetch(`/api/admin/laporan?tanggal=${tanggal}`, { cache: "no-store" });
      const d = await res.json();
      setIsi(d.isi); setFoto(d.foto);
    } finally { setLoading(false); }
  }, [tanggal]);
  useEffect(() => { load(); }, [load]);

  function patchIsi(p: Partial<LaporanIsi>) { setIsi((prev) => (prev ? { ...prev, ...p } : prev)); }
  function setKolom(k: keyof LaporanIsi["menu_tabel"], text: string) {
    setIsi((prev) => prev ? { ...prev, menu_tabel: { ...prev.menu_tabel, [k]: text.split("\n") } } : prev);
  }
  function setPersonel(next: Personel[]) { patchIsi({ personel: next }); }

  async function addFoto(key: keyof LaporanFoto, file: File | undefined, max: number) {
    if (!file || !foto) return;
    if (foto[key].length >= max) { setMsg(`Maksimal ${max} foto untuk slot ini.`); return; }
    try {
      const dataUrl = await compressImage(file);
      setFoto((prev) => (prev ? { ...prev, [key]: [...prev[key], dataUrl].slice(0, max) } : prev));
    } catch { setMsg("Gagal memproses foto."); }
  }
  function removeFoto(key: keyof LaporanFoto, idx: number) {
    setFoto((prev) => (prev ? { ...prev, [key]: prev[key].filter((_, i) => i !== idx) } : prev));
  }

  async function simpan() {
    if (!isi || !foto) return;
    setSaving(true); setMsg(null);
    // Buang baris kosong pada list sebelum simpan.
    const clean = (a: string[]) => a.map((s) => s.trim()).filter(Boolean);
    const payloadIsi: LaporanIsi = {
      ...isi,
      menu_tabel: {
        besar: clean(isi.menu_tabel.besar), kecil: clean(isi.menu_tabel.kecil),
        busui_bumil: clean(isi.menu_tabel.busui_bumil), balita: clean(isi.menu_tabel.balita),
      },
      kegiatan: clean(isi.kegiatan),
      personel: isi.personel.filter((p) => p.label.trim()),
    };
    try {
      const res = await fetch("/api/admin/laporan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tanggal, isi: payloadIsi, foto }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(d.error || "Gagal menyimpan."); return; }
      setMsg("✓ Laporan tersimpan. Siap dicetak.");
      await load();
    } catch { setMsg("Tidak dapat terhubung ke server."); }
    finally { setSaving(false); }
  }

  const totalPersonel = isi ? isi.personel.reduce((a, p) => a + (p.jumlah || 0), 0) : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">📋 Laporan Kegiatan Harian</h1>
          <p className="text-sm text-slate-400">{fmtTgl(tanggal)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" className="input" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          <button onClick={() => window.open(`/cetak/laporan?tanggal=${tanggal}`, "_blank")} className="btn-ghost">🖨️ Cetak</button>
        </div>
      </div>

      {msg && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{msg}</p>}

      {loading || !isi || !foto ? (
        <div className="card p-6 text-center text-slate-400">Memuat…</div>
      ) : (
        <>
          {/* Menu */}
          <div className="card space-y-3 p-4">
            <h2 className="text-sm font-semibold text-gold-400">🍚 Menu Hari Ini</h2>
            <div>
              <label className="label">Ringkasan menu (opsional)</label>
              <input className="input" value={isi.menu_teks} onChange={(e) => patchIsi({ menu_teks: e.target.value })} placeholder="mis. Nasi, Ayam Bawang, Sayur Lodeh, Susu, Buah" />
            </div>
            <p className="text-xs text-slate-500">Rincian menu per penerima — satu item per baris.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {([["besar", "Serdik Besar"], ["kecil", "Serdik Kecil"], ["busui_bumil", "Busui & Bumil"], ["balita", "Balita"]] as const).map(([k, lbl]) => (
                <div key={k}>
                  <label className="label">{lbl}</label>
                  <textarea className="input min-h-[140px]" value={isi.menu_tabel[k].join("\n")} onChange={(e) => setKolom(k, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          {/* Personel */}
          <div className="card space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gold-400">👥 Kehadiran Personel <span className="font-normal text-slate-500">(total {totalPersonel} orang)</span></h2>
              <button onClick={() => setPersonel([...isi.personel, { label: "", jumlah: 0 }])} className="btn-ghost px-2.5 py-1 text-xs">+ Baris</button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {isi.personel.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 text-right text-xs text-slate-500">{i + 1}.</span>
                  <input className="input flex-1 px-2 py-1 text-sm" value={p.label} placeholder="Personil" onChange={(e) => setPersonel(isi.personel.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
                  <input type="number" min={0} className="input w-16 px-2 py-1 text-sm" value={p.jumlah} onChange={(e) => setPersonel(isi.personel.map((x, j) => j === i ? { ...x, jumlah: Math.max(0, parseInt(e.target.value) || 0) } : x))} />
                  <button onClick={() => setPersonel(isi.personel.filter((_, j) => j !== i))} className="btn-ghost px-2 py-1 text-xs">✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Kegiatan */}
          <div className="card space-y-2 p-4">
            <h2 className="text-sm font-semibold text-gold-400">🕒 Rangkaian Kegiatan <span className="font-normal text-slate-500">(satu kegiatan per baris)</span></h2>
            <textarea className="input min-h-[160px]" value={isi.kegiatan.join("\n")} onChange={(e) => patchIsi({ kegiatan: e.target.value.split("\n") })} />
          </div>

          {/* Kendala & Solusi */}
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="card space-y-2 p-4">
              <h2 className="text-sm font-semibold text-gold-400">⚠️ Kendala</h2>
              <textarea className="input min-h-[120px]" value={isi.kendala} onChange={(e) => patchIsi({ kendala: e.target.value })} />
            </div>
            <div className="card space-y-2 p-4">
              <h2 className="text-sm font-semibold text-gold-400">✅ Solusi</h2>
              <textarea className="input min-h-[120px]" value={isi.solusi} onChange={(e) => patchIsi({ solusi: e.target.value })} />
            </div>
          </div>

          {/* Foto */}
          <div className="card space-y-3 p-4">
            <h2 className="text-sm font-semibold text-gold-400">📷 Foto (menu &amp; dokumentasi)</h2>
            <p className="text-xs text-slate-500">
              Menu 2 foto (tampil di atas rincian menu). Dokumentasi 3 foto per kegiatan. Semua rasio disamakan (4:3) &amp; dikompres otomatis.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FOTO_SLOTS.map((s) => (
                <div key={s.key} className="rounded-lg border border-white/10 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{s.label}</span>
                    <span className="text-xs text-slate-500">{foto[s.key].length}/{s.max}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {foto[s.key].map((src, i) => (
                      <div key={i} className="group relative aspect-[4/3] overflow-hidden rounded bg-black/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`${s.label} ${i + 1}`} className="h-full w-full object-cover" />
                        <button onClick={() => removeFoto(s.key, i)}
                          className="absolute right-0.5 top-0.5 rounded bg-black/70 px-1 text-xs text-white">✕</button>
                      </div>
                    ))}
                    {foto[s.key].length < s.max && (
                      <label className="grid aspect-[4/3] cursor-pointer place-items-center rounded border border-dashed border-white/20 bg-black/10 text-xl text-slate-500 hover:bg-black/20">
                        +
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e: ChangeEvent<HTMLInputElement>) => { addFoto(s.key, e.target.files?.[0], s.max); e.target.value = ""; }} />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-ink-900/90 p-3 backdrop-blur">
            <button onClick={simpan} className="btn-gold" disabled={saving}>{saving ? "Menyimpan…" : "💾 Simpan Laporan"}</button>
            <button onClick={() => window.open(`/cetak/laporan?tanggal=${tanggal}`, "_blank")} className="btn-ghost">🖨️ Cetak / PDF</button>
            <span className="text-xs text-amber-300">Simpan dulu sebelum cetak agar data terbaru ikut.</span>
            <Link href="/admin/distribusi" className="btn-ghost ml-auto">← Distribusi</Link>
          </div>
        </>
      )}
    </div>
  );
}
