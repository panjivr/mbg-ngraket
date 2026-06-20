"use client";

import { useEffect, useState } from "react";

interface SppgRow {
  id: number;
  nama: string;
  alamat: string;
  tz: string;
  jam_masuk: string;
  jam_pulang: string;
  aktif: boolean;
  jumlah_staf?: number;
  jumlah_admin?: number;
}

const emptyForm = {
  nama: "",
  alamat: "",
  jam_masuk: "07:00",
  jam_pulang: "15:00",
  tz: "Asia/Jakarta",
  admin_nama: "",
  admin_username: "",
  admin_password: "",
};

export default function SppgPage() {
  const [list, setList] = useState<SppgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...emptyForm });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sppg", { cache: "no-store" });
      if (res.status === 403) {
        setDenied(true);
        return;
      }
      const data = await res.json();
      setList(data.sppg || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/sppg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal membuat dapur.");
        return;
      }
      setMsg(
        `Dapur "${data.sppg.nama}" dibuat. Admin "${form.admin_username}" bisa langsung login & mengelola dapurnya.`,
      );
      setForm({ ...emptyForm });
      setOpen(false);
      await load();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: SppgRow) {
    if (
      !confirm(
        `Hapus dapur "${s.nama}" beserta SEMUA akun & absensinya? Tindakan ini permanen.`,
      )
    )
      return;
    const res = await fetch(`/api/admin/sppg/${s.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Gagal menghapus.");
      return;
    }
    await load();
  }

  if (denied) {
    return (
      <div className="card p-6 text-center text-slate-400">
        Halaman ini khusus Super Admin.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Kelola Dapur (SPPG)</h1>
          <p className="text-sm text-slate-400">
            Tiap dapur punya data, pegawai, divisi, event, & dashboard terpisah. Buat dapur
            baru lengkap dengan akun adminnya.
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-gold">
          + Tambah Dapur
        </button>
      </div>

      {msg && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {msg}
        </p>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <p className="p-6 text-center text-slate-400">Memuat…</p>
        ) : list.length === 0 ? (
          <p className="p-6 text-center text-slate-400">Belum ada dapur.</p>
        ) : (
          <div className="scroll-x overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr className="border-b border-white/5">
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">Dapur</th>
                  <th className="px-4 py-2.5">Zona Waktu</th>
                  <th className="px-4 py-2.5">Admin</th>
                  <th className="px-4 py-2.5">Staf</th>
                  <th className="px-4 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {list.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2.5 text-slate-400">{s.id}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{s.nama}</p>
                      {s.alamat && (
                        <p className="text-xs text-slate-500">{s.alamat}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{s.tz}</td>
                    <td className="px-4 py-2.5 text-slate-300">{s.jumlah_admin ?? 0}</td>
                    <td className="px-4 py-2.5 text-slate-300">{s.jumlah_staf ?? 0}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end">
                        <button
                          onClick={() => remove(s)}
                          className="btn-danger px-2.5 py-1 text-xs"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-20 grid place-items-center overflow-y-auto bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Tambah Dapur Baru</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Nama Dapur / SPPG</label>
                <input
                  className="input"
                  value={form.nama}
                  placeholder="mis. SPPG Ngraket 2"
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Alamat (opsional)</label>
                <input
                  className="input"
                  value={form.alamat}
                  onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="label">Jam Masuk</label>
                  <input
                    type="time"
                    className="input"
                    value={form.jam_masuk}
                    onChange={(e) => setForm({ ...form, jam_masuk: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Jam Pulang</label>
                  <input
                    type="time"
                    className="input"
                    value={form.jam_pulang}
                    onChange={(e) => setForm({ ...form, jam_pulang: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Zona</label>
                  <select
                    className="input"
                    value={form.tz}
                    onChange={(e) => setForm({ ...form, tz: e.target.value })}
                  >
                    <option value="Asia/Jakarta">WIB</option>
                    <option value="Asia/Makassar">WITA</option>
                    <option value="Asia/Jayapura">WIT</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 p-3">
                <p className="mb-2 text-sm font-semibold">Akun Admin Dapur Ini</p>
                <div className="space-y-2">
                  <input
                    className="input"
                    placeholder="Nama admin"
                    value={form.admin_nama}
                    onChange={(e) => setForm({ ...form, admin_nama: e.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="Username (unik, huruf kecil)"
                    value={form.admin_username}
                    onChange={(e) => setForm({ ...form, admin_username: e.target.value })}
                  />
                  <input
                    className="input"
                    type="text"
                    placeholder="Password (min 6 karakter)"
                    value={form.admin_password}
                    onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Admin ini hanya dapat melihat & mengelola dapur barunya. GPS/geofence dapur
                  dapat diatur admin tersebut lewat menu Pengaturan.
                </p>
              </div>

              {error && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={() => setOpen(false)} className="btn-ghost flex-1">
                  Batal
                </button>
                <button onClick={save} disabled={saving} className="btn-gold flex-1">
                  {saving ? "Menyimpan…" : "Buat Dapur"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
