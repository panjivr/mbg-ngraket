"use client";

import { useEffect, useMemo, useState } from "react";

interface Sop {
  id: number;
  kode: string;
  judul: string;
  kategori: string;
  tujuan: string;
  ruang_lingkup: string;
  penanggung_jawab: string;
  prosedur: string;
  referensi: string;
  urutan: number;
  aktif: boolean;
}

interface SopForm {
  id: number | null;
  kode: string;
  judul: string;
  kategori: string;
  tujuan: string;
  ruang_lingkup: string;
  penanggung_jawab: string;
  prosedur: string;
  referensi: string;
  urutan: number;
  aktif: boolean;
}

interface PerSop {
  id: number;
  kode: string;
  judul: string;
  lengkap: boolean;
  kurang: string[];
}

interface Rekomendasi {
  judul: string;
  alasan: string;
}

interface Analisis {
  skor: number;
  total: number;
  lengkap: number;
  perSop: PerSop[];
  rekomendasi: Rekomendasi[];
}

const KATEGORI_OPTIONS = [
  "Penerimaan & Penyimpanan",
  "Pengolahan",
  "Higiene & Sanitasi",
  "Distribusi",
  "K3 (Keselamatan Kerja)",
  "Administrasi",
  "Umum",
] as const;

const emptyForm: SopForm = {
  id: null,
  kode: "",
  judul: "",
  kategori: KATEGORI_OPTIONS[0],
  tujuan: "",
  ruang_lingkup: "",
  penanggung_jawab: "",
  prosedur: "",
  referensi: "",
  urutan: 0,
  aktif: true,
};

export default function SopPage() {
  const [list, setList] = useState<Sop[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<SopForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number[]>([]);
  const [analisis, setAnalisis] = useState<Analisis | null>(null);
  const [analisisLoading, setAnalisisLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sop", { cache: "no-store" });
      const data = (await res.json()) as { sop?: Sop[] };
      setList(data.sop || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  // Kelompokkan SOP per kategori, urutkan mengikuti daftar kategori baku.
  const grouped = useMemo(() => {
    const map = new Map<string, Sop[]>();
    for (const s of list) {
      const k = s.kategori?.trim() || "Umum";
      const arr = map.get(k);
      if (arr) arr.push(s);
      else map.set(k, [s]);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.urutan - b.urutan || a.kode.localeCompare(b.kode));
    }
    const order = (k: string) => {
      const i = (KATEGORI_OPTIONS as readonly string[]).indexOf(k);
      return i === -1 ? KATEGORI_OPTIONS.length : i;
    };
    return [...map.entries()].sort(
      ([a], [b]) => order(a) - order(b) || a.localeCompare(b),
    );
  }, [list]);

  function toggleOpen(id: number) {
    setOpen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function openNew(prefJudul?: string) {
    setError(null);
    setForm({ ...emptyForm, judul: prefJudul ?? "" });
  }
  function openEdit(s: Sop) {
    setError(null);
    setForm({
      id: s.id,
      kode: s.kode,
      judul: s.judul,
      kategori: s.kategori || KATEGORI_OPTIONS[0],
      tujuan: s.tujuan,
      ruang_lingkup: s.ruang_lingkup,
      penanggung_jawab: s.penanggung_jawab,
      prosedur: s.prosedur,
      referensi: s.referensi,
      urutan: s.urutan,
      aktif: s.aktif,
    });
  }

  async function save() {
    if (!form) return;
    if (!form.judul.trim()) {
      setError("Judul SOP wajib diisi.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const isEdit = form.id !== null;
      const url = isEdit ? `/api/admin/sop/${form.id}` : "/api/admin/sop";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kode: form.kode,
          judul: form.judul,
          kategori: form.kategori,
          tujuan: form.tujuan,
          ruang_lingkup: form.ruang_lingkup,
          penanggung_jawab: form.penanggung_jawab,
          prosedur: form.prosedur,
          referensi: form.referensi,
          urutan: form.urutan,
          aktif: form.aktif,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan SOP.");
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

  async function remove(s: Sop) {
    if (!confirm(`Hapus SOP "${s.judul}"?`)) return;
    const res = await fetch(`/api/admin/sop/${s.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      alert(data.error || "Gagal menghapus SOP.");
      return;
    }
    await load();
  }

  async function analisa() {
    setAnalisisLoading(true);
    try {
      const res = await fetch("/api/admin/sop/analisis", { cache: "no-store" });
      const data = (await res.json()) as Analisis;
      setAnalisis(data);
    } finally {
      setAnalisisLoading(false);
    }
  }

  const kategoriOptions = form
    ? (KATEGORI_OPTIONS as readonly string[]).includes(form.kategori)
      ? [...KATEGORI_OPTIONS]
      : [form.kategori, ...KATEGORI_OPTIONS]
    : [...KATEGORI_OPTIONS];

  const kurangList = analisis?.perSop.filter((p) => !p.lengkap) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">📋 Standar Operasional Prosedur (SOP)</h1>
          <p className="text-sm text-slate-400">
            Kelola SOP dapur MBG/SPPG — dari penerimaan bahan, pengolahan, higiene,
            hingga distribusi. Satu SOP satu prosedur baku.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={analisa}
            disabled={analisisLoading}
            className="btn-ghost"
            title="Analisa kelengkapan & rekomendasi SOP"
          >
            {analisisLoading ? "Menganalisa…" : "🔍 Analisa Kelengkapan SOP"}
          </button>
          <button onClick={() => openNew()} className="btn-gold">
            ➕ Tambah SOP
          </button>
        </div>
      </div>

      {/* Panel analisa kelengkapan (insight) */}
      {analisis && (
        <div className="card border border-emas-500/40 bg-emas-500/5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-emas-400">
                🔍 Analisa Kelengkapan SOP
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Skor kelengkapan dihitung dari SOP yang mengisi seluruh komponen wajib.
              </p>
            </div>
            <button
              onClick={() => setAnalisis(null)}
              className="btn-ghost px-2.5 py-1 text-xs"
            >
              Tutup
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-6">
            <div>
              <p className="text-4xl font-bold text-emas-400">{analisis.skor}%</p>
              <p className="text-xs text-slate-400">
                {analisis.lengkap}/{analisis.total} SOP lengkap
              </p>
            </div>
            <div className="min-w-[180px] flex-1">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emas-500"
                  style={{ width: `${Math.max(0, Math.min(100, analisis.skor))}%` }}
                />
              </div>
            </div>
          </div>

          {kurangList.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-semibold">SOP yang masih kurang</p>
              <div className="mt-2 space-y-2">
                {kurangList.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-white/10 bg-ink-900/60 p-3"
                  >
                    <p className="text-sm font-medium">
                      <span className="font-mono text-slate-400">{p.kode}</span> {p.judul}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {p.kurang.map((k) => (
                        <span
                          key={k}
                          className="badge bg-ember-500/15 text-ember-400"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analisis.rekomendasi.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-semibold">
                Rekomendasi SOP yang sebaiknya ditambahkan
              </p>
              <div className="mt-2 space-y-2">
                {analisis.rekomendasi.map((r, i) => (
                  <div
                    key={`${r.judul}-${i}`}
                    className="flex items-start justify-between gap-3 rounded-xl border border-emas-500/30 bg-emas-500/5 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{r.judul}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{r.alasan}</p>
                    </div>
                    <button
                      onClick={() => openNew(r.judul)}
                      className="btn-ghost shrink-0 px-2.5 py-1 text-xs"
                    >
                      + Tambah
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Daftar SOP per kategori */}
      {loading ? (
        <div className="card p-6 text-center text-slate-400">Memuat…</div>
      ) : list.length === 0 ? (
        <div className="card p-6 text-center text-slate-400">
          Belum ada SOP. Klik <span className="font-semibold">➕ Tambah SOP</span> untuk
          membuat yang pertama.
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([kategori, items]) => (
            <div key={kategori} className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="badge bg-emas-500/15 text-emas-400">{kategori}</span>
                <span className="text-xs text-slate-500">{items.length} SOP</span>
              </div>
              {items.map((s) => {
                const isOpen = open.includes(s.id);
                return (
                  <div key={s.id} className="card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {s.kode && (
                            <span className="mr-2 font-mono text-slate-400">{s.kode}</span>
                          )}
                          {s.judul}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          Penanggung jawab:{" "}
                          {s.penanggung_jawab ? (
                            <span className="text-slate-300">{s.penanggung_jawab}</span>
                          ) : (
                            <span className="text-slate-600">— belum diisi —</span>
                          )}
                        </p>
                      </div>
                      <span
                        className={
                          "badge " +
                          (s.aktif
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-slate-500/15 text-slate-300")
                        }
                      >
                        {s.aktif ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>

                    {isOpen && (
                      <div className="mt-3 space-y-3 border-t border-white/5 pt-3 text-sm">
                        <div>
                          <p className="label">Tujuan</p>
                          <p className="text-slate-300">
                            {s.tujuan || (
                              <span className="text-slate-600">— belum diisi —</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="label">Ruang Lingkup</p>
                          <p className="text-slate-300">
                            {s.ruang_lingkup || (
                              <span className="text-slate-600">— belum diisi —</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="label">Prosedur</p>
                          {s.prosedur ? (
                            <p className="whitespace-pre-line text-slate-300">
                              {s.prosedur}
                            </p>
                          ) : (
                            <p className="text-slate-600">— belum diisi —</p>
                          )}
                        </div>
                        <div>
                          <p className="label">Referensi</p>
                          <p className="text-slate-300">
                            {s.referensi || (
                              <span className="text-slate-600">— belum diisi —</span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <button
                        onClick={() => toggleOpen(s.id)}
                        className="btn-ghost px-2.5 py-1 text-xs"
                      >
                        {isOpen ? "▲ Sembunyikan detail" : "▼ Lihat detail"}
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(s)}
                          className="btn-ghost px-2.5 py-1 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => remove(s)}
                          className="btn-danger px-2.5 py-1 text-xs"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Modal tambah/edit SOP */}
      {form && (
        <div
          className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4"
          onClick={() => setForm(null)}
        >
          <div
            className="card w-full max-w-lg p-6 max-h-[90dvh] overflow-y-auto"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 className="text-lg font-bold">
              {form.id ? "Edit SOP" : "Tambah SOP"}
            </h2>
            <div className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Kode</label>
                  <input
                    className="input"
                    value={form.kode}
                    placeholder="mis. SOP-001"
                    onChange={(e) => setForm({ ...form, kode: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Urutan</label>
                  <input
                    type="number"
                    className="input"
                    value={form.urutan}
                    onChange={(e) =>
                      setForm({ ...form, urutan: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="label">Judul *</label>
                <input
                  className="input"
                  value={form.judul}
                  placeholder="mis. Penerimaan & Pemeriksaan Bahan Makanan"
                  onChange={(e) => setForm({ ...form, judul: e.target.value })}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Kategori</label>
                  <select
                    className="input"
                    value={form.kategori}
                    onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                  >
                    {kategoriOptions.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Penanggung Jawab</label>
                  <input
                    className="input"
                    value={form.penanggung_jawab}
                    placeholder="mis. Kepala Dapur / Ahli Gizi"
                    onChange={(e) =>
                      setForm({ ...form, penanggung_jawab: e.target.value })
                    }
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Ketik bebas — peran baru otomatis tercatat dari sini.
                  </p>
                </div>
              </div>

              <div>
                <label className="label">Tujuan</label>
                <textarea
                  className="input min-h-[72px] resize-y"
                  value={form.tujuan}
                  placeholder="Maksud & sasaran dari SOP ini…"
                  onChange={(e) => setForm({ ...form, tujuan: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Ruang Lingkup</label>
                <textarea
                  className="input min-h-[72px] resize-y"
                  value={form.ruang_lingkup}
                  placeholder="Batasan penerapan SOP ini…"
                  onChange={(e) => setForm({ ...form, ruang_lingkup: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Prosedur</label>
                <textarea
                  className="input min-h-[140px] resize-y"
                  value={form.prosedur}
                  placeholder={"1. Periksa suhu bahan…\n2. Timbang & catat…\n3. Simpan sesuai jenis…"}
                  onChange={(e) => setForm({ ...form, prosedur: e.target.value })}
                />
                <p className="mt-1 text-[11px] text-slate-500">satu langkah per baris</p>
              </div>

              <div>
                <label className="label">Referensi</label>
                <input
                  className="input"
                  value={form.referensi}
                  placeholder="mis. Permenkes / Pedoman BGN…"
                  onChange={(e) => setForm({ ...form, referensi: e.target.value })}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-gold-500"
                  checked={form.aktif}
                  onChange={(e) => setForm({ ...form, aktif: e.target.checked })}
                />
                Aktif
              </label>

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
