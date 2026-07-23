"use client";

import { useCallback, useEffect, useState } from "react";

interface Pengumuman {
  id: number;
  judul: string;
  isi: string;
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

export default function PengumumanPage() {
  const [list, setList] = useState<Pengumuman[]>([]);
  const [loading, setLoading] = useState(true);
  const [judul, setJudul] = useState("");
  const [isi, setIsi] = useState("");
  const [pinned, setPinned] = useState(false);
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
        body: JSON.stringify({ judul, isi, pinned }),
      });
      if (res.ok) {
        setJudul("");
        setIsi("");
        setPinned(false);
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
