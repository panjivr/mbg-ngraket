"use client";

/**
 * Arsip / "kalender" Berita Acara. Pilih tanggal → tampil semua BA yang
 * tersimpan pada tanggal itu. Tiap item bisa dibuka/cetak ulang atau dihapus.
 */
import { useEffect, useState, useCallback } from "react";

interface BaItem {
  id: number;
  slug: string;
  judul: string;
  nomor: string;
  tanggal: string;
  dibuat_oleh: string;
  updated_at: string;
}

function todayJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function ArsipPage() {
  const [tanggal, setTanggal] = useState("");
  const [items, setItems] = useState<BaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const muat = useCallback(async (tgl: string) => {
    if (!tgl) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/akuntan/ba?tanggal=${encodeURIComponent(tgl)}`,
      );
      const data = (await res.json().catch(() => ({}))) as {
        items?: BaItem[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Gagal memuat arsip.");
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Default tanggal hari ini setelah mount, lalu muat.
  useEffect(() => {
    const t = todayJakarta();
    setTanggal(t);
    muat(t);
  }, [muat]);

  const hapus = async (id: number) => {
    if (!confirm("Hapus BA ini dari arsip?")) return;
    try {
      const res = await fetch(`/api/admin/akuntan/ba/${id}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Gagal menghapus.");
      setItems((s) => s.filter((x) => x.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal menghapus.");
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">🗓️ Arsip Berita Acara</h1>
          <p className="mt-1 text-sm text-slate-400">
            Pilih tanggal untuk melihat semua BA yang tersimpan pada hari itu.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">Tanggal</label>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => {
              setTanggal(e.target.value);
              muat(e.target.value);
            }}
            className="rounded-lg border border-ink-700 bg-ink-900 px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      {loading && <p className="text-sm text-slate-400">Memuat…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-slate-500">
          Tidak ada BA tersimpan pada tanggal ini.
        </p>
      )}

      <div className="grid gap-3">
        {items.map((it) => (
          <div
            key={it.id}
            className="card flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold">{it.judul}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {it.nomor || "—"} · {it.tanggal}
                {it.dibuat_oleh ? ` · oleh ${it.dibuat_oleh}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/cetak/akuntan/tersimpan/${it.id}`}
                className="rounded-lg bg-gold-600 px-3 py-1.5 text-sm font-semibold text-black"
              >
                Lihat / Cetak
              </a>
              <button
                type="button"
                onClick={() => hapus(it.id)}
                className="rounded-lg border border-red-500/40 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10"
              >
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
