"use client";

import { useCallback, useEffect, useState } from "react";
import type { Slip } from "@/lib/slip";
import SlipGaji from "@/components/SlipGaji";

interface GajiRow {
  id: number;
  nama: string;
  divisi_nama: string | null;
  gaji_harian: number;
  lembur_per_hari: number;
  potongan_per_telat: number;
  bpjs_tk: boolean;
  slip_show: boolean;
}
interface Config {
  period_from: string | null;
  period_to: string | null;
  show_from: string | null;
  show_until: string | null;
  aktif: boolean;
}

export default function HrPanel() {
  const [tab, setTab] = useState<"slip" | "gaji" | "cetak">("slip");
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">🧾 HR — Gaji & Slip</h1>
      <p className="text-xs text-slate-400">
        Halaman khusus HR. Admin biasa tidak dapat mengubah data gaji atau pengaturan slip.
      </p>
      <div className="flex flex-wrap gap-2">
        {[
          ["slip", "⚙️ Pengaturan Slip"],
          ["gaji", "💰 Data Gaji"],
          ["cetak", "🖨️ Pratinjau / Cetak"],
        ].map(([v, label]) => (
          <button
            key={v}
            onClick={() => setTab(v as typeof tab)}
            className={
              "rounded-lg px-3 py-1.5 text-sm " +
              (tab === v ? "bg-gold-500/15 text-gold-400" : "text-slate-400 hover:bg-white/5")
            }
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "slip" && <PengaturanSlip />}
      {tab === "gaji" && <DataGaji />}
      {tab === "cetak" && <CetakSlip />}
    </div>
  );
}

function PengaturanSlip() {
  const [cfg, setCfg] = useState<Config>({
    period_from: "",
    period_to: "",
    show_from: "",
    show_until: "",
    aktif: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/hr/slip-config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const c = d.config || {};
        setCfg({
          period_from: c.period_from || "",
          period_to: c.period_to || "",
          show_from: c.show_from || "",
          show_until: c.show_until || "",
          aktif: !!c.aktif,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/hr/slip-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const d = await res.json();
      setMsg(res.ok ? "Tersimpan." : d?.error || "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card p-6 text-center text-slate-400">Memuat…</div>;

  return (
    <div className="card space-y-3 p-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          className="h-4 w-4 accent-gold-500"
          checked={cfg.aktif}
          onChange={(e) => setCfg({ ...cfg, aktif: e.target.checked })}
        />
        Tampilkan slip ke karyawan (aktif)
      </label>
      <p className="text-xs text-slate-400">
        Karyawan hanya bisa <b>melihat</b> slip (tidak bisa cetak/unduh) pada jendela waktu di
        bawah. Di luar jendela, tombol slip mereka kosong dengan keterangan.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Periode Gaji — Dari</label>
          <input type="date" className="input" value={cfg.period_from || ""}
            onChange={(e) => setCfg({ ...cfg, period_from: e.target.value })} />
        </div>
        <div>
          <label className="label">Periode Gaji — Sampai</label>
          <input type="date" className="input" value={cfg.period_to || ""}
            onChange={(e) => setCfg({ ...cfg, period_to: e.target.value })} />
        </div>
        <div>
          <label className="label">Mulai Tampil (opsional)</label>
          <input type="datetime-local" className="input" value={cfg.show_from || ""}
            onChange={(e) => setCfg({ ...cfg, show_from: e.target.value })} />
        </div>
        <div>
          <label className="label">Berhenti Tampil (opsional)</label>
          <input type="datetime-local" className="input" value={cfg.show_until || ""}
            onChange={(e) => setCfg({ ...cfg, show_until: e.target.value })} />
        </div>
      </div>
      <p className="text-[11px] text-slate-500">
        Contoh: isi periode 2 minggu, lalu atur tampil mulai Sabtu jam gajian sampai Minggu malam —
        di luar itu karyawan tidak melihat slip.
      </p>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? "Menyimpan…" : "Simpan"}
        </button>
        {msg && <span className="text-sm text-slate-300">{msg}</span>}
      </div>
    </div>
  );
}

function DataGaji() {
  const [rows, setRows] = useState<GajiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hr/gaji", { cache: "no-store" });
      const d = await res.json();
      setRows(d.pegawai || []);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const upd = (id: number, patch: Partial<GajiRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const save = async (r: GajiRow) => {
    setSavingId(r.id);
    try {
      await fetch("/api/hr/gaji", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: r.id,
          gaji_harian: r.gaji_harian,
          lembur_per_hari: r.lembur_per_hari,
          potongan_per_telat: r.potongan_per_telat,
          bpjs_tk: r.bpjs_tk,
          slip_show: r.slip_show,
        }),
      });
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <div className="card p-6 text-center text-slate-400">Memuat…</div>;

  return (
    <div className="card scroll-x overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="text-left text-xs uppercase text-slate-400">
          <tr className="border-b border-white/5">
            <th className="px-3 py-2.5">Pegawai</th>
            <th className="px-3 py-2.5">Upah/Hari</th>
            <th className="px-3 py-2.5">Lembur/Hari</th>
            <th className="px-3 py-2.5">Potongan/Telat</th>
            <th className="px-3 py-2.5 text-center">BPJS TK</th>
            <th className="px-3 py-2.5 text-center">Tampilkan Slip</th>
            <th className="px-3 py-2.5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2">
                <div className="font-medium">{r.nama}</div>
                <div className="text-[11px] text-slate-500">{r.divisi_nama || "—"}</div>
              </td>
              <td className="px-3 py-2">
                <input type="number" min={0} className="input w-28 py-1.5" value={r.gaji_harian}
                  onChange={(e) => upd(r.id, { gaji_harian: Number(e.target.value) || 0 })} />
              </td>
              <td className="px-3 py-2">
                <input type="number" min={0} className="input w-28 py-1.5" value={r.lembur_per_hari}
                  onChange={(e) => upd(r.id, { lembur_per_hari: Number(e.target.value) || 0 })} />
              </td>
              <td className="px-3 py-2">
                <input type="number" min={0} className="input w-28 py-1.5" value={r.potongan_per_telat}
                  onChange={(e) => upd(r.id, { potongan_per_telat: Number(e.target.value) || 0 })} />
              </td>
              <td className="px-3 py-2 text-center">
                <input type="checkbox" className="h-4 w-4 accent-gold-500" checked={r.bpjs_tk}
                  onChange={(e) => upd(r.id, { bpjs_tk: e.target.checked })} />
              </td>
              <td className="px-3 py-2 text-center">
                <input type="checkbox" className="h-4 w-4 accent-gold-500" checked={r.slip_show}
                  onChange={(e) => upd(r.id, { slip_show: e.target.checked })} />
              </td>
              <td className="px-3 py-2">
                <button onClick={() => save(r)} disabled={savingId === r.id}
                  className="btn-ghost px-2.5 py-1 text-xs">
                  {savingId === r.id ? "…" : "Simpan"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CetakSlip() {
  const [emps, setEmps] = useState<GajiRow[]>([]);
  const [userId, setUserId] = useState<number | "">("");
  const [slip, setSlip] = useState<Slip | null>(null);
  const [dapur, setDapur] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/hr/gaji", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setEmps(d.pegawai || []))
      .catch(() => {});
  }, []);

  const tampil = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/slip?user=${userId}`, { cache: "no-store" });
      const d = await res.json();
      if (res.ok) {
        setSlip(d.slip);
        setDapur(d.dapur || "");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[180px] flex-1">
          <label className="label">Pegawai</label>
          <select className="input" value={userId} onChange={(e) => setUserId(Number(e.target.value) || "")}>
            <option value="">— pilih pegawai —</option>
            {emps.map((e) => (
              <option key={e.id} value={e.id}>{e.nama}</option>
            ))}
          </select>
        </div>
        <button onClick={tampil} disabled={loading || !userId} className="btn-primary">
          {loading ? "Memuat…" : "Tampilkan"}
        </button>
      </div>
      <p className="text-xs text-slate-400">Slip memakai periode gaji yang dikonfigurasi di tab Pengaturan Slip.</p>
      {slip && (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <SlipGaji slip={slip} dapur={dapur} canPrint />
        </div>
      )}
    </div>
  );
}
