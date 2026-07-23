"use client";

import { useCallback, useEffect, useState } from "react";
import type { Slip } from "@/lib/slip";
import SlipGaji from "@/components/SlipGaji";

interface Emp {
  id: number;
  nama: string;
  divisi_nama: string | null;
}

function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function monthStart(): string {
  return jakartaToday().slice(0, 8) + "01";
}

export default function AdminSlipPage() {
  const [emps, setEmps] = useState<Emp[]>([]);
  const [userId, setUserId] = useState<number | "">("");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(jakartaToday());
  const [slip, setSlip] = useState<Slip | null>(null);
  const [dapur, setDapur] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/admin/employees", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setEmps(d.employees || []))
      .catch(() => {});
  }, []);

  const tampil = useCallback(async () => {
    if (!userId) {
      setErr("Pilih pegawai dulu.");
      return;
    }
    setErr("");
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/slip?user=${userId}&from=${from}&to=${to}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || "Gagal memuat slip.");
        setSlip(null);
        return;
      }
      setSlip(data.slip);
      setDapur(data.dapur || "");
    } finally {
      setLoading(false);
    }
  }, [userId, from, to]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">🧾 Slip Gaji</h1>

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[180px] flex-1">
          <label className="label">Pegawai</label>
          <select className="input" value={userId} onChange={(e) => setUserId(Number(e.target.value) || "")}>
            <option value="">— pilih pegawai —</option>
            {emps.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nama}
                {e.divisi_nama ? ` · ${e.divisi_nama}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Dari</label>
          <input type="date" className="input" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">Sampai</label>
          <input type="date" className="input" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button onClick={tampil} disabled={loading} className="btn-primary">
          {loading ? "Memuat…" : "Tampilkan"}
        </button>
      </div>

      {err && <p className="text-sm text-rose-300">{err}</p>}

      <p className="text-xs text-slate-400">
        Komponen gaji (upah harian, tunjangan, lembur/jam, potongan/telat) diatur di{" "}
        <b className="text-slate-300">Data Pegawai</b>. Slip dihitung otomatis dari presensi.
      </p>

      {slip && (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <SlipGaji slip={slip} dapur={dapur} />
        </div>
      )}
    </div>
  );
}
