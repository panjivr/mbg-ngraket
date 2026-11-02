"use client";
import { useEffect, useState, type ReactNode } from "react";
import {
  CATEGORIES,
  blankRow,
  cost,
  exportCSV,
  honorTotal,
  MAX_IMPORT_BYTES,
  money,
  parseScenario,
  planCost,
  preset,
  summary,
  syncHonor,
  uid,
  validateScenario,
  warnings,
  type Expense,
  type Scenario,
} from "@/lib/simulator/model";
import {
  download,
  loadScenario,
  saveScenario,
  STORAGE_KEY,
} from "@/lib/simulator/storage";

type Change = (s: Scenario, message?: string) => void;
function NumberField({
  label,
  value,
  onChange,
  max = 1e9,
  integer = false,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  max?: number;
  integer?: boolean;
  disabled?: boolean;
}) {
  const [error, setError] = useState("");
  return (
    <label className="sim-field">
      <span>{label}</span>
      <input
        type="number"
        inputMode={integer ? "numeric" : "decimal"}
        min="0"
        max={max}
        step={integer ? "1" : "any"}
        value={value}
        disabled={disabled}
        aria-invalid={!!error}
        onChange={(e) => {
          const raw = e.target.value,
            n = Number(raw);
          if (
            raw !== "" &&
            (!Number.isFinite(n) ||
              n < 0 ||
              n > max ||
              (integer && !Number.isInteger(n)))
          ) {
            setError(
              `Masukkan ${integer ? "bilangan bulat" : "angka"} 0–${max.toLocaleString("id-ID")}.`,
            );
            return;
          }
          setError("");
          onChange(raw === "" ? 0 : n);
        }}
      />
      {error && <small role="alert">{error}</small>}
    </label>
  );
}
function TextField({
  label,
  value,
  onChange,
  max = 300,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max?: number;
  type?: string;
}) {
  return (
    <label className="sim-field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        maxLength={max}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly (string | readonly [string, string])[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="sim-field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => {
          const [v, l] = typeof o === "string" ? [o, o] : o;
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
    </label>
  );
}
function Section({
  title,
  tag,
  children,
}: {
  title: string;
  tag: string;
  children: ReactNode;
}) {
  return (
    <section className="sim-panel">
      <div className="sim-section-heading">
        <span>{tag}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}
export function BudgetParameters({
  s,
  change,
}: {
  s: Scenario;
  change: Change;
}) {
  const [nonstandard, setNonstandard] = useState(false);
  const set = (patch: Partial<Scenario>) => change({ ...s, ...patch });
  return (
    <Section title="Parameter anggaran" tag="01">
      <div className="sim-fields">
        <TextField
          label="Nama skenario"
          value={s.name}
          max={150}
          onChange={(name) => set({ name })}
        />
        <Select
          label="Jenis skenario"
          value={s.kind}
          options={["baseline", "hemat", "custom"]}
          onChange={(v) => set({ kind: v as Scenario["kind"] })}
        />
        <TextField
          label="Periode mulai (opsional)"
          type="date"
          value={s.start}
          onChange={(start) => set({ start })}
        />
        <TextField
          label="Periode akhir (opsional)"
          type="date"
          value={s.end}
          onChange={(end) => set({ end })}
        />
        <NumberField
          label="Penerima manfaat / hari"
          value={s.pm}
          integer
          max={1000000}
          onChange={(pm) => set({ pm })}
        />
        <NumberField
          label="Hari pelayanan efektif"
          value={s.days}
          integer
          max={366}
          onChange={(days) => set({ days })}
        />
        <NumberField
          label="Tarif / PM / hari (Rp)"
          value={s.rate}
          integer
          max={1000000}
          disabled={!nonstandard}
          onChange={(rate) => set({ rate })}
        />
        <Select
          label="Cadangan dalam"
          value={s.reserveMode}
          options={[
            ["percent", "Persen dari pagu"],
            ["nominal", "Nominal Rupiah"],
          ]}
          onChange={(v) =>
            set({ reserveMode: v as Scenario["reserveMode"], reserve: 0 })
          }
        />
        <NumberField
          label={`Target cadangan (${s.reserveMode === "percent" ? "%" : "Rp"})`}
          value={s.reserve}
          max={s.reserveMode === "percent" ? 100 : 1e12}
          onChange={(reserve) => set({ reserve })}
        />
        <Select
          label="Dasar ringkasan"
          value={s.basis}
          options={[
            ["plan", "Anggaran rencana"],
            ["actual", "Realisasi input lokal"],
            ["projected", "Proyeksi input lokal"],
          ]}
          onChange={(v) => set({ basis: v as Scenario["basis"] })}
        />
        <Select
          label="Pembulatan per pos (Rupiah)"
          value={s.rounding}
          options={[
            ["round", "Terdekat"],
            ["ceil", "Ke atas"],
            ["floor", "Ke bawah"],
          ]}
          onChange={(v) => set({ rounding: v as Scenario["rounding"] })}
        />
        <TextField
          label="Keterangan skenario"
          value={s.note}
          max={2000}
          onChange={(note) => set({ note })}
        />
      </div>
      <label className="sim-check sim-no-print">
        <input
          type="checkbox"
          checked={nonstandard}
          onChange={(e) => setNonstandard(e.target.checked)}
        />{" "}
        Buka perubahan tarif untuk simulasi nonstandar
      </label>
      <p className="sim-muted">
        Acuan awal Rp3.000/PM/hari berdasarkan materi pengguna, belum
        diverifikasi terhadap juknis terbaru. 2.600 PM dan 10 hari hanya contoh.
        Realisasi dan proyeksi diisi terpisah; tidak terhubung ke pembukuan
        internal.
      </p>
    </Section>
  );
}
export function BudgetSummary({ s }: { s: Scenario }) {
  const t = summary(s),
    status =
      t.balance < 0
        ? "⚠ Melewati pagu"
        : t.usage !== null && t.usage >= 90
          ? "△ Mendekati pagu"
          : "✓ Dalam pagu";
  const metrics = [
    ["Pagu maksimum", money(t.budget)],
    [
      "Total " +
        {
          plan: "anggaran rencana",
          actual: "realisasi input lokal",
          projected: "proyeksi input lokal",
        }[s.basis],
      money(t.total),
    ],
    ["Saldo anggaran / defisit", money(t.balance)],
    [
      "Tingkat serapan",
      t.usage === null ? "Tidak tersedia" : `${t.usage.toFixed(1)}%`,
    ],
    ["Target cadangan", money(t.reserve)],
    ["Selisih dari target", money(t.gap)],
    [
      "Biaya / hari pelayanan",
      s.days ? money(t.total / s.days) : "Tidak tersedia",
    ],
    ["Biaya / PM / hari", t.perPM === null ? "Tidak tersedia" : money(t.perPM)],
    ["Honor / non-honor", `${money(t.honor)} / ${money(t.nonHonor)}`],
  ];
  return (
    <section aria-label="Ringkasan anggaran" className="sim-summary">
      <div className="sim-status">
        <span className={t.balance < 0 ? "sim-negative" : ""}>{status}</span>
        <span>Saldo rencana bukan uang kas riil</span>
      </div>
      <div className="sim-metrics">
        {metrics.map(([label, value]) => (
          <div key={label} className="sim-metric">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div
        className="sim-meter"
        role="img"
        aria-label={`Serapan ${t.usage === null ? "tidak tersedia" : t.usage.toFixed(1) + " persen"}`}
      >
        <div style={{ width: `${Math.min(t.usage ?? 0, 100)}%` }} />
      </div>
    </section>
  );
}
export function BudgetWarnings({ s }: { s: Scenario }) {
  return (
    <aside className="sim-warning" aria-label="Peringatan anggaran">
      <strong>Perlu diperiksa</strong>
      <ul>
        {warnings(s).map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </aside>
  );
}
export function ExpenseEditor({
  r,
  s,
  onChange,
}: {
  r: Expense;
  s: Scenario;
  onChange: (r: Expense) => void;
}) {
  const set = (patch: Partial<Expense>) => onChange({ ...r, ...patch });
  return (
    <div className="sim-fields sim-editor">
      <Select
        label="Kategori"
        value={r.category}
        options={CATEGORIES}
        onChange={(category) => set({ category })}
      />
      <Select
        label="Prioritas"
        value={r.priority}
        options={["Tetap / diprioritaskan", "Pendukung", "Harus diverifikasi"]}
        onChange={(priority) => set({ priority })}
      />
      <TextField
        label="Satuan"
        value={r.unit}
        max={50}
        onChange={(unit) => set({ unit })}
      />
      <NumberField
        label="Kuantitas"
        value={r.qty}
        max={10000}
        onChange={(qty) => set({ qty })}
      />
      <NumberField
        label="Tarif satuan (Rp)"
        value={r.price}
        onChange={(price) => set({ price })}
      />
      <NumberField
        label="Frekuensi per periode / hari"
        value={r.frequency}
        max={366}
        onChange={(frequency) => set({ frequency })}
      />
      <label className="sim-check">
        <input
          type="checkbox"
          checked={r.daily}
          onChange={(e) => set({ daily: e.target.checked })}
        />{" "}
        Kalikan {s.days} hari pelayanan
      </label>
      <TextField
        label="Sumber dana / kelayakan"
        value={r.source}
        onChange={(source) => set({ source })}
      />
      <TextField
        label="Catatan pos"
        value={r.note}
        max={2000}
        onChange={(note) => set({ note })}
      />
      <TextField
        label="Bukti / rujukan (catatan lokal saja)"
        value={r.evidence}
        max={1000}
        onChange={(evidence) => set({ evidence })}
      />
      <NumberField
        label="Realisasi input lokal (Rp)"
        value={r.actual}
        max={1e12}
        onChange={(actual) => set({ actual })}
      />
      <NumberField
        label="Proyeksi input lokal (Rp)"
        value={r.projected}
        max={1e12}
        onChange={(projected) => set({ projected })}
      />
    </div>
  );
}
export function ExpenseTable({ s, change }: { s: Scenario; change: Change }) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("Semua"),
    [sort, setSort] = useState("Urutan awal");
  const rows = s.rows
    .filter(
      (r) =>
        (category === "Semua" || r.category === category) &&
        r.name.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "Nama"
        ? a.name.localeCompare(b.name)
        : sort === "Biaya terbesar"
          ? cost(b, s) - cost(a, s)
          : 0,
    );
  const setRows = (rows: Expense[], message: string) =>
    change({ ...s, rows }, message);
  return (
    <Section title="Rincian biaya operasional" tag="02">
      <p className="sim-muted">
        Total rencana = kuantitas × tarif × frekuensi × hari (jika dipilih).
        Buka “Edit rincian” untuk satuan, status, dan catatan. Data contoh bukan
        pengeluaran aktual yang disahkan.
      </p>
      <div className="sim-toolbar sim-no-print">
        <button
          onClick={() =>
            s.rows.length < 500 &&
            setRows([...s.rows, blankRow()], "Tambah pos")
          }
        >
          + Tambah pos
        </button>
        <button
          onClick={() =>
            setRows(
              s.rows.map((r) => ({ ...r, active: true })),
              "Aktifkan semua pos",
            )
          }
        >
          Aktifkan semua
        </button>
        <button
          onClick={() =>
            setRows(
              s.rows.map((r) => ({ ...r, active: false })),
              "Nonaktifkan semua pos",
            )
          }
        >
          Nonaktifkan semua
        </button>
        <TextField label="Cari pos" value={query} onChange={setQuery} />
        <Select
          label="Filter kategori"
          value={category}
          options={["Semua", ...CATEGORIES]}
          onChange={setCategory}
        />
        <Select
          label="Urutkan"
          value={sort}
          options={["Urutan awal", "Nama", "Biaya terbesar"]}
          onChange={setSort}
        />
      </div>
      <div className="sim-expenses">
        {rows.map((r) => (
          <article
            key={r.id}
            className={`sim-expense ${!r.active ? "sim-inactive" : ""}`}
          >
            <div className="sim-expense-head">
              <label className="sim-check">
                <input
                  type="checkbox"
                  aria-label={`Aktifkan ${r.name}`}
                  checked={r.active}
                  onChange={(e) =>
                    setRows(
                      s.rows.map((x) =>
                        x.id === r.id ? { ...r, active: e.target.checked } : x,
                      ),
                      "Ubah status pos",
                    )
                  }
                />{" "}
                Aktif
              </label>
              <TextField
                label="Nama pos"
                value={r.name}
                max={150}
                onChange={(name) =>
                  setRows(
                    s.rows.map((x) => (x.id === r.id ? { ...r, name } : x)),
                    "Ubah nama pos",
                  )
                }
              />
              <div className="sim-expense-total">
                <small>{r.category}</small>
                <strong>{money(cost(r, s))}</strong>
                <small>Rencana {money(planCost(r, s))}</small>
              </div>
            </div>
            <details>
              <summary>
                Edit rincian · {r.qty} {r.unit} × {money(r.price)} ×{" "}
                {r.frequency}
                {r.daily ? ` × ${s.days} hari` : ""}
              </summary>
              <ExpenseEditor
                r={r}
                s={s}
                onChange={(next) =>
                  setRows(
                    s.rows.map((x) => (x.id === r.id ? next : x)),
                    "Ubah rincian pos",
                  )
                }
              />
            </details>
            <div className="sim-toolbar sim-no-print">
              <button
                onClick={() =>
                  s.rows.length < 500 &&
                  setRows(
                    [
                      ...s.rows,
                      {
                        ...r,
                        id: uid(),
                        managedHonor: false,
                        name: r.name + " (salinan)",
                      },
                    ],
                    "Duplikasi pos",
                  )
                }
              >
                Duplikasi
              </button>
              <button
                onClick={() =>
                  window.confirm(`Hapus pos ${r.name}?`) &&
                  setRows(
                    s.rows.filter((x) => x.id !== r.id),
                    "Hapus pos",
                  )
                }
              >
                Hapus
              </button>
            </div>
          </article>
        ))}
        {!rows.length && (
          <p>Tidak ada pos yang cocok. Tambahkan pos atau ubah filter.</p>
        )}
      </div>
      <div className="sim-print-table">
        <table>
          <thead>
            <tr>
              <th>Pos / kategori</th>
              <th>Statut / satuan</th>
              <th>Rumus</th>
              <th>Rencana</th>
              <th>Realisasi</th>
              <th>Proyeksi</th>
              <th>Sumber / catatan / rujukan lokal</th>
            </tr>
          </thead>
          <tbody>
            {s.rows.map((r) => (
              <tr key={r.id}>
                <th>
                  {r.name}
                  <br />
                  {r.category}
                </th>
                <td>
                  {r.active ? "Aktif" : "Nonaktif"} · {r.priority} · {r.unit}
                </td>
                <td>
                  {r.qty} × {r.price} × {r.frequency} × {r.daily ? s.days : 1}
                </td>
                <td>{money(planCost(r, s))}</td>
                <td>{money(r.actual)}</td>
                <td>{money(r.projected)}</td>
                <td>
                  {r.source}
                  <br />
                  {r.note}
                  <br />
                  {r.evidence}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sim-muted">
        {s.rows.length}/500 pos. Nonaktifkan filter untuk melihat semua rincian
        sebelum mencetak.
      </p>
    </Section>
  );
}
export function HonorScenario({ s, change }: { s: Scenario; change: Change }) {
  const h = s.honor,
    total = honorTotal(s),
    set = (patch: Partial<Scenario["honor"]>) =>
      change({ ...s, honor: { ...h, ...patch } });
  const synchronize = (amount: number) => {
    if (
      window.confirm(
        "Ganti seluruh pos kategori Honor relawan dengan satu pos rencana simulasi? Realisasi dan proyeksi pos honor pengganti dimulai dari nol.",
      )
    )
      change(syncHonor(s, amount), "Sinkronkan honor satu kali");
  };
  return (
    <Section title="Simulasi honor & rotasi" tag="03">
      <p className="sim-muted">
        Simulasi terpisah. Mengubah kalkulator tidak mengubah pos anggaran
        sampai Anda memilih sinkronisasi. Sinkronisasi mengganti seluruh
        kategori honor agar tidak dihitung dua kali.
      </p>
      <div className="sim-fields">
        <NumberField
          label="Personel terdaftar"
          value={h.registered}
          integer
          max={10000}
          onChange={(registered) => set({ registered })}
        />
        <NumberField
          label="Petugas aktif per hari"
          value={h.active}
          integer
          max={10000}
          onChange={(active) => set({ active })}
        />
        <NumberField
          label="Hari kerja efektif honor"
          value={h.days}
          integer
          max={366}
          onChange={(days) => set({ days })}
        />
        <NumberField
          label="Honor per orang / hari (Rp)"
          value={h.rate}
          integer
          max={1000000}
          onChange={(rate) => set({ rate })}
        />
        <Select
          label="Metode honor"
          value={h.mode}
          options={[
            ["uniform", "Tarif seragam"],
            ["roles", "Tarif per role anonim"],
          ]}
          onChange={(v) => set({ mode: v as typeof h.mode })}
        />
        <Select
          label="Analisis pengurangan tarif (Rp/hari)"
          value={String(h.reduction)}
          options={["0", "5000", "10000", "15000"]}
          onChange={(v) => set({ reduction: Number(v) })}
        />
      </div>
      {h.mode === "roles" && (
        <div>
          {h.roles.map((role, i) => (
            <div className="sim-role" key={i}>
              <TextField
                label={`Nama role ${i + 1} (anonim)`}
                value={role.name}
                max={100}
                onChange={(name) =>
                  set({
                    roles: h.roles.map((r, j) =>
                      i === j ? { ...r, name } : r,
                    ),
                  })
                }
              />
              <NumberField
                label={`Penugasan orang-hari role ${i + 1}`}
                value={role.assignments}
                integer
                max={3660000}
                onChange={(assignments) =>
                  set({
                    roles: h.roles.map((r, j) =>
                      i === j ? { ...r, assignments } : r,
                    ),
                  })
                }
              />
              <NumberField
                label={`Tarif role ${i + 1} (Rp)`}
                value={role.rate}
                integer
                max={1000000}
                onChange={(rate) =>
                  set({
                    roles: h.roles.map((r, j) =>
                      i === j ? { ...r, rate } : r,
                    ),
                  })
                }
              />
              <button
                className="sim-no-print"
                onClick={() =>
                  set({ roles: h.roles.filter((_, j) => i !== j) })
                }
              >
                Hapus role {i + 1}
              </button>
            </div>
          ))}
          <button
            className="sim-no-print"
            onClick={() =>
              h.roles.length < 50 &&
              set({
                roles: [
                  ...h.roles,
                  { name: "Role anonim", assignments: 0, rate: 0 },
                ],
              })
            }
          >
            + Tambah role
          </button>
          <p className="sim-muted">
            Jumlah penugasan adalah orang-hari aktual yang Anda simulasikan: 3
            orang × 10 hari = 30. Tidak memakai nama pegawai.
          </p>
        </div>
      )}
      <p className="sim-honor-total">
        Total simulasi honor <strong>{money(total)}</strong>
      </p>
      <div className="sim-toolbar sim-no-print">
        <button onClick={() => synchronize(total)}>
          Sinkronkan ke pos Honor Relawan
        </button>
        <button onClick={() => synchronize(30850000)}>
          Gunakan contoh honor Rp30.850.000 sekali
        </button>
      </div>
      <p className="sim-muted">
        Perbandingan berikut memakai tarif seragam, {h.days} hari. Bila memakai
        role, perbandingan ini tetap analisis tarif seragam dan bukan total role
        di atas. Penghasilan rata-rata diasumsikan rotasi merata ke{" "}
        {h.registered} personel.
      </p>
      <div
        className="sim-bars"
        aria-label="Grafik perbandingan honor tarif seragam"
      >
        {[49, 40, 36, 33].map((active) => (
          <div key={active}>
            <div>
              <span>
                {active} aktif / hari · pengurangan {money(h.reduction)}
              </span>
              <strong>
                {money(active * h.days * Math.max(0, h.rate - h.reduction))}
              </strong>
            </div>
            <div className="sim-meter">
              <div style={{ width: `${(active / 49) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div
        className="sim-table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Perbandingan honor, geser horizontal"
      >
        <table>
          <thead>
            <tr>
              <th>Aktif / hari</th>
              <th>Pengurangan / hari</th>
              <th>Total honor</th>
              <th>Hemat vs 49 aktif, tarif awal</th>
              <th>Rata-rata / personel terdaftar</th>
              <th>Penurunan rata-rata</th>
            </tr>
          </thead>
          <tbody>
            {[49, 40, 36, 33].flatMap((active) =>
              [0, 5000, 10000, 15000].map((reduction) => {
                const total = active * h.days * Math.max(0, h.rate - reduction),
                  base = 49 * h.days * h.rate;
                return (
                  <tr key={`${active}-${reduction}`}>
                    <td>{active}</td>
                    <td>{money(reduction)}</td>
                    <td>{money(total)}</td>
                    <td>{money(base - total)}</td>
                    <td>
                      {h.registered
                        ? money(total / h.registered)
                        : "Tidak tersedia"}
                    </td>
                    <td>
                      {h.registered
                        ? money((base - total) / h.registered)
                        : "Tidak tersedia"}
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>
      <div className="sim-warning">
        33 aktif bukan otomatis cukup. Verifikasi produksi, sanitasi,
        kebersihan, keamanan 24 jam, istirahat, dan mutu pangan. Analisis tarif
        bukan instruksi pemotongan honor sepihak; ikuti prosedur yang sah.
      </div>
    </Section>
  );
}
export function ScenarioComparison({
  s,
  saved,
  onSave,
  onLoad,
  onDelete,
}: {
  s: Scenario;
  saved: Scenario[];
  onSave: () => void;
  onLoad: (s: Scenario) => void;
  onDelete: (i: number) => void;
}) {
  const t = summary(s),
    byCategory = CATEGORIES.map((name) => ({
      name,
      total: s.rows
        .filter((r) => r.category === name)
        .reduce((n, r) => n + cost(r, s), 0),
    }));
  return (
    <Section title="Komposisi & perbandingan" tag="04">
      <div className="sim-bars">
        {byCategory
          .filter((c) => c.total > 0)
          .map((c) => (
            <div key={c.name}>
              <div>
                <span>{c.name}</span>
                <strong>
                  {money(c.total)} ·{" "}
                  {t.total ? ((100 * c.total) / t.total).toFixed(1) : 0}%
                </strong>
              </div>
              <div className="sim-meter">
                <div
                  style={{
                    width: `${t.total ? (100 * c.total) / t.total : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
      </div>
      <button className="sim-no-print" onClick={onSave}>
        Duplikasi untuk perbandingan ({saved.length}/5)
      </button>
      <p className="sim-muted">
        Snapshot pembanding bertahan selama halaman ini terbuka. Ekspor JSON
        tiap skenario untuk menyimpannya. Skenario aktif tersimpan otomatis
        secara lokal.
      </p>
      {saved.length > 0 && (
        <div
          className="sim-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Perbandingan skenario"
        >
          <table>
            <thead>
              <tr>
                <th>Skenario</th>
                <th>Dasar</th>
                <th>Pagu</th>
                <th>Total</th>
                <th>Saldo</th>
                <th className="sim-no-print">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {[s, ...saved].map((v, i) => {
                const t = summary(v);
                return (
                  <tr key={i}>
                    <th>
                      {v.name}
                      {i === 0 ? " (aktif)" : ""}
                    </th>
                    <td>{v.basis}</td>
                    <td>{money(t.budget)}</td>
                    <td>{money(t.total)}</td>
                    <td>{money(t.balance)}</td>
                    <td className="sim-no-print">
                      {i > 0 && (
                        <>
                          <button onClick={() => onLoad(v)}>Muat</button>
                          <button onClick={() => onDelete(i - 1)}>Hapus</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
export function ExportActions({
  s,
  change,
  onClear,
}: {
  s: Scenario;
  change: Change;
  onClear: () => void;
}) {
  const [error, setError] = useState("");
  return (
    <Section title="Simpan, ekspor & cetak" tag="05">
      <div className="sim-toolbar sim-no-print">
        <button
          onClick={() =>
            download(
              "skenario-operasional.json",
              JSON.stringify(s, null, 2),
              "application/json",
            )
          }
        >
          Ekspor JSON
        </button>
        <button
          onClick={() =>
            download(
              "rincian-operasional.csv",
              exportCSV(s),
              "text/csv;charset=utf-8",
            )
          }
        >
          Ekspor CSV
        </button>
        <button onClick={() => window.print()}>Cetak / Simpan PDF</button>
        <label className="sim-file">
          Impor JSON
          <input
            aria-label="Impor skenario JSON"
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              const input = e.currentTarget,
                file = input.files?.[0];
              if (!file) return;
              try {
                if (file.size > MAX_IMPORT_BYTES)
                  throw Error("File maksimum 1 MB.");
                const next = parseScenario(await file.text());
                if (window.confirm("Timpa skenario aktif dengan file ini?")) {
                  change(next, "Impor skenario");
                  setError("");
                }
              } catch (error) {
                setError(
                  error instanceof Error ? error.message : "Impor gagal.",
                );
              } finally {
                input.value = "";
              }
            }}
          />
        </label>
        <button
          onClick={() =>
            window.confirm(
              "Reset parameter dan seluruh pos ke preset contoh?",
            ) && change(preset(), "Reset preset contoh")
          }
        >
          Reset preset
        </button>
        <button
          onClick={() =>
            window.confirm(
              "Hapus skenario tersimpan di browser dan kembali ke contoh? Autosave dihentikan sampai Anda mengubah data lagi.",
            ) && onClear()
          }
        >
          Hapus data lokal
        </button>
      </div>
      {error && (
        <p role="alert" className="sim-negative">
          {error}
        </p>
      )}
      <p className="sim-muted">
        Data hanya di browser/perangkat ini, tidak disimpan ke server. Maksimum
        impor 1 MB / 500 pos. JSON berisi satu skenario; CSV memuat parameter
        dan rincian. Untuk PDF, pilih A4 landscape pada dialog cetak browser.
      </p>
    </Section>
  );
}
function QuickSheet({ s, change }: { s: Scenario; change: Change }) {
  const update = (id: string, patch: Partial<Expense>) => change({ ...s, rows: s.rows.map(r => r.id === id ? { ...r, ...patch } : r) }, "Ubah biaya");
  const daily = s.rows.filter(r=>r.active && r.daily).reduce((n,r)=>n+planCost(r,{...s,days:1}),0);
  const period = s.rows.filter(r=>r.active && !r.daily).reduce((n,r)=>n+planCost(r,s),0);
  return <Section title="Biaya harian dan periode" tag="02"><p className="sim-muted">Pilih <strong>Harian</strong> untuk biaya yang berulang setiap hari pelayanan. Pilih <strong>Periode</strong> untuk biaya sekali, misalnya listrik atau BPJS. Masukkan bagian tagihan yang memang ingin dibebankan pada periode ini; tagihan bulanan tidak otomatis dibagi.</p><p className="sim-muted">Biaya harian {money(daily)} × {s.days} hari + biaya periode {money(period)} = <strong>{money(s.rows.reduce((n,r)=>n+(r.active?planCost(r,s):0),0))}</strong>. Preset catatan memakai biaya per periode, bukan biaya per hari.</p><div className="sim-table-scroll" tabIndex={0} role="region" aria-label="Tabel biaya, geser ke samping"><table><thead><tr><th>Aktif</th><th>Nama biaya</th><th>Jenis biaya</th><th>Jumlah</th><th>Harga satuan (Rp)</th><th>Frekuensi</th><th>Total periode</th><th>Hapus</th></tr></thead><tbody>{s.rows.map((r,i)=><tr key={r.id}><td><input type="checkbox" aria-label={`Aktif ${r.name}`} checked={r.active} onChange={e=>update(r.id,{active:e.target.checked})}/></td><td><input aria-label={`Nama biaya ${i+1}`} value={r.name} maxLength={150} onChange={e=>update(r.id,{name:e.target.value})}/></td><td><select aria-label={`Jenis biaya ${r.name}`} value={r.daily?'daily':'period'} onChange={e=>update(r.id,{daily:e.target.value==='daily'})}><option value="daily">Harian</option><option value="period">Periode</option></select></td>{([['qty','Jumlah',10000],['price','Harga satuan',1000000000],['frequency','Frekuensi',366]] as const).map(([key,label,max])=><td key={key}><input type="number" min="0" max={max} step="any" aria-label={`${label} ${r.name}`} value={r[key]} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&n>=0&&n<=max)update(r.id,{[key]:n});}}/></td>)}<td>{r.active ? money(planCost(r,s)) : 'Tidak aktif'}</td><td><button onClick={()=>window.confirm(`Hapus ${r.name}?`) && change({...s,rows:s.rows.filter(x=>x.id!==r.id)},'Hapus pos')}>Hapus</button></td></tr>)}</tbody></table></div><div className="sim-toolbar sim-no-print"><button onClick={()=>s.rows.length<500&&change({...s,rows:[...s.rows,{...blankRow(),daily:true}]},'Tambah pos')}>+ Tambah biaya</button></div></Section>;
}

function Kesimpulan({s}:{s:Scenario}) {
  const t=summary(s); const largest=s.rows.filter(r=>r.active && cost(r,s)>0).sort((a,b)=>cost(b,s)-cost(a,s)).slice(0,3);
  const short=Math.max(0,-t.balance), reserveShort=Math.max(0,-t.gap);
  const title=!t.budget?'Pagu belum tersedia':short>0?'Melebihi pagu':t.balance===0?'Tepat di batas pagu':t.usage!==null&&t.usage>=90?'Mendekati batas pagu':'Masih dalam pagu';
  return <section className="sim-conclusion" aria-live="polite"><span>HASIL SIMULASI · {s.basis==='plan'?'RENCANA':s.basis==='actual'?'REALISASI':'PROYEKSI'}</span><h2>{title}</h2><p>{!t.budget?'Isi jumlah penerima dan hari pelayanan untuk menghitung pagu.':short>0?`Kurangi total biaya minimal ${money(short)} agar tidak melebihi pagu.`:`Sisa anggaran ${money(t.balance)}.`}</p>{t.budget>0&&reserveShort>0&&<p>Untuk memenuhi target cadangan, kurangi biaya sebesar {money(reserveShort)}.</p>}{(short>0||reserveShort>0)&&largest.length>0&&<p>Mulai periksa pos terbesar: {largest.map(r=>`${r.name} (${money(cost(r,s))})`).join(', ')}. Tentukan pengurangan sesuai kebutuhan dan ketentuan yang berlaku.</p>}<small>Ini simulasi anggaran, bukan saldo kas atau persetujuan pembiayaan.</small></section>;
}

export default function Simulator() {
  const [s, setS] = useState<Scenario>(() => { const base = preset(); return { ...base, name: "Skenario harian baru", note: "Isi biaya harian atau biaya untuk periode yang dipilih.", days: 1, rows: base.rows.map(r => ({...r, price: 0, daily: false})) }; }),
    [ready, setReady] = useState(false),
    [persist, setPersist] = useState(false),
    [status, setStatus] = useState("Memuat penyimpanan lokal…"),
    [saved, setSaved] = useState<Scenario[]>([]);
  useEffect(() => {
    try {
      const stored = loadScenario();
      if (stored) setS(stored);
      setStatus(
        stored
          ? "Skenario lokal dimuat."
          : "Contoh siap digunakan. Data hanya di perangkat ini.",
      );
    } catch {
      setStatus(
        "Penyimpanan tidak tersedia atau data tersimpan tidak valid. Gunakan ekspor JSON.",
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || !persist) return;
    const timer = setTimeout(() => {
      try {
        saveScenario(s);
        setStatus("Tersimpan lokal pada browser ini.");
      } catch {
        setStatus(
          "Gagal menyimpan lokal (akses/kuota). Ekspor JSON untuk menyimpan.",
        );
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [s, ready, persist]);
  const change: Change = (next, message = "Ubah parameter simulasi") => {
    try {
      const checked = validateScenario(next);
      const time = new Date().toLocaleString("id-ID");
      checked.log = [...checked.log, `${time} · ${message}`].slice(-30);
      setS(checked);
      setPersist(true);
      setStatus("Perubahan siap disimpan lokal.");
    } catch (e) {
      setStatus(
        `Perubahan ditolak: ${e instanceof Error ? e.message : "Data tidak valid"}`,
      );
    }
  };
  return (
    <div className="simulator">
      <div className="sim-intro">
        <span className="sim-eyebrow">DJATI / ALAT PUBLIK</span>
        <h1>
          Simulator Anggaran
          <br />
          <em>Operasional SPPG</em>
        </h1>
        <p>
          Rencanakan kebutuhan dapur, uji rotasi petugas, dan lihat ruang
          anggaran sebelum mengambil keputusan.
        </p>
        <div className="sim-badges">
          <span>Tanpa login</span>
          <span>Data lokal</span>
          <span>Contoh anonim</span>
        </div>
      </div>
      <p className="sim-save-status" role="status" aria-live="polite">
        {status}
      </p>
      <Section title="Hitung harian dan periode" tag="01"><div className="sim-fields"><NumberField label="Jumlah penerima manfaat" value={s.pm} integer max={1000000} onChange={pm=>change({...s,pm})}/><NumberField label="Jumlah hari pelayanan" value={s.days} integer max={366} onChange={days=>change({...s,days})}/><div><span>Tarif per penerima / hari</span><p><strong>{money(s.rate)}</strong></p></div></div></Section>
      <div className="sim-summary"><div className="sim-metrics"><div className="sim-metric"><span>Pagu per hari</span><strong>{money(s.pm * s.rate)}</strong></div><div className="sim-metric"><span>Pagu {s.days} hari</span><strong>{money(summary(s).budget)}</strong></div><div className="sim-metric"><span>Total biaya {s.days} hari ({s.basis === 'plan' ? 'rencana' : s.basis === 'actual' ? 'realisasi' : 'proyeksi'})</span><strong>{money(summary(s).total)}</strong></div></div></div>
      <p className="sim-muted">Mulai dengan 1 hari. Untuk simulasi 10 hari, ubah jumlah hari menjadi 10. Biaya periode dihitung sekali.</p>
      <details className="sim-panel"><summary>Lihat rincian pagu, cadangan dan serapan</summary><BudgetSummary s={s} /></details>
      <details className="sim-panel sim-no-print"><summary>Pengaturan tambahan</summary><BudgetParameters s={s} change={change} /></details>
      <details className="sim-panel"><summary>Periksa catatan dan peringatan</summary><BudgetWarnings s={s} /></details>
      <details className="sim-panel"><summary>Isi atau ubah daftar biaya ({s.rows.length} pos)</summary><QuickSheet s={s} change={change} /></details>
      <details className="sim-panel"><summary>Rincian biaya dan pengaturan lanjutan</summary><ExpenseTable s={s} change={change} /></details>
      <details className="sim-panel"><summary>Simulasi honor relawan</summary><HonorScenario s={s} change={change} /></details>
      <details className="sim-panel"><summary>Bandingkan skenario</summary>
      <ScenarioComparison
        s={s}
        saved={saved}
        onSave={() => {
          if (saved.length >= 5) {
            setStatus(
              "Maksimum 5 pembanding. Hapus salah satu atau ekspor JSON.",
            );
            return;
          }
          setSaved([...saved, structuredClone(s)]);
          setStatus("Snapshot pembanding ditambahkan.");
        }}
        onLoad={(v) =>
          window.confirm("Muat snapshot ini dan timpa skenario aktif?") &&
          change(structuredClone(v), "Muat pembanding")
        }
        onDelete={(i) => setSaved(saved.filter((_, j) => i !== j))}
      />
      </details>
      <details className="sim-panel sim-no-print"><summary>Simpan, impor, ekspor atau cetak</summary><ExportActions
        s={s}
        change={change}
        onClear={() => {
          setPersist(false);
          setS(preset());
          setSaved([]);
          try {
            localStorage.removeItem(STORAGE_KEY);
            setStatus(
              "Data lokal dihapus. Autosave dimulai lagi setelah perubahan.",
            );
          } catch {
            setStatus("Browser menolak penghapusan penyimpanan lokal.");
          }
        }}
      />
      </details>
      <details className="sim-panel sim-no-print">
        <summary>Catatan perubahan lokal (30 terakhir)</summary>
        <ul>
          {s.log.map((v, i) => (
            <li key={i}>{v}</li>
          ))}
        </ul>
      </details>
      <Kesimpulan s={s} />
      <aside className="sim-disclaimer">
        <strong>Batas penggunaan</strong>
        <p>
          Hasil simulasi bukan bukti kelayakan audit atau persetujuan
          pembiayaan. Klasifikasi, sumber dana, bukti, dan batas biaya wajib
          diverifikasi terhadap juknis terbaru serta otorisasi pengelola. BBM
          subsidi mengikuti aturan konsumen yang berhak. Perubahan honor
          memerlukan prosedur yang sah. Anggaran tersisa bukan otomatis dana
          bebas.
        </p>
        <p>
          Tidak ada unggahan bukti, akses payroll, atau nama pegawai dari sistem
          internal. Hindari memasukkan data pribadi pada catatan maupun file
          ekspor.
        </p>
      </aside>
    </div>
  );
}
