"use client";

import { useCallback, useEffect, useState } from "react";
import type { Slip, StatusHari, HariSlip } from "@/lib/slip";
import SlipGaji from "@/components/SlipGaji";

function rupiah(n: number): string {
  return "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(n));
}
function tglPendek(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}
const STATUS_OPSI: { v: StatusHari; l: string }[] = [
  { v: "penuh", l: "Hadir Penuh" },
  { v: "setengah", l: "Setengah (50%)" },
  { v: "sakit", l: "Sakit" },
  { v: "izin", l: "Izin" },
  { v: "alpha", l: "Tidak Masuk" },
  { v: "libur", l: "Libur" },
];

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
      <h1 className="text-xl font-bold">HR — Gaji & Slip</h1>
      <p className="text-xs text-slate-400">
        Halaman khusus HR. Admin biasa tidak dapat mengubah data gaji atau pengaturan slip.
      </p>
      <div className="flex flex-wrap gap-2">
        {[
          ["slip", "Pengaturan Slip"],
          ["gaji", "Data Gaji"],
          ["cetak", "Pratinjau / Cetak"],
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

  function unduhCSV() {
    if (rows.length === 0) return;
    const head = ["Nama", "Divisi", "Upah/Hari", "Lembur/Hari", "Potongan/Telat", "BPJS TK", "Tampilkan Slip"];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const body = rows.map((r) =>
      [r.nama, r.divisi_nama || "-", Math.round(r.gaji_harian || 0), Math.round(r.lembur_per_hari || 0), Math.round(r.potongan_per_telat || 0), r.bpjs_tk ? "ya" : "tidak", r.slip_show ? "ya" : "tidak"]
        .map(esc)
        .join(","),
    );
    const csv = "﻿" + [head.map(esc).join(","), ...body].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "data-gaji-pegawai.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="card p-6 text-center text-slate-400">Memuat…</div>;

  return (
    <div className="card p-0">
      <div className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2">
        <p className="text-xs font-semibold text-slate-400">Data Gaji Pegawai</p>
        <button onClick={unduhCSV} disabled={rows.length === 0} className="btn-ghost px-2.5 py-1 text-xs">Unduh CSV</button>
      </div>
      <div className="scroll-x overflow-x-auto">
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
    </div>
  );
}

function CetakSlip() {
  const [emps, setEmps] = useState<GajiRow[]>([]);
  const [userId, setUserId] = useState<number | "">("");
  const [slip, setSlip] = useState<Slip | null>(null);
  const [dapur, setDapur] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/hr/gaji", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setEmps(d.pegawai || []))
      .catch(() => {});
  }, []);

  const tampil = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`/api/hr/slip?user=${userId}`, { cache: "no-store" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setSlip(d.slip);
        setDapur(d.dapur || "");
      } else {
        setSlip(null);
        setErr(d?.error || `Gagal memuat slip (kode ${res.status}).`);
      }
    } catch {
      setSlip(null);
      setErr("Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[180px] flex-1">
          <label className="label">Pegawai</label>
          <select className="input" value={userId} onChange={(e) => { setUserId(Number(e.target.value) || ""); setSlip(null); }}>
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
      {err && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          ⚠️ {err}
        </p>
      )}
      {slip && typeof userId === "number" && (
        <>
          <AdjustHarian userId={userId} slip={slip} onSaved={tampil} />
          <KasbonManager userId={userId} onChanged={tampil} />
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <SlipGaji slip={slip} dapur={dapur} canPrint />
          </div>
        </>
      )}
    </div>
  );
}

function AdjustHarian({ userId, slip, onSaved }: { userId: number; slip: Slip; onSaved: () => void }) {
  const [rows, setRows] = useState<HariSlip[]>(slip.hari);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [busyTgl, setBusyTgl] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setRows(slip.hari);
    setDirty(new Set());
    setMsg("");
  }, [slip]);

  const gaji = slip.user.gaji_harian;
  const upahDefault = (status: StatusHari) =>
    status === "penuh" ? gaji : status === "setengah" ? Math.round(gaji / 2) : 0;

  const upd = (tgl: string, patch: Partial<HariSlip>) => {
    setRows((prev) => prev.map((r) => (r.tanggal === tgl ? { ...r, ...patch } : r)));
    setDirty((prev) => new Set(prev).add(tgl));
    setMsg("");
  };
  const setStatus = (tgl: string, status: StatusHari) =>
    upd(tgl, {
      status,
      upah: upahDefault(status),
      lembur: status === "penuh" || status === "setengah" ? undefined : false,
    });

  const save = async () => {
    const items = rows
      .filter((r) => dirty.has(r.tanggal))
      .map((r) => ({
        tanggal: r.tanggal,
        status: r.status,
        upah: r.upah,
        lembur: !!r.lembur,
        catatan: r.catatan || "",
      }));
    if (!items.length) {
      setMsg("Tidak ada perubahan.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/hr/slip-adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userId, items }),
      });
      if (res.ok) onSaved();
      else setMsg("Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const resetHari = async (tgl: string) => {
    setBusyTgl(tgl);
    try {
      const res = await fetch("/api/hr/slip-adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userId, items: [{ tanggal: tgl, reset: true }] }),
      });
      if (res.ok) onSaved();
    } finally {
      setBusyTgl(null);
    }
  };

  return (
    <div className="card space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Penyesuaian Gaji Harian</h3>
          <p className="text-[11px] text-slate-500">
            Ubah status, upah, atau lembur per hari. Hari tanpa penyesuaian otomatis mengikuti absensi.
          </p>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? "Menyimpan…" : "Simpan Penyesuaian"}
        </button>
      </div>
      {msg && <p className="text-xs text-slate-300">{msg}</p>}
      <div className="scroll-x overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs uppercase text-slate-400">
            <tr className="border-b border-white/5">
              <th className="px-2 py-2">Tanggal</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Upah</th>
              <th className="px-2 py-2 text-center">Lembur</th>
              <th className="px-2 py-2">Catatan</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r) => (
              <tr key={r.tanggal} className={r.override ? "bg-gold-500/5" : ""}>
                <td className="whitespace-nowrap px-2 py-1.5">
                  {tglPendek(r.tanggal)}
                  {r.override && <span className="ml-1 text-[10px] text-gold-400">•diubah</span>}
                </td>
                <td className="px-2 py-1.5">
                  <select
                    className="input py-1"
                    value={r.status}
                    onChange={(e) => setStatus(r.tanggal, e.target.value as StatusHari)}
                  >
                    {STATUS_OPSI.map((o) => (
                      <option key={o.v} value={o.v}>{o.l}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min={0}
                    className="input w-28 py-1"
                    value={r.upah}
                    onChange={(e) => upd(r.tanggal, { upah: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-gold-500"
                    checked={!!r.lembur}
                    onChange={(e) => upd(r.tanggal, { lembur: e.target.checked })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    className="input py-1"
                    placeholder="—"
                    value={r.catatan || ""}
                    onChange={(e) => upd(r.tanggal, { catatan: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5 text-right">
                  {r.override && (
                    <button
                      onClick={() => resetHari(r.tanggal)}
                      disabled={busyTgl === r.tanggal}
                      className="btn-ghost px-2 py-1 text-[11px]"
                    >
                      {busyTgl === r.tanggal ? "…" : "Reset"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface KasbonRow {
  id: number;
  tanggal: string;
  jumlah: number;
  keterangan: string;
  lunas: boolean;
}

function KasbonManager({ userId, onChanged }: { userId: number; onChanged: () => void }) {
  const [items, setItems] = useState<KasbonRow[]>([]);
  const [tanggal, setTanggal] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [ket, setKet] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/hr/kasbon?user=${userId}`, { cache: "no-store" });
    const d = await res.json();
    setItems(d.kasbon || []);
  }, [userId]);
  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    const n = Math.round(Number(jumlah)) || 0;
    if (n <= 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/hr/kasbon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userId, tanggal: tanggal || undefined, jumlah: n, keterangan: ket }),
      });
      if (res.ok) {
        setJumlah("");
        setKet("");
        setTanggal("");
        await load();
        onChanged();
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleLunas = async (k: KasbonRow) => {
    await fetch(`/api/hr/kasbon/${k.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lunas: !k.lunas }),
    });
    await load();
    onChanged();
  };

  const del = async (k: KasbonRow) => {
    if (!confirm("Hapus kasbon ini?")) return;
    await fetch(`/api/hr/kasbon/${k.id}`, { method: "DELETE" });
    await load();
    onChanged();
  };

  const totalBelum = items.filter((k) => !k.lunas).reduce((a, k) => a + Number(k.jumlah), 0);

  return (
    <div className="card space-y-3 p-4">
      <div>
        <h3 className="text-sm font-semibold">Kasbon / Utang Gaji</h3>
        <p className="text-[11px] text-slate-500">
          Kasbon yang belum lunas otomatis memotong slip. Total belum lunas:{" "}
          <b className="text-gold-400">{rupiah(totalBelum)}</b>
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="label">Tanggal</label>
          <input type="date" className="input py-1.5" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </div>
        <div>
          <label className="label">Jumlah</label>
          <input type="number" min={0} className="input w-32 py-1.5" placeholder="0" value={jumlah}
            onChange={(e) => setJumlah(e.target.value)} />
        </div>
        <div className="min-w-[160px] flex-1">
          <label className="label">Keterangan</label>
          <input type="text" className="input py-1.5" placeholder="mis. kasbon lebaran" value={ket}
            onChange={(e) => setKet(e.target.value)} />
        </div>
        <button onClick={add} disabled={busy || !jumlah} className="btn-primary">
          {busy ? "…" : "Tambah"}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-500">Belum ada kasbon.</p>
      ) : (
        <div className="scroll-x overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr className="border-b border-white/5">
                <th className="px-2 py-2">Tanggal</th>
                <th className="px-2 py-2">Jumlah</th>
                <th className="px-2 py-2">Keterangan</th>
                <th className="px-2 py-2 text-center">Status</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((k) => (
                <tr key={k.id} className={k.lunas ? "text-slate-500" : ""}>
                  <td className="whitespace-nowrap px-2 py-1.5">{tglPendek(k.tanggal)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">{rupiah(k.jumlah)}</td>
                  <td className="px-2 py-1.5">{k.keterangan || "—"}</td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      onClick={() => toggleLunas(k)}
                      className={
                        "rounded-full px-2 py-0.5 text-[11px] " +
                        (k.lunas ? "bg-white/5 text-slate-400" : "bg-emerald-500/15 text-emerald-400")
                      }
                    >
                      {k.lunas ? "Lunas" : "Belum lunas"}
                    </button>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <button onClick={() => del(k)} className="btn-ghost px-2 py-1 text-[11px] text-red-400">
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
