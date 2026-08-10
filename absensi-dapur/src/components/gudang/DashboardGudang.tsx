"use client";

/**
 * Dashboard Gudang (untuk admin): analitik persediaan yang lengkap —
 * ringkasan nilai & status, kesehatan stok, aktivitas & konsumsi 30 hari,
 * estimasi habis / reorder, barang paling sering dipakai, pantauan kadaluarsa,
 * rincian per kategori, dan mutasi terbaru.
 * Membaca /api/admin/gudang/barang + /mutasi (read-only).
 */
import { useEffect, useMemo, useState } from "react";
import {
  KATEGORI_LABEL, KATEGORI_LIST, TIPE_LABEL, statusStok, statusKadaluarsa,
  type Barang, type Kategori, type Mutasi,
} from "@/lib/gudang";

const WINDOW_DAYS = 30;          // jendela analitik konsumsi/aktivitas
const REORDER_HORIZON = 14;      // tampilkan barang yang habis ≤ N hari
const EXPIRY_AMBANG = 7;         // "segera kadaluarsa" bila ≤ N hari

const fmtNum = (n: number) => (Number.isInteger(n) ? n.toLocaleString("id-ID") : n.toLocaleString("id-ID", { maximumFractionDigits: 2 }));
const fmtRp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");

/** Tanggal hari ini di zona Asia/Jakarta, format YYYY-MM-DD. */
function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}
const dayMs = 86_400_000;
function parseIso(iso: string): number { return Date.parse(iso + "T00:00:00"); }
function addDays(iso: string, n: number): string {
  const t = parseIso(iso);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(t + n * dayMs));
}

export default function DashboardGudang() {
  const [list, setList] = useState<Barang[]>([]);
  const [mutasi, setMutasi] = useState<Mutasi[]>([]);
  const [loading, setLoading] = useState(true);
  const today = useMemo(() => jakartaToday(), []);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/gudang/barang", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/gudang/mutasi", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
    ]).then(([b, m]) => {
      setList(b.barang || []);
      setMutasi(m.mutasi || []);
    }).finally(() => setLoading(false));
  }, []);

  // Peta bantu
  const namaById = useMemo(() => new Map(list.map((b) => [b.id, b.nama])), [list]);
  const barangById = useMemo(() => new Map(list.map((b) => [b.id, b])), [list]);

  // Ringkasan status + nilai persediaan
  const stat = useMemo(() => {
    let habis = 0, menipis = 0, aman = 0, nilai = 0;
    for (const b of list) {
      const s = statusStok(b);
      if (s === "habis") habis++; else if (s === "menipis") menipis++; else aman++;
      nilai += (b.stok || 0) * (b.harga || 0);
    }
    return { total: list.length, habis, menipis, aman, nilai };
  }, [list]);

  // Ringkasan kadaluarsa
  const kad = useMemo(() => {
    let kadaluarsa = 0, segera = 0;
    for (const b of list) {
      const s = statusKadaluarsa(b.tanggal_kadaluarsa, today, EXPIRY_AMBANG);
      if (s === "kadaluarsa") kadaluarsa++; else if (s === "segera") segera++;
    }
    return { kadaluarsa, segera };
  }, [list, today]);

  const perKategori = useMemo(() => {
    const m = new Map<Kategori, { jumlah: number; nilai: number }>();
    for (const b of list) {
      const e = m.get(b.kategori) || { jumlah: 0, nilai: 0 };
      e.jumlah += 1; e.nilai += (b.stok || 0) * (b.harga || 0);
      m.set(b.kategori, e);
    }
    return KATEGORI_LIST.map((k) => ({ k, ...(m.get(k) || { jumlah: 0, nilai: 0 }) })).filter((x) => x.jumlah > 0);
  }, [list]);
  const maxNilai = Math.max(1, ...perKategori.map((x) => x.nilai));

  // Aktivitas + konsumsi dalam WINDOW_DAYS terakhir
  const aktivitas = useMemo(() => {
    const cutoff = parseIso(today) - (WINDOW_DAYS - 1) * dayMs;
    let masukQty = 0, keluarQty = 0, masukRp = 0, keluarRp = 0, opnameCount = 0, tx = 0;
    const konsumsiById = new Map<number, number>();
    for (const m of mutasi) {
      const t = parseIso(m.tanggal);
      if (Number.isNaN(t) || t < cutoff) continue;
      tx++;
      const harga = barangById.get(m.barang_id)?.harga || 0;
      if (m.tipe === "masuk") { masukQty += m.jumlah; masukRp += m.jumlah * harga; }
      else if (m.tipe === "keluar") {
        keluarQty += m.jumlah; keluarRp += m.jumlah * harga;
        konsumsiById.set(m.barang_id, (konsumsiById.get(m.barang_id) || 0) + m.jumlah);
      } else opnameCount++;
    }
    return { masukQty, keluarQty, masukRp, keluarRp, opnameCount, tx, konsumsiById };
  }, [mutasi, today, barangById]);

  // Estimasi habis / reorder — berdasarkan laju pemakaian harian
  const reorder = useMemo(() => {
    const rows: { b: Barang; laju: number; hari: number; tglHabis: string }[] = [];
    for (const b of list) {
      const total = aktivitas.konsumsiById.get(b.id) || 0;
      if (total <= 0) continue;
      const laju = total / WINDOW_DAYS;
      const hari = (b.stok || 0) / laju;
      if (hari > REORDER_HORIZON) continue;
      rows.push({ b, laju, hari, tglHabis: addDays(today, Math.max(0, Math.round(hari))) });
    }
    return rows.sort((a, b) => a.hari - b.hari);
  }, [list, aktivitas, today]);

  // Barang paling sering dipakai (WINDOW_DAYS)
  const topPakai = useMemo(() => {
    const rows = [...aktivitas.konsumsiById.entries()]
      .map(([id, qty]) => ({ id, qty, b: barangById.get(id) }))
      .filter((x) => x.b)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);
    const max = Math.max(1, ...rows.map((x) => x.qty));
    return { rows, max };
  }, [aktivitas, barangById]);

  // Pantauan kadaluarsa (kadaluarsa + segera), diurutkan paling dekat
  const watchKad = useMemo(() => {
    return list
      .map((b) => ({ b, s: statusKadaluarsa(b.tanggal_kadaluarsa, today, EXPIRY_AMBANG), sisa: b.tanggal_kadaluarsa ? Math.round((parseIso(b.tanggal_kadaluarsa) - parseIso(today)) / dayMs) : Infinity }))
      .filter((x) => x.s === "kadaluarsa" || x.s === "segera")
      .sort((a, b) => a.sisa - b.sisa);
  }, [list, today]);

  const kritis = useMemo(
    () => list.filter((b) => statusStok(b) !== "aman").sort((a, b) => a.stok - b.stok),
    [list],
  );

  if (loading) return <div className="card p-6 text-center text-slate-400">Memuat…</div>;

  return (
    <div className="space-y-5">
      {/* Kartu ringkasan */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <div className="card p-4">
          <p className="text-xs text-slate-400">Total Nilai Persediaan</p>
          <p className="mt-1 text-xl font-bold text-emerald-300 sm:text-2xl">{fmtRp(stat.nilai)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400">Jumlah Barang</p>
          <p className="mt-1 text-xl font-bold sm:text-2xl">{stat.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400">Stok Menipis</p>
          <p className="mt-1 text-xl font-bold text-amber-300 sm:text-2xl">{stat.menipis}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400">Stok Habis</p>
          <p className="mt-1 text-xl font-bold text-red-300 sm:text-2xl">{stat.habis}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400">Segera Kadaluarsa <span className="text-slate-500">(≤{EXPIRY_AMBANG}h)</span></p>
          <p className="mt-1 text-xl font-bold text-orange-300 sm:text-2xl">{kad.segera}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400">Kadaluarsa</p>
          <p className="mt-1 text-xl font-bold text-red-300 sm:text-2xl">{kad.kadaluarsa}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Kesehatan stok + aktivitas 30 hari */}
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-bold">Kesehatan Stok</h3>
          <div className="flex items-center gap-5">
            <HealthDonut aman={stat.aman} menipis={stat.menipis} habis={stat.habis} />
            <div className="space-y-1.5 text-sm">
              <LegendRow color="bg-emerald-400" label="Aman" value={stat.aman} total={stat.total} />
              <LegendRow color="bg-amber-400" label="Menipis" value={stat.menipis} total={stat.total} />
              <LegendRow color="bg-red-400" label="Habis" value={stat.habis} total={stat.total} />
            </div>
          </div>

          <h3 className="mb-2 mt-5 text-sm font-bold">Aktivitas {WINDOW_DAYS} Hari Terakhir</h3>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <MiniStat label="Masuk" value={fmtNum(aktivitas.masukQty)} sub={fmtRp(aktivitas.masukRp)} tone="text-emerald-300" />
            <MiniStat label="Keluar" value={fmtNum(aktivitas.keluarQty)} sub={fmtRp(aktivitas.keluarRp)} tone="text-sky-300" />
            <MiniStat label="Opname" value={fmtNum(aktivitas.opnameCount)} sub="penyesuaian" tone="text-amber-300" />
            <MiniStat label="Transaksi" value={fmtNum(aktivitas.tx)} sub="total mutasi" tone="text-slate-200" />
          </div>
        </div>

        {/* Nilai per kategori */}
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-bold">Nilai Persediaan per Kategori</h3>
          {perKategori.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada data.</p>
          ) : (
            <div className="space-y-2.5">
              {perKategori.map((x) => (
                <div key={x.k}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{KATEGORI_LABEL[x.k]} <span className="text-slate-500">· {x.jumlah}</span></span>
                    <span className="tabular-nums text-slate-400">{fmtRp(x.nilai)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-gold-500/70" style={{ width: `${(x.nilai / maxNilai) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Reorder / estimasi habis */}
        <div className="card p-4">
          <h3 className="mb-1 text-sm font-bold">Perlu Dipesan Ulang</h3>
          <p className="mb-3 text-xs text-slate-500">Estimasi habis ≤ {REORDER_HORIZON} hari (dari laju pakai {WINDOW_DAYS} hari).</p>
          {reorder.length === 0 ? (
            <p className="text-sm text-emerald-300">Tidak ada barang mendesak ✓</p>
          ) : (
            <div className="scroll-x max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-400">
                  <tr className="border-b border-white/5">
                    <th className="py-1.5 pr-2">Barang</th><th className="py-1.5 pr-2 text-right">Stok</th>
                    <th className="py-1.5 pr-2 text-right">Pakai/hari</th><th className="py-1.5 text-right">Estimasi</th>
                  </tr>
                </thead>
                <tbody>
                  {reorder.map(({ b, laju, hari, tglHabis }) => (
                    <tr key={b.id} className="border-b border-white/5">
                      <td className="py-1.5 pr-2 font-medium">{b.nama}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{fmtNum(b.stok)} {b.satuan}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums text-slate-400">{fmtNum(Math.round(laju * 10) / 10)}</td>
                      <td className="py-1.5 text-right">
                        <span className={"badge " + (hari <= 3 ? "bg-red-500/15 text-red-300" : hari <= 7 ? "bg-amber-500/15 text-amber-300" : "bg-white/5 text-slate-300")}>
                          {hari < 1 ? "hari ini" : `${Math.round(hari)} hari`}
                        </span>
                        <span className="ml-1 hidden text-xs text-slate-500 sm:inline">{tglHabis}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Paling sering dipakai */}
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-bold">Paling Sering Dipakai <span className="text-slate-500">({WINDOW_DAYS} hari)</span></h3>
          {topPakai.rows.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada pemakaian.</p>
          ) : (
            <div className="space-y-2.5">
              {topPakai.rows.map((x) => (
                <div key={x.id}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{x.b!.nama}</span>
                    <span className="tabular-nums text-slate-400">{fmtNum(x.qty)} {x.b!.satuan}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-sky-400/70" style={{ width: `${(x.qty / topPakai.max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Pantauan kadaluarsa */}
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-bold">Pantauan Kadaluarsa</h3>
          {watchKad.length === 0 ? (
            <p className="text-sm text-emerald-300">Tidak ada yang mendekati kadaluarsa ✓</p>
          ) : (
            <div className="scroll-x max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <tbody>
                  {watchKad.map(({ b, s, sisa }) => (
                    <tr key={b.id} className="border-b border-white/5">
                      <td className="py-1.5 pr-2 font-medium">{b.nama}</td>
                      <td className="py-1.5 pr-2 text-right text-xs text-slate-500">{b.tanggal_kadaluarsa}</td>
                      <td className="py-1.5 text-right">
                        <span className={"badge " + (s === "kadaluarsa" ? "bg-red-500/15 text-red-300" : "bg-orange-500/15 text-orange-300")}>
                          {s === "kadaluarsa" ? `Lewat ${Math.abs(sisa)}h` : sisa <= 0 ? "Hari ini" : `${sisa} hari`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stok kritis */}
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-bold">Perlu Perhatian (menipis / habis)</h3>
          {kritis.length === 0 ? (
            <p className="text-sm text-emerald-300">Semua stok aman ✓</p>
          ) : (
            <div className="scroll-x max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <tbody>
                  {kritis.map((b) => {
                    const s = statusStok(b);
                    return (
                      <tr key={b.id} className="border-b border-white/5">
                        <td className="py-1.5 pr-2 font-medium">{b.nama}</td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">{fmtNum(b.stok)} {b.satuan}</td>
                        <td className="py-1.5 text-right">
                          <span className={"badge " + (s === "habis" ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300")}>
                            {s === "habis" ? "Habis" : "Menipis"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Mutasi terbaru */}
      <div className="card p-4">
        <h3 className="mb-3 text-sm font-bold">Mutasi Terbaru</h3>
        {mutasi.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada mutasi.</p>
        ) : (
          <div className="scroll-x max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr className="border-b border-white/5">
                  <th className="py-1.5 pr-2">Tanggal</th><th className="py-1.5 pr-2">Barang</th>
                  <th className="py-1.5 pr-2">Tipe</th><th className="py-1.5 pr-2 text-right">Jumlah</th>
                  <th className="py-1.5 pr-2 text-right">Sisa</th><th className="py-1.5">Oleh</th>
                </tr>
              </thead>
              <tbody>
                {mutasi.slice(0, 20).map((m) => (
                  <tr key={m.id} className="border-b border-white/5">
                    <td className="py-1.5 pr-2 whitespace-nowrap">{m.tanggal}</td>
                    <td className="py-1.5 pr-2">{namaById.get(m.barang_id) || "-"}</td>
                    <td className="py-1.5 pr-2">
                      <span className={m.tipe === "masuk" ? "text-emerald-300" : m.tipe === "keluar" ? "text-sky-300" : "text-amber-300"}>
                        {TIPE_LABEL[m.tipe].split(" ")[0]}
                      </span>
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{fmtNum(m.jumlah)}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{fmtNum(m.stok_sesudah)}</td>
                    <td className="py-1.5 text-xs text-slate-500">{m.oleh}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/** Donut ringkas kesehatan stok (SVG, tanpa dependensi). */
function HealthDonut({ aman, menipis, habis }: { aman: number; menipis: number; habis: number }) {
  const total = Math.max(1, aman + menipis + habis);
  const r = 34, c = 2 * Math.PI * r;
  const segs = [
    { v: aman, cls: "text-emerald-400" },
    { v: menipis, cls: "text-amber-400" },
    { v: habis, cls: "text-red-400" },
  ];
  let offset = 0;
  const pct = Math.round((aman / total) * 100);
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 90 90" className="h-24 w-24 -rotate-90">
        <circle cx="45" cy="45" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-white/5" />
        {segs.map((s, i) => {
          const len = (s.v / total) * c;
          const el = (
            <circle
              key={i} cx="45" cy="45" r={r} fill="none" stroke="currentColor" strokeWidth="10"
              className={s.cls} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold leading-none">{pct}%</span>
        <span className="text-[10px] text-slate-400">aman</span>
      </div>
    </div>
  );
}

function LegendRow({ color, label, value, total }: { color: string; label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className={"inline-block h-2.5 w-2.5 rounded-sm " + color} />
      <span className="text-slate-300">{label}</span>
      <span className="tabular-nums text-slate-400">{value}</span>
      <span className="text-xs text-slate-500">· {pct}%</span>
    </div>
  );
}

function MiniStat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: string }) {
  return (
    <div className="rounded-lg bg-white/5 p-2.5">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={"mt-0.5 text-base font-bold tabular-nums " + tone}>{value}</p>
      <p className="text-[10px] text-slate-500">{sub}</p>
    </div>
  );
}
