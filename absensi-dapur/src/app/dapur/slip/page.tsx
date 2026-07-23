"use client";

import { useCallback, useEffect, useState } from "react";
import type { Slip } from "@/lib/slip";
import SlipGaji from "@/components/SlipGaji";

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

export default function SlipSayaPage() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(jakartaToday());
  const [slip, setSlip] = useState<Slip | null>(null);
  const [dapur, setDapur] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/slip?from=${from}&to=${to}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setSlip(data.slip);
        setDapur(data.dapur || "");
      }
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">🧾 Slip Gaji Saya</h1>
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label">Dari</label>
          <input type="date" className="input" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">Sampai</label>
          <input type="date" className="input" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button onClick={load} disabled={loading} className="btn-ghost">
          {loading ? "Memuat…" : "Tampilkan"}
        </button>
      </div>

      {slip && (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <SlipGaji slip={slip} dapur={dapur} />
        </div>
      )}
    </div>
  );
}
