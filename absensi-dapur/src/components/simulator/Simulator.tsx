"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CATEGORIES,
  billingKind,
  calendarDays,
  calendarMonths,
  monthlyParts,
  monthlyAllocationIncomplete,
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
  usesPlan,
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
  const [draft, setDraft] = useState(value === 0 ? "" : String(value));
  const draftRef = useRef(draft);
  useEffect(() => {
    if (Number(draftRef.current) !== value) {
      const next = value === 0 ? "" : String(value);
      draftRef.current = next;
      setDraft(next);
    }
  }, [value, draft]);
  return (
    <label className="sim-field">
      <span>{label}</span>
      <input
        type="number"
        inputMode={integer ? "numeric" : "decimal"}
        min="0"
        max={max}
        step={integer ? "1" : "any"}
        value={draft}
        placeholder="Isi angka"
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
          draftRef.current = raw;
          setDraft(raw);
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
          onChange={(start) =>
            set({
              start,
              end: s.end && start > s.end ? "" : s.end,
              serviceByMonth: {},
            })
          }
        />
        <TextField
          label="Periode akhir (opsional)"
          type="date"
          value={s.end}
          onChange={(end) => set({ end, serviceByMonth: {} })}
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
          label="Pembulatan total akhir (Rupiah)"
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
        diverifikasi terhadap juknis terbaru. Jumlah penerima dan hari dapat
        disesuaikan. Realisasi dan proyeksi diisi terpisah; tidak terhubung ke
        pembukuan internal.
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
        max={1e12}
        value={r.price}
        onChange={(price) => set({ price })}
      />
      <NumberField
        label="Berapa kali biaya ini berulang dalam satuan yang dipilih"
        value={r.frequency}
        max={366}
        onChange={(frequency) => set({ frequency })}
      />
      <Select
        label="Satuan waktu / jumlah"
        value={billingKind(r)}
        options={[
          ["daily", "Per hari pelayanan"],
          ["portion", "Per porsi"],
          ["monthly", "Per bulan kalender"],
          ["once", "Sekali per periode"],
        ]}
        onChange={(v) =>
          set({ billing: v as Expense["billing"], daily: v === "daily" })
        }
      />
      <p className="sim-muted">
        Total rencana {money(planCost(r, s))};{" "}
        {billingKind(r) === "monthly" && !s.start
          ? "tanggal belum lengkap; menggunakan hari pelayanan dengan pembagi 30."
          : "perhitungan mengikuti satuan yang dipilih."}
      </p>
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
        onChange={(actual) => set({ actual, actualProvided: true })}
      />
      <NumberField
        label="Proyeksi input lokal (Rp)"
        value={r.projected}
        max={1e12}
        onChange={(projected) => set({ projected, projectedProvided: true })}
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
        Total rencana mengikuti kuantitas, tarif, frekuensi, dan cara menghitung
        setiap pos. Buka “Edit rincian” untuk satuan, status, dan catatan. Data
        contoh bukan pengeluaran aktual yang disahkan.
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
function HonorTable({ s, change }: { s: Scenario; change: Change }) {
  const h = s.honor, rows = h.roles, reduction = h.optionReduction ?? 0;
  const update = (i: number, patch: Partial<(typeof rows)[number]>) => {
    const roles = rows.map((row, j) => {
      if (i !== j) return row;
      const next = { ...row, ...patch };
      if (next.people !== undefined && next.workDays !== undefined) {
        next.assignments = next.people * next.workDays;
        next.optionRemoved = Math.min(next.people, next.optionRemoved ?? 0);
      }
      return next;
    });
    change({ ...s, honor: { ...h, roles } }, "Ubah simulasi honor");
  };
  const setReduction = (value: number) => change({ ...s, honor: { ...h, optionReduction: value } }, "Uji tarif honor");
  const baseline = rows.reduce((sum, r) => sum + r.assignments * r.rate, 0);
  const compare = rows.reduce((sum, r) => sum + (r.people === undefined || r.workDays === undefined
    ? r.assignments : (r.people - (r.optionRemoved ?? 0)) * r.workDays) * Math.max(0, r.rate - reduction), 0);
  const optionSummary = summary(syncHonor(s, compare));
  const example = () => {
    if (rows.length && !window.confirm("Ganti tabel saat ini dengan contoh? Simpan JSON dahulu jika perlu.")) return;
    const roles = [["Aslap", 1, 200000], ["Koordinator admin", 4, 140000], ["Koordinator", 5, 130000], ["Pengolahan", 9, 125000]].map(([name, people, rate]) => ({ name: String(name), people: Number(people), workDays: 5, assignments: Number(people) * 5, rate: Number(rate) }));
    change({ ...s, honor: { ...h, roles, optionReduction: 0 } }, "Muat contoh honor");
  };
  return <div>
    <p className="sim-muted">Isi satu baris per divisi dengan tarif dan hari yang sama, atau satu baris per orang. Untuk rotasi dengan hari berbeda, pisahkan menjadi beberapa baris. Angka orang adalah jumlah yang dijadwalkan pada setiap hari di baris tersebut.</p>
    <button onClick={example}>Muat contoh tabel</button> <span className="sim-muted">Contoh saja, bukan data aktual.</span>
    <div className="sim-table-scroll" tabIndex={0} role="region" aria-label="Tabel honor, geser ke samping"><table><thead><tr><th>Divisi / kode</th><th>Orang masuk / hari</th><th>Hari layanan</th><th>Tarif / hari</th><th>Total awal</th><th>Kurangi orang / hari (uji)</th><th>Penghasilan / orang opsi</th><th></th></tr></thead><tbody>
      {rows.map((r, i) => {
        const legacy = r.people === undefined || r.workDays === undefined;
        return <tr key={i}><td><TextField label={`Divisi ${i+1}`} value={r.name} max={100} onChange={name => update(i, {name})}/></td>
          {legacy ? <td colSpan={2}><NumberField label={`Total orang-hari lama ${i+1}`} value={r.assignments} integer max={3660000} onChange={assignments => update(i, {assignments})}/><small>Data lama: jumlah orang dan hari tidak diketahui.</small></td> : <><td><NumberField label={`Orang ${i+1}`} value={r.people!} integer max={10000} onChange={people => update(i, {people})}/></td><td><NumberField label={`Hari ${i+1}`} value={r.workDays!} integer max={366} onChange={workDays => update(i, {workDays})}/></td></>}
          <td><NumberField label={`Tarif ${i+1}`} value={r.rate} integer max={1000000000} onChange={rate => update(i, {rate})}/></td><td>{money(r.assignments * r.rate)}</td>
          <td>{legacy ? "Tidak tersedia" : <NumberField label={`Kurangi orang ${i+1}`} value={r.optionRemoved ?? 0} integer max={r.people} onChange={optionRemoved => update(i, {optionRemoved})}/>}</td><td>{legacy ? "Tidak tersedia" : money(r.workDays! * Math.max(0, r.rate - reduction))}</td>
          <td><button onClick={() => change({ ...s, honor: { ...h, roles: rows.filter((_, j) => j !== i) } }, "Hapus baris honor")}>Hapus</button></td></tr>;
      })}</tbody><tfoot><tr><th colSpan={4}>Total honor awal</th><th>{money(baseline)}</th><td colSpan={3}/></tr></tfoot></table></div>
    <button onClick={() => rows.length < 500 && change({ ...s, honor: { ...h, roles: [...rows, {name: "Divisi baru", assignments: 0, people: 1, workDays: 0, rate: 0}] } }, "Tambah baris honor")}>＋ Tambah divisi / orang</button>
    <div className="sim-fields"><NumberField label="Analisis pengurangan tarif per orang per hari (Rp)" value={reduction} integer max={1000000000} onChange={setReduction}/></div>
    <p>Pilihan cepat: {[0, 5000, 10000, 15000].map(value => <button key={value} onClick={() => setReduction(value)}>{money(value)}</button>)}</p>
    <p>Hasil opsi: <strong>{money(compare)}</strong> · Penghematan dibanding awal: {money(baseline - compare)}.</p>
    <p><strong>{optionSummary.balance < 0 ? `Melebihi pagu ${money(-optionSummary.balance)}` : `Sisa pagu ${money(optionSummary.balance)}`}</strong> setelah opsi, berdasarkan {s.basis === "plan" ? "rencana" : s.basis === "actual" ? "realisasi (nilai kosong memakai rencana)" : "proyeksi (nilai kosong memakai rencana)"}. Cadangan belum dikurangi.</p>
    <button onClick={() => window.confirm(`Masukkan hasil opsi ${money(compare)} ke anggaran? Seluruh pos Honor relawan akan diganti. Ekspor JSON dahulu jika ingin menyimpan rinciannya.`) && change(syncHonor(s, compare), "Sinkronkan opsi honor")}>Gunakan hasil opsi di anggaran</button>
    <p className="sim-muted">Penghasilan per orang pada opsi adalah hari kerja × tarif setelah pengurangan. Jumlah yang dikurangi berlaku pada setiap hari di baris tersebut; ini simulasi penugasan, bukan pemberhentian. Untuk rotasi, bagi orang ke beberapa baris sesuai hari masing-masing, lalu periksa jadwal setiap orang. Opsi tidak mengubah anggaran sampai dipilih.</p>
    {h.reduction > 0 && <p className="sim-warning">Kalkulator aktif masih memakai pengurangan lama; total tersinkron {money(honorTotal(s))}. Hapus pengurangan lama sebelum membandingkan jika ingin memakai tarif awal.</p>}
    <p className="sim-muted">Periksa keselamatan, keamanan 24 jam, kualitas, waktu istirahat, dan pengganti. Pengurangan honor memerlukan kesepakatan dan prosedur yang berlaku; 33 orang bukan batas otomatis.</p>
  </div>;
}

export function HonorScenario({ s, change }: { s: Scenario; change: Change }) {
  const h = s.honor,
    total = honorTotal(s),
    current = s.rows
      .filter((r) => r.active && r.category === CATEGORIES[0])
      .reduce((n, r) => n + cost(r, s), 0);
  const set = (patch: Partial<Scenario["honor"]>) =>
    change({ ...s, honor: { ...h, ...patch } });
  const apply = () => {
    if (
      window.confirm(
        `Honor di anggaran saat ini ${money(current)}. Ganti seluruh pos Honor relawan dengan satu pos ${money(total)}? Data realisasi/proyeksi pos tersebut akan diganti. Simpan JSON lebih dulu jika diperlukan.`,
      )
    )
      change(syncHonor(s, total), "Sinkronkan honor");
  };
  return (
    <Section title="Honor relawan" tag="03">
      <p className="sim-muted">
        Isi sebagai simulasi lokal. Bandingkan jumlahnya dengan anggaran; data
        tidak terhubung ke penggajian.
      </p>
      <Select
        label="Cara menghitung honor"
        value={h.mode}
        options={[
          ["pooled", "Bagi rata dari total dana"],
          ["roles", "Per divisi atau setiap relawan"],
          ["uniform", "Tarif sama per hari"],
          ["actual", "Masukkan total honor aktual"],
        ]}
        onChange={(v) => set({ mode: v as typeof h.mode, reduction: 0 })}
      />
      {h.reduction > 0 && (h.mode === "uniform" || h.mode === "roles") && (
        <p className="sim-warning">
          Pengurangan lama {money(h.reduction)} per orang-hari masih diterapkan.{" "}
          <button onClick={() => set({ reduction: 0 })}>
            Hapus pengurangan
          </button>
        </p>
      )}
      {h.mode === "pooled" && (
        <>
          <button
            onClick={() => {
              const t = summary(s);
              set({ pooled: Math.max(0, t.budget - (t.total - t.honor)) });
            }}
          >
            Isi dari sisa pagu setelah biaya lain
          </button>
          <div className="sim-fields">
            <NumberField
              label="Total dana honor (Rp)"
              value={h.pooled}
              max={1e12}
              onChange={(pooled) => set({ pooled })}
            />
            <NumberField
              label="Jumlah relawan yang menerima"
              value={h.registered}
              integer
              max={10000}
              onChange={(registered) => set({ registered })}
            />
          </div>
          <p>
            Rata-rata per relawan:{" "}
            <strong>
              {h.registered
                ? money(h.pooled / h.registered)
                : "Isi jumlah relawan"}
            </strong>
          </p>
          <p className="sim-muted">
            Pembagian rata adalah perkiraan; tentukan pembulatan pembayaran
            sesuai kebijakan.
          </p>
        </>
      )}
      {h.mode === "uniform" && (
        <div className="sim-fields">
          <NumberField
            label="Relawan aktif per hari"
            value={h.active}
            integer
            max={10000}
            onChange={(active) => set({ active })}
          />
          <NumberField
            label="Hari kerja honor"
            value={h.days}
            integer
            max={366}
            onChange={(days) => set({ days })}
          />
          <NumberField
            label="Honor per orang per hari (Rp)"
            value={h.rate}
            integer
            max={1000000}
            onChange={(rate) => set({ rate })}
          />
        </div>
      )}
      {h.mode === "actual" && (
        <NumberField
          label="Total honor yang ingin dimasukkan (Rp)"
          value={h.actual}
          max={1e12}
          onChange={(actual) => set({ actual })}
        />
      )}
      {h.mode === "roles" && <HonorTable s={s} change={change} />}
      <p className="sim-honor-total">
        Hasil kalkulator <strong>{money(total)}</strong>
      </p>
      <p>
        Honor yang sudah ada di anggaran: <strong>{money(current)}</strong>
      </p>
      {current !== total && (
        <p className="sim-warning" role="status">
          Jumlah berbeda. Kalkulator belum mengubah anggaran; periksa sebelum
          memasukkan.
        </p>
      )}
      <button onClick={apply}>Gunakan hasil ini di anggaran</button>
      <p className="sim-muted">
        Tombol ini mengganti semua pos kategori Honor relawan menjadi satu pos
        rencana setelah konfirmasi. Tidak mengubah data payroll internal. Jumlah
        33 orang tidak otomatis cukup; pastikan kebutuhan kerja dan keselamatan.
      </p>
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
        .filter((r) => r.category === name && !r.outsideCap)
        .reduce((n, r) => n + cost(r, s), 0),
    }));
  return (
    <Section title="Komposisi & perbandingan" tag="04">
      <p className="sim-muted">
        Grafik menampilkan biaya dalam pagu operasional. Biaya di luar pagu
        ditampilkan terpisah pada hasil.
      </p>
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
        Duplikasi untuk perbandingan ({saved.length}/10)
      </button>
      <p className="sim-muted">
        Skenario pembanding disimpan di browser ini. Ekspor JSON sebagai
        cadangan atau untuk pindah perangkat.
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
  onClear, saved, onImportMany,
}: {
  s: Scenario;
  change: Change;
  onClear: () => void;
  saved: Scenario[];
  onImportMany: (items: Scenario[], mode: "replace" | "skip", replaceIndices: number[]) => boolean;
}) {
  const [error, setError] = useState("");
  const [incoming, setIncoming] = useState<Scenario[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [replaceIndices, setReplaceIndices] = useState<number[]>([]);
  const picked = incoming.filter((_, i) => selected.includes(i));
  const overflow = saved.length + picked.length > 10;
  const importSelected = (mode: "replace" | "skip") => { if (onImportMany(picked, mode, replaceIndices)) { setIncoming([]); setSelected([]); setReplaceIndices([]); setError(""); } };
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
        <button onClick={() => download("semua-skenario-operasional.json", JSON.stringify({ version: 1, scenarios: [{ ...s, savedAt: new Date().toISOString() }, ...saved] }, null, 2), "application/json")}>Ekspor semua skenario</button>
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
                if (file.size > MAX_IMPORT_BYTES * 12) throw Error("File maksimum 12 MB.");
                const contents = await file.text();
                const raw: unknown = JSON.parse(contents);
                if (raw && typeof raw === "object" && "scenarios" in raw) {
                  if (!("version" in raw) || raw.version !== 1) throw Error("Versi kumpulan skenario tidak didukung.");
                  const list = (raw as { scenarios: unknown }).scenarios;
                  if (!Array.isArray(list) || !list.length || list.length > 11) throw Error("File harus berisi 1–11 skenario.");
                  const parsed = list.map(item => parseScenario(JSON.stringify(item)));
                  setIncoming(parsed); setSelected(parsed.map((_, i) => i)); setReplaceIndices([]); setError(""); return;
                }
                let next = parseScenario(contents);
                const candidates = next.rows.filter(
                  (r) =>
                    billingKind(r) === "once" &&
                    (/internet|bpjs|listrik|langganan/i.test(r.name) ||
                      /^sewa$/i.test(r.name.trim())),
                );
                if (
                  candidates.length &&
                  window.confirm(
                    `Biaya berikut mungkin bulanan: ${candidates
                      .slice(0, 10)
                      .map((r) => r.name)
                      .join(
                        ", ",
                      )}${candidates.length > 10 ? ` dan ${candidates.length - 10} lainnya` : ""}. Ubah semuanya menjadi Per bulan? Pilih Batal untuk mempertahankan jenis semula.`,
                  )
                )
                  next = {
                    ...next,
                    rows: next.rows.map((r) =>
                      candidates.includes(r)
                        ? {
                            ...r,
                            billing: "monthly",
                            daily: false,
                            monthlyDivisor: "fixed30",
                            monthlyBasis: "calendar",
                          }
                        : r,
                    ),
                  };
                if (
                  window.confirm(
                    "Timpa skenario aktif? Impor akan menghitung ulang dengan pembulatan pada total akhir.",
                  )
                ) {
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
              "Reset parameter dan seluruh pos ke skenario kosong?",
            ) && change(freshScenario(), "Reset skenario")
          }
        >
          Reset skenario
        </button>
        <button
          onClick={() =>
            window.confirm(
              "Hapus skenario tersimpan di browser dan kembali ke skenario kosong? Autosave dihentikan sampai Anda mengubah data lagi.",
            ) && onClear()
          }
        >
          Hapus data lokal
        </button>
      </div>
      {incoming.length > 0 && <div className="sim-import-list"><h3>Pilih skenario yang akan diimpor</h3><p>Skenario aktif tidak berubah. Pilih yang ingin disimpan di perangkat ini.</p>{incoming.map((item, i) => <label className="sim-import-choice" key={i}><input type="checkbox" checked={selected.includes(i)} onChange={e => setSelected(e.target.checked ? [...selected, i] : selected.filter(n => n !== i))}/><span><strong>{item.name}</strong> · {money(summary(item).allTotal)} · {item.savedAt ? new Date(item.savedAt).toLocaleString("id-ID") : "Tanggal simpan tidak tersedia"}</span></label>)}<p>{selected.length} dipilih · {saved.length}/10 tempat terisi.</p>{overflow ? <><p role="status">Tempat tidak cukup. Pilih {Math.max(0, saved.length + picked.length - 10)} skenario tersimpan yang akan diganti, atau lewati yang tidak muat. Maksimal 10 skenario dapat dipilih untuk mengganti.</p>{saved.map((item,i) => <label className="sim-import-choice" key={i}><input type="checkbox" checked={replaceIndices.includes(i)} onChange={e => setReplaceIndices(e.target.checked ? [...replaceIndices,i] : replaceIndices.filter(n => n !== i))}/><span>Ganti: {item.name} · {money(summary(item).allTotal)} · {item.savedAt ? new Date(item.savedAt).toLocaleString("id-ID") : "Tanggal tidak tersedia"}</span></label>)}<button disabled={!selected.length || picked.length > 10 || replaceIndices.length !== saved.length + picked.length - 10} onClick={() => importSelected("replace")}>Ganti skenario lama</button> <button disabled={!selected.length} onClick={() => importSelected("skip")}>Lewati kelebihan</button></> : <button disabled={!selected.length} onClick={() => importSelected("skip")}>Impor yang dipilih</button>} <button onClick={() => {setIncoming([]); setSelected([]);}}>Batal</button></div>}
      {error && (
        <p role="alert" className="sim-negative">
          {error}
        </p>
      )}
      <p className="sim-muted">
        Data hanya di browser/perangkat ini, tidak disimpan ke server. Maksimum
        impor 12 MB untuk kumpulan; tiap skenario maksimal 1 MB / 500 pos. CSV memuat parameter
        dan rincian. Untuk PDF, pilih Simpan sebagai PDF dan aktifkan cetak latar belakang.
      </p>
    </Section>
  );
}
const billingLabels = {
  daily: "Per hari",
  portion: "Per porsi",
  monthly: "Per bulan",
  once: "Sekali",
} as const;
function QuickSheet({ s, change }: { s: Scenario; change: Change }) {
  const update = (id: string, patch: Partial<Expense>) =>
    change(
      { ...s, rows: s.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) },
      "Ubah biaya",
    );
  return (
    <div className="easy-costs">
      <p className="easy-hint">
        Ketuk nama biaya, pilih cara menghitung, lalu isi nominal.
      </p>
      {s.basis !== "plan" && (
        <p role="status" className="sim-warning">
          Isian ini mengubah rencana. Hasil memakai{" "}
          {s.basis === "actual" ? "realisasi" : "proyeksi"} yang diisi di
          rincian lanjutan.
        </p>
      )}
      <div className="easy-rows">
        {s.rows.map((r, i) => {
          const kind = billingKind(r),
            monthlyMissing =
              kind === "monthly" && monthlyAllocationIncomplete(r, s);
          return (
            <details className="easy-row" key={r.id}>
              <summary>
                <span>
                  {r.name || `Biaya ${i + 1}`}
                  <small>
                    {!r.active ? "Tidak aktif" : billingLabels[kind]}
                    {r.outsideCap ? " · Di luar pagu" : ""}
                  </small>
                </span>
                <strong>
                  {!r.active
                    ? "—"
                    : monthlyMissing
                      ? "Isi hari per bulan"
                      : money(planCost(r, s))}
                </strong>
              </summary>
              <div className="easy-row-body">
                <TextField
                  label="Nama biaya"
                  value={r.name}
                  max={150}
                  onChange={(name) => update(r.id, { name })}
                />
                <Select
                  label="Kategori biaya"
                  value={r.category}
                  options={CATEGORIES}
                  onChange={(category) => update(r.id, { category })}
                />
                <fieldset>
                  <legend>Cara menghitung</legend>
                  <div className="easy-choices">
                    {(
                      Object.entries(billingLabels) as [
                        Expense["billing"],
                        string,
                      ][]
                    ).map(([key, label]) => (
                      <button
                        type="button"
                        key={key}
                        aria-pressed={kind === key}
                        onClick={() =>
                          update(r.id, {
                            billing: key,
                            daily: key === "daily",
                            ...(key === "monthly" && kind !== "monthly"
                              ? {
                                  monthlyDivisor: "fixed30" as const,
                                  monthlyBasis: "calendar" as const,
                                }
                              : {}),
                          })
                        }
                      >
                        {key === "daily" ? "☀ " : ""}
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                {kind === "monthly" && (
                  <>
                    <p className="easy-hint">
                      Tagihan bulanan dihitung menjadi biaya harian, lalu
                      dikalikan jumlah hari yang dipilih. Hari awal dan akhir
                      termasuk.
                    </p>
                    <Select
                      label="Pembagi biaya bulanan"
                      value={r.monthlyDivisor}
                      options={[
                        ["fixed30", "30 hari tetap"],
                        ["calendar", "Hari kalender bulan (28–31)"],
                      ]}
                      onChange={(v) =>
                        update(r.id, {
                          monthlyDivisor: v as Expense["monthlyDivisor"],
                        })
                      }
                    />
                    {r.monthlyDivisor === "fixed30" &&
                      r.monthlyBasis === "calendar" &&
                      calendarMonths(s.start, s.end).some(
                        (m) => m.days === m.daysInMonth && m.daysInMonth !== 30,
                      ) && (
                        <p className="easy-hint">
                          Dengan pembagi tetap 30, satu bulan penuh yang berisi
                          28, 29, atau 31 hari menghasilkan bagian tagihan yang
                          berbeda dari satu bulan penuh. Pilih hari kalender
                          bulan jika ingin mengikuti panjang bulan sebenarnya.
                        </p>
                      )}
                    <Select
                      label="Dasar jumlah hari"
                      value={r.monthlyBasis}
                      options={[
                        ["calendar", "Hari kalender periode"],
                        ["service", "Hari pelayanan"],
                      ]}
                      onChange={(v) =>
                        update(r.id, {
                          monthlyBasis: v as Expense["monthlyBasis"],
                        })
                      }
                    />
                    <div className="easy-fields">
                      <TextField
                        label="Tanggal awal periode"
                        type="date"
                        value={s.start}
                        onChange={(start) =>
                          change({
                            ...s,
                            start,
                            end: s.end && start > s.end ? "" : s.end,
                            serviceByMonth: {},
                          })
                        }
                      />
                      <TextField
                        label="Tanggal akhir periode"
                        type="date"
                        value={s.end}
                        onChange={(end) =>
                          change({ ...s, end, serviceByMonth: {} })
                        }
                      />
                    </div>
                    {(!s.start || !s.end) && (
                      <p className="sim-warning">
                        Tanggal belum lengkap. Perkiraan memakai {s.days} hari
                        pelayanan dan pembagi 30; isi tanggal agar sesuai bulan
                        sebenarnya.
                      </p>
                    )}
                    {r.monthlyBasis === "service" &&
                      calendarMonths(s.start, s.end).length > 1 && (
                        <div>
                          <p className="easy-hint">
                            Bagikan {s.days} hari pelayanan ke masing-masing
                            bulan. Jumlah seluruhnya harus sama. Mengubah
                            tanggal menghapus pembagian sebelumnya.
                          </p>
                          {calendarMonths(s.start, s.end).map((m) => (
                            <NumberField
                              key={m.key}
                              label={`Hari pelayanan ${m.key}`}
                              value={s.serviceByMonth[m.key] ?? 0}
                              integer
                              max={m.days}
                              onChange={(n) =>
                                change({
                                  ...s,
                                  serviceByMonth: {
                                    ...s.serviceByMonth,
                                    [m.key]: n,
                                  },
                                })
                              }
                            />
                          ))}
                        </div>
                      )}
                    {s.start && s.end && (
                      <p className="easy-hint">
                        {calendarDays(s)} hari kalender dalam periode · {s.days}{" "}
                        hari pelayanan.
                      </p>
                    )}
                  </>
                )}
                <NumberField
                  max={1e12}
                  label={
                    r.qty !== 1 || r.frequency !== 1
                      ? `Harga satuan ${billingLabels[kind]} (Rp)`
                      : `Biaya ${billingLabels[kind].toLowerCase()} (Rp)`
                  }
                  value={r.price}
                  onChange={(price) => update(r.id, { price })}
                />
                <p className="easy-hint">
                  {kind === "daily"
                    ? `${money(r.price)} × ${s.days} hari pelayanan`
                    : kind === "portion"
                      ? `${money(r.price)} × ${s.pm.toLocaleString("id-ID")} penerima × ${s.days} hari pelayanan`
                      : kind === "monthly"
                        ? monthlyMissing
                          ? "Lengkapi pembagian hari pelayanan per bulan"
                          : `(${monthlyParts(r, s)
                              .map(
                                (m) =>
                                  `${money(r.price)}/bulan ÷ ${m.divisor} ${Number.isInteger(r.price / m.divisor) ? "=" : "≈"} Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(r.price / m.divisor)}/hari × ${m.days} hari (${m.key})`,
                              )
                              .join(" + ")})`
                        : `${money(r.price)} × 1 kali`}
                  {r.qty !== 1 || r.frequency !== 1
                    ? ` × jumlah ${r.qty} × frekuensi ${r.frequency}`
                    : ""}{" "}
                  = {monthlyMissing ? "belum dihitung" : money(planCost(r, s))}.
                  Biaya harian ditampilkan sebagai perkiraan; total memakai
                  nilai sebelum pembulatan.
                </p>
                <label className="sim-check">
                  <input
                    type="checkbox"
                    checked={r.outsideCap}
                    onChange={(e) =>
                      update(r.id, { outsideCap: e.target.checked })
                    }
                  />{" "}
                  Di luar pagu operasional
                </label>
                <p className="easy-hint">
                  Biaya di luar pagu tetap ditampilkan terpisah dan tidak
                  mengurangi pagu operasional. Pastikan sumber dan aturannya
                  benar.
                </p>
                <div className="easy-actions">
                  <label className="sim-check">
                    <input
                      type="checkbox"
                      checked={r.active}
                      onChange={(e) =>
                        update(r.id, { active: e.target.checked })
                      }
                    />{" "}
                    Hitung biaya ini
                  </label>
                  <button
                    onClick={() =>
                      window.confirm(`Hapus ${r.name}?`) &&
                      change(
                        { ...s, rows: s.rows.filter((x) => x.id !== r.id) },
                        "Hapus pos",
                      )
                    }
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </details>
          );
        })}
      </div>
      <button
        className="easy-add"
        onClick={() =>
          s.rows.length < 500 &&
          change(
            {
              ...s,
              rows: [
                ...s.rows,
                { ...blankRow(), daily: true, billing: "daily" },
              ],
            },
            "Tambah pos",
          )
        }
      >
        ＋ Tambah biaya
      </button>
    </div>
  );
}

function Kesimpulan({ s }: { s: Scenario }) {
  const t = summary(s),
    incompleteMonth = s.rows.some(
      (r) =>
        r.active &&
        r.price > 0 &&
        billingKind(r) === "monthly" &&
        usesPlan(r, s) &&
        monthlyAllocationIncomplete(r, s),
    );
  const invalidDays = !!(s.start && s.end && s.days > calendarDays(s));
  const missing =
    s.basis !== "plan" &&
    s.rows.some(
      (r) =>
        r.active &&
        (r.price > 0 ||
          planCost(r, s) > 0 ||
          r.actual > 0 ||
          r.projected > 0) &&
        !(s.basis === "actual" ? r.actualProvided : r.projectedProvided),
    );
  const honorRows = s.rows.filter(
    (r) => r.active && r.category === CATEGORIES[0],
  );
  const honorSum = honorRows.reduce((n, r) => n + cost(r, s), 0),
    different = honorRows.length > 0 && honorSum !== honorTotal(s);
  const largest = s.rows
    .filter((r) => r.active && !r.outsideCap && cost(r, s) > 0)
    .sort((a, b) => cost(b, s) - cost(a, s))
    .slice(0, 3);
  const short = Math.max(0, -t.balance),
    reserveShort = Math.max(0, -t.gap);
  const title = incompleteMonth
    ? "Lengkapi hari pelayanan per bulan"
    : invalidDays
      ? "Periksa jumlah hari pelayanan"
      : missing
        ? "Data belum lengkap"
        : !t.budget
          ? "Pagu belum tersedia"
          : t.total === 0
            ? t.outside > 0
              ? "Belum ada biaya dalam pagu"
              : "Isi biaya dulu"
            : short > 0
              ? "Melebihi pagu"
              : t.balance === 0
                ? "Tepat di batas pagu"
                : t.usage !== null && t.usage >= 90
                  ? "Mendekati batas pagu"
                  : "Masih dalam pagu";
  return (
    <section className="sim-conclusion" aria-live="polite">
      <span>
        HASIL ·{" "}
        {s.basis === "plan"
          ? "RENCANA"
          : s.basis === "actual"
            ? "REALISASI"
            : "PROYEKSI"}
      </span>
      <h2>{title}</h2>
      <p>
        {incompleteMonth
          ? "Isi pembagian hari pelayanan per bulan untuk menghitung biaya bulanan."
          : invalidDays
            ? `Periode ini ${calendarDays(s)} hari kalender; hari pelayanan tidak boleh lebih banyak.`
            : missing
              ? "Sebagian nilai belum diisi; sementara menggunakan angka rencana. Isi nilai sebenarnya di Rincian biaya lanjutan."
              : !t.budget
                ? "Isi jumlah penerima dan hari pelayanan untuk menghitung pagu."
                : t.total === 0
                  ? t.outside > 0
                    ? "Belum ada biaya yang dibebankan pada pagu operasional."
                    : "Ketuk Isi biaya untuk mulai menghitung."
                  : short > 0
                    ? `Kurangi total biaya minimal ${money(short)} dari biaya dalam pagu.`
                    : `Sisa anggaran ${money(t.balance)}.`}
      </p>
      {!incompleteMonth &&
        !invalidDays &&
        !missing &&
        t.budget > 0 &&
        reserveShort > 0 && (
          <p>
            Untuk mencapai target cadangan, kurangi biaya sebesar{" "}
            {money(reserveShort)}.
          </p>
        )}
      {!incompleteMonth &&
        !invalidDays &&
        !missing &&
        (short > 0 || reserveShort > 0) &&
        largest.length > 0 && (
          <p>
            Periksa pos terbesar:{" "}
            {largest.map((r) => `${r.name} (${money(cost(r, s))})`).join(", ")}.
            Tentukan pengurangan sesuai kebutuhan dan ketentuan.
          </p>
        )}
      {!missing &&
        !incompleteMonth &&
        !invalidDays &&
        t.total > 0 &&
        t.perPM !== null && (
          <p>
            Biaya operasional / penerima / hari:{" "}
            <strong>{money(t.perPM)}</strong> dibanding tarif {money(s.rate)} (
            {t.perPM > s.rate ? "+" : ""}
            {money(t.perPM - s.rate)}).
          </p>
        )}
      <p>
        {missing || incompleteMonth || invalidDays ? "Sementara — " : ""}Dalam
        pagu: {money(t.total)} · Di luar pagu: {money(t.outside)} · Total semua:{" "}
        {money(t.allTotal)}
      </p>
      {s.basis === "plan" && /realisasi/i.test(s.name) && (
        <p>
          ⚠ Nama skenario berisi “realisasi”, tetapi hasil memakai rencana. Ubah
          dasar ringkasan jika ingin melihat realisasi.
        </p>
      )}
      {different && (
        <p>
          ⚠ Honor anggaran {money(honorSum)} berbeda dari kalkulator{" "}
          {money(honorTotal(s))}. Buka Simulasi honor relawan untuk memeriksa.
        </p>
      )}
      {t.total + t.outside !== t.allTotal && (
        <p>
          Subtotal yang ditampilkan dapat berbeda Rp1 dari total gabungan karena
          pembulatan akhir.
        </p>
      )}
      {s.rows.some(
        (r) =>
          r.active &&
          r.price > 0 &&
          usesPlan(r, s) &&
          billingKind(r) === "monthly" &&
          (!s.start || !s.end),
      ) && (
        <p>
          ⚠ Tanggal belum lengkap: biaya bulanan diperkirakan dari {s.days} hari
          pelayanan dengan pembagi 30.
        </p>
      )}
      <small>
        Simulasi, bukan saldo kas atau persetujuan pembiayaan. Pembulatan
        dilakukan pada total akhir.
      </small>
    </section>
  );
}

function freshScenario(): Scenario {
  const base = preset();
  return {
    ...base,
    name: "Skenario harian baru",
    note: "Isi biaya harian atau biaya untuk periode yang dipilih.",
    pm: 0,
    days: 1,
    rows: [
      ...base.rows
        .filter((r) => !r.name.startsWith("Ard"))
        .map((r) => ({
          ...r,
          name: r.name === "Listrik" ? "Listrik abonemen" : r.name,
          price: 0,
          daily: false,
          billing: /internet|bpjs|listrik/i.test(r.name)
            ? ("monthly" as const)
            : r.billing,
          monthlyDivisor: "fixed30" as const,
          monthlyBasis: "calendar" as const,
        })),
      ...["Sewa", "Langganan aplikasi"].map((name) => ({
        ...blankRow(),
        name,
        billing: "monthly" as const,
        monthlyDivisor: "fixed30" as const,
        monthlyBasis: "calendar" as const,
      })),
    ],
    honor: {
      ...base.honor,
      registered: 0,
      active: 0,
      days: 1,
      rate: 0,
      mode: "pooled",
      pooled: 0,
      actual: 0,
      roles: [],
    },
  };
}

function PrintReport({s}: {s: Scenario}) {
  const t = summary(s);
  const basis = s.basis === "plan" ? "Rencana" : s.basis === "actual" ? "Realisasi" : "Proyeksi";
  const reduction = s.honor.optionReduction ?? 0;
  return <article className="report-print">
    <header><div><small>DJATI · SIMULATOR OPERASIONAL SPPG</small><h1>Laporan simulasi anggaran</h1><p>{s.name}</p></div><div className="report-date">Dasar: {basis}</div></header>
    <section className="report-summary"><div><span>HASIL TERHADAP PAGU</span><h2>{t.budget === 0 ? "Pagu belum tersedia" : t.balance < 0 ? `Melebihi pagu ${money(-t.balance)}` : `Sisa pagu ${money(t.balance)}`}</h2><p>Setelah cadangan: {t.gap < 0 ? `kurang ${money(-t.gap)}` : `tersisa ${money(t.gap)}`} · Biaya per penerima per hari: {t.perPM === null ? "belum dapat dihitung" : money(t.perPM)} dibanding tarif {money(s.rate)}.</p></div></section>
    <div className="report-metrics"><div><small>PAGU OPERASIONAL</small><b>{money(t.budget)}</b></div><div><small>BIAYA DALAM PAGU</small><b>{money(t.total)}</b></div><div><small>DI LUAR PAGU</small><b>{money(t.outside)}</b></div><div><small>TOTAL SELURUH BIAYA</small><b>{money(t.allTotal)}</b></div></div>
    <p><b>Dasar hitung:</b> {s.pm.toLocaleString("id-ID")} penerima × {s.days} hari pelayanan × {money(s.rate)}. Periode: {s.start || "belum diisi"} s.d. {s.end || "belum diisi"}. Cadangan {money(t.reserve)}. Nilai realisasi/proyeksi kosong memakai rencana.</p>
    <h2>Rincian biaya</h2><table><thead><tr><th>Pos / kategori</th><th>Dasar perhitungan</th><th>Rencana</th><th>Realisasi</th><th>Proyeksi</th></tr></thead><tbody>{s.rows.map(r => <tr key={r.id}><td>{r.name}<br/><small>{r.category}{r.outsideCap ? " · luar pagu" : ""}{!r.active ? " · nonaktif" : ""}{r.note ? ` · ${r.note}` : ""}{r.source ? ` · Sumber: ${r.source}` : ""}{r.evidence ? ` · Bukti: ${r.evidence}` : ""}</small></td><td>{billingLabels[billingKind(r)]} · {r.qty} × {money(r.price)} × {r.frequency}{billingKind(r) === "daily" ? ` × ${s.days} hari` : billingKind(r) === "portion" ? ` × ${s.pm} × ${s.days} hari` : billingKind(r) === "monthly" ? ` × ${monthlyAllocationIncomplete(r,s) ? "belum lengkap" : monthlyParts(r,s).map(m => `${m.key}: ${m.days}/${m.divisor}${m.fallback ? " (perkiraan)" : ""}`).join(" + ")}` : ""}</td><td>{r.active && billingKind(r) === "monthly" && monthlyAllocationIncomplete(r,s) ? "Belum lengkap" : money(r.active ? planCost(r,s) : 0)}</td><td>{r.actualProvided ? money(r.active ? r.actual : 0) : "Belum diisi"}</td><td>{r.projectedProvided ? money(r.active ? r.projected : 0) : "Belum diisi"}</td></tr>)}</tbody></table>
    {s.honor.mode !== "roles" && <><h2>Perhitungan honor relawan</h2><p>Metode: {s.honor.mode === "pooled" ? "Bagi rata" : s.honor.mode === "actual" ? "Honor aktual" : "Tarif sama per hari"}. Total kalkulator: {money(honorTotal(s))}. Relawan terdaftar: {s.honor.registered}; aktif: {s.honor.active}; hari: {s.honor.days}; tarif: {money(s.honor.rate)} per hari. Pastikan hasil sudah dipilih untuk anggaran bila ingin menggunakannya.</p></>}
    {s.honor.mode === "roles" && s.honor.roles.length > 0 && <><h2>Simulasi honor per divisi / orang</h2><p>Pengurangan tarif opsi: {money(reduction)} per orang per hari. Total kalkulator awal: {money(honorTotal(s))}. Angka di anggaran mengikuti pos honor yang dipilih, bukan otomatis hasil opsi.</p><table><thead><tr><th>Divisi / kode</th><th>Orang × hari</th><th>Tarif / hari</th><th>Total awal</th><th>Opsi: kurangi orang / hari</th><th>Total opsi</th></tr></thead><tbody>{s.honor.roles.map((r,i) => <tr key={i}><td>{r.name}</td><td>{r.people === undefined ? `${r.assignments} orang-hari` : `${r.people} × ${r.workDays}`}</td><td>{money(r.rate)}</td><td>{money(r.assignments*r.rate)}</td><td>{r.people === undefined ? "Tidak diketahui" : r.optionRemoved ?? 0}</td><td>{money((r.people === undefined || r.workDays === undefined ? r.assignments : (r.people - (r.optionRemoved ?? 0))*r.workDays)*Math.max(0,r.rate-reduction))}</td></tr>)}</tbody></table></>}
    {s.note && <p><b>Catatan skenario:</b> {s.note}</p>}
    {warnings(s).length > 0 && <><h2>Hal yang perlu diperiksa</h2><ul>{warnings(s).map((w,i)=><li key={i}>{w}</li>)}</ul></>}
    <footer>Simulasi berdasarkan data yang diisi; bukan saldo kas, payroll, atau persetujuan pembiayaan. Pastikan kebutuhan kerja, keselamatan, dan jadwal rotasi sebelum mengambil keputusan.</footer>
  </article>;
}

export default function Simulator() {
  const [s, setS] = useState<Scenario>(freshScenario),
    [ready, setReady] = useState(false),
    [persist, setPersist] = useState(false),
    [status, setStatus] = useState("Memuat penyimpanan lokal…"),
    [saved, setSaved] = useState<Scenario[]>([]);
  const archiveReadable = useRef(false);
  useEffect(() => {
    try {
      const stored = loadScenario();
      if (stored) setS(stored);
      const archive = localStorage.getItem(
        "djati:simulator-operasional:scenarios:v1",
      );
      if (archive) {
        const items: unknown = JSON.parse(archive);
        if (!Array.isArray(items) || items.length > 10)
          throw Error("Arsip tidak valid");
        setSaved(items.map((item) => validateScenario(item)));
      }
      archiveReadable.current = true;
      const storedText = localStorage.getItem(STORAGE_KEY);
      const legacy = storedText && JSON.parse(storedText).version === 1;
      setStatus(
        stored
          ? legacy
            ? "Skenario lama dimuat. Periksa ulang total: pembulatan kini pada total akhir."
            : "Skenario lokal dimuat."
          : "Skenario siap digunakan. Data hanya di perangkat ini.",
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
  useEffect(() => {
    if (!ready || !archiveReadable.current) return;
    try {
      localStorage.setItem(
        "djati:simulator-operasional:scenarios:v1",
        JSON.stringify(saved),
      );
    } catch {
      setStatus(
        "Gagal menyimpan daftar skenario lokal. Ekspor JSON untuk menyimpan.",
      );
    }
  }, [ready, saved]);
  const archiveCurrent = () => {
    if (!archiveReadable.current) {
      setStatus(
        "Arsip skenario tidak dapat dibaca. Ekspor JSON sebelum mengganti.",
      );
      return false;
    }
    if (saved.length >= 10) {
      setStatus("Maksimum 10 skenario tersimpan; hapus salah satu.");
      return false;
    }
    const next = [...saved, { ...structuredClone(s), savedAt: new Date().toISOString() }];
    try {
      localStorage.setItem(
        "djati:simulator-operasional:scenarios:v1",
        JSON.stringify(next),
      );
      setSaved(next);
      return true;
    } catch {
      setStatus(
        "Gagal menyimpan skenario sebelumnya. Ekspor JSON sebelum mengganti.",
      );
      return false;
    }
  };
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
      <PrintReport s={s} />
      <div className="sim-intro">
        <span className="sim-eyebrow">DJATI / ALAT PUBLIK</span>
        <h1>
          Simulator Anggaran
          <br />
          <em>Operasional SPPG</em>
        </h1>
        <p>
          Isi jumlah penerima, hari pelayanan, dan biaya. Hasil langsung muncul
          di bawah.
        </p>
      </div>
      <p className="sim-save-status" role="status" aria-live="polite">
        {status}
      </p>
      <section className="easy-parameters">
        <div className="easy-fields">
          <NumberField
            label="👥 Jumlah penerima"
            value={s.pm}
            integer
            max={1000000}
            onChange={(pm) => change({ ...s, pm })}
          />
          <NumberField
            label="📅 Hari pelayanan"
            value={s.days}
            integer
            max={366}
            onChange={(days) => change({ ...s, days })}
          />
        </div>
        <p className="easy-hint">
          Pagu {money(s.rate)} × {s.pm.toLocaleString("id-ID")} penerima ×{" "}
          {s.days} hari = <strong>{money(summary(s).budget)}</strong>
        </p>
      </section>
      <div className="sim-toolbar sim-no-print">
        <button
          onClick={() => {
            if (archiveCurrent())
              change(
                {
                  ...s,
                  name: "Skenario baru",
                  note: "",
                  rows: s.rows.map((r) => ({
                    ...r,
                    price: 0,
                    actual: 0,
                    projected: 0,
                    actualProvided: false,
                    projectedProvided: false,
                    managedHonor: false,
                  })),
                  honor: freshScenario().honor,
                  log: [],
                },
                "Skenario baru",
              );
          }}
        >
          ＋ Skenario baru
        </button>
        <button
          onClick={() => {
            if (archiveCurrent())
              change(
                {
                  ...structuredClone(s),
                  name: (s.name + " (salinan)").slice(0, 150),
                },
                "Duplikasi skenario",
              );
          }}
        >
          ⧉ Duplikat
        </button>
      </div>
      {saved.length > 0 && (
        <details className="easy-main sim-no-print">
          <summary>
            <span>
              <strong>📁 Skenario tersimpan ({saved.length})</strong>
              <small>Ketuk untuk membuka</small>
            </span>
          </summary>
          {saved.map((item, i) => (
            <div className="sim-toolbar" key={i}>
              <strong>{item.name}</strong>
              <span>{money(summary(item).allTotal)} · {item.savedAt ? new Date(item.savedAt).toLocaleString("id-ID") : "Tanggal simpan tidak tersedia"}</span>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "Muat skenario ini dan timpa skenario aktif? Duplikasi dahulu untuk menyimpan perubahan.",
                    )
                  )
                    change(structuredClone(item), "Muat skenario");
                }}
              >
                Buka
              </button>
              <button
                onClick={() =>
                  window.confirm("Hapus skenario tersimpan ini?") &&
                  setSaved(saved.filter((_, j) => j !== i))
                }
              >
                Hapus
              </button>
            </div>
          ))}
        </details>
      )}
      <details className="easy-main">
        <summary>
          <span>
            <strong>🧾 Isi biaya</strong>
            <small>Ketuk untuk menambah atau mengubah</small>
          </span>
          <b>{money(summary(s).total)}</b>
        </summary>
        <QuickSheet s={s} change={change} />
      </details>
      <Kesimpulan s={s} />
      <div className="easy-print">
        <h2>Rincian biaya</h2>
        <p>
          Jumlah penerima: {s.pm} · Hari pelayanan: {s.days} · Pagu:{" "}
          {money(summary(s).budget)}
        </p>
        <table>
          <thead>
            <tr>
              <th>Nama biaya</th>
              <th>Perhitungan</th>
              <th>Rencana</th>
              <th>Realisasi</th>
              <th>Proyeksi</th>
            </tr>
          </thead>
          <tbody>
            {s.rows.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.name} {!r.active && "(tidak aktif)"}
                </td>
                <td>
                  {billingLabels[billingKind(r)]} · {r.qty} × {money(r.price)} ×{" "}
                  {r.frequency}
                  {billingKind(r) === "daily"
                    ? ` × ${s.days} hari`
                    : billingKind(r) === "portion"
                      ? ` × ${s.pm} penerima × ${s.days} hari`
                      : billingKind(r) === "monthly"
                        ? ` × (${
                            monthlyAllocationIncomplete(r, s)
                              ? "hari pelayanan belum lengkap"
                              : monthlyParts(r, s)
                                  .map(
                                    (m) =>
                                      `${m.key}: ${m.days}/${m.divisor}${m.fallback ? " (perkiraan)" : ""}`,
                                  )
                                  .join(" + ")
                          })`
                        : ""}
                  {r.outsideCap ? " · di luar pagu" : ""}
                </td>
                <td>
                  {r.active &&
                  billingKind(r) === "monthly" &&
                  monthlyAllocationIncomplete(r, s)
                    ? "Belum lengkap"
                    : money(r.active ? planCost(r, s) : 0)}
                </td>
                <td>
                  {r.actualProvided
                    ? money(r.active ? r.actual : 0)
                    : "Belum diisi"}
                </td>
                <td>
                  {r.projectedProvided
                    ? money(r.active ? r.projected : 0)
                    : "Belum diisi"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="easy-main sim-no-print">
        <summary>
          <span>
            <strong>⚙️ Pilihan lain</strong>
            <small>Honor, rincian, simpan, dan cetak</small>
          </span>
        </summary>
        <details className="sim-panel">
          <summary>Rincian pagu dan cadangan</summary>
          <BudgetSummary s={s} />
        </details>
        <details className="sim-panel">
          <summary>Pengaturan anggaran</summary>
          <BudgetParameters s={s} change={change} />
        </details>
        <details className="sim-panel">
          <summary>Catatan dan peringatan</summary>
          <BudgetWarnings s={s} />
        </details>
        <details className="sim-panel">
          <summary>Rincian biaya lanjutan</summary>
          <ExpenseTable s={s} change={change} />
        </details>
        <details className="sim-panel">
          <summary>Simulasi honor relawan</summary>
          <HonorScenario s={s} change={change} />
        </details>
        <details className="sim-panel">
          <summary>Bandingkan skenario</summary>
          <ScenarioComparison
            s={s}
            saved={saved}
            onSave={() => {
              if (saved.length >= 10) {
                setStatus(
                  "Maksimum 10 pembanding. Hapus salah satu atau ekspor JSON.",
                );
                return;
              }
              setSaved([...saved, { ...structuredClone(s), savedAt: new Date().toISOString() }]);
              setStatus("Snapshot pembanding ditambahkan.");
            }}
            onLoad={(v) =>
              window.confirm("Muat snapshot ini dan timpa skenario aktif?") &&
              change(structuredClone(v), "Muat pembanding")
            }
            onDelete={(i) => setSaved(saved.filter((_, j) => i !== j))}
          />
        </details>
        <details className="sim-panel sim-no-print">
          <summary>Simpan, impor, ekspor atau cetak</summary>
          <ExportActions
            s={s}
            change={change}
            saved={saved}
            onImportMany={(items, mode, replaceIndices) => {
              if (!archiveReadable.current) { setStatus("Arsip tidak dapat dibaca. Impor dibatalkan."); return false; }
              const accepted = mode === "skip" ? items.slice(0, Math.max(0, 10 - saved.length)) : items.slice(0, 10);
              const removed = mode === "replace" ? replaceIndices : [];
              const next = [...saved.filter((_, i) => !removed.includes(i)), ...accepted.map(item => ({...structuredClone(item), savedAt: item.savedAt ?? new Date().toISOString()}))];
              if (removed.length && !window.confirm(`Ganti ${removed.length} skenario yang dipilih: ${removed.map(i => saved[i].name).join(", ")}?`)) return false;
              try { localStorage.setItem("djati:simulator-operasional:scenarios:v1", JSON.stringify(next)); setSaved(next); setStatus(`${accepted.length} skenario diimpor; ${items.length - accepted.length} dilewati.`); return true; } catch { setStatus("Penyimpanan gagal; arsip tidak diubah."); return false; }
            }}
            onClear={() => {
              setPersist(false);
              setS(freshScenario());
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
      </details>
      <details className="sim-disclaimer">
        <summary>Catatan penggunaan</summary>
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
      </details>
    </div>
  );
}
