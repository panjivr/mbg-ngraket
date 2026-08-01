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

/**
 * Buka share-sheet WhatsApp dengan teks pengumuman terisi.
 * Admin tinggal memilih grup/daftar broadcast tujuan — tanpa gateway berbayar,
 * tanpa mengubah data/skema. Gambar tidak ikut (WA share teks tidak dukung file).
 */
function waShare(judul: string, isi: string): void {
  const teks = isi.trim() ? `*${judul.trim()}*\n\n${isi.trim()}` : `*${judul.trim()}*`;
  window.open(`https://wa.me/?text=${encodeURIComponent(teks)}`, "_blank", "noopener,noreferrer");
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
        <div className="flex gap-2">
          <button onClick={submit} disabled={saving || !judul.trim()} className="btn-primary flex-1">
            {saving ? "Menyimpan…" : "Terbitkan"}
          </button>
          <button
            type="button"
            onClick={() => waShare(judul, isi)}
            disabled={!judul.trim()}
            title="Bagikan teks ini ke grup / daftar broadcast WhatsApp"
            className="btn-ghost inline-flex items-center gap-1.5 px-3 text-emerald-300 disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.38a9.85 9.85 0 0 0 4.74 1.2h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7A9.82 9.82 0 0 0 12.04 2Zm0 1.8c2.16 0 4.19.84 5.72 2.37a8.04 8.04 0 0 1 2.37 5.72c0 4.46-3.63 8.09-8.1 8.09-1.48 0-2.93-.4-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.03 8.03 0 0 1-1.24-4.32c0-4.46 3.63-8.09 8.1-8.09Zm4.68 10.24c-.26-.13-1.51-.75-1.75-.83-.24-.09-.4-.13-.58.13-.17.26-.66.83-.81 1-.15.17-.3.2-.55.07-.26-.13-1.08-.4-2.06-1.27-.76-.68-1.28-1.52-1.43-1.78-.15-.26-.02-.4.11-.53.12-.12.26-.3.39-.46.13-.15.17-.26.26-.44.09-.17.04-.33-.02-.46-.07-.13-.58-1.4-.8-1.92-.21-.5-.42-.43-.58-.44l-.5-.01c-.17 0-.44.07-.67.33-.24.26-.9.88-.9 2.15 0 1.27.92 2.5 1.05 2.67.13.17 1.8 2.76 4.37 3.87.61.26 1.09.42 1.46.54.61.2 1.17.17 1.62.1.49-.07 1.51-.62 1.72-1.21.21-.6.21-1.1.15-1.21-.06-.11-.24-.17-.5-.3Z" />
            </svg>
            WA
          </button>
        </div>
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
                  <button onClick={() => waShare(p.judul, p.isi)} className="btn-ghost px-2 py-1 text-emerald-300" title="Bagikan ke grup / broadcast WhatsApp">
                    💬 Bagikan WA
                  </button>
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
