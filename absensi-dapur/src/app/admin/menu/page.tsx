"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KATEGORI_MENU_LABEL,
  KATEGORI_MENU_LIST,
  PEMBULATAN_LABEL,
  PEMBULATAN_LIST,
  KOMPONEN_GIZI,
  KOMPONEN_GIZI_LIST,
  KOMPONEN_INTI,
  komponenKurang,
  skalaBahan,
  perPorsi,
  fmtJumlah,
  fmtKecil,
  type KategoriMenu,
  type KomponenGizi,
  type MenuLengkap,
  type MenuBahan,
  type Pembulatan,
} from "@/lib/menu";
import QuoteBanner from "@/components/QuoteBanner";

interface BarangPilih {
  id: number;
  nama: string;
  satuan: string;
  kategori: string;
}

// Baris bahan versi editor (tanpa id/menu_id, boleh sedang diketik).
interface BahanDraft {
  barang_id: number | null;
  nama: string;
  satuan: string;
  jumlah_dasar: number;
  pembulatan: Pembulatan;
  komponen: KomponenGizi;
}

function toDraft(b: MenuBahan): BahanDraft {
  return {
    barang_id: b.barang_id,
    nama: b.nama,
    satuan: b.satuan,
    jumlah_dasar: b.jumlah_dasar,
    pembulatan: b.pembulatan,
    komponen: b.komponen,
  };
}

export default function MenuPage() {
  const [menus, setMenus] = useState<MenuLengkap[]>([]);
  const [barang, setBarang] = useState<BarangPilih[]>([]);
  const [selId, setSelId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/menu", { cache: "no-store" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setMenus(d.menu || []);
        setBarang(d.barang || []);
        setSelId((prev) => prev ?? (d.menu?.[0]?.id ?? null));
      } else {
        setErr(d?.error || `Gagal memuat (kode ${res.status}).`);
      }
    } catch {
      setErr("Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const tambahMenu = async () => {
    const nama = prompt("Nama menu baru:")?.trim();
    if (!nama) return;
    const res = await fetch("/api/admin/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama, porsi_dasar: 1000 }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      await load();
      setSelId(d.menu?.id ?? null);
    } else {
      alert(d?.error || "Gagal membuat menu.");
    }
  };

  const duplikatMenu = async (m: MenuLengkap) => {
    const nama = prompt("Nama menu salinan:", `${m.nama} (salinan)`)?.trim();
    if (!nama) return;
    const res = await fetch("/api/admin/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama, duplikat_dari: m.id }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      await load();
      setSelId(d.menu?.id ?? null);
    } else {
      alert(d?.error || "Gagal menduplikat menu.");
    }
  };

  const selected = menus.find((m) => m.id === selId) || null;

  return (
    <div className="space-y-4">
      <QuoteBanner />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">🍱 Bank Menu &amp; Kalkulasi Bahan</h1>
          <p className="text-xs text-slate-400">
            Kunci bahan pada satu porsi dasar (mis. 2000). Sistem membagi/mengalikan otomatis ke
            porsi berapa pun.
          </p>
        </div>
        <button onClick={tambahMenu} className="btn-primary">
          + Menu baru
        </button>
      </div>

      {err && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          ⚠️ {err}
        </p>
      )}

      {loading ? (
        <div className="card p-6 text-center text-slate-400">Memuat…</div>
      ) : menus.length === 0 ? (
        <div className="card p-6 text-center text-slate-400">
          Belum ada menu. Klik <b>+ Menu baru</b> untuk mulai.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
          {/* Daftar menu */}
          <div className="card h-max space-y-1 p-2">
            {menus.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelId(m.id)}
                className={
                  "flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm " +
                  (m.id === selId ? "bg-gold-500/15 text-gold-300" : "hover:bg-white/5")
                }
              >
                <span className="font-medium">{m.nama || "(tanpa nama)"}</span>
                <span className="text-[11px] text-slate-500">
                  {KATEGORI_MENU_LABEL[m.kategori]} · dasar {fmtJumlah(m.porsi_dasar)} porsi ·{" "}
                  {m.bahan.length} bahan{!m.aktif && " · nonaktif"}
                </span>
              </button>
            ))}
          </div>

          {/* Editor menu terpilih */}
          {selected && (
            <MenuEditor
              key={selected.id}
              menu={selected}
              barang={barang}
              onSaved={load}
              onDuplikat={() => duplikatMenu(selected)}
              onDeleted={() => {
                setSelId(null);
                load();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MenuEditor({
  menu,
  barang,
  onSaved,
  onDuplikat,
  onDeleted,
}: {
  menu: MenuLengkap;
  barang: BarangPilih[];
  onSaved: () => void;
  onDuplikat: () => void;
  onDeleted: () => void;
}) {
  const [nama, setNama] = useState(menu.nama);
  const [kategori, setKategori] = useState<KategoriMenu>(menu.kategori);
  const [porsiDasar, setPorsiDasar] = useState<number>(menu.porsi_dasar);
  const [keterangan, setKeterangan] = useState(menu.keterangan);
  const [aktif, setAktif] = useState(menu.aktif);
  const [bahan, setBahan] = useState<BahanDraft[]>(menu.bahan.map(toDraft));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [porsiTarget, setPorsiTarget] = useState<number>(menu.porsi_dasar);

  const updBahan = (i: number, patch: Partial<BahanDraft>) =>
    setBahan((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));

  const pilihBarang = (i: number, val: string) => {
    if (val === "") {
      updBahan(i, { barang_id: null }); // ketik bebas — biarkan nama/satuan
      return;
    }
    const b = barang.find((x) => x.id === Number(val));
    if (b) updBahan(i, { barang_id: b.id, nama: b.nama, satuan: b.satuan });
  };

  const addBahan = () =>
    setBahan((prev) => [
      ...prev,
      { barang_id: null, nama: "", satuan: "kg", jumlah_dasar: 0, pembulatan: "desimal", komponen: "lainnya" },
    ]);
  const delBahan = (i: number) => setBahan((prev) => prev.filter((_, idx) => idx !== i));

  const simpan = async () => {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/menu/${menu.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama,
          kategori,
          porsi_dasar: porsiDasar,
          keterangan,
          aktif,
          bahan: bahan.filter((b) => b.nama.trim()),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg("Tersimpan.");
        onSaved();
      } else {
        setMsg(d?.error || "Gagal menyimpan.");
      }
    } finally {
      setSaving(false);
    }
  };

  const hapus = async () => {
    if (!confirm(`Hapus menu "${menu.nama}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    const res = await fetch(`/api/admin/menu/${menu.id}`, { method: "DELETE" });
    if (res.ok) onDeleted();
    else alert("Gagal menghapus.");
  };

  const faktor = porsiDasar > 0 ? porsiTarget / porsiDasar : 0;
  const hasil = useMemo(
    () =>
      bahan
        .filter((b) => b.nama.trim())
        .map((b) => ({
          nama: b.nama,
          satuan: b.satuan,
          komponen: b.komponen,
          dasar: b.jumlah_dasar,
          perPorsi: perPorsi(b.jumlah_dasar, porsiDasar),
          target: skalaBahan(b.jumlah_dasar, porsiDasar, porsiTarget, b.pembulatan),
        })),
    [bahan, porsiDasar, porsiTarget],
  );

  // Cek kelengkapan komponen "Isi Piringku" (untuk ahli gizi).
  const kurang = useMemo(
    () => komponenKurang(bahan.filter((b) => b.nama.trim())),
    [bahan],
  );

  return (
    <div className="space-y-4">
      {/* Data menu */}
      <div className="card space-y-3 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nama menu</label>
            <input className="input" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="mis. Ayam Kecap + Sayur" />
          </div>
          <div>
            <label className="label">Kategori</label>
            <select className="input" value={kategori} onChange={(e) => setKategori(e.target.value as KategoriMenu)}>
              {KATEGORI_MENU_LIST.map((k) => (
                <option key={k} value={k}>
                  {KATEGORI_MENU_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Porsi dasar (jumlah bahan dikunci di sini)</label>
            <input
              type="number"
              min={1}
              className="input"
              value={porsiDasar}
              onChange={(e) => setPorsiDasar(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Keterangan (opsional)</label>
            <input className="input" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="catatan cara masak / porsi / dll" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-gold-500" checked={aktif} onChange={(e) => setAktif(e.target.checked)} />
          Menu aktif
        </label>
      </div>

      {/* Daftar bahan */}
      <div className="card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Bahan (untuk {fmtJumlah(porsiDasar)} porsi)</h3>
          <button onClick={addBahan} className="btn-ghost px-2.5 py-1 text-xs">
            + Bahan
          </button>
        </div>
        {bahan.length === 0 ? (
          <p className="text-xs text-slate-500">Belum ada bahan. Klik <b>+ Bahan</b>.</p>
        ) : (
          <div className="scroll-x overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr className="border-b border-white/5">
                  <th className="px-2 py-2">Sumber</th>
                  <th className="px-2 py-2">Nama bahan</th>
                  <th className="px-2 py-2">Komponen gizi</th>
                  <th className="px-2 py-2">Jumlah</th>
                  <th className="px-2 py-2">Satuan</th>
                  <th className="px-2 py-2">Pembulatan</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bahan.map((b, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1.5">
                      <select className="input py-1" value={b.barang_id ?? ""} onChange={(e) => pilihBarang(i, e.target.value)}>
                        <option value="">✍️ Ketik bebas</option>
                        {barang.map((x) => (
                          <option key={x.id} value={x.id}>
                            📦 {x.nama}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        className="input py-1"
                        value={b.nama}
                        onChange={(e) => updBahan(i, { nama: e.target.value })}
                        disabled={b.barang_id !== null}
                        placeholder="nama bahan"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        className="input py-1"
                        value={b.komponen}
                        onChange={(e) => updBahan(i, { komponen: e.target.value as KomponenGizi })}
                      >
                        {KOMPONEN_GIZI_LIST.map((k) => (
                          <option key={k} value={k}>
                            {KOMPONEN_GIZI[k].emoji} {KOMPONEN_GIZI[k].label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        className="input w-24 py-1"
                        value={b.jumlah_dasar}
                        onChange={(e) => updBahan(i, { jumlah_dasar: Math.max(0, Number(e.target.value) || 0) })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        className="input w-20 py-1"
                        value={b.satuan}
                        onChange={(e) => updBahan(i, { satuan: e.target.value })}
                        disabled={b.barang_id !== null}
                        placeholder="kg"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select className="input py-1" value={b.pembulatan} onChange={(e) => updBahan(i, { pembulatan: e.target.value as Pembulatan })}>
                        {PEMBULATAN_LIST.map((p) => (
                          <option key={p} value={p}>
                            {PEMBULATAN_LABEL[p]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <button onClick={() => delBahan(i)} className="btn-ghost px-2 py-1 text-[11px] text-red-400">
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Cek kelengkapan gizi "Isi Piringku" untuk ahli gizi */}
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Kelengkapan gizi (Isi Piringku)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {KOMPONEN_INTI.map((k) => {
              const ada = !kurang.includes(k);
              return (
                <span
                  key={k}
                  className={
                    "rounded-full px-2 py-0.5 text-[11px] font-medium " +
                    (ada
                      ? "bg-green-500/15 text-green-300"
                      : "bg-white/5 text-slate-500 line-through")
                  }
                >
                  {KOMPONEN_GIZI[k].emoji} {KOMPONEN_GIZI[k].label} {ada ? "✓" : ""}
                </span>
              );
            })}
          </div>
          {kurang.length > 0 && (
            <p className="mt-2 text-[11px] text-amber-300/90">
              ⚠️ Komponen inti belum ada: {kurang.map((k) => KOMPONEN_GIZI[k].label).join(", ")}.
              Menu makan utama idealnya memuat karbohidrat, protein hewani, sayur, dan buah.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={simpan} disabled={saving} className="btn-primary">
            {saving ? "Menyimpan…" : "💾 Simpan Menu"}
          </button>
          <button onClick={onDuplikat} className="btn-ghost px-3 py-1.5 text-sm">
            📑 Duplikat menu
          </button>
          <button onClick={hapus} className="btn-ghost px-3 py-1.5 text-sm text-red-400">
            Hapus menu
          </button>
          {msg && <span className="text-sm text-slate-300">{msg}</span>}
        </div>
      </div>

      {/* Kalkulator scaling */}
      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">🧮 Hitung kebutuhan bahan</h3>
            <p className="text-[11px] text-slate-500">
              Faktor skala: {fmtJumlah(Number(faktor.toFixed(4)))}× (dari {fmtJumlah(porsiDasar)} porsi)
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="label">Untuk berapa porsi?</label>
              <input
                type="number"
                min={0}
                className="input w-32"
                value={porsiTarget}
                onChange={(e) => setPorsiTarget(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
            <a
              href={`/cetak/menu-belanja?menu=${menu.id}&porsi=${porsiTarget}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost px-3 py-2 text-sm"
            >
              🖨️ Cetak Belanja
            </a>
          </div>
        </div>
        {hasil.length === 0 ? (
          <p className="text-xs text-slate-500">Tambahkan bahan dulu untuk melihat hitungan.</p>
        ) : (
          <div className="scroll-x overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr className="border-b border-white/5">
                  <th className="px-2 py-2">Bahan</th>
                  <th className="px-2 py-2 text-right">Per porsi</th>
                  <th className="px-2 py-2 text-right">Dasar</th>
                  <th className="px-2 py-2 text-right">Butuh ({fmtJumlah(porsiTarget)} porsi)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {hasil.map((h, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1.5">
                      <span
                        className="mr-1.5"
                        title={KOMPONEN_GIZI[h.komponen].label}
                      >
                        {KOMPONEN_GIZI[h.komponen].emoji}
                      </span>
                      {h.nama}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right text-slate-400">
                      {fmtKecil(h.perPorsi)} {h.satuan}
                    </td>
                    <td className="px-2 py-1.5 text-right text-slate-400">
                      {fmtJumlah(h.dasar)} {h.satuan}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right font-semibold text-gold-300">
                      {fmtJumlah(h.target)} {h.satuan}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
