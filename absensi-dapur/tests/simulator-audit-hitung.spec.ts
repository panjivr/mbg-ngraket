import { test, expect } from "@playwright/test";
import {
  preset,
  planCost,
  summary,
  syncHonor,
  honorTotal,
} from "../src/lib/simulator/model";
test("pagu, pengeluaran, cadangan, nonaktif dan pembulatan", () => {
  const s = preset();
  let t = summary(s);
  expect([t.budget, t.total, t.balance]).toEqual([
    78000000, 29050000, 48950000,
  ]);
  const r = s.rows[0];
  r.price = 100000;
  r.daily = true;
  s.rows = [r, { ...s.rows[2], price: 300000 }];
  t = summary(s);
  expect([t.total, t.balance, t.reserve, t.gap]).toEqual([
    1300000, 76700000, 3900000, 72800000,
  ]);
  s.days = 1;
  t = summary(s);
  expect([t.budget, t.total, t.balance]).toEqual([7800000, 400000, 7400000]);
  s.days = 10;
  s.rows[1].price = 78000000;
  t = summary(s);
  expect(t.balance).toBe(-1000000);
  expect(t.gap).toBe(-4900000);
  s.rows[1].active = false;
  expect(summary(s).total).toBe(1000000);
  s.days = 0;
  t = summary(s);
  expect(t.usage).toBeNull();
  expect(t.perPM).toBeNull();
  s.days = 3;
  r.price = 0.5;
  r.qty = 1;
  r.frequency = 1;
  s.rounding = "round";
  expect(planCost(r, s)).toBe(1.5);
  expect(summary(s).total).toBe(2);
});
test("honor sinkron tidak menambah dua kali dan tarif per role terpisah", () => {
  const s = preset(),
    one = syncHonor(s, 30850000),
    two = syncHonor(one, 30850000);
  expect(summary(one).total).toBe(59900000);
  expect(summary(two).balance).toBe(18100000);
  s.honor.mode = "roles";
  s.honor.roles = [
    { name: "A", assignments: 20, rate: 100000 },
    { name: "B", assignments: 10, rate: 50000 },
  ];
  expect(honorTotal(s)).toBe(2500000);
});
test("masukan yang ditolak tidak meninggalkan angka keliru di layar", async ({
  page,
}) => {
  const s = preset();
  s.days = 366;
  s.rows[0].qty = 10000;
  s.rows[0].frequency = 366;
  s.rows[0].price = 1;
  s.rows[0].daily = true;
  await page.addInitScript(
    (value) => localStorage.setItem("djati:simulator-operasional:v1", value),
    JSON.stringify(s),
  );
  await page.goto("/simulator-operasional");
  await expect(page.getByRole("status")).toContainText("dimuat");
  await page
    .locator(".easy-main > summary")
    .filter({ hasText: "Isi biaya" })
    .click();
  const gas = page.locator(".easy-row").filter({ hasText: /^Gas/ });
  await gas.locator("summary").click();
  const amount = gas.getByLabel("Harga satuan Per hari (Rp)");
  await amount.fill("1000000");
  await expect(page.getByRole("status").first()).toContainText(
    "Perubahan ditolak",
  );
  await expect(amount).toHaveValue("1");
});
test("simulasi lapangan: 1 hari, 10 hari, defisit dan pos dinonaktifkan", async ({
  page,
}) => {
  await page.goto("/simulator-operasional");
  await page.getByLabel("👥 Jumlah penerima").fill("2600");
  await page
    .locator(".easy-main > summary")
    .filter({ hasText: "Isi biaya" })
    .click();
  const gas = page.locator(".easy-row").filter({ hasText: /^Gas/ });
  const listrik = page.locator(".easy-row").filter({ hasText: /^Listrik/ });
  await gas.locator("summary").click();
  await gas.getByRole("button", { name: "☀ Per hari" }).click();
  await gas.getByLabel("Biaya per hari (Rp)").fill("100000");
  await listrik.locator("summary").click();
  await listrik.getByRole("button", { name: "Sekali", exact: true }).click();
  await listrik.getByLabel("Biaya sekali (Rp)").fill("300000");
  await expect(page.locator(".sim-conclusion")).toContainText("7.400.000");
  await page.getByLabel("📅 Hari pelayanan").fill("10");
  await expect(page.locator(".sim-conclusion")).toContainText("76.700.000");
  await listrik.getByLabel("Biaya sekali (Rp)").fill("78000000");
  await expect(page.locator(".sim-conclusion")).toContainText(
    "Kurangi total biaya minimal Rp 1.000.000",
  );
  await expect(page.locator(".sim-conclusion")).toContainText("Rp 4.900.000");
  await listrik.getByLabel("Hitung biaya ini").uncheck();
  await expect(page.locator(".sim-conclusion")).toContainText("77.000.000");
});
