"use client";

import { useCallback, useEffect, useState } from "react";
import type { Slip } from "@/lib/slip";
import SlipGaji from "@/components/SlipGaji";

export default function SlipSayaPage() {
  const [slip, setSlip] = useState<Slip | null>(null);
  const [dapur, setDapur] = useState("");
  const [pesan, setPesan] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/slip", { cache: "no-store" });
      const data = await res.json();
      if (data.visible) {
        setSlip(data.slip);
        setDapur(data.dapur || "");
        setPesan("");
      } else {
        setSlip(null);
        setPesan(data.pesan || "Slip gaji belum tersedia.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const konfirmasi = async () => {
    setConfirming(true);
    try {
      const res = await fetch("/api/slip", { method: "POST" });
      if (res.ok) await load();
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">🧾 Slip Gaji Saya</h1>

      {loading ? (
        <div className="card p-6 text-center text-slate-400">Memuat…</div>
      ) : slip ? (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <SlipGaji slip={slip} dapur={dapur} onConfirm={konfirmasi} confirming={confirming} />
        </div>
      ) : (
        <div className="card p-8 text-center">
          <p className="text-3xl">🗓️</p>
          <p className="mt-2 text-sm text-slate-300">{pesan}</p>
          <p className="mt-1 text-xs text-slate-500">
            Slip hanya bisa dilihat pada waktu yang ditentukan HR.
          </p>
        </div>
      )}
    </div>
  );
}
