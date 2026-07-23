"use client";

import { useEffect, useState } from "react";

interface EventRow {
  id: number;
  nama: string;
  tanggal: string;
  jam_masuk: string;
  jam_pulang: string;
  toleransi_menit: number;
  lat: number | null;
  lng: number | null;
  radius_m: number | null;
  aktif: boolean;
  lintas_hari?: boolean;
  peserta_ids: number[];
}

interface PegawaiLite {
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

function fmtDate(v: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(v + "T00:00:00"));
}

const emptyForm = {
  nama: "",
  tanggal: jakartaToday(),
  jam_masuk: "08:00",
  jam_pulang: "11:30",
  toleransi_menit: 15,
  lat: "",
  lng: "",
  radius_m: "",
  peserta: [] as number[],
};

export default function EventPage() {
  const today = jakartaToday();
  const [list, setList] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pegawai, setPegawai] = useState<PegawaiLite[]>([]);
  const [editPeserta, setEditPeserta] = useState<{ ev: EventRow; sel: number[] } | null>(null);
  const [pesertaSaving, setPesertaSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [res, pRes] = await Promise.all([
        fetch("/api/admin/event", { cache: "no-store" }),
        fetch("/api/admin/employees", { cache: "no-store" }),
      ]);
      const data = await res.json();
      const p = await pRes.json();
      setList(data.events || []);
      setPegawai(
        (p.employees || []).map((e: { id: number; nama: string; divisi_nama?: string | null }) => ({
          id: e.id,
          nama: e.nama,
          divisi_nama: e.divisi_nama ?? null,
        })),
      );
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
      const res = await fetch("/api/admin/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan event.");
        return;
      }
      setForm({ ...emptyForm });
      setMsg(
        `Event dibuat. ${data.affected ?? 0} absensi pada tanggal itu disesuaikan ke jadwal event (tidak terhitung terlambat).`,
      );
      await load();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(e: EventRow) {
    setMsg(null);
    const res = await fetch(`/api/admin/event/${e.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aktif: !e.aktif }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok)
      setMsg(
        e.aktif
          ? `Event dinonaktifkan. ${data.affected ?? 0} absensi dikembalikan ke jadwal divisi/shift asal.`
          : `Event diaktifkan. ${data.affected ?? 0} absensi disesuaikan ke jadwal event.`,
      );
    await load();
  }

  async function reapply(e: EventRow) {
    setMsg(null);
    const res = await fetch(`/api/admin/event/${e.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reapply: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok)
      setMsg(`Disinkronkan. ${data.affected ?? 0} absensi mengikuti jadwal event.`);
    await load();
  }

  async function remove(e: EventRow) {
    if (!confirm(`Hapus event "${e.nama}"?`)) return;
    await fetch(`/api/admin/event/${e.id}`, { method: "DELETE" });
    await load();
  }

  function toggleId(arr: number[], id: number): number[] {
    return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
  }

  async function simpanPeserta() {
    if (!editPeserta) return;
    setPesertaSaving(true);
    try {
      const res = await fetch(`/api/admin/event/${editPeserta.ev.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peserta: editPeserta.sel }),
      });
      const d = await res.json();
      if (!res.ok) {
        alert(d.error || "Gagal menyimpan peserta.");
        return;
      }
      setEditPeserta(null);
      setMsg(
        editPeserta.sel.length
          ? `Peserta event disimpan (${editPeserta.sel.length} orang). Hanya mereka yang mengikuti jadwal & titik event; sisanya absen normal di dapur.`
          : "Daftar peserta dikosongkan — event berlaku untuk semua pegawai.",
      );
      await load();
    } finally {
      setPesertaSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Event Karyawan</h1>
        <p className="text-sm text-slate-400">
          Buat event khusus (mis. <i>General Cleaning</i>) — pada tanggalnya, semua karyawan
          mengikuti jadwal event ini, bukan jadwal divisi/shift, sehingga tidak terhitung
          terlambat selama masuk dalam jam event.
        </p>
      </div>

      {/* Form buat event */}
      <div className="card p-4">
        <p className="mb-3 text-sm font-semibold">+ Buat Event</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nama Event</label>
            <input
              className="input"
              value={form.nama}
              placeholder="mis. General Cleaning"
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Tanggal</label>
            <input
              type="date"
              className="input"
              value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
            />
          </div>
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
        <div className="mt-3">
          <p className="label">
            Titik GPS Event (opsional — kosongkan bila event di dapur)
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <input
              className="input max-w-[160px]"
              placeholder="Latitude"
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
            />
            <input
              className="input max-w-[160px]"
              placeholder="Longitude"
              value={form.lng}
              onChange={(e) => setForm({ ...form, lng: e.target.value })}
            />
            <input
              className="input max-w-[130px]"
              placeholder="Radius (m)"
              value={form.radius_m}
              onChange={(e) => setForm({ ...form, radius_m: e.target.value })}
            />
            <button
              type="button"
              className="btn-ghost px-3 py-2.5 text-xs"
              title="Gunakan lokasi saya"
              onClick={() => {
                navigator.geolocation?.getCurrentPosition(
                  (pos) =>
                    setForm((fm) => ({
                      ...fm,
                      lat: pos.coords.latitude.toFixed(6),
                      lng: pos.coords.longitude.toFixed(6),
                      radius_m: fm.radius_m || "150",
                    })),
                  () => setError("Gagal membaca lokasi GPS."),
                  { enableHighAccuracy: true, timeout: 15000 },
                );
              }}
            >
              📍 Lokasi Saya
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Jika diisi, peserta event absen di titik ini; penjaga dapur tetap
            absen di titik dapur.
          </p>
        </div>
        <div className="mt-3">
          <p className="label">
            Peserta Event ({form.peserta.length ? `${form.peserta.length} orang` : "kosong = semua pegawai"})
          </p>
          <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-2">
            {pegawai.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setForm({ ...form, peserta: toggleId(form.peserta, p.id) })}
                className={
                  "rounded-lg border px-2.5 py-1 text-xs font-medium transition " +
                  (form.peserta.includes(p.id)
                    ? "border-emas-500/60 bg-emas-500/15 text-emas-300"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10")
                }
              >
                {p.nama}
                {p.divisi_nama ? ` · ${p.divisi_nama}` : ""}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Pilih siapa saja yang ikut kegiatan (mis. 10 orang ke tempat B). Yang
            tidak dipilih tetap absen dengan jadwal & titik dapur seperti biasa.
          </p>
        </div>
        {error && (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        <button onClick={save} disabled={saving} className="btn-gold mt-3 w-full sm:w-auto">
          {saving ? "Menyimpan…" : "Simpan Event"}
        </button>
      </div>

      {msg && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {msg}
        </p>
      )}

      {/* Daftar event */}
      <div className="card overflow-hidden">
        {loading ? (
          <p className="p-6 text-center text-slate-400">Memuat…</p>
        ) : list.length === 0 ? (
          <p className="p-6 text-center text-slate-400">Belum ada event.</p>
        ) : (
          <div className="scroll-x overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr className="border-b border-white/5">
                  <th className="px-4 py-2.5">Event</th>
                  <th className="px-4 py-2.5">Tanggal</th>
                  <th className="px-4 py-2.5">Jadwal</th>
                  <th className="px-4 py-2.5">Peserta</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {list.map((e) => {
                  const isToday = e.tanggal === today;
                  return (
                    <tr key={e.id}>
                      <td className="px-4 py-2.5 font-medium">
                        {e.nama}
                        {isToday && e.aktif && (
                          <span className="badge ml-2 bg-ember-500/15 text-ember-300">
                            hari ini
                          </span>
                        )}
                        {e.lat !== null && e.lng !== null && (
                          <span className="badge ml-2 bg-sky-500/15 text-sky-300">
                            📌 titik GPS sendiri
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-300">
                        {fmtDate(e.tanggal)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-300">
                        {e.jam_masuk}–{e.jam_pulang}
                        {e.lintas_hari && (
                          <span className="badge ml-2 bg-ember-500/15 text-ember-400">
                            lintas hari
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() =>
                            setEditPeserta({ ev: e, sel: [...(e.peserta_ids || [])] })
                          }
                          className="btn-ghost px-2.5 py-1 text-xs"
                          title="Atur siapa saja yang ikut event ini"
                        >
                          👥{" "}
                          {e.peserta_ids && e.peserta_ids.length
                            ? `${e.peserta_ids.length} orang`
                            : "Semua"}
                        </button>
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => toggle(e)}
                          className={
                            "badge " +
                            (e.aktif
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-slate-500/15 text-slate-300")
                          }
                          title="Klik untuk mengubah status"
                        >
                          {e.aktif ? "Aktif" : "Nonaktif"}
                        </button>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-2">
                          {e.aktif && (
                            <button
                              onClick={() => reapply(e)}
                              className="btn-ghost px-2.5 py-1 text-xs"
                              title="Terapkan ulang jadwal event ke absensi tanggal ini"
                            >
                              ↻ Sinkronkan
                            </button>
                          )}
                          <button
                            onClick={() => remove(e)}
                            className="btn-danger px-2.5 py-1 text-xs"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editPeserta && (
        <div
          className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4"
          onClick={() => setEditPeserta(null)}
        >
          <div
            className="card max-h-[85dvh] w-full max-w-md overflow-y-auto p-6"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 className="text-lg font-bold">Peserta — {editPeserta.ev.nama}</h2>
            <p className="mt-1 text-xs text-slate-400">
              Hanya peserta yang mengikuti jadwal & titik event; pegawai lain
              absen normal di dapur. Kosongkan untuk memberlakukan ke semua.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {pegawai.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    setEditPeserta({
                      ...editPeserta,
                      sel: toggleId(editPeserta.sel, p.id),
                    })
                  }
                  className={
                    "rounded-lg border px-2.5 py-1 text-xs font-medium transition " +
                    (editPeserta.sel.includes(p.id)
                      ? "border-emas-500/60 bg-emas-500/15 text-emas-300"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10")
                  }
                >
                  {p.nama}
                  {p.divisi_nama ? ` · ${p.divisi_nama}` : ""}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Terpilih: {editPeserta.sel.length || "semua (kosong)"}
            </p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setEditPeserta(null)} className="btn-ghost flex-1">
                Batal
              </button>
              <button
                onClick={simpanPeserta}
                className="btn-gold flex-1"
                disabled={pesertaSaving}
              >
                {pesertaSaving ? "Menyimpan…" : "Simpan Peserta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
