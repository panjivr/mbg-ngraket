"use client";

/**
 * Panel acuan Harga Pasar (SISKAPERBAPO Jatim) untuk area Akuntan.
 * Menyambungkan data harga komoditas ke fitur akuntan: memudahkan pengisian
 * nominal BA (mis. penambahan bahan baku) dengan harga acuan resmi terbaru.
 * Data diambil dari GET /api/admin/harga-pasar (envelope langsung, tanpa {data}).
 */
import { useCallback, useEffect, useState } from "react";

interface Komoditas {
  id: string;
  nama: string;
  satuan: string;
  harga: number;
}
interface Kabkota {
  value: string;
  label: string;
}
interface HargaResp {
  tersedia: boolean;
  tanggal: string;
  kabkota: string;
  label: string;
  daftarKabkota: Kabkota[];
  lokasiDapur: string;
  sumber: "live" | "cache" | null;
  komoditas: Komoditas[];
  catatan: string | null;
}

const rupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");

export default function HargaPasarPanel() {
  const [data, setData] = useState<HargaResp | null>(null);
  const [kabkota, setKabkota] = useState<string | null>(null); // null = ikut default dapur
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const muat = useCallback(async (kab: string | null) => {
    setLoading(true);
    setErr("");
    try {
      const qs = kab !== null ? `?kabkota=${encodeURIComponent(kab)}` : "";
      const res = await fetch(`/api/admin/harga-pasar${qs}`, { cache: "no-store" });
      const json = (await res.json()) as HargaResp & { error?: string };
      if (!res.ok) throw new Error(json.error || "Gagal memuat harga pasar.");
      setData(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memuat harga pasar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    muat(kabkota);
  }, [kabkota, muat]);

  const daftar = data?.daftarKabkota ?? [];
  const nilaiSelect = kabkota ?? data?.kabkota ?? "";
  const komoditas = (data?.komoditas ?? []).filter((k) =>
    q.trim() ? k.nama.toLowerCase().includes(q.trim().toLowerCase()) : true,
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-ink-700 bg-gradient-to-br from-ink-850 via-ink-900 to-ink-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700 px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
              {/* ikon tag harga */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                <path d="M20.6 13.4 12 22l-9-9V4a1 1 0 0 1 1-1h9l7.6 7.6a2 2 0 0 1 0 2.8Z" />
                <circle cx="7.5" cy="7.5" r="1.5" />
              </svg>
            </span>
            <h2 className="truncate text-sm font-bold uppercase tracking-wider text-slate-200">
              Harga Pasar Acuan · SISKAPERBAPO
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Harga komoditas pasar Jawa Timur untuk acuan nominal BA (mis. pembelian bahan baku).
            {data ? ` Data ${data.tanggal}` : ""}
            {data?.sumber ? ` · ${data.sumber === "live" ? "terbaru" : "cache"}` : ""}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {daftar.length > 0 && (
            <select
              value={nilaiSelect}
              onChange={(e) => setKabkota(e.target.value)}
              className="rounded-lg border border-ink-700 bg-ink-900 px-2 py-1.5 text-sm text-slate-200"
              aria-label="Pilih kabupaten/kota"
            >
              {daftar.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => muat(kabkota)}
            disabled={loading}
            className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
          >
            {loading ? "Memuat…" : "↻ Muat ulang"}
          </button>
        </div>
      </div>

      <div className="p-5">
        {err && (
          <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {err}
          </p>
        )}
        {data && !data.tersedia && (
          <p className="mb-3 rounded-lg border border-slate-500/30 bg-white/5 px-3 py-2 text-sm text-slate-300">
            {data.catatan || "Data harga pasar sedang tidak tersedia. Isi nominal BA secara manual."}
          </p>
        )}

        {komoditas.length > 0 && (
          <>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari komoditas (mis. ayam, telur, beras)…"
              className="mb-3 w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500"
            />
            <div className="max-h-80 overflow-auto rounded-xl border border-ink-700">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-ink-900 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Komoditas</th>
                    <th className="px-3 py-2 font-semibold">Satuan</th>
                    <th className="px-3 py-2 text-right font-semibold">Harga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-800">
                  {komoditas.map((k) => (
                    <tr key={k.id} className="hover:bg-white/[0.03]">
                      <td className="px-3 py-2 text-slate-200">{k.nama}</td>
                      <td className="px-3 py-2 text-slate-400">{k.satuan}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums text-emerald-300">
                        {rupiah(k.harga)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-right text-xs text-slate-500">
              {komoditas.length} komoditas · sumber: siskaperbapo.jatimprov.go.id
            </p>
          </>
        )}

        {loading && !data && (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-8 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
