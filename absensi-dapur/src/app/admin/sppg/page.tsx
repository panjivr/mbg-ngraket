"use client";

import { useEffect, useState } from "react";
import { PAKET_LIST, PAKET_LABEL, PAKET_DESKRIPSI, normalizePaket, paketExpired } from "@/lib/paket";

interface SppgRow {
  id: number;
  nama: string;
  alamat: string;
  tz: string;
  jam_masuk: string;
  jam_pulang: string;
  aktif: boolean;
  jenis?: string;
  paket?: string;
  paket_until?: string | null;
  jumlah_staf?: number;
  jumlah_admin?: number;
}

const emptyForm = {
  nama: "",
  alamat: "",
  jam_masuk: "07:00",
  jam_pulang: "15:00",
  tz: "Asia/Jakarta",
  jenis: "dapur",
  admin_nama: "",
  admin_username: "",
  admin_password: "",
};

export default function SppgPage() {
  const [list, setList] = useState<SppgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...emptyForm });
  const [open, setOpen] = useState(false);
  const [addMenu, setAddMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [editS, setEditS] = useState<SppgRow | null>(null);
  const [ep, setEp] = useState("pro");
  const [eu, setEu] = useState("");

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

  const isPerusahaan = form.jenis === "perusahaan";

  function openForm(jenis: string) {
    setForm({ ...emptyForm, jenis });
    setError(null);
    setAddMenu(false);
    setOpen(true);
  }

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
        `${isPerusahaan ? "Perusahaan" : "Dapur"} "${data.sppg.nama}" dibuat. Admin "${form.admin_username}" bisa langsung login & mengelola unitnya.`,
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
        `Hapus ${s.jenis === "perusahaan" ? "perusahaan" : "dapur"} "${s.nama}" beserta SEMUA akun & absensinya? Tindakan ini permanen.`,
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

  function openPaket(s: SppgRow) {
    setEditS(s);
    setEp(normalizePaket(s.paket));
    setEu(s.paket_until ? String(s.paket_until).slice(0, 10) : "");
  }
  async function simpanPaket() {
    if (!editS) return;
    const res = await fetch(`/api/admin/sppg/${editS.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paket: ep, paket_until: eu || null }),
    });
    if (res.ok) {
      setEditS(null);
      await load();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Gagal menyimpan paket.");
    }
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
          <h1 className="text-xl font-bold">Kelola Unit (Dapur &amp; Perusahaan)</h1>
          <p className="text-sm text-slate-400">
            Tiap unit punya data, pegawai, divisi, &amp; dashboard terpisah. Buat dapur (SPPG)
            atau perusahaan/kantor baru lengkap dengan akun adminnya.
          </p>
        </div>
        <div className="relative">
          <button onClick={() => setAddMenu((v) => !v)} className="btn-gold">
            + Tambah Unit
          </button>
          {addMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setAddMenu(false)} />
              <div className="absolute right-0 z-20 mt-1 w-60 overflow-hidden rounded-xl border border-white/10 bg-ink-900 p-1 shadow-xl">
                <button
                  onClick={() => openForm("dapur")}
                  className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left hover:bg-white/5"
                >
                  <span className="mt-0.5 text-lg leading-none">🍳</span>
                  <span>
                    <span className="block text-sm font-semibold">Tambah Dapur Baru</span>
                    <span className="block text-[11px] text-slate-500">SPPG/katering — fitur dapur lengkap</span>
                  </span>
                </button>
                <button
                  onClick={() => openForm("perusahaan")}
                  className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left hover:bg-white/5"
                >
                  <span className="mt-0.5 text-lg leading-none">🏢</span>
                  <span>
                    <span className="block text-sm font-semibold">Tambah Perusahaan Baru</span>
                    <span className="block text-[11px] text-slate-500">Kantor/usaha — absensi &amp; kepegawaian</span>
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
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
          <p className="p-6 text-center text-slate-400">Belum ada unit.</p>
        ) : (
          <div className="scroll-x overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr className="border-b border-white/5">
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">Unit</th>
                  <th className="px-4 py-2.5">Zona Waktu</th>
                  <th className="px-4 py-2.5">Admin</th>
                  <th className="px-4 py-2.5">Staf</th>
                  <th className="px-4 py-2.5">Paket / Masa Aktif</th>
                  <th className="px-4 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {list.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2.5 text-slate-400">{s.id}</td>
                    <td className="px-4 py-2.5">
                      <p className="flex items-center gap-1.5 font-medium">
                        {s.nama}
                        {s.jenis === "perusahaan" ? (
                          <span className="rounded-md bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-300 ring-1 ring-inset ring-indigo-500/25">
                            🏢 Perusahaan
                          </span>
                        ) : (
                          <span className="rounded-md bg-emas-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emas-300 ring-1 ring-inset ring-emas-500/25">
                            🍳 Dapur
                          </span>
                        )}
                      </p>
                      {s.alamat && (
                        <p className="text-xs text-slate-500">{s.alamat}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{s.tz}</td>
                    <td className="px-4 py-2.5 text-slate-300">{s.jumlah_admin ?? 0}</td>
                    <td className="px-4 py-2.5 text-slate-300">{s.jumlah_staf ?? 0}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{PAKET_LABEL[normalizePaket(s.paket)]}</span>
                      <span
                        className={
                          "ml-1.5 text-xs " +
                          (paketExpired(s.paket_until) ? "text-amber-400" : "text-slate-500")
                        }
                      >
                        {s.paket_until
                          ? String(s.paket_until).slice(0, 10) +
                            (paketExpired(s.paket_until) ? " (berakhir)" : "")
                          : "tanpa batas"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => openPaket(s)}
                          className="btn-ghost px-2.5 py-1 text-xs"
                        >
                          Paket
                        </button>
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
            <h2 className="text-lg font-bold">
              {isPerusahaan ? "🏢 Tambah Perusahaan Baru" : "🍳 Tambah Dapur Baru"}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {isPerusahaan
                ? "Unit kantor/usaha — fitur absensi & kepegawaian. Fitur khusus dapur (distribusi, menu, gudang, gizi) otomatis disembunyikan."
                : "Unit dapur/SPPG — fitur lengkap termasuk distribusi, menu, gudang & gizi."}
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">{isPerusahaan ? "Nama Perusahaan / Kantor" : "Nama Dapur / SPPG"}</label>
                <input
                  className="input"
                  value={form.nama}
                  placeholder={isPerusahaan ? "mis. PT Djati Karya Nusantara" : "mis. SPPG Ngraket 2"}
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
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
                <p className="mb-2 text-sm font-semibold">{isPerusahaan ? "Akun Admin Perusahaan Ini" : "Akun Admin Dapur Ini"}</p>
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
                  Admin ini hanya dapat melihat &amp; mengelola unit barunya. GPS/geofence &amp; jam
                  kerja dapat diatur admin tersebut lewat menu Pengaturan.
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
                  {saving ? "Menyimpan…" : isPerusahaan ? "Buat Perusahaan" : "Buat Dapur"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editS && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-black/60 p-4" onClick={() => setEditS(null)}>
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Paket — {editS.nama}</h2>
            <p className="mt-1 text-sm text-slate-400">Atur paket langganan &amp; masa aktif dapur ini.</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Paket</label>
                <select className="input" value={ep} onChange={(e) => setEp(e.target.value)}>
                  {PAKET_LIST.map((p) => (
                    <option key={p} value={p}>{PAKET_LABEL[p]}</option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">{PAKET_DESKRIPSI[normalizePaket(ep)]}</p>
              </div>
              <div>
                <label className="label">Masa aktif s.d (opsional)</label>
                <div className="flex gap-2">
                  <input type="date" className="input" value={eu} onChange={(e) => setEu(e.target.value)} />
                  {eu && (
                    <button type="button" onClick={() => setEu("")} className="btn-ghost shrink-0 px-3 text-xs">
                      Tanpa batas
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Kosongkan = tanpa batas. Lewat tanggal → fitur terkunci (turun ke Bronze) sampai diperpanjang.
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditS(null)} className="btn-ghost flex-1">Batal</button>
                <button onClick={simpanPaket} className="btn-gold flex-1">Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
