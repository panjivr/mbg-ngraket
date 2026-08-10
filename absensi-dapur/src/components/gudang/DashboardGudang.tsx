"use client";

/**
 * Dashboard Gudang (untuk admin): analitik persediaan yang lengkap —
 * ringkasan nilai & status, kesehatan stok, aktivitas & konsumsi 30 hari,
 * estimasi habis / reorder, barang paling sering dipakai, pantauan kadaluarsa,
 * rincian per kategori, dan mutasi terbaru.
 * Membaca /api/admin/gudang/barang + /mutasi (read-only).
 */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  KATEGORI_LABEL, KATEGORI_LIST, TIPE_LABEL, statusStok, statusKadaluarsa,
  type Barang, type Kategori, type Mutasi,
} from "@/lib/gudang";

const WINDOW_DAYS = 30;          // jendela analitik konsumsi/aktivitas
const REORDER_HORIZON = 14;      // tampilkan barang yang habis ≤ N hari
const EXPIRY_AMBANG = 7;         // "segera kadaluarsa" bila ≤ N hari
const TREND_DAYS = 14;           // panjang sparkline aktivitas harian

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

  // Tren aktivitas harian (TREND_DAYS terakhir) untuk sparkline
  const trend = useMemo(() => {
    const start = parseIso(today) - (TREND_DAYS - 1) * dayMs;
    const masuk = new Array<number>(TREND_DAYS).fill(0);
    const keluar = new Array<number>(TREND_DAYS).fill(0);
    for (const m of mutasi) {
      const t = parseIso(m.tanggal);
      if (Number.isNaN(t)) continue;
      const idx = Math.round((t - start) / dayMs);
      if (idx < 0 || idx >= TREND_DAYS) continue;
      if (m.tipe === "masuk") masuk[idx] += m.jumlah;
      else if (m.tipe === "keluar") keluar[idx] += m.jumlah;
    }
    const max = Math.max(1, ...masuk, ...keluar);
    return { masuk, keluar, max };
  }, [mutasi, today]);

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

  const amanPct = stat.total > 0 ? Math.round((stat.aman / stat.total) * 100) : 0;
  const gaugeVar = {
    "--val": amanPct,
    "--c1": "#34d399",
    "--c2": "#22d3ee",
  } as CSSProperties;

  return (
    <div className="dash-stagger space-y-5">
      {/* Hero command-center: gauge kesehatan + tren aktivitas */}
      <div className="card grid-glow ring-glow overflow-hidden p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="live-dot inline-block h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Pusat Kendali Gudang</span>
          <span className="ml-auto text-xs text-slate-500">{today}</span>
        </div>

        <div className="grid items-center gap-6 md:grid-cols-[auto,1fr]">
          {/* Gauge kesehatan stok */}
          <div className="flex items-center gap-4">
            <div className="gauge h-28 w-28 shrink-0" style={gaugeVar}>
              <div className="gauge-inner">
                <div className="text-2xl font-bold neon-cyan">{amanPct}%</div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">stok aman</div>
              </div>
            </div>
            <div className="space-y-1.5 text-sm">
              <LegendRow color="bg-emerald-400" label="Aman" value={stat.aman} total={stat.total} />
              <LegendRow color="bg-amber-400" label="Menipis" value={stat.menipis} total={stat.total} />
              <LegendRow color="bg-red-400" label="Habis" value={stat.habis} total={stat.total} />
            </div>
          </div>

          {/* Sparkline aktivitas harian */}
          <div>
            <div className="mb-2 flex items-center gap-3 text-xs">
              <span className="font-semibold uppercase tracking-wide text-slate-300">Tren Aktivitas {TREND_DAYS} Hari</span>
              <span className="flex items-center gap-1 text-slate-400"><span className="inline-block h-2 w-2 rounded-sm bg-emerald-400" /> Masuk</span>
              <span className="flex items-center gap-1 text-slate-400"><span className="inline-block h-2 w-2 rounded-sm bg-sky-400" /> Keluar</span>
            </div>
            <div className="flex h-20 items-end gap-1">
              {trend.keluar.map((k, i) => (
                <div key={i} className="flex h-full flex-1 items-end justify-center gap-0.5">
                  <div className="bar-neon bar-grow w-1/2 rounded-t bg-emerald-400/70" style={{ height: `${(trend.masuk[i] / trend.max) * 100}%` }} title={`Masuk ${fmtNum(trend.masuk[i])}`} />
                  <div className="bar-neon bar-grow w-1/2 rounded-t bg-sky-400/80" style={{ height: `${(k / trend.max) * 100}%` }} title={`Keluar ${fmtNum(k)}`} />
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MiniStat label="Masuk 30h" value={fmtNum(aktivitas.masukQty)} sub={fmtRp(aktivitas.masukRp)} tone="text-emerald-300" />
              <MiniStat label="Keluar 30h" value={fmtNum(aktivitas.keluarQty)} sub={fmtRp(aktivitas.keluarRp)} tone="text-sky-300" />
              <MiniStat label="Opname 30h" value={fmtNum(aktivitas.opnameCount)} sub="penyesuaian" tone="text-amber-300" />
              <MiniStat label="Transaksi" value={fmtNum(aktivitas.tx)} sub="total mutasi" tone="text-slate-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Kartu ringkasan */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <div className="stat-card sheen">
          <span className="absolute inset-y-0 left-0 w-1 bg-emerald-400/70" />
          <p className="text-xs text-slate-400">Total Nilai Persediaan</p>
          <p className="mt-1 text-xl font-bold text-emerald-300 sm:text-2xl">{fmtRp(stat.nilai)}</p>
        </div>
        <div className="stat-card">
          <span className="absolute inset-y-0 left-0 w-1 bg-sky-400/70" />
          <p className="text-xs text-slate-400">Jumlah Barang</p>
          <p className="mt-1 text-xl font-bold sm:text-2xl">{stat.total}</p>
        </div>
        <div className="stat-card">
          <span className="absolute inset-y-0 left-0 w-1 bg-amber-400/70" />
          <p className="text-xs text-slate-400">Stok Menipis</p>
          <p className="mt-1 text-xl font-bold text-amber-300 sm:text-2xl">{stat.menipis}</p>
        </div>
        <div className="stat-card">
          <span className="absolute inset-y-0 left-0 w-1 bg-red-400/70" />
          <p className="text-xs text-slate-400">Stok Habis</p>
          <p className="mt-1 text-xl font-bold text-red-300 sm:text-2xl">{stat.habis}</p>
        </div>
        <div className="stat-card">
          <span className="absolute inset-y-0 left-0 w-1 bg-orange-400/70" />
          <p className="text-xs text-slate-400">Segera Kadaluarsa <span className="text-slate-500">(≤{EXPIRY_AMBANG}h)</span></p>
          <p className="mt-1 text-xl font-bold text-orange-300 sm:text-2xl">{kad.segera}</p>
        </div>
        <div className="stat-card">
          <span className="absolute inset-y-0 left-0 w-1 bg-red-500/70" />
          <p className="text-xs text-slate-400">Kadaluarsa</p>
          <p className="mt-1 text-xl font-bold text-red-300 sm:text-2xl">{kad.kadaluarsa}</p>
        </div>
      </div>

      <div>
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
