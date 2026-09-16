"use client";

import { useCallback, useEffect, useState } from "react";
import {
  INFO_GIZI_KOSONG,
  KATEGORI_MENU,
  KATEGORI_MENU_LABEL,
  GIZI_LABEL,
  type InfoGiziIsi,
  type GiziPorsi,
  type KategoriMenu,
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

export default function AdminInfoGiziPage() {
  const [tanggal, setTanggal] = useState(jakartaToday());
  const [data, setData] = useState<Data | null>(null);
  const [isi, setIsi] = useState<InfoGiziIsi>(INFO_GIZI_KOSONG);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

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

  const setGizi = (porsi: "gizi_kecil" | "gizi_besar", k: keyof GiziPorsi, v: number) =>
    setIsi((s) => ({ ...s, [porsi]: { ...s[porsi], [k]: v } }));

  const setMenu = (i: number, patch: Partial<InfoGiziIsi["menu"][number]>) =>
    setIsi((s) => ({ ...s, menu: s.menu.map((m, j) => (j === i ? { ...m, ...patch } : m)) }));

  const tambahMenu = () =>
    setIsi((s) => ({
      ...s,
      menu: [...s.menu, { kategori: "karbohidrat", nama: "", harga_kecil: 0, harga_besar: 0 }],
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
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={isi.tampil_harga}
              onChange={(e) => set("tampil_harga", e.target.checked)}
            />
            Tampilkan harga per item
          </label>
        </div>
      </section>

      {/* Kandungan gizi */}
      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold text-gold-300">Kandungan gizi per porsi</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["gizi_kecil", "gizi_besar"] as const).map((porsi) => (
            <div key={porsi} className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
              <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400">
                {porsi === "gizi_kecil" ? "PORSI KECIL" : "PORSI BESAR"}
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
                      value={isi[porsi][key]}
                      onChange={(e) => setGizi(porsi, key, Number(e.target.value))}
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
              className="grid gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2 sm:grid-cols-[150px_1fr_110px_110px_auto]"
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
              <div>
                <label className="label">Harga kecil</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={m.harga_kecil}
                  onChange={(e) => setMenu(i, { harga_kecil: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Harga besar</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={m.harga_besar}
                  onChange={(e) => setMenu(i, { harga_besar: Number(e.target.value) })}
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
