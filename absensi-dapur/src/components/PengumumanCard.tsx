"use client";

import { useCallback, useEffect, useState } from "react";

interface Pengumuman {
  id: number;
  judul: string;
  isi: string;
  pinned: boolean;
  created_at: string;
  dibaca: boolean;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Kartu pengumuman aktif di layar absen karyawan, dengan tanda "sudah dibaca".
export default function PengumumanCard() {
  const [list, setList] = useState<Pengumuman[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/pengumuman", { cache: "no-store" });
      const data = await res.json();
      setList(data.pengumuman || []);
    } catch {
      // abaikan
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tandai = async (id: number) => {
    setList((prev) => prev.map((p) => (p.id === id ? { ...p, dibaca: true } : p)));
    await fetch("/api/pengumuman", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  if (!loaded || list.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-white/5 px-4 py-3 text-sm font-bold">📢 Pengumuman</div>
      <ul className="divide-y divide-white/5">
        {list.map((p) => (
          <li key={p.id} className={"px-4 py-3 " + (p.dibaca ? "" : "bg-gold-500/5")}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  {p.pinned && <span title="Disematkan">📌</span>}
                  <span className="font-medium">{p.judul}</span>
                  {!p.dibaca && (
                    <span className="rounded bg-gold-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-gold-300">
                      BARU
                    </span>
                  )}
                </div>
                {p.isi && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{p.isi}</p>}
                <p className="mt-1 text-xs text-slate-500">{fmt(p.created_at)}</p>
              </div>
              {!p.dibaca && (
                <button
                  onClick={() => tandai(p.id)}
                  className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/5"
                >
                  Tandai dibaca
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
