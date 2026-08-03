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
}

const KATEGORI: { val: string; label: string }[] = [
  { val: "keluhan", label: "😟 Keluh kesah" },
  { val: "penilaian", label: "⭐ Penilaian" },
  { val: "masalah", label: "⚠️ Masalah" },
  { val: "saran", label: "💡 Saran" },
  { val: "lainnya", label: "📝 Lainnya" },
];

const STATUS_LABEL: Record<string, string> = {
  baru: "Terkirim",
  dibaca: "Dibaca admin",
  selesai: "Selesai",
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PengaduanPage() {
  const [list, setList] = useState<Pengaduan[]>([]);
  const [loading, setLoading] = useState(true);
  const [kategori, setKategori] = useState("keluhan");
  const [isi, setIsi] = useState("");
  const [anonim, setAnonim] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pesan, setPesan] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/me/pengaduan", { cache: "no-store" });
      const data = await res.json();
      setList(data.pengaduan || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (isi.trim().length < 5) {
      setPesan("Isi laporan minimal 5 karakter.");
      return;
    }
    setSaving(true);
    setPesan("");
    try {
      const res = await fetch("/api/me/pengaduan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kategori, isi, anonim }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsi("");
        setAnonim(false);
        setPesan("✅ Laporan terkirim ke manajemen. Terima kasih!");
        if (!anonim) await load();
      } else {
        setPesan(data.error || "Gagal mengirim.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">📮 Kotak Aspirasi</h1>
        <p className="mt-1 text-sm text-slate-400">
          Sampaikan keluh kesah, penilaian, masalah, atau saran langsung ke
          manajemen. Bisa dikirim anonim.
        </p>
      </div>

      <div className="card space-y-3 p-4">
        <div>
          <label className="mb-1 block text-sm text-slate-300">Kategori</label>
          <div className="scroll-x flex gap-2 overflow-x-auto pb-1">
            {KATEGORI.map((k) => (
              <button
                key={k.val}
                type="button"
                onClick={() => setKategori(k.val)}
                className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm ${
                  kategori === k.val
                    ? "border-gold-400/60 bg-gold-400/10 text-gold-300"
                    : "border-white/10 text-slate-300"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>
        <textarea
          className="input min-h-[120px]"
          placeholder="Tulis laporan / aspirasi kamu di sini…"
          value={isi}
          onChange={(e) => setIsi(e.target.value)}
          maxLength={4000}
        />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={anonim}
            onChange={(e) => setAnonim(e.target.checked)}
          />
          🕶️ Kirim anonim (nama saya disembunyikan dari admin)
        </label>
        {pesan && (
          <p
            className={`text-sm ${
              pesan.startsWith("✅") ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {pesan}
          </p>
        )}
        <button
          onClick={submit}
          disabled={saving || isi.trim().length < 5}
          className="btn-primary w-full"
        >
          {saving ? "Mengirim…" : "Kirim ke Manajemen"}
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-white/5 px-4 py-3 text-sm font-semibold">
          Laporan Saya
        </div>
        {loading ? (
          <p className="p-6 text-center text-slate-400">Memuat…</p>
        ) : list.length === 0 ? (
          <p className="p-6 text-center text-slate-400">
            Belum ada laporan. Laporan anonim tidak muncul di sini.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {list.map((p) => (
              <li key={p.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium capitalize">
                    {p.kategori}
                  </span>
                  <span
                    className={`badge ${
                      p.status === "selesai"
                        ? "text-emerald-300"
                        : p.status === "dibaca"
                          ? "text-sky-300"
                          : "text-slate-300"
                    }`}
                  >
                    {STATUS_LABEL[p.status] || p.status}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">
                  {p.isi}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">{fmt(p.created_at)}</p>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenId((cur) => (cur === p.id ? null : p.id))
                    }
                    className="text-xs font-medium text-gold-300 hover:text-gold-200"
                  >
                    {openId === p.id ? "Tutup chat ▲" : "💬 Buka chat ▼"}
                  </button>
                </div>
                {openId === p.id && (
                  <div className="mt-2">
                    <ChatAspirasi
                      base="/api/me/pengaduan"
                      id={p.id}
                      viewerIsAdmin={false}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
