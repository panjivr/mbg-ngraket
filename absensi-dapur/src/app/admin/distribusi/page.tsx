"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface Baris {
  penerima_id: number;
  jenis: "serdik" | "b3";
  nama: string;
  jenjang: string;
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
  distribusi: { driver: string; menu: string; catatan: string };
  baris: Baris[];
  total: { besar: number; kecil: number; b3: number; porsi: number; pagu: number };
}
interface Pengaturan {
  nama_sppg: string;
  kepala_sppg: string;
  harga_besar: number;
  harga_kecil: number;
  harga_b3: number;
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [setel, setSetel] = useState<Pengaturan | null>(null);

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
    } finally {
      setLoading(false);
    }
  }, [tanggal]);

  useEffect(() => {
    load();
  }, [load]);

  function upd(id: number, patch: Partial<Baris>) {
    setBaris((prev) => prev.map((b) => (b.penerima_id === id ? { ...b, ...patch } : b)));
  }

  const harga = data?.sppg ?? { harga_besar: 10000, harga_kecil: 8000, harga_b3: 8000, nama: "", kepala_sppg: "" };
  const total = useMemo(() => {
    let besar = 0, kecil = 0, b3 = 0;
    for (const b of baris) {
      if (!b.ikut) continue;
      besar += b.besar || 0;
      kecil += b.kecil || 0;
      b3 += b.b3 || 0;
    }
    return {
      besar, kecil, b3,
      porsi: besar + kecil + b3,
      pagu: besar * harga.harga_besar + kecil * harga.harga_kecil + b3 * harga.harga_b3,
    };
  }, [baris, harga]);

  async function simpan() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/distribusi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanggal, driver, menu, catatan,
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

  const cetak = (dok: string) =>
    window.open(`/cetak/distribusi?tanggal=${tanggal}&dok=${dok}`, "_blank");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">🚚 Distribusi Harian</h1>
          <p className="text-sm text-slate-400">{fmtTgl(tanggal)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" className="input" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          <Link href="/admin/distribusi/penerima" className="btn-ghost">🏫 Data Penerima</Link>
          <button onClick={bukaSetel} className="btn-ghost">⚙️ Harga & Kepala</button>
        </div>
      </div>

      {/* Ringkasan porsi & pagu */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { l: "Porsi Besar", v: total.besar, c: "text-emerald-300" },
          { l: "Porsi Kecil", v: total.kecil, c: "text-sky-300" },
          { l: "Porsi B3", v: total.b3, c: "text-amber-300" },
          { l: "Total Porsi", v: total.porsi, c: "text-slate-100" },
        ].map((s) => (
          <div key={s.l} className="card p-3">
            <p className="text-xs text-slate-400">{s.l}</p>
            <p className={"mt-0.5 text-2xl font-bold " + s.c}>{s.v}</p>
          </div>
        ))}
        <div className="card p-3">
          <p className="text-xs text-slate-400">Pagu (Rp)</p>
          <p className="mt-0.5 text-lg font-bold text-gold-400">{rupiah(total.pagu)}</p>
        </div>
      </div>

      {/* Info hari itu */}
      <div className="card grid gap-3 p-4 sm:grid-cols-3">
        <div>
          <label className="label">Menu Hari Ini</label>
          <input className="input" value={menu} onChange={(e) => setMenu(e.target.value)} placeholder="mis. Nasi, Ayam, Sayur, Buah" />
        </div>
        <div>
          <label className="label">Driver</label>
          <input className="input" value={driver} onChange={(e) => setDriver(e.target.value)} />
        </div>
        <div>
          <label className="label">Catatan</label>
          <input className="input" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
        </div>
      </div>

      {msg && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{msg}</p>
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
                {grup.map(([jenjang, rows]) => (
                  <Fragment key={jenjang}>
                    <tr className="bg-white/5">
                      <td colSpan={6} className="px-3 py-1.5 text-xs font-semibold text-gold-400">{jenjang}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Aksi */}
      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-ink-900/90 p-3 backdrop-blur">
        <button onClick={simpan} className="btn-gold" disabled={saving}>
          {saving ? "Menyimpan…" : "💾 Simpan Distribusi"}
        </button>
        <span className="mx-1 text-xs text-slate-500">Cetak dokumen:</span>
        <button onClick={() => cetak("bast")} className="btn-ghost text-sm">🧾 BAST</button>
        <button onClick={() => cetak("surat-jalan")} className="btn-ghost text-sm">🚚 Surat Jalan</button>
        <button onClick={() => cetak("organoleptik")} className="btn-ghost text-sm">🔬 Organoleptik</button>
        <button onClick={() => cetak("semua")} className="btn-ghost text-sm">📚 Semua</button>
        {!data?.tersimpan && (
          <span className="text-xs text-amber-300">Simpan dulu sebelum cetak agar angka terbaru ikut.</span>
        )}
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
                <label className="label">Kepala SPPG</label>
                <input className="input" value={setel.kepala_sppg} onChange={(e) => setSetel({ ...setel, kepala_sppg: e.target.value })} />
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
    </div>
  );
}
