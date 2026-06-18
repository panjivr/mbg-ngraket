"use client";

import { useEffect, useState } from "react";

interface Employee {
  id: number;
  nama: string;
  username: string;
  role: "admin" | "staff";
  jabatan: string | null;
  nip: string | null;
  aktif: boolean;
  divisi_id: number | null;
  divisi_nama: string | null;
}

interface DivisiLite {
  id: number;
  nama: string;
  jam_masuk: string;
  jam_pulang: string;
}

interface FormState {
  id: number | null;
  nama: string;
  username: string;
  password: string;
  role: "admin" | "staff";
  jabatan: string;
  nip: string;
  aktif: boolean;
  divisi_id: number | null;
}

const emptyForm: FormState = {
  id: null,
  nama: "",
  username: "",
  password: "",
  role: "staff",
  jabatan: "",
  nip: "",
  aktif: true,
  divisi_id: null,
};

export default function PegawaiPage() {
  const [list, setList] = useState<Employee[]>([]);
  const [divisi, setDivisi] = useState<DivisiLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [eRes, dRes] = await Promise.all([
        fetch("/api/admin/employees", { cache: "no-store" }),
        fetch("/api/admin/divisi", { cache: "no-store" }),
      ]);
      const e = await eRes.json();
      const d = await dRes.json();
      setList(e.employees || []);
      setDivisi(d.divisi || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setError(null);
    setForm({ ...emptyForm });
  }
  function openEdit(e: Employee) {
    setError(null);
    setForm({
      id: e.id,
      nama: e.nama,
      username: e.username,
      password: "",
      role: e.role,
      jabatan: e.jabatan || "",
      nip: e.nip || "",
      aktif: e.aktif,
      divisi_id: e.divisi_id,
    });
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const isEdit = form.id !== null;
      const url = isEdit
        ? `/api/admin/employees/${form.id}`
        : "/api/admin/employees";
      const payload: Record<string, unknown> = {
        nama: form.nama,
        username: form.username,
        role: form.role,
        jabatan: form.jabatan,
        nip: form.nip,
        aktif: form.aktif,
        divisi_id: form.divisi_id,
      };
      if (form.password) payload.password = form.password;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan.");
        return;
      }
      setForm(null);
      await load();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(e: Employee) {
    if (!confirm(`Hapus pegawai "${e.nama}"? Tindakan ini permanen.`)) return;
    const res = await fetch(`/api/admin/employees/${e.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Gagal menghapus.");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Data Pegawai</h1>
        <button onClick={openNew} className="btn-gold">
          + Tambah Pegawai
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <p className="p-6 text-center text-slate-400">Memuat…</p>
        ) : list.length === 0 ? (
          <p className="p-6 text-center text-slate-400">Belum ada pegawai.</p>
        ) : (
          <div className="scroll-x overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr className="border-b border-white/5">
                  <th className="px-4 py-2.5">Nama</th>
                  <th className="px-4 py-2.5">Username</th>
                  <th className="px-4 py-2.5">Divisi</th>
                  <th className="px-4 py-2.5">Jabatan</th>
                  <th className="px-4 py-2.5">Peran</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {list.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-2.5 font-medium">{e.nama}</td>
                    <td className="px-4 py-2.5 text-slate-400">{e.username}</td>
                    <td className="px-4 py-2.5">
                      {e.divisi_nama ? (
                        <span className="badge bg-gold-500/15 text-gold-400">
                          {e.divisi_nama}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{e.jabatan || "—"}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={
                          "badge " +
                          (e.role === "admin"
                            ? "bg-emas-500/15 text-emas-400"
                            : "bg-white/5 text-slate-300")
                        }
                      >
                        {e.role === "admin" ? "Admin" : "Staf"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={
                          "badge " +
                          (e.aktif
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-red-500/15 text-red-300")
                        }
                      >
                        {e.aktif ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(e)}
                          className="btn-ghost px-2.5 py-1 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => remove(e)}
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

      {form && (
        <div
          className="fixed inset-0 z-20 grid place-items-center bg-black/60 p-4"
          onClick={() => setForm(null)}
        >
          <div
            className="card w-full max-w-md p-6"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 className="text-lg font-bold">
              {form.id ? "Edit Pegawai" : "Tambah Pegawai"}
            </h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Nama Lengkap</label>
                <input
                  className="input"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Username</label>
                  <input
                    className="input"
                    value={form.username}
                    onChange={(e) =>
                      setForm({ ...form, username: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">NIP</label>
                  <input
                    className="input"
                    value={form.nip}
                    onChange={(e) => setForm({ ...form, nip: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Jabatan</label>
                  <input
                    className="input"
                    value={form.jabatan}
                    placeholder="mis. Juru Masak"
                    onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Divisi (Shift)</label>
                  <select
                    className="input"
                    value={form.divisi_id ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        divisi_id: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  >
                    <option value="">— Tanpa divisi —</option>
                    {divisi.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nama} ({d.jam_masuk}–{d.jam_pulang})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Peran</label>
                  <select
                    className="input"
                    value={form.role}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        role: e.target.value === "admin" ? "admin" : "staff",
                      })
                    }
                  >
                    <option value="staff">Staf</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select
                    className="input"
                    value={form.aktif ? "1" : "0"}
                    onChange={(e) =>
                      setForm({ ...form, aktif: e.target.value === "1" })
                    }
                  >
                    <option value="1">Aktif</option>
                    <option value="0">Nonaktif</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">
                  {form.id ? "Password Baru (opsional)" : "Password"}
                </label>
                <input
                  type="password"
                  className="input"
                  value={form.password}
                  placeholder={form.id ? "Kosongkan jika tidak diubah" : "min. 6 karakter"}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>

              {error && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={() => setForm(null)} className="btn-ghost flex-1">
                  Batal
                </button>
                <button onClick={save} className="btn-gold flex-1" disabled={saving}>
                  {saving ? "Menyimpan…" : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
