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

interface SopResponse {
  sop: Sop[];
}

const SEMUA = "Semua";

function Section({ label, value }: { label: string; value: string }) {
  const text = value?.trim();
  if (!text) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-200">{text}</p>
    </div>
  );
}

export default function SopPage() {
  const [items, setItems] = useState<Sop[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [kategori, setKategori] = useState<string>(SEMUA);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/sop", { cache: "no-store" })
      .then((r) => r.json() as Promise<SopResponse>)
      .then((d) => setItems(Array.isArray(d.sop) ? d.sop : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  // Daftar kategori unik untuk chip filter.
  const kategoriList = useMemo(() => {
    const set = new Set<string>();
    for (const s of items) {
      const k = s.kategori?.trim();
      if (k) set.add(k);
    }
    return [SEMUA, ...Array.from(set).sort((a, b) => a.localeCompare(b, "id"))];
  }, [items]);

  // Filter berdasarkan kategori terpilih + kata kunci (judul/kategori), lalu urutkan.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((s) => kategori === SEMUA || s.kategori === kategori)
      .filter((s) => {
        if (!q) return true;
        return (
          s.judul.toLowerCase().includes(q) ||
          s.kategori.toLowerCase().includes(q) ||
          s.kode.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.urutan - b.urutan || a.kode.localeCompare(b.kode, "id"));
  }, [items, kategori, query]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold">📋 SOP Dapur</h1>
        <p className="text-sm text-slate-400">
          Standar Operasional Prosedur untuk dapurmu. Ketuk salah satu SOP untuk membaca isinya.
        </p>
      </div>

      {/* Pencarian */}
      <div>
        <input
          className="input"
          type="search"
          value={query}
          placeholder="Cari SOP (judul, kategori, kode)…"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Chip kategori */}
      {kategoriList.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {kategoriList.map((k) => {
            const active = k === kategori;
            return (
              <button
                key={k}
                onClick={() => setKategori(k)}
                className={
                  "badge transition " +
                  (active
                    ? "bg-gold-500/20 text-gold-400 ring-1 ring-gold-500/40"
                    : "bg-white/5 text-slate-300 hover:bg-white/10")
                }
              >
                {k}
              </button>
            );
          })}
        </div>
      )}

      {/* Daftar SOP */}
      {loading ? (
        <div className="card p-6 text-center text-slate-400">Memuat…</div>
      ) : filtered.length === 0 ? (
        <div className="card p-6 text-center text-slate-400">
          {items.length === 0
            ? "Belum ada SOP untuk dapur ini."
            : "Tidak ada SOP yang cocok dengan pencarianmu."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => {
            const open = openId === s.id;
            return (
              <div key={s.id} className="card overflow-hidden">
                <button
                  onClick={() => setOpenId(open ? null : s.id)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {s.kode && (
                        <span className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-slate-400">
                          {s.kode}
                        </span>
                      )}
                      {s.kategori && (
                        <span className="badge bg-sky-500/15 text-sky-300">{s.kategori}</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-100">{s.judul}</p>
                  </div>
                  <span
                    className={
                      "shrink-0 text-slate-400 transition-transform " +
                      (open ? "rotate-180" : "")
                    }
                    aria-hidden
                  >
                    ▾
                  </span>
                </button>

                {open && (
                  <div className="space-y-4 border-t border-white/10 bg-ink-900/40 px-4 py-4">
                    <Section label="Tujuan" value={s.tujuan} />
                    <Section label="Ruang Lingkup" value={s.ruang_lingkup} />
                    <Section label="Penanggung Jawab" value={s.penanggung_jawab} />
                    <Section label="Prosedur" value={s.prosedur} />
                    <Section label="Referensi" value={s.referensi} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
