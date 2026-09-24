"use client";

import { useCallback, useEffect, useState } from "react";

interface Turnamen {
  id: number;
  nama: string;
  mulai: string;
  selesai: string;
  hadiah1: string;
  hadiah2: string;
  hadiah3: string;
  catatan: string;
  status: "menunggu" | "berlangsung" | "selesai";
}

interface PapanRow {
  user_id: number;
  nama: string;
  username: string;
  sppg_nama: string | null;
  skor: number;
  peringkat: number;
}

const MEDALI = ["🥇", "🥈", "🥉"];
const angka = new Intl.NumberFormat("id-ID");

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Default: input datetime-local butuh format YYYY-MM-DDTHH:mm (waktu lokal).
function localInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const badge: Record<Turnamen["status"], string> = {
  berlangsung: "bg-emerald-500/20 text-emerald-300",
  menunggu: "bg-sky-500/20 text-sky-300",
  selesai: "bg-slate-500/20 text-slate-300",
};
const badgeLabel: Record<Turnamen["status"], string> = {
  berlangsung: "Berlangsung",
  menunggu: "Akan Datang",
  selesai: "Selesai",
};

export default function TurnamenAdmin() {
  const [list, setList] = useState<Turnamen[]>([]);
  const [loading, setLoading] = useState(true);
  const [pesan, setPesan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ id: number; papan: PapanRow[] } | null>(null);
  const [saving, setSaving] = useState(false);

  const kosong = () => {
    const now = new Date();
    const besok = new Date(now.getTime() + 7 * 86400_000);
    return {
      nama: "",
      mulai: localInput(now),
      selesai: localInput(besok),
      hadiah1: "",
      hadiah2: "",
      hadiah3: "",
      catatan: "",
    };
  };
  const [form, setForm] = useState(kosong());

  const muat = useCallback(async () => {
    try {
      const r = await fetch("/api/game/turnamen", { cache: "no-store" });
      const d = await r.json();
      setList(d.turnamen ?? []);
    } catch {
      setError("Gagal memuat daftar turnamen.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  const set = (k: keyof ReturnType<typeof kosong>, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPesan(null);
    setSaving(true);
    try {
      const r = await fetch("/api/game/turnamen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: form.nama,
          mulai: new Date(form.mulai).toISOString(),
          selesai: new Date(form.selesai).toISOString(),
          hadiah1: form.hadiah1,
          hadiah2: form.hadiah2,
          hadiah3: form.hadiah3,
          catatan: form.catatan,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan.");
      setPesan("Turnamen berhasil dibuat.");
      setForm(kosong());
      muat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function hapus(id: number) {
    if (!confirm("Hapus turnamen ini? Riwayat skor pemain tetap tersimpan.")) return;
    try {
      const r = await fetch(`/api/game/turnamen/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      if (detail?.id === id) setDetail(null);
      muat();
    } catch {
      setError("Gagal menghapus turnamen.");
    }
  }

  async function lihatHasil(id: number) {
    if (detail?.id === id) {
      setDetail(null);
      return;
    }
    try {
      const r = await fetch(`/api/game/turnamen/${id}`, { cache: "no-store" });
      const d = await r.json();
      setDetail({ id, papan: d.papan ?? [] });
    } catch {
      setError("Gagal memuat hasil turnamen.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">🏆 Turnamen Game Blok Gizi</h1>
        <p className="text-sm text-slate-400">
          Buat turnamen berhadiah untuk seluruh karyawan. Pemenang ditentukan
          dari skor tertinggi selama rentang waktu turnamen.
        </p>
      </div>

      {/* Form buat turnamen */}
      <form onSubmit={simpan} className="card space-y-4 p-5">
        <p className="text-sm font-semibold text-slate-200">Buat Turnamen Baru</p>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">
            Nama Turnamen
          </label>
          <input
            required
            value={form.nama}
            onChange={(e) => set("nama", e.target.value)}
            placeholder="Turnamen Blok Gizi Kemerdekaan"
            className="input w-full"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Waktu Mulai
            </label>
            <input
              required
              type="datetime-local"
              value={form.mulai}
              onChange={(e) => set("mulai", e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Waktu Selesai
            </label>
            <input
              required
              type="datetime-local"
              value={form.selesai}
              onChange={(e) => set("selesai", e.target.value)}
              className="input w-full"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              🥇 Hadiah Juara 1
            </label>
            <input
              value={form.hadiah1}
              onChange={(e) => set("hadiah1", e.target.value)}
              placeholder="mis. Rp500.000"
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              🥈 Hadiah Juara 2
            </label>
            <input
              value={form.hadiah2}
              onChange={(e) => set("hadiah2", e.target.value)}
              placeholder="mis. Rp300.000"
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              🥉 Hadiah Juara 3
            </label>
            <input
              value={form.hadiah3}
              onChange={(e) => set("hadiah3", e.target.value)}
              placeholder="mis. Rp150.000"
              className="input w-full"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">
            Catatan (opsional)
          </label>
          <textarea
            value={form.catatan}
            onChange={(e) => set("catatan", e.target.value)}
            rows={2}
            placeholder="Aturan, cara klaim hadiah, dll."
            className="input w-full resize-none"
          />
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}
        {pesan && <p className="text-sm text-emerald-400">{pesan}</p>}

        <button type="submit" disabled={saving} className="btn-primary px-4 py-2 text-sm">
          {saving ? "Menyimpan…" : "Buat Turnamen"}
        </button>
      </form>

      {/* Daftar turnamen */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-200">Daftar Turnamen</p>
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-500">Memuat…</p>
        ) : list.length === 0 ? (
          <p className="card p-6 text-center text-sm text-slate-500">
            Belum ada turnamen.
          </p>
        ) : (
          list.map((t) => (
            <div key={t.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-100">{t.nama}</p>
                    <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold " + badge[t.status]}>
                      {badgeLabel[t.status]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {fmt(t.mulai)} — {fmt(t.selesai)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => lihatHasil(t.id)}
                    className="btn-ghost px-3 py-1.5 text-xs"
                  >
                    {detail?.id === t.id ? "Tutup" : "Lihat Hasil"}
                  </button>
                  <button
                    onClick={() => hapus(t.id)}
                    className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10"
                  >
                    Hapus
                  </button>
                </div>
              </div>

              {(t.hadiah1 || t.hadiah2 || t.hadiah3) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[t.hadiah1, t.hadiah2, t.hadiah3].map((h, i) =>
                    h ? (
                      <span key={i} className="rounded-lg bg-white/5 px-2 py-1 text-[11px] text-slate-200">
                        {MEDALI[i]} {h}
                      </span>
                    ) : null,
                  )}
                </div>
              )}
              {t.catatan && <p className="mt-2 text-xs text-slate-400">{t.catatan}</p>}

              {detail?.id === t.id && (
                <div className="mt-3 border-t border-white/10 pt-3">
                  {detail.papan.length === 0 ? (
                    <p className="py-3 text-center text-xs text-slate-500">
                      Belum ada peserta bermain di rentang waktu turnamen ini.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {detail.papan.map((r) => (
                        <div
                          key={r.user_id}
                          className={
                            "flex items-center gap-3 rounded-lg px-3 py-2 " +
                            (r.peringkat <= 3 ? "bg-gold-500/10" : "odd:bg-white/[0.03]")
                          }
                        >
                          <span className="w-7 text-center text-sm font-bold">
                            {r.peringkat <= 3 ? MEDALI[r.peringkat - 1] : r.peringkat}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-100">{r.nama}</p>
                            <p className="truncate text-[11px] text-slate-500">
                              @{r.username}
                              {r.sppg_nama ? ` · ${r.sppg_nama}` : ""}
                            </p>
                          </div>
                          <span className="text-sm font-black tabular-nums text-gold-400">
                            {angka.format(r.skor)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
