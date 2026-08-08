"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SASARAN_LABEL, type Sasaran } from "@/lib/jadwal";

interface JItem {
  id: number;
  tanggal: string;
  sasaran: Sasaran;
  menu_id: number;
  nama: string;
  urutan: number;
}
interface Porsi {
  besar: number;
  kecil: number;
  b3: number;
}
interface Hari {
  tanggal: string;
  porsi: Porsi;
  porsiOverride: boolean;
  reguler: JItem[];
  b3: JItem[];
}
interface MenuOpt {
  id: number;
  nama: string;
  kategori: string;
}
interface Data {
  mulai: string;
  selesai: string;
  hari: number;
  porsiDefault: Porsi;
  menus: MenuOpt[];
  hariList: Hari[];
}

const fmtTgl = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

export default function JadwalMenuPage() {
  const [mulai, setMulai] = useState("");
  const [hari, setHari] = useState(14);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (m?: string, h?: number) => {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      if (m) params.set("mulai", m);
      if (h) params.set("hari", String(h));
      const res = await fetch(`/api/admin/jadwal-menu?${params.toString()}`, { cache: "no-store" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setData(d);
        setMulai(d.mulai);
        setHari(d.hari);
      } else {
        setErr(d?.error || `Gagal memuat (kode ${res.status}).`);
      }
    } catch {
      setErr("Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addMenu = useCallback(
    async (tanggal: string, sasaran: Sasaran, menu_id: number) => {
      if (!menu_id) return;
      setBusy(true);
      try {
        await fetch("/api/admin/jadwal-menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tanggal, sasaran, menu_id }),
        });
        await load(mulai, hari);
      } finally {
        setBusy(false);
      }
    },
    [load, mulai, hari],
  );

  const removeMenu = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await fetch(`/api/admin/jadwal-menu?id=${id}`, { method: "DELETE" });
        await load(mulai, hari);
      } finally {
        setBusy(false);
      }
    },
    [load, mulai, hari],
  );

  const savePorsi = useCallback(
    async (tanggal: string, porsi: Porsi) => {
      setBusy(true);
      try {
        await fetch("/api/admin/jadwal-menu", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tanggal, ...porsi }),
        });
        await load(mulai, hari);
      } finally {
        setBusy(false);
      }
    },
    [load, mulai, hari],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">Jadwal Menu & Belanja</h1>
          <p className="text-xs text-slate-400">
            Tempel menu Reguler & B3 ke tiap tanggal. Porsi dari penerima terdaftar, bisa diubah per hari.
          </p>
        </div>
        {data && (
          <Link
            href={`/admin/belanja?mulai=${data.mulai}&hari=${data.hari}`}
            className="btn-gold px-3 py-1.5 text-sm"
          >
            Belanja periode ini
          </Link>
        )}
      </div>

      {/* Pengaturan periode */}
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <label className="label">
          Mulai
          <input
            type="date"
            className="input mt-1"
            value={mulai}
            onChange={(e) => setMulai(e.target.value)}
          />
        </label>
        <label className="label">
          Jumlah hari
          <input
            type="number"
            min={1}
            max={31}
            className="input mt-1 w-24"
            value={hari}
            onChange={(e) => setHari(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
          />
        </label>
        <button className="btn-primary px-4 py-2" onClick={() => load(mulai, hari)} disabled={loading}>
          Tampilkan
        </button>
        {data && (
          <span className="text-xs text-slate-400">
            Default porsi: Besar {data.porsiDefault.besar} · Kecil {data.porsiDefault.kecil} · B3{" "}
            {data.porsiDefault.b3}
          </span>
        )}
      </div>

      {err && <div className="card border-red-500/30 p-3 text-sm text-red-300">{err}</div>}
      {loading && <div className="card p-4 text-sm text-slate-400">Memuat…</div>}

      {data && !loading && (
        <div className="grid gap-3 md:grid-cols-2">
          {data.hariList.map((h) => (
            <HariCard
              key={h.tanggal}
              hari={h}
              menus={data.menus}
              busy={busy}
              onAdd={addMenu}
              onRemove={removeMenu}
              onSavePorsi={savePorsi}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HariCard({
  hari,
  menus,
  busy,
  onAdd,
  onRemove,
  onSavePorsi,
}: {
  hari: Hari;
  menus: MenuOpt[];
  busy: boolean;
  onAdd: (tanggal: string, sasaran: Sasaran, menu_id: number) => void;
  onRemove: (id: number) => void;
  onSavePorsi: (tanggal: string, porsi: Porsi) => void;
}) {
  const [porsi, setPorsi] = useState<Porsi>(hari.porsi);
  useEffect(() => setPorsi(hari.porsi), [hari.porsi]);

  const kosong = hari.reguler.length === 0 && hari.b3.length === 0;

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold capitalize">{fmtTgl(hari.tanggal)}</h3>
        {kosong && <span className="text-[11px] text-slate-500">belum ada menu</span>}
      </div>

      {/* Porsi per hari */}
      <div className="grid grid-cols-3 gap-2">
        {(["besar", "kecil", "b3"] as const).map((k) => (
          <label key={k} className="label text-[11px] capitalize">
            {k}
            <input
              type="number"
              min={0}
              className="input mt-0.5 py-1 text-sm"
              value={porsi[k]}
              onChange={(e) => setPorsi({ ...porsi, [k]: Math.max(0, Number(e.target.value) || 0) })}
              onBlur={() => {
                if (porsi[k] !== hari.porsi[k]) onSavePorsi(hari.tanggal, porsi);
              }}
            />
          </label>
        ))}
      </div>
      <p className="text-[11px] text-slate-500">
        {hari.porsiOverride ? "Porsi khusus hari ini." : "Porsi dari penerima terdaftar (default)."} Reguler ={" "}
        {porsi.besar + porsi.kecil} · B3 = {porsi.b3}
      </p>

      {(["reguler", "b3"] as Sasaran[]).map((s) => (
        <div key={s} className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
          <p className="mb-1 text-[11px] font-semibold text-gold-300">{SASARAN_LABEL[s]}</p>
          <ul className="space-y-1">
            {(s === "reguler" ? hari.reguler : hari.b3).map((it) => (
              <li key={it.id} className="flex items-center justify-between gap-2 text-sm">
                <span>{it.nama}</span>
                <button
                  className="text-xs text-red-400 hover:text-red-300"
                  onClick={() => onRemove(it.id)}
                  disabled={busy}
                  title="Hapus dari jadwal"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <select
            className="input mt-1.5 py-1 text-sm"
            value=""
            disabled={busy}
            onChange={(e) => {
              const id = Number(e.target.value);
              if (id) onAdd(hari.tanggal, s, id);
              e.target.value = "";
            }}
          >
            <option value="">+ Tambah menu…</option>
            {menus.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nama}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
