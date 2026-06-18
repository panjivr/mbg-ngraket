"use client";

import { useEffect, useState } from "react";

interface Divisi {
  id: number;
  nama: string;
  jam_masuk: string;
  jam_pulang: string;
  toleransi_menit: number;
  aktif: boolean;
  lintas_hari?: boolean;
  jumlah_staf?: number;
}

interface FormState {
  id: number | null;
  nama: string;
  jam_masuk: string;
  jam_pulang: string;
  toleransi_menit: number;
  aktif: boolean;
}

const emptyForm: FormState = {
  id: null,
  nama: "",
  jam_masuk: "07:00",
  jam_pulang: "15:00",
  toleransi_menit: 10,
  aktif: true,
};

export default function DivisiPage() {
  const [list, setList] = useState<Divisi[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/divisi", { cache: "no-store" });
      const data = await res.json();
      setList(data.divisi || []);
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
  function openEdit(d: Divisi) {
    setError(null);
    setForm({
      id: d.id,
      nama: d.nama,
      jam_masuk: d.jam_masuk,
      jam_pulang: d.jam_pulang,
      toleransi_menit: d.toleransi_menit,
      aktif: d.aktif,
    });
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const isEdit = form.id !== null;
      const url = isEdit ? `/api/admin/divisi/${form.id}` : "/api/admin/divisi";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: form.nama,
          jam_masuk: form.jam_masuk,
          jam_pulang: form.jam_pulang,
          toleransi_menit: form.toleransi_menit,
          aktif: form.aktif,
        }),
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

  async function remove(d: Divisi) {
    if (!confirm(`Hapus divisi "${d.nama}"? Staf di divisi ini akan menjadi tanpa divisi.`))
      return;
    const res = await fetch(`/api/admin/divisi/${d.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Gagal menghapus.");
      return;
    }
    await load();
  }

  const isOvernight = form
    ? Number(form.jam_pulang.replace(":", "")) <= Number(form.jam_masuk.replace(":", ""))
    : false;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Divisi & Shift</h1>
          <p className="text-sm text-slate-400">
            Atur jam kerja tiap divisi. Shift bisa melewati tengah malam.
          </p>
        </div>
        <button onClick={openNew} className="btn-gold">
          + Tambah Divisi
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <p className="p-6 text-center text-slate-400">Memuat…</p>
        ) : list.length === 0 ? (
          <p className="p-6 text-center text-slate-400">Belum ada divisi.</p>
        ) : (
          <div className="scroll-x overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr className="border-b border-white/5">
                  <th className="px-4 py-2.5">Divisi</th>
                  <th className="px-4 py-2.5">Jam Kerja</th>
                  <th className="px-4 py-2.5">Toleransi</th>
                  <th className="px-4 py-2.5">Staf</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {list.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-2.5 font-medium">{d.nama}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono">
                        {d.jam_masuk}–{d.jam_pulang}
                      </span>
                      {d.lintas_hari && (
                        <span className="badge ml-2 bg-ember-500/15 text-ember-400">
                          lintas hari
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">
                      {d.toleransi_menit} mnt
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">
                      {d.jumlah_staf ?? 0}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={
                          "badge " +
                          (d.aktif
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-red-500/15 text-red-300")
                        }
                      >
                        {d.aktif ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(d)}
                          className="btn-ghost px-2.5 py-1 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => remove(d)}
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
              {form.id ? "Edit Divisi" : "Tambah Divisi"}
            </h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Nama Divisi</label>
                <input
                  className="input"
                  value={form.nama}
                  placeholder="mis. Dapur / Masak"
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
              </div>
              {isOvernight && (
                <p className="rounded-lg border border-ember-500/30 bg-ember-500/10 px-3 py-2 text-xs text-ember-300">
                  Shift ini melewati tengah malam (lintas hari) — absen pulang di
                  pagi hari tetap dihitung untuk shift yang dimulai malam
                  sebelumnya.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Toleransi (menit)</label>
                  <input
                    type="number"
                    min={0}
                    max={240}
                    className="input"
                    value={form.toleransi_menit}
                    onChange={(e) =>
                      setForm({ ...form, toleransi_menit: Number(e.target.value) })
                    }
                  />
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
