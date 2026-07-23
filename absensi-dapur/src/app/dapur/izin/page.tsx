"use client";

import { useCallback, useEffect, useState } from "react";
import { compressImage } from "@/lib/image";

interface Izin {
  id: number;
  jenis: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  alasan: string;
  lampiran: string | null;
  status: string;
  catatan_admin: string | null;
  created_at: string;
}

function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function fmt(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const JENIS_LABEL: Record<string, string> = {
  izin: "Izin",
  sakit: "Sakit",
  cuti: "Cuti",
};
const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  disetujui: "bg-emerald-500/15 text-emerald-300",
  ditolak: "bg-rose-500/15 text-rose-300",
};

export default function IzinPage() {
  const today = jakartaToday();
  const [list, setList] = useState<Izin[]>([]);
  const [loading, setLoading] = useState(true);
  const [jenis, setJenis] = useState("izin");
  const [mulai, setMulai] = useState(today);
  const [selesai, setSelesai] = useState(today);
  const [alasan, setAlasan] = useState("");
  const [lampiran, setLampiran] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/izin", { cache: "no-store" });
      const data = await res.json();
      setList(data.izin || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setLampiran(await compressImage(f, 1100, 0.7));
    } catch {
      setErr("Gagal memproses gambar.");
    }
  };

  const submit = async () => {
    setErr("");
    if (!alasan.trim()) {
      setErr("Alasan wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/izin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jenis,
          tanggal_mulai: mulai,
          tanggal_selesai: selesai,
          alasan,
          lampiran,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || "Gagal mengajukan.");
        return;
      }
      setAlasan("");
      setLampiran(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const batal = async (id: number) => {
    if (!confirm("Batalkan pengajuan ini?")) return;
    await fetch(`/api/izin?id=${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">📝 Izin & Cuti</h1>

      <div className="card space-y-3 p-4">
        <p className="text-sm font-semibold">Ajukan Izin</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Jenis</label>
            <select className="input" value={jenis} onChange={(e) => setJenis(e.target.value)}>
              <option value="izin">Izin</option>
              <option value="sakit">Sakit</option>
              <option value="cuti">Cuti</option>
            </select>
          </div>
          <div>
            <label className="label">Tanggal Mulai</label>
            <input type="date" className="input" value={mulai} max={selesai}
              onChange={(e) => setMulai(e.target.value)} />
          </div>
          <div>
            <label className="label">Tanggal Selesai</label>
            <input type="date" className="input" value={selesai} min={mulai}
              onChange={(e) => setSelesai(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Alasan</label>
          <textarea className="input min-h-[72px]" value={alasan} placeholder="Contoh: Sakit demam, ada acara keluarga…"
            onChange={(e) => setAlasan(e.target.value)} />
        </div>
        <div>
          <label className="label">Lampiran (opsional — mis. surat sakit)</label>
          <input type="file" accept="image/*" onChange={pickFile} className="text-sm text-slate-400" />
          {lampiran && (
            <div className="mt-2 flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lampiran} alt="lampiran" className="h-16 w-16 rounded-lg object-cover" />
              <button onClick={() => setLampiran(null)} className="text-xs text-rose-300">
                Hapus
              </button>
            </div>
          )}
        </div>
        {err && <p className="text-sm text-rose-300">{err}</p>}
        <button onClick={submit} disabled={saving} className="btn-primary w-full">
          {saving ? "Mengirim…" : "Ajukan"}
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-white/5 px-4 py-3 text-sm font-semibold">
          Riwayat Pengajuan
        </div>
        {loading ? (
          <p className="p-6 text-center text-slate-400">Memuat…</p>
        ) : list.length === 0 ? (
          <p className="p-6 text-center text-slate-400">Belum ada pengajuan.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {list.map((i) => (
              <li key={i.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{JENIS_LABEL[i.jenis] || i.jenis}</span>
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
                    <p className="mt-1 text-xs text-slate-400">Catatan admin: {i.catatan_admin}</p>
                  )}
                </div>
                {i.status === "pending" && (
                  <button onClick={() => batal(i.id)} className="shrink-0 text-xs text-rose-300 hover:underline">
                    Batalkan
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
