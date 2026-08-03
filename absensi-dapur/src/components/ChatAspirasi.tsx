"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Pesan {
  from_admin: boolean;
  isi: string;
  nama: string | null;
  created_at: string;
}

interface Props {
  /** Base endpoint tanpa id, mis. "/api/me/pengaduan" atau "/api/admin/pengaduan". */
  base: string;
  id: number;
  /** TRUE bila yang melihat adalah admin — menentukan sisi bubble "milik saya". */
  viewerIsAdmin: boolean;
}

function jam(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Panel chat 2 arah untuk satu thread aspirasi/pengaduan. Menampilkan gelembung
 * pesan (pegawai vs manajemen) dan kolom balas. Dipakai di sisi pegawai dan admin.
 */
export default function ChatAspirasi({ base, id, viewerIsAdmin }: Props) {
  const [pesan, setPesan] = useState<Pesan[]>([]);
  const [loading, setLoading] = useState(true);
  const [teks, setTeks] = useState("");
  const [kirim, setKirim] = useState(false);
  const [err, setErr] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${base}/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setPesan(data.messages || []);
    } finally {
      setLoading(false);
    }
  }, [base, id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
  }, [pesan]);

  const submit = async () => {
    const isi = teks.trim();
    if (!isi) return;
    setKirim(true);
    setErr("");
    try {
      const res = await fetch(`${base}/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isi }),
      });
      const data = await res.json();
      if (res.ok) {
        setTeks("");
        await load();
      } else {
        setErr(data.error || "Gagal mengirim.");
      }
    } finally {
      setKirim(false);
    }
  };

  return (
    <div className="space-y-2">
      <div
        ref={boxRef}
        className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-white/5 bg-black/20 p-3"
      >
        {loading ? (
          <p className="text-center text-sm text-slate-400">Memuat…</p>
        ) : pesan.length === 0 ? (
          <p className="text-center text-sm text-slate-400">Belum ada pesan.</p>
        ) : (
          pesan.map((p, i) => {
            const mine = p.from_admin === viewerIsAdmin;
            return (
              <div
                key={i}
                className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    p.from_admin
                      ? "bg-gold-400/15 text-gold-100"
                      : "bg-white/10 text-slate-100"
                  }`}
                >
                  <p className="mb-0.5 text-[11px] font-semibold opacity-70">
                    {p.from_admin ? p.nama || "Manajemen" : p.nama || "Pegawai"}
                  </p>
                  <p className="whitespace-pre-wrap">{p.isi}</p>
                </div>
                <span className="mt-0.5 text-[10px] text-slate-500">
                  {jam(p.created_at)}
                </span>
              </div>
            );
          })
        )}
      </div>
      {err && <p className="text-sm text-rose-300">{err}</p>}
      <div className="flex items-end gap-2">
        <textarea
          className="input min-h-[44px] flex-1 resize-none py-2"
          placeholder="Tulis balasan…"
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          maxLength={4000}
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          onClick={submit}
          disabled={kirim || teks.trim().length === 0}
          className="btn-primary shrink-0 px-4"
        >
          {kirim ? "…" : "Kirim"}
        </button>
      </div>
    </div>
  );
}
