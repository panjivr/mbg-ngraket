"use client";

import { useEffect, useRef, useState } from "react";
import UnitLogo from "@/components/UnitLogo";

interface Settings {
  nama_dapur: string;
  alamat: string;
  lat: number;
  lng: number;
  radius_m: number;
  geofence_aktif: boolean;
  selfie_wajib: boolean;
  jam_masuk: string;
  jam_pulang: string;
  tz: string;
  jenis?: string;
  logo_url?: string;
}

/** Perkecil gambar ke kotak ≤ maxPx lalu kembalikan data URL PNG (hemat ukuran DB). */
function resizeToDataUrl(file: File, maxPx = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no-ctx"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("img-error"));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("read-error"));
    reader.readAsDataURL(file);
  });
}

export default function PengaturanPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const perusahaan = s?.jenis === "perusahaan";

  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !s) return;
    if (!file.type.startsWith("image/")) {
      setMsg({ kind: "err", text: "File harus berupa gambar." });
      return;
    }
    try {
      const dataUrl = await resizeToDataUrl(file, 256);
      setS({ ...s, logo_url: dataUrl });
      setMsg({ kind: "ok", text: "Logo siap — klik Simpan Pengaturan untuk menerapkan." });
    } catch {
      setMsg({ kind: "err", text: "Gagal memproses gambar." });
    }
  }

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setS(d.settings))
      .finally(() => setLoading(false));
  }, []);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setMsg({ kind: "err", text: "GPS tidak didukung perangkat ini." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setS((prev) =>
          prev
            ? { ...prev, lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) }
            : prev,
        ),
      () => setMsg({ kind: "err", text: "Gagal membaca lokasi." }),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function save() {
    if (!s) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ kind: "err", text: data.error || "Gagal menyimpan." });
        return;
      }
      setS(data.settings);
      setMsg({ kind: "ok", text: "Pengaturan tersimpan." });
    } catch {
      setMsg({ kind: "err", text: "Tidak dapat terhubung ke server." });
    } finally {
      setSaving(false);
    }
  }

  if (loading || !s) {
    return <div className="card p-6 text-center text-slate-400">Memuat…</div>;
  }

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-xl font-bold">{perusahaan ? "Pengaturan Perusahaan" : "Pengaturan Dapur"}</h1>

      <div className="card space-y-4 p-5">
        <div>
          <label className="label">{perusahaan ? "Nama Perusahaan / Kantor" : "Nama Dapur"}</label>
          <input
            className="input"
            value={s.nama_dapur}
            onChange={(e) => setS({ ...s, nama_dapur: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Alamat</label>
          <input
            className="input"
            value={s.alamat}
            onChange={(e) => setS({ ...s, alamat: e.target.value })}
          />
        </div>
      </div>

      {/* Logo unit — khusus perusahaan (dapur tetap memakai lambang BGN). */}
      {perusahaan && (
        <div className="card space-y-3 p-5">
          <p className="text-sm font-semibold">Logo Perusahaan</p>
          <p className="text-xs text-slate-400">
            Tampil di header admin &amp; karyawan serta halaman login. Kosong = inisial nama.
          </p>
          <div className="flex items-center gap-4">
            <UnitLogo jenis="perusahaan" nama={s.nama_dapur} logoUrl={s.logo_url || ""} size={56} />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost px-3 py-1.5 text-xs">
                {s.logo_url ? "Ganti logo" : "Unggah logo"}
              </button>
              {s.logo_url && (
                <button type="button" onClick={() => setS({ ...s, logo_url: "" })} className="btn-ghost px-3 py-1.5 text-xs">
                  Hapus logo
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickLogo} />
          </div>
        </div>
      )}

      <div className="card space-y-4 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Lokasi & Geofence</p>
          <button onClick={useMyLocation} className="btn-ghost px-3 py-1.5 text-xs">
            Gunakan Lokasi Saya
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Latitude</label>
            <input
              type="number"
              step="0.000001"
              className="input"
              value={s.lat}
              onChange={(e) => setS({ ...s, lat: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label">Longitude</label>
            <input
              type="number"
              step="0.000001"
              className="input"
              value={s.lng}
              onChange={(e) => setS({ ...s, lng: Number(e.target.value) })}
            />
          </div>
        </div>
        <div>
          <label className="label">Radius Geofence (meter)</label>
          <input
            type="number"
            className="input"
            value={s.radius_m}
            onChange={(e) => setS({ ...s, radius_m: Number(e.target.value) })}
          />
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-gold-500"
            checked={s.geofence_aktif}
            onChange={(e) => setS({ ...s, geofence_aktif: e.target.checked })}
          />
          Aktifkan validasi lokasi (absen hanya bisa di area {perusahaan ? "kantor" : "dapur"})
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-gold-500"
            checked={s.selfie_wajib}
            onChange={(e) => setS({ ...s, selfie_wajib: e.target.checked })}
          />
          Wajib foto selfie saat absen
        </label>
      </div>

      <div className="card space-y-4 p-5">
        <p className="text-sm font-semibold">Jam Kerja</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Jam Masuk</label>
            <input
              type="time"
              className="input"
              value={s.jam_masuk}
              onChange={(e) => setS({ ...s, jam_masuk: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Jam Pulang</label>
            <input
              type="time"
              className="input"
              value={s.jam_pulang}
              onChange={(e) => setS({ ...s, jam_pulang: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="label">Zona Waktu</label>
          <select
            className="input"
            value={s.tz}
            onChange={(e) => setS({ ...s, tz: e.target.value })}
          >
            <option value="Asia/Jakarta">WIB — Asia/Jakarta</option>
            <option value="Asia/Makassar">WITA — Asia/Makassar</option>
            <option value="Asia/Jayapura">WIT — Asia/Jayapura</option>
          </select>
        </div>
        <p className="text-xs text-slate-500">
          Datang setelah jam masuk akan ditandai <b>Terlambat</b>.
        </p>
      </div>

      {msg && (
        <p
          className={
            "rounded-xl border px-4 py-3 text-sm " +
            (msg.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/30 bg-red-500/10 text-red-200")
          }
        >
          {msg.text}
        </p>
      )}

      <button onClick={save} className="btn-gold w-full py-3" disabled={saving}>
        {saving ? "Menyimpan…" : "Simpan Pengaturan"}
      </button>
    </div>
  );
}
