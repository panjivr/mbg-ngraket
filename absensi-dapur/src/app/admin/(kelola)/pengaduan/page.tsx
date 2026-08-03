"use client";

import { useCallback, useEffect, useState } from "react";
import ChatAspirasi from "@/components/ChatAspirasi";

interface Pengaduan {
  id: number;
  kategori: string;
  isi: string;
  anonim: boolean;
  status: string;
  balasan: string | null;
  dibalas_at: string | null;
  created_at: string;
  pelapor: string | null;
  jabatan: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  baru: "Baru",
  dibaca: "Dibaca",
  selesai: "Selesai",
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminPengaduanPage() {
  const [list, setList] = useState<Pengaduan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"semua" | "baru" | "selesai">("semua");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pengaduan", { cache: "no-store" });
      const data = await res.json();
      setList(data.pengaduan || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (id: number, body: Record<string, unknown>) => {
    await fetch("/api/admin/pengaduan", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    await load();
  };

  const tampil = list.filter((p) =>
    filter === "semua" ? true : p.status === filter,
  );
  const jmlBaru = list.filter((p) => p.status === "baru").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">📮 Kotak Aspirasi Pegawai</h1>
        {jmlBaru > 0 && (
          <span className="badge text-rose-300">{jmlBaru} baru</span>
        )}
      </div>

      <div className="flex gap-2">
        {(["semua", "baru", "selesai"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg border px-3 py-1.5 text-sm capitalize ${
              filter === f
                ? "border-gold-400/60 bg-gold-400/10 text-gold-300"
                : "border-white/10 text-slate-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="p-6 text-center text-slate-400">Memuat…</p>
      ) : tampil.length === 0 ? (
        <p className="card p-6 text-center text-slate-400">
          Tidak ada laporan.
        </p>
      ) : (
        <ul className="space-y-3">
          {tampil.map((p) => (
            <li key={p.id} className="card space-y-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold capitalize">
                    {p.kategori}
                  </span>
                  <span
                    className={`badge ${
                      p.status === "selesai"
                        ? "text-emerald-300"
                        : p.status === "dibaca"
                          ? "text-sky-300"
                          : "text-rose-300"
                    }`}
                  >
                    {STATUS_LABEL[p.status] || p.status}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {fmt(p.created_at)}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {p.anonim ? (
                  <span className="italic">🕶️ Anonim</span>
                ) : (
                  <>
                    {p.pelapor || "—"}
                    {p.jabatan && <span> · {p.jabatan}</span>}
                  </>
                )}
              </p>
              <p className="whitespace-pre-wrap text-sm text-slate-200">
                {p.isi}
              </p>

              {p.anonim ? (
                <div className="space-y-2 border-t border-white/5 pt-2">
                  <p className="text-xs italic text-slate-500">
                    Laporan anonim — tidak bisa dibalas via chat (identitas
                    pelapor disembunyikan).
                  </p>
                  {p.status !== "selesai" && (
                    <button
                      onClick={() => patch(p.id, { status: "selesai" })}
                      className="btn-ghost px-3 py-1.5 text-xs text-emerald-300"
                    >
                      Tandai selesai
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2 border-t border-white/5 pt-2">
                  <ChatAspirasi
                    base="/api/admin/pengaduan"
                    id={p.id}
                    viewerIsAdmin={true}
                  />
                  {p.status !== "selesai" && (
                    <button
                      onClick={() => patch(p.id, { status: "selesai" })}
                      className="btn-ghost px-3 py-1.5 text-xs text-emerald-300"
                    >
                      Tandai selesai
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
