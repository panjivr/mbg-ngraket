"use client";

import { useCallback, useEffect, useState } from "react";

interface Izin {
  id: number;
  user_id: number;
  nama: string;
  jenis: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  alasan: string;
  lampiran: string | null;
  status: string;
  catatan_admin: string | null;
  created_at: string;
}

function fmt(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const JENIS_LABEL: Record<string, string> = { izin: "Izin", sakit: "Sakit", cuti: "Cuti" };
const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  disetujui: "bg-emerald-500/15 text-emerald-300",
  ditolak: "bg-rose-500/15 text-rose-300",
};

export default function AdminIzinPage() {
  const [list, setList] = useState<Izin[]>([]);
  const [pending, setPending] = useState(0);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = filter ? `?status=${filter}` : "";
      const res = await fetch(`/api/admin/izin${q}`, { cache: "no-store" });
      const data = await res.json();
      setList(data.izin || []);
      setPending(data.pending || 0);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (id: number, status: "disetujui" | "ditolak") => {
    let catatan: string | null = null;
    if (status === "ditolak") {
      catatan = prompt("Catatan penolakan (opsional):") || null;
    }
    setBusy(id);
    try {
      const res = await fetch("/api/admin/izin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, catatan_admin: catatan }),
      });
      if (res.ok) await load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">📝 Izin & Cuti</h1>
        {pending > 0 && (
          <span className="rounded-lg bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-300">
            {pending} menunggu persetujuan
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["", "Semua"],
          ["pending", "Menunggu"],
          ["disetujui", "Disetujui"],
          ["ditolak", "Ditolak"],
        ].map(([v, label]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={
              "rounded-lg px-3 py-1.5 text-sm " +
              (filter === v ? "bg-gold-500/15 text-gold-400" : "text-slate-400 hover:bg-white/5")
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <p className="p-6 text-center text-slate-400">Memuat…</p>
        ) : list.length === 0 ? (
          <p className="p-6 text-center text-slate-400">Tidak ada pengajuan.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {list.map((i) => (
              <li key={i.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{i.nama}</span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-slate-300">
                      {JENIS_LABEL[i.jenis] || i.jenis}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[i.status] || ""}`}>
                      {i.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {fmt(i.tanggal_mulai)}
                    {i.tanggal_selesai !== i.tanggal_mulai ? ` – ${fmt(i.tanggal_selesai)}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">{i.alasan}</p>
                  {i.catatan_admin && (
                    <p className="mt-1 text-xs text-slate-400">Catatan: {i.catatan_admin}</p>
                  )}
                  {i.lampiran && (
                    <button onClick={() => setPreview(i.lampiran)} className="mt-1 text-xs text-gold-400 hover:underline">
                      Lihat lampiran
                    </button>
                  )}
                </div>
                {i.status === "pending" && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => review(i.id, "disetujui")}
                      disabled={busy === i.id}
                      className="rounded-md bg-emerald-500/90 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Setujui
                    </button>
                    <button
                      onClick={() => review(i.id, "ditolak")}
                      disabled={busy === i.id}
                      className="rounded-md bg-rose-500/90 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                    >
                      Tolak
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          onClick={() => setPreview(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Lampiran" className="max-h-[85vh] max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
