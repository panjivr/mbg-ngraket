"use client";

import { useCallback, useEffect, useState } from "react";
import {
  INFO_GIZI_KOSONG,
  KATEGORI_MENU,
  KATEGORI_MENU_LABEL,
  GIZI_LABEL,
  PORSI,
  DESAIN_MODE,
  DESAIN_MAX_CHARS,
  DESAIN_RASIO,
  DESAIN_LEBAR,
  DESAIN_TINGGI,
  type InfoGiziIsi,
  type GiziPorsi,
  type PorsiKey,
  type KategoriMenu,
  type DesainMode,
} from "@/lib/info-gizi";

interface Data {
  tanggal: string;
  tersimpan: boolean;
  url: string;
  qr: string;
  sppg: { nama: string; alamat: string; tz: string };
  isi: InfoGiziIsi;
}

function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Baca file gambar → potong tengah jadi rasio 4:5 → kecilkan ke 1080×1350 →
 * JPEG data URL. Semua dikerjakan di browser supaya server tidak perlu
 * memproses gambar dan ukuran request tetap kecil.
 */
function potongPotrait(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      const rasio = DESAIN_LEBAR / DESAIN_TINGGI;
      const wSrc = Math.min(img.width, img.height * rasio);
      const hSrc = Math.min(img.height, img.width / rasio);
      const canvas = document.createElement("canvas");
      canvas.width = DESAIN_LEBAR;
      canvas.height = DESAIN_TINGGI;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas tidak tersedia"));
        return;
      }
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        img,
        (img.width - wSrc) / 2,
        (img.height - hSrc) / 2,
        wSrc,
        hSrc,
        0,
        0,
        DESAIN_LEBAR,
        DESAIN_TINGGI,
      );
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objUrl);
      reject(new Error("gambar tidak terbaca"));
    };
    img.src = objUrl;
  });
}

export default function AdminInfoGiziPage() {
  const [tanggal, setTanggal] = useState(jakartaToday());
  const [data, setData] = useState<Data | null>(null);
  const [isi, setIsi] = useState<InfoGiziIsi>(INFO_GIZI_KOSONG);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [olahGambar, setOlahGambar] = useState(false);

  const muat = useCallback(async () => {
    setErr("");
    setInfo("");
    try {
      const res = await fetch(`/api/admin/info-gizi?tanggal=${tanggal}`, { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) {
        setErr(d?.error || `Gagal memuat (kode ${res.status}).`);
        return;
      }
      setData(d as Data);
      setIsi((d as Data).isi);
    } catch {
      setErr("Gagal memuat data.");
    }
  }, [tanggal]);

  useEffect(() => {
    void muat();
  }, [muat]);

  const simpan = async () => {
    setBusy(true);
    setErr("");
    setInfo("");
    try {
      const res = await fetch("/api/admin/info-gizi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tanggal, isi }),
      });
      const d = await res.json();
      if (!res.ok) {
        setErr(d?.error || `Gagal menyimpan (kode ${res.status}).`);
        return;
      }
      setInfo("Tersimpan. Halaman publik langsung ikut berubah.");
      await muat();
    } catch {
      setErr("Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  };

  // Semua setter membuat objek baru (tanpa mutasi) supaya React pasti re-render.
  const set = <K extends keyof InfoGiziIsi>(k: K, v: InfoGiziIsi[K]) =>
    setIsi((s) => ({ ...s, [k]: v }));

  const setGizi = (porsi: PorsiKey, k: keyof GiziPorsi, v: number) =>
    setIsi((s) => ({
      ...s,
      gizi: { ...s.gizi, [porsi]: { ...s.gizi[porsi], [k]: v } },
    }));

  const setMenu = (i: number, patch: Partial<InfoGiziIsi["menu"][number]>) =>
    setIsi((s) => ({ ...s, menu: s.menu.map((m, j) => (j === i ? { ...m, ...patch } : m)) }));

  const tambahMenu = () =>
    setIsi((s) => ({
      ...s,
      menu: [...s.menu, { kategori: "karbohidrat", nama: "" }],
    }));

  const hapusMenu = (i: number) =>
    setIsi((s) => ({ ...s, menu: s.menu.filter((_, j) => j !== i) }));

  const unduhQr = () => {
    if (!data?.qr) return;
    const a = document.createElement("a");
    a.href = data.qr;
    a.download = `qr-info-gizi-${data.sppg.nama || "sppg"}.png`;
    a.click();
  };

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4">
      <header>
        <h1 className="text-xl font-bold text-gold-300">Info Gizi Publik (QR)</h1>
        <p className="mt-1 text-sm text-slate-400">
          Isi menu, kandungan gizi, dan batas waktu makan untuk satu tanggal. Siapa pun yang
          memindai QR akan melihat isi hari itu — tanpa perlu login.
        </p>
      </header>

      {err && <div className="card border-red-500/30 p-3 text-sm text-red-300">{err}</div>}
      {info && (
        <div className="card border-emerald-500/30 p-3 text-sm text-emerald-300">{info}</div>
      )}

      {/* Tanggal + status */}
      <section className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label">Tanggal</label>
          <input
            type="date"
            className="input"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </div>
        <p className="pb-2 text-sm text-slate-400">
          {data?.tersimpan ? "Sudah dipublikasikan." : "Belum ada isi untuk tanggal ini."}
        </p>
        <div className="ml-auto pb-1">
          <button className="btn-primary px-4 py-2" onClick={simpan} disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </section>

      {/* QR */}
      {data && (
        <section className="card flex flex-wrap items-center gap-4 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.qr}
            alt="QR halaman info gizi"
            className="rounded-lg bg-white p-2"
            style={{ height: 160, width: 160 }}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm text-slate-400">
              QR ini permanen — isinya otomatis mengikuti tanggal hari ini, jadi cukup dicetak
              sekali.
            </p>
            <p className="break-all text-[13px] text-gold-300">{data.url}</p>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-gold px-3 py-1.5 text-sm"
                onClick={() => navigator.clipboard?.writeText(data.url)}
              >
                Salin link
              </button>
              <button className="btn-gold px-3 py-1.5 text-sm" onClick={unduhQr}>
                Unduh QR
              </button>
              <a
                className="btn-gold px-3 py-1.5 text-sm"
                href={`${data.url}?t=${tanggal}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Lihat halaman publik
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Desain poster harian */}
      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold text-gold-300">Desain poster harian (4:5)</h2>
        <p className="text-sm text-slate-400">
          Gambar ini menempel pada tanggal di atas, jadi otomatis berganti tiap hari tanpa
          mencetak QR baru. Foto apa pun akan dipotong tengah jadi potrait 4:5 ({DESAIN_LEBAR}×
          {DESAIN_TINGGI}) dan dikecilkan di browser.
        </p>
        <div className="flex flex-wrap items-start gap-4">
          <div
            className="w-40 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/30"
            style={{ aspectRatio: DESAIN_RASIO }}
          >
            {isi.desain ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={isi.desain}
                alt="Pratinjau desain"
                className="h-full w-full object-cover"
              />
            ) : (
              <p className="flex h-full items-center justify-center px-2 text-center text-xs text-slate-500">
                Belum ada desain
              </p>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <label className="label" htmlFor="desain-file">
                Unggah gambar (JPG/PNG/WebP)
              </label>
              <input
                id="desain-file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="input"
                disabled={olahGambar}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setErr("");
                  setOlahGambar(true);
                  try {
                    const dataUrl = await potongPotrait(file);
                    if (dataUrl.length > DESAIN_MAX_CHARS) {
                      setErr("Gambar terlalu besar setelah dikompresi. Coba gambar lain.");
                      return;
                    }
                    set("desain", dataUrl);
                    setInfo("Desain siap. Klik Simpan supaya tayang di halaman publik.");
                  } catch {
                    setErr("Gambar tidak bisa dibaca.");
                  } finally {
                    setOlahGambar(false);
                  }
                }}
              />
              {olahGambar && <p className="mt-1 text-xs text-slate-400">Memproses gambar…</p>}
            </div>
            <div>
              <label className="label">Posisi di halaman publik</label>
              <select
                className="input"
                value={isi.desain_mode}
                onChange={(e) => set("desain_mode", e.target.value as DesainMode)}
              >
                {DESAIN_MODE.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                {DESAIN_MODE.find((m) => m.value === isi.desain_mode)?.hint}
              </p>
            </div>
            {isi.desain && (
              <button
                className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm text-red-300"
                onClick={() => set("desain", "")}
              >
                Hapus desain
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Kop & status tayang */}
      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold text-gold-300">Kop &amp; status</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Instansi</label>
            <input
              className="input"
              value={isi.instansi}
              onChange={(e) => set("instansi", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Judul</label>
            <input
              className="input"
              value={isi.judul}
              onChange={(e) => set("judul", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Subjudul / keterangan singkat</label>
            <input
              className="input"
              value={isi.subjudul}
              onChange={(e) => set("subjudul", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Total porsi</label>
            <input
              type="number"
              min={0}
              className="input"
              value={isi.porsi_total}
              onChange={(e) => set("porsi_total", Number(e.target.value))}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={isi.aktif}
              onChange={(e) => set("aktif", e.target.checked)}
            />
            Tayangkan ke publik
          </label>
        </div>
      </section>

      {/* Kandungan gizi */}
      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold text-gold-300">Kandungan gizi per porsi</h2>
        <p className="text-sm text-slate-400">
          Isi kandungan gizi untuk keempat kelompok penerima. Kelompok yang dibiarkan kosong
          otomatis disembunyikan di halaman publik.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {PORSI.map((p) => (
            <div
              key={p.key}
              className="rounded-lg border-l-4 border border-white/5 bg-white/[0.02] p-2"
              style={{ borderLeftColor: p.warna }}
            >
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-300">
                <span aria-hidden>{p.emoji}</span>
                {p.label.toUpperCase()}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {GIZI_LABEL.map(({ key, label, sat }) => (
                  <div key={key}>
                    <label className="label">
                      {label} ({sat})
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      className="input"
                      value={isi.gizi[p.key][key]}
                      onChange={(e) => setGizi(p.key, key, Number(e.target.value))}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Menu */}
      <section className="card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gold-300">Menu hari ini</h2>
          <button className="btn-gold px-3 py-1.5 text-sm" onClick={tambahMenu}>
            + Tambah item
          </button>
        </div>
        {isi.menu.length === 0 && <p className="text-sm text-slate-500">Belum ada item menu.</p>}
        <div className="space-y-2">
          {isi.menu.map((m, i) => (
            <div
              key={i}
              className="grid gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2 sm:grid-cols-[180px_1fr_auto]"
            >
              <div>
                <label className="label">Kategori</label>
                <select
                  className="input"
                  value={m.kategori}
                  onChange={(e) => setMenu(i, { kategori: e.target.value as KategoriMenu })}
                >
                  {KATEGORI_MENU.map((k) => (
                    <option key={k} value={k}>
                      {KATEGORI_MENU_LABEL[k]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Nama menu</label>
                <input
                  className="input"
                  value={m.nama}
                  onChange={(e) => setMenu(i, { nama: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <button
                  className="rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-300"
                  onClick={() => hapusMenu(i)}
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Batas konsumsi & peringatan */}
      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold text-gold-300">Batas waktu makan &amp; peringatan</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="label">Batas konsumsi (HH.MM)</label>
            <input
              className="input"
              placeholder="11.00"
              value={isi.batas_konsumsi}
              onChange={(e) => set("batas_konsumsi", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Zona waktu</label>
            <input
              className="input"
              placeholder="WIB"
              value={isi.zona}
              onChange={(e) => set("zona", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Akun sosial media (footer)</label>
            <input
              className="input"
              placeholder="@sppg..."
              value={isi.sosmed}
              onChange={(e) => set("sosmed", e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">Judul peringatan</label>
          <input
            className="input"
            value={isi.peringatan_judul}
            onChange={(e) => set("peringatan_judul", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Teks peringatan</label>
          <textarea
            className="input"
            rows={2}
            value={isi.peringatan_teks}
            onChange={(e) => set("peringatan_teks", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Catatan tambahan (opsional)</label>
          <textarea
            className="input"
            rows={2}
            value={isi.catatan}
            onChange={(e) => set("catatan", e.target.value)}
          />
        </div>
      </section>

      <div className="pb-8">
        <button className="btn-primary px-4 py-2" onClick={simpan} disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan"}
        </button>
      </div>
    </main>
  );
}
