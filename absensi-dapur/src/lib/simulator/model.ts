export const CATEGORIES = [
  "Honor relawan",
  "Utilitas",
  "Bahan bakar memasak",
  "BBM distribusi",
  "BBM koordinasi",
  "Jaminan sosial",
  "Kebersihan & sanitasi",
  "ATK & barang habis pakai",
  "Keamanan",
  "Insentif PIC/PJ",
  "Rapat koordinasi",
  "Lainnya / perlu verifikasi",
  "Sewa kendaraan",
  "Insentif fasilitas",
  "Kemasan",
  "Bahan baku",
] as const;
export type Expense = {
  id: string;
  name: string;
  category: string;
  priority: string;
  unit: string;
  qty: number;
  price: number;
  frequency: number;
  daily: boolean;
  billing: "daily" | "portion" | "monthly" | "once";
  outsideCap: boolean;
  actualProvided: boolean;
  projectedProvided: boolean;
  active: boolean;
  source: string;
  note: string;
  evidence: string;
  actual: number;
  projected: number;
  managedHonor: boolean;
};
export type Scenario = {
  version: 1;
  name: string;
  kind: "baseline" | "hemat" | "custom";
  start: string;
  end: string;
  note: string;
  pm: number;
  days: number;
  rate: number;
  reserve: number;
  reserveMode: "percent" | "nominal";
  rounding: "round" | "ceil" | "floor";
  basis: "plan" | "actual" | "projected";
  rows: Expense[];
  honor: {
    registered: number;
    active: number;
    days: number;
    rate: number;
    reduction: number;
    mode: "uniform" | "roles" | "pooled" | "actual";
    pooled: number;
    actual: number;
    roles: { name: string; assignments: number; rate: number }[];
  };
  log: string[];
};
export const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `row-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const money = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
export const blankRow = (): Expense => ({
  id: uid(),
  name: "Pos baru",
  category: CATEGORIES[11],
  priority: "Harus diverifikasi",
  unit: "paket",
  qty: 1,
  price: 0,
  frequency: 1,
  daily: false,
  billing: "once",
  outsideCap: false,
  actualProvided: false,
  projectedProvided: false,
  active: true,
  source: "Perlu verifikasi",
  note: "",
  evidence: "",
  actual: 0,
  projected: 0,
  managedHonor: false,
});
export function preset(): Scenario {
  const data: [string, number, number][] = [
    ["Gas", 12150000, 2],
    ["BBM distribusi", 2600000, 3],
    ["Listrik", 2600000, 1],
    ["Insentif PIC (satdik/B3, perlu verifikasi)", 5000000, 9],
    ["Air", 2000000, 1],
    ["Internet", 500000, 1],
    ["BPJS", 500000, 5],
    ["ATK", 1500000, 7],
    ["Sabun", 2000000, 6],
    ["Ard — perlu konfirmasi", 200000, 11],
  ];
  return {
    version: 1,
    name: "Contoh catatan operasional — belum diverifikasi",
    kind: "baseline",
    start: "",
    end: "",
    note: "Nominal contoh adalah total per periode; tentukan periode yang sesuai. Bukan pengeluaran aktual yang disahkan.",
    pm: 2600,
    days: 10,
    rate: 3000,
    reserve: 5,
    reserveMode: "percent",
    rounding: "round",
    basis: "plan",
    rows: data.map(([name, price, category], i) => ({
      ...blankRow(),
      id: `preset-${i}`,
      name,
      price,
      category: CATEGORIES[category],
    })),
    honor: {
      registered: 49,
      active: 33,
      days: 10,
      rate: 100000,
      reduction: 0,
      mode: "uniform",
      pooled: 0,
      actual: 0,
      roles: [{ name: "Role A (anonim)", assignments: 330, rate: 100000 }],
    },
    log: [],
  };
}
/** Kalender inklusif; pemisahan bulan menggunakan UTC agar tidak tergantung zona browser. */
export function calendarMonths(
  start: string,
  end: string,
): { days: number; daysInMonth: number }[] {
  if (!start || !end || start > end) return [];
  const first = new Date(`${start}T00:00:00Z`),
    last = new Date(`${end}T00:00:00Z`);
  if (!Number.isFinite(first.getTime()) || !Number.isFinite(last.getTime()))
    return [];
  const result: { days: number; daysInMonth: number }[] = [];
  let y = first.getUTCFullYear(),
    m = first.getUTCMonth();
  for (let i = 0; i < 1200; i++) {
    const monthStart = (year: number, month: number) => {
      const d = new Date(0);
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCFullYear(year, month, 1);
      return d.getTime();
    };
    const startMonth = monthStart(y, m),
      next = monthStart(y, m + 1);
    if (startMonth > last.getTime()) break;
    const daysInMonth = (next - startMonth) / 86400000;
    const from = Math.max(startMonth, first.getTime()),
      to = Math.min(next - 86400000, last.getTime());
    result.push({ days: (to - from) / 86400000 + 1, daysInMonth });
    m++;
    if (m === 12) {
      m = 0;
      y++;
    }
  }
  return result;
}
export function calendarDays(s: Scenario) {
  if (!s.start || !s.end || s.start > s.end) return 0;
  const a = Date.parse(s.start + "T00:00:00Z"),
    b = Date.parse(s.end + "T00:00:00Z");
  return Number.isFinite(a) && Number.isFinite(b) ? (b - a) / 86400000 + 1 : 0;
}
export function billingKind(r: Expense) {
  return r.daily && (!r.billing || r.billing === "once")
    ? "daily"
    : (r.billing ?? "once");
}
export function planCost(r: Expense, s: Scenario) {
  const kind = billingKind(r);
  const multiplier =
    kind === "daily"
      ? s.days
      : kind === "portion"
        ? s.pm * s.days
        : kind === "monthly"
          ? calendarMonths(s.start, s.end).reduce(
              (n, m) => n + m.days / m.daysInMonth,
              0,
            )
          : 1;
  return Math[s.rounding](r.qty * r.price * r.frequency * multiplier);
}

export function cost(r: Expense, s: Scenario) {
  return r.active
    ? s.basis === "plan"
      ? planCost(r, s)
      : s.basis === "actual"
        ? r.actual
        : r.projected
    : 0;
}
export function summary(s: Scenario) {
  const budget = s.pm * s.rate * s.days,
    total = s.rows
      .filter((r) => !r.outsideCap)
      .reduce((n, r) => n + cost(r, s), 0),
    outside = s.rows
      .filter((r) => r.outsideCap)
      .reduce((n, r) => n + cost(r, s), 0),
    balance = budget - total;
  const reserve =
    s.reserveMode === "percent"
      ? Math[s.rounding]((budget * s.reserve) / 100)
      : s.reserve;
  const honor = s.rows
    .filter((r) => r.category === CATEGORIES[0] && !r.outsideCap)
    .reduce((n, r) => n + cost(r, s), 0);
  return {
    budget,
    total,
    outside,
    allTotal: total + outside,
    balance,
    reserve,
    gap: balance - reserve,
    usage: budget ? (total / budget) * 100 : null,
    perPM: s.pm && s.days ? total / s.pm / s.days : null,
    honor,
    nonHonor: total - honor,
  };
}
export function honorTotal(
  s: Scenario,
  active = s.honor.active,
  reduction = s.honor.reduction,
) {
  const h = s.honor;
  return Math[s.rounding](
    h.mode === "pooled"
      ? h.pooled
      : h.mode === "actual"
        ? h.actual
        : h.mode === "roles"
          ? h.roles.reduce(
              (n, r) => n + r.assignments * Math.max(0, r.rate - reduction),
              0,
            )
          : active * h.days * Math.max(0, h.rate - reduction),
  );
}
// One managed row is replaced on every sync; other honor entries are explicitly replaced.
export function syncHonor(s: Scenario, amount = honorTotal(s)): Scenario {
  const row = {
    ...blankRow(),
    id: "managed-honor",
    name: "Honor relawan — simulasi tersinkron",
    category: CATEGORIES[0],
    price: amount,
    managedHonor: true,
    actual: s.honor.mode === "actual" ? amount : 0,
    actualProvided: s.honor.mode === "actual",
    note:
      s.honor.mode === "actual"
        ? "Nilai aktual dimasukkan pengguna; perlu verifikasi."
        : "Rencana simulasi; bukan payroll aktual.",
  };
  return {
    ...s,
    rows: [
      ...s.rows.filter((r) => r.category !== CATEGORIES[0] && !r.managedHonor),
      row,
    ],
  };
}
export function warnings(s: Scenario): string[] {
  const t = summary(s),
    list: string[] = [];
  if (s.name === "Contoh catatan operasional — belum diverifikasi")
    list.push(
      "Subtotal catatan Rp47.150.000 berbeda Rp18.100.000 dari jumlah 10 pos. Selisih belum direkonsiliasi.",
    );
  if (
    s.rows.some((r) => r.active && billingKind(r) === "monthly") &&
    (!s.start || !s.end)
  )
    list.push("Isi tanggal awal dan akhir untuk menghitung biaya bulanan.");
  if (s.start && s.end && s.days > calendarDays(s))
    list.push("Hari pelayanan melebihi jumlah hari kalender pada periode.");
  if (
    s.basis !== "plan" &&
    s.rows.some(
      (r) =>
        r.active &&
        (planCost(r, s) > 0 || r.actual > 0 || r.projected > 0) &&
        !(s.basis === "actual" ? r.actualProvided : r.projectedProvided),
    )
  )
    list.push(
      "Sebagian nilai " +
        (s.basis === "actual" ? "realisasi" : "proyeksi") +
        " belum diisi; total belum lengkap.",
    );
  const honorRows = s.rows.filter(
    (r) => r.active && r.category === CATEGORIES[0],
  );
  if (
    honorRows.length &&
    honorRows.reduce((n, r) => n + cost(r, s), 0) !== honorTotal(s)
  )
    list.push(
      "Total honor pada anggaran berbeda dari kalkulator honor. Periksa sebelum sinkronisasi.",
    );
  if (s.rate !== 3000)
    list.push(
      "Simulasi nonstandar: tarif berbeda dari acuan Rp3.000/PM/hari; bukan penilaian kepatuhan.",
    );
  if (t.balance < 0)
    list.push("Pagu terlampaui. Tinjau kembali kebutuhan dan parameter.");
  if (!t.budget)
    list.push("Pagu nol: serapan dan ekuivalen per PM mungkin tidak tersedia.");
  if (t.gap < 0) list.push("Saldo di bawah target cadangan.");
  if (
    s.rows.some(
      (r) =>
        r.active &&
        (r.category === CATEGORIES[11] ||
          r.priority === "Harus diverifikasi" ||
          /verifikasi/i.test(r.source)),
    )
  )
    list.push("Ada pos yang kelayakan atau klasifikasinya harus diverifikasi.");
  const names = s.rows
    .filter((r) => r.active)
    .map((r) => r.name.trim().toLowerCase());
  if (new Set(names).size < names.length)
    list.push(
      "Nama pos duplikat ditemukan; periksa kemungkinan penghitungan ganda.",
    );
  if (s.honor.active > s.honor.registered)
    list.push("Petugas aktif melebihi personel terdaftar.");
  if (s.rows.some((r) => cost(r, s) > 1e10))
    list.push("Ada nilai pos sangat besar; periksa kuantitas dan satuannya.");
  return list;
}
const obj = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw Error("Objek tidak valid.");
  return v as Record<string, unknown>;
};
const str = (v: unknown, max = 300) => {
  if (typeof v !== "string" || v.length > max)
    throw Error("Teks tidak valid atau terlalu panjang.");
  return v;
};
const num = (v: unknown, max = 1e9, integer = false) => {
  if (
    typeof v !== "number" ||
    !Number.isFinite(v) ||
    v < 0 ||
    v > max ||
    (integer && !Number.isInteger(v))
  )
    throw Error("Angka harus terbatas, nonnegatif, dan sesuai batas.");
  return v;
};
const bool = (v: unknown) => {
  if (typeof v !== "boolean") throw Error("Status tidak valid.");
  return v;
};
function choice<T extends string>(v: unknown, values: readonly T[]): T {
  if (!values.includes(v as T)) throw Error("Pilihan tidak valid.");
  return v as T;
}
export const MAX_IMPORT_BYTES = 1024 * 1024;
export function validateScenario(value: unknown): Scenario {
  const s = obj(value);
  if (s.version !== 1) throw Error("Versi skema tidak didukung.");
  if (!Array.isArray(s.rows) || s.rows.length > 500)
    throw Error("Maksimum 500 pos.");
  const h = obj(s.honor);
  if (!Array.isArray(h.roles) || h.roles.length > 500)
    throw Error("Maksimum 500 divisi atau relawan.");
  const date = (v: unknown) => {
    const d = str(v, 10);
    if (
      d &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(d) ||
        Number.isNaN(Date.parse(d)) ||
        new Date(d).toISOString().slice(0, 10) !== d)
    )
      throw Error("Tanggal tidak valid.");
    return d;
  };
  const result: Scenario = {
    version: 1,
    name: str(s.name, 150),
    kind: choice(s.kind, ["baseline", "hemat", "custom"]),
    start: date(s.start),
    end: date(s.end),
    note: str(s.note, 2000),
    pm: num(s.pm, 1000000, true),
    days: num(s.days, 366, true),
    rate: num(s.rate, 1000000, true),
    reserve: num(s.reserve, s.reserveMode === "percent" ? 100 : 1e12),
    reserveMode: choice(s.reserveMode, ["percent", "nominal"]),
    rounding: choice(s.rounding, ["round", "ceil", "floor"]),
    basis: choice(s.basis, ["plan", "actual", "projected"]),
    rows: s.rows.map((value) => {
      const r = obj(value);
      return {
        id: str(r.id, 100),
        name: str(r.name, 150),
        category: choice(r.category, CATEGORIES),
        priority: choice(r.priority, [
          "Tetap / diprioritaskan",
          "Pendukung",
          "Harus diverifikasi",
        ]),
        unit: str(r.unit, 50),
        qty: num(r.qty, 10000),
        price: num(r.price, 1e12),
        frequency: num(r.frequency, 366),
        daily: bool(r.daily),
        billing:
          r.billing === undefined
            ? r.daily
              ? "daily"
              : "once"
            : choice(r.billing, ["daily", "portion", "monthly", "once"]),
        outsideCap: r.outsideCap === undefined ? false : bool(r.outsideCap),
        actualProvided:
          r.actualProvided === undefined
            ? r.actual !== 0
            : bool(r.actualProvided),
        projectedProvided:
          r.projectedProvided === undefined
            ? r.projected !== 0
            : bool(r.projectedProvided),
        active: bool(r.active),
        source: str(r.source),
        note: str(r.note, 2000),
        evidence: str(r.evidence, 1000),
        actual: num(r.actual, 1e12),
        projected: num(r.projected, 1e12),
        managedHonor: bool(r.managedHonor),
      };
    }),
    honor: {
      registered: num(h.registered, 10000, true),
      active: num(h.active, 10000, true),
      days: num(h.days, 366, true),
      rate: num(h.rate, 1000000, true),
      reduction: num(h.reduction, 1000000, true),
      mode: choice(h.mode, ["uniform", "roles", "pooled", "actual"]),
      pooled: h.pooled === undefined ? 0 : num(h.pooled, 1e12),
      actual: h.actual === undefined ? 0 : num(h.actual, 1e12),
      roles: h.roles.map((value) => {
        const r = obj(value);
        return {
          name: str(r.name, 100),
          assignments: num(r.assignments, 3660000, true),
          rate: num(r.rate, 1000000000, true),
        };
      }),
    },
    log: Array.isArray(s.log) ? s.log.slice(-30).map((v) => str(v, 250)) : [],
  };
  if (result.start && result.end && result.start > result.end)
    throw Error("Akhir periode harus sesudah awal.");
  if (
    result.start &&
    result.end &&
    calendarDays(result) > 3660 &&
    result.rows.some((r) => billingKind(r) === "monthly")
  )
    throw Error("Biaya bulanan mendukung periode maksimum 3660 hari kalender.");
  if (
    new Set(result.rows.map((r) => r.id)).size !== result.rows.length ||
    result.rows.filter((r) => r.managedHonor).length > 1
  )
    throw Error("ID pos atau sumber honor duplikat.");
  if (result.rows.some((r) => planCost(r, result) > 1e12))
    throw Error("Total per pos maksimum Rp1 triliun.");
  return result;
}
export function parseScenario(text: string) {
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES)
    throw Error("File maksimum 1 MB.");
  return validateScenario(JSON.parse(text));
}
export const csvCell = (value: unknown) => {
  const s = String(value);
  return (
    '"' +
    (/^[\s\u0000-\u001f]*[=+@-]/.test(s) ? "'" + s : s).replace(/"/g, '""') +
    '"'
  );
};
export function exportCSV(s: Scenario) {
  return (
    "\ufeff" +
    [
      ["Skenario", s.name],
      ["Dasar", s.basis],
      ["Periode", s.start, s.end],
      ["PM", s.pm, "Hari", s.days, "Tarif", s.rate],
      [
        "Pagu",
        summary(s).budget,
        "Total",
        summary(s).total,
        "Saldo",
        summary(s).balance,
      ],
      [
        "Aktif",
        "Pos",
        "Kategori",
        "Prioritas",
        "Satuan",
        "Qty",
        "Tarif",
        "Frekuensi",
        "Jenis biaya",
        "Di luar pagu",
        "Rencana",
        "Realisasi input lokal",
        "Proyeksi input lokal",
        "Sumber/kelayakan",
        "Catatan",
        "Rujukan lokal",
      ],
      ...s.rows.map((r) => [
        r.active ? "Ya" : "Tidak",
        r.name,
        r.category,
        r.priority,
        r.unit,
        r.qty,
        r.price,
        r.frequency,
        billingKind(r),
        r.outsideCap ? "Ya" : "Tidak",
        planCost(r, s),
        r.actual,
        r.projected,
        r.source,
        r.note,
        r.evidence,
      ]),
      [
        "Disclaimer",
        "Simulasi lokal, bukan kas riil atau persetujuan pembiayaan.",
      ],
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n")
  );
}
