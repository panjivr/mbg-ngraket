"use client";

import { useCallback, useEffect, useState } from "react";

interface Pengumuman {
  id: number;
  judul: string;
  isi: string;
  gambar?: string;
  pinned: boolean;
  aktif: boolean;
  created_at: string;
  dibaca: number;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Kompres gambar di sisi klien → data URL JPEG kecil (maks sisi 1000px). */
function kompresGambar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const MAX = 1000;
      let w = img.width;
      let h = img.height;
      if (Math.max(w, h) > MAX) {
        const s = MAX / Math.max(w, h);
        w = Math.round(w * s);
        h = Math.round(h * s);
      }
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx) return reject(new Error("Gagal memproses gambar."));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", 0.6));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gagal memuat gambar."));
    };
    img.src = url;
  });
}

export default function PengumumanPage() {
  const [list, setList] = useState<Pengumuman[]>([]);
  const [loading, setLoading] = useState(true);
  const [judul, setJudul] = useState("");
  const [isi, setIsi] = useState("");
  const [pinned, setPinned] = useState(false);
  const [gambar, setGambar] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pengumuman", { cache: "no-store" });
      const data = await res.json();
      setList(data.pengumuman || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!judul.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/pengumuman", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judul, isi, pinned, gambar }),
      });
      if (res.ok) {
        setJudul("");
        setIsi("");
        setPinned(false);
        setGambar("");
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  const patch = async (id: number, body: Record<string, unknown>) => {
    await fetch("/api/admin/pengumuman", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    await load();
  };

  const hapus = async (id: number) => {
    if (!confirm("Hapus pengumuman ini?")) return;
    await fetch(`/api/admin/pengumuman?id=${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">📢 Pengumuman</h1>

      <div className="card space-y-3 p-4">
        <p className="text-sm font-semibold">Buat Pengumuman</p>
        <input className="input" placeholder="Judul" value={judul} onChange={(e) => setJudul(e.target.value)} />
        <textarea className="input min-h-[80px]" placeholder="Isi pengumuman…" value={isi}
          onChange={(e) => setIsi(e.target.value)} />
        <div>
          <label className="mb-1 block text-sm text-slate-300">Gambar (opsional)</label>
          {gambar ? (
            <div className="flex items-start gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={gambar} alt="Pratinjau" className="max-h-40 rounded-lg border border-white/10 object-contain" />
              <button type="button" onClick={() => setGambar("")} className="btn-ghost px-2 py-1 text-xs text-rose-300">
                Hapus gambar
              </button>
            </div>
          ) : (
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  try {
                    setGambar(await kompresGambar(f));
                  } catch {
                    /* abaikan gambar gagal */
                  }
                }
                e.target.value = "";
              }}
              className="block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-slate-200"
            />
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
          📌 Sematkan di atas
        </label>
        <button onClick={submit} disabled={saving || !judul.trim()} className="btn-primary w-full">
          {saving ? "Menyimpan…" : "Terbitkan"}
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-white/5 px-4 py-3 text-sm font-semibold">
          Daftar Pengumuman
        </div>
        {loading ? (
          <p className="p-6 text-center text-slate-400">Memuat…</p>
        ) : list.length === 0 ? (
          <p className="p-6 text-center text-slate-400">Belum ada pengumuman.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {list.map((p) => (
              <li key={p.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {p.pinned && <span title="Disematkan">📌</span>}
                      <span className="font-medium">{p.judul}</span>
                      {!p.aktif && (
                        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-slate-400">nonaktif</span>
                      )}
                    </div>
                    {p.isi && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{p.isi}</p>}
                    {p.gambar && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.gambar} alt="Lampiran" className="mt-2 max-h-40 rounded-lg border border-white/10 object-contain" />
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      {fmt(p.created_at)} · dibaca {p.dibaca} orang
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <button onClick={() => patch(p.id, { pinned: !p.pinned })} className="btn-ghost px-2 py-1">
                    {p.pinned ? "Lepas sematan" : "📌 Sematkan"}
                  </button>
                  <button onClick={() => patch(p.id, { aktif: !p.aktif })} className="btn-ghost px-2 py-1">
                    {p.aktif ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                  <button onClick={() => hapus(p.id)} className="btn-ghost px-2 py-1 text-rose-300">
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
