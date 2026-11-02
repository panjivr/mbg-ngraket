import { expect, test } from "@playwright/test";
import {
  blankRow,
  calendarMonths,
  honorTotal,
  planCost,
  preset,
  summary,
  syncHonor,
  validateScenario,
} from "../src/lib/simulator/model";
test("prorata kalender lintas bulan dan tahun kabisat", () => {
  const s = preset(),
    r = { ...blankRow(), billing: "monthly" as const, price: 3100000 };
  s.start = "2026-10-19";
  s.end = "2026-10-30";
  s.days = 10;
  expect(calendarMonths(s.start, s.end)).toEqual([
    { days: 12, daysInMonth: 31 },
  ]);
  expect(planCost(r, s)).toBe(1200000);
  s.start = "2026-10-31";
  s.end = "2026-11-02";
  expect(planCost(r, s)).toBe(Math.round(3100000 * (1 / 31 + 2 / 30)));
  s.start = "2024-02-01";
  s.end = "2024-02-29";
  expect(planCost(r, s)).toBe(3100000);
  s.start = "";
  expect(planCost(r, s)).toBe(0);
});
test("per porsi dan di luar pagu terpisah", () => {
  const s = preset(),
    r = { ...blankRow(), billing: "portion" as const, price: 500 },
    out = { ...blankRow(), id: "sewa", price: 2000000, outsideCap: true };
  s.rows = [r, out];
  expect(planCost(r, s)).toBe(13000000);
  expect(summary(s).total).toBe(13000000);
  expect(summary(s).outside).toBe(2000000);
  expect(summary(s).allTotal).toBe(15000000);
  expect(summary(s).balance).toBe(65000000);
});
test("legacy tetap dibaca, nominal aktual dan bagi rata serta gaji berbeda", () => {
  const old = JSON.parse(JSON.stringify(preset()));
  old.rows.forEach((r: Record<string, unknown>) => {
    delete r.billing;
    delete r.outsideCap;
    delete r.actualProvided;
    delete r.projectedProvided;
  });
  delete old.honor.actual;
  delete old.honor.pooled;
  old.rows[0].daily = true;
  old.rows[0].price = 100000;
  const s = validateScenario(old);
  expect(planCost(s.rows[0], s)).toBe(1000000);
  s.honor.mode = "pooled";
  s.honor.pooled = 61760000;
  s.honor.registered = 40;
  expect(honorTotal(s)).toBe(61760000);
  s.honor.mode = "roles";
  s.honor.roles = [
    { name: "A", assignments: 1, rate: 3000000 },
    { name: "B", assignments: 1, rate: 2000000 },
  ];
  expect(honorTotal(s)).toBe(5000000);
  s.honor.mode = "actual";
  s.honor.actual = 61760000;
  const result = syncHonor(s);
  const row = result.rows.find((r) => r.managedHonor);
  expect(row?.actual).toBe(61760000);
  expect(row?.actualProvided).toBe(true);
  expect(
    result.rows.filter((r) => r.category === "Honor relawan"),
  ).toHaveLength(1);
});
test("antarmuka bulanan, porsi, luar pagu dan penyimpanan skenario", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/simulator-operasional");
  await page.getByLabel("👥 Jumlah penerima").fill("2600");
  await page
    .locator(".easy-main > summary")
    .filter({ hasText: "Isi biaya" })
    .click();
  const gas = page.locator(".easy-row").filter({ hasText: /^Gas/ });
  await gas.locator("summary").click();
  await gas.getByRole("button", { name: "Per bulan" }).click();
  await expect(page.locator(".sim-conclusion")).toContainText(
    "Lengkapi tanggal biaya bulanan",
  );
  await gas.getByLabel("Tanggal awal periode").fill("2026-10-19");
  await gas.getByLabel("Tanggal akhir periode").fill("2026-10-30");
  await gas.getByLabel("Biaya per bulan (Rp)").fill("3100000");
  await expect(gas).toContainText("1.200.000");
  await expect(gas).toContainText("12 hari kalender");
  await page.getByLabel("📅 Berapa hari?").fill("13");
  await expect(page.locator(".sim-conclusion")).toContainText("Periksa jumlah hari pelayanan");
  await page.getByLabel("📅 Berapa hari?").fill("10");
  await gas.getByRole("button", { name: "Per porsi" }).click();
  await gas.getByLabel("Biaya per porsi (Rp)").fill("500");
  await expect(gas).toContainText("13.000.000");
  await gas.getByLabel("Di luar pagu operasional").check();
  await expect(page.locator(".sim-conclusion")).toContainText(
    "Di luar pagu: Rp 13.000.000",
  );
  await page.getByRole("button", { name: "⧉ Duplikat" }).click();
  await expect(page.getByText(/Skenario tersimpan \(1\)/)).toBeVisible();
  await expect(page.getByRole("status").first()).toHaveText(
    "Tersimpan lokal pada browser ini.",
  );
  await page.reload();
  await expect(page.getByText(/Skenario tersimpan \(1\)/)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("honor aktual ditampilkan berbeda, bisa bagi rata dan gaji per relawan", async ({
  page,
}) => {
  await page.goto("/simulator-operasional");
  await page.getByLabel("👥 Jumlah penerima").fill("2600");
  await page
    .locator(".easy-main > summary")
    .filter({ hasText: "Isi biaya" })
    .click();
  await page.getByRole("button", { name: "＋ Tambah biaya" }).click();
  const row = page.locator(".easy-row").last();
  await row.locator("summary").click();
  await row.getByRole("button", { name: "Sekali", exact: true }).click();
  await row.getByLabel("Nama biaya").fill("Honor nyata");
  await row.getByLabel("Kategori biaya").selectOption("Honor relawan");
  await row.getByLabel("Biaya sekali (Rp)").fill("61760000");
  await expect(page.locator(".sim-conclusion")).toContainText(
    "Honor anggaran Rp 61.760.000 berbeda",
  );
  await page
    .locator(".easy-main > summary")
    .filter({ hasText: "Pilihan lain" })
    .click();
  await page.getByText("Simulasi honor relawan", { exact: true }).click();
  await page.getByLabel("Cara menghitung honor").selectOption("pooled");
  await page.getByLabel("Total dana honor (Rp)").fill("61760000");
  await page.getByLabel("Jumlah relawan yang menerima").fill("40");
  await expect(page.getByText("Rata-rata per relawan:")).toContainText(
    "1.544.000",
  );
  await page.getByLabel("Cara menghitung honor").selectOption("roles");
  await page
    .getByRole("button", { name: "＋ Tambah divisi / relawan" })
    .click();
  await page.getByLabel("Jumlah orang atau orang-hari 1").fill("1");
  await page.getByLabel("Honor per unit 1 (Rp)").fill("3000000");
  await page
    .getByRole("button", { name: "＋ Tambah divisi / relawan" })
    .click();
  await page.getByLabel("Jumlah orang atau orang-hari 2").fill("1");
  await page.getByLabel("Honor per unit 2 (Rp)").fill("2000000");
  await expect(page.locator(".sim-honor-total")).toContainText("5.000.000");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Gunakan hasil ini di anggaran" })
    .click();
  await expect(page.locator(".sim-conclusion")).not.toContainText(
    "Honor anggaran Rp 61.760.000",
  );
});
test("arsip gagal disimpan tidak menimpa skenario aktif", async ({ page }) => {
  await page.addInitScript(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === "djati:simulator-operasional:scenarios:v1")
        throw new DOMException("Kuota", "QuotaExceededError");
      return set.call(this, k, v);
    };
  });
  await page.goto("/simulator-operasional");
  await page.getByLabel("👥 Jumlah penerima").fill("2450");
  await page.getByRole("button", { name: "＋ Skenario baru" }).click();
  await expect(page.getByRole("status").first()).toContainText(
    "Gagal menyimpan skenario sebelumnya",
  );
  await expect(page.getByLabel("👥 Jumlah penerima")).toHaveValue("2450");
});
test("realisasi yang belum diisi tidak disebut selesai dan nama skenario tidak mengubah dasar otomatis", async ({
  page,
}) => {
  const s = preset();
  s.name = "Realisasi Oktober";
  s.rows = s.rows.slice(0, 1);
  s.rows[0].actual = 0;
  s.rows[0].actualProvided = false;
  await page.addInitScript(
    (value) => localStorage.setItem("djati:simulator-operasional:v1", value),
    JSON.stringify(s),
  );
  await page.goto("/simulator-operasional");
  await expect(page.locator(".sim-conclusion")).toContainText(
    "hasil memakai rencana",
  );
  await page
    .locator(".easy-main > summary")
    .filter({ hasText: "Pilihan lain" })
    .click();
  await page.getByText("Pengaturan anggaran", { exact: true }).click();
  await page.getByLabel("Dasar ringkasan").selectOption("actual");
  await expect(page.locator(".sim-conclusion")).toContainText(
    "Data belum lengkap",
  );
});
