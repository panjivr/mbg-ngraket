import { expect, test } from "@playwright/test";
import {
  csvCell,
  exportCSV,
  honorTotal,
  parseScenario,
  planCost,
  preset,
  summary,
  syncHonor,
  validateScenario,
  warnings,
} from "../src/lib/simulator/model";
test("contoh pagu, rekonsiliasi dan honor hanya dihitung sekali", () => {
  const s = preset();
  expect(summary(s).budget).toBe(78000000);
  expect(summary(s).total).toBe(29050000);
  expect(warnings(s).join(" ")).toContain("Rp18.100.000");
  const synced = syncHonor(s, 30850000);
  expect(summary(synced).total).toBe(59900000);
  expect(summary(synced).balance).toBe(18100000);
  expect(summary(syncHonor(synced, 30850000)).total).toBe(59900000);
  expect(
    synced.rows.filter((r) => r.category === "Honor relawan"),
  ).toHaveLength(1);
});
test("sumber honor lain diganti dan realisasi tetap terpisah", () => {
  const s = syncHonor(preset(), 30850000);
  s.rows.push({ ...s.rows.at(-1)!, id: "other", managedHonor: false });
  const synced = syncHonor(s, 1000000);
  expect(summary(synced).honor).toBe(1000000);
  synced.basis = "actual";
  synced.rows.forEach(r=>{r.actualProvided=true; r.actual=0});
  expect(summary(synced).total).toBe(0);
  synced.rows[0].actual = 500;
  expect(summary(synced).total).toBe(500);
  synced.basis = "projected";
  synced.rows.forEach(r=>{r.projectedProvided=true; r.projected=0});
  expect(summary(synced).total).toBe(0);
});
test("perubahan parameter, pengali hari, pembulatan, nonaktif, nol dan defisit", () => {
  const s = preset();
  s.rows = s.rows.slice(0, 1);
  s.rows[0].price = 10.4;
  s.rows[0].qty = 2;
  s.rows[0].daily = true;
  expect(planCost(s.rows[0], s)).toBe(208);
  s.rounding = "ceil";
  s.rows[0].price = 10.41;
  expect(planCost(s.rows[0], s)).toBeCloseTo(208.2);
  expect(summary(s).total).toBe(209);
  s.rows[0].active = false;
  expect(summary(s).total).toBe(0);
  s.rows[0].active = true;
  s.pm = 0;
  expect(summary(s).usage).toBeNull();
  expect(summary(s).perPM).toBeNull();
  expect(summary(s).balance).toBeLessThan(0);
});
test("honor seragam, role dan pengurangan tidak menghasilkan tarif negatif", () => {
  const s = preset();
  expect(honorTotal(s)).toBe(33000000);
  expect(honorTotal(s, 49, 5000)).toBe(46550000);
  s.honor.mode = "roles";
  s.honor.roles = [
    { name: "A", assignments: 20, rate: 100000 },
    { name: "B", assignments: 10, rate: 50000 },
  ];
  expect(honorTotal(s)).toBe(2500000);
  expect(honorTotal(s, 33, 200000)).toBe(0);
});
test("impor tervalidasi, batas ukuran, finite, tipe, duplikat dan versi", () => {
  const s = preset();
  expect(parseScenario(JSON.stringify(s))).toEqual(s);
  for (const value of [-1, NaN, Infinity, "2600", null])
    expect(() => validateScenario({ ...s, pm: value })).toThrow();
  expect(() => validateScenario({ ...s, pm: 1.5 })).toThrow();
  expect(() => validateScenario({ ...s, version: 3 })).toThrow();
  expect(() =>
    validateScenario({ ...s, rows: [s.rows[0], s.rows[0]] }),
  ).toThrow();
  expect(() =>
    validateScenario({ ...s, rows: Array(501).fill(s.rows[0]) }),
  ).toThrow();
  expect(() => parseScenario(" ".repeat(1024 * 1024 + 1))).toThrow();
  expect(() =>
    validateScenario({ ...s, start: "2026-11-10", end: "2026-11-01" }),
  ).toThrow();
  expect(() =>
    validateScenario({
      ...s,
      rows: [
        { ...s.rows[0], qty: 10000, price: 1e9, frequency: 366, daily: true },
      ],
    }),
  ).toThrow();
});
test("CSV neutralise formula injection, escaped quotes, unicode et JSON text remains inert", () => {
  for (const v of ["=SUM(A1)", " +cmd", "\t@cmd", "-cmd"])
    expect(csvCell(v)).toMatch(/^"'/);
  expect(csvCell('a"b')).toBe('"a""b"');
  const s = preset();
  s.rows[0].name = "<img src=x onerror=alert(1)>";
  expect(parseScenario(JSON.stringify(s)).rows[0].name).toBe(s.rows[0].name);
  expect(exportCSV(s)).toContain("29050000");
});
