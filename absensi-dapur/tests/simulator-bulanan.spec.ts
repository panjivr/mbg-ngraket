import { expect, test } from "@playwright/test";
import {
  blankRow,
  exportCSV,
  calendarMonths,
  monthlyAllocationIncomplete,
  monthlyParts,
  parseScenario,
  planCost,
  roundTotal,
  preset,
  summary,
  validateScenario,
  warnings,
} from "../src/lib/simulator/model";
test("bulanan: 30 hari, kalender, lintas bulan, dan tanggal kosong", () => {
  const s = preset(),
    r = {
      ...blankRow(),
      billing: "monthly" as const,
      price: 300000,
      monthlyDivisor: "fixed30" as const,
      monthlyBasis: "calendar" as const,
    };
  s.start = "2026-10-19";
  s.end = "2026-10-30";
  s.days = 10;
  expect(planCost(r, s)).toBe(120000);
  r.price = 369075;
  expect(planCost(r, s)).toBe(147630);
  r.monthlyBasis = "service" as typeof r.monthlyBasis;
  expect(planCost(r, s)).toBe(123025);
  r.monthlyBasis = "calendar";
  r.price = 300000;
  s.start = "2026-10-28";
  s.end = "2026-11-03";
  expect(monthlyParts(r, s).map((x) => x.days)).toEqual([4, 3]);
  expect(planCost(r, s)).toBe(70000);
  r.monthlyDivisor = "calendar" as typeof r.monthlyDivisor;
  expect(planCost(r, s)).toBeCloseTo(300000 * (4 / 31 + 3 / 30));
  s.start = "";
  s.end = "";
  s.days = 12;
  expect(planCost(r, s)).toBe(120000);
  expect(monthlyParts(r, s)[0].fallback).toBe(true);
});
test("hari pelayanan lintas bulan harus dibagi eksplisit", () => {
  const s = preset(),
    r = {
      ...blankRow(),
      billing: "monthly" as const,
      price: 300000,
      monthlyBasis: "service" as const,
    };
  s.start = "2026-10-28";
  s.end = "2026-11-03";
  s.days = 5;
  expect(monthlyAllocationIncomplete(r, s)).toBe(true);
  s.serviceByMonth = { "2026-10": 3, "2026-11": 2 };
  expect(monthlyAllocationIncomplete(r, s)).toBe(false);
  expect(planCost(r, s)).toBeCloseTo(50000);
  s.rows = [r];
  s.rounding = "ceil";
  expect(summary(s).total).toBe(50000);
  s.serviceByMonth["2026-10"] = 5;
  expect(monthlyAllocationIncomplete(r, s)).toBe(true);
});
test("pembulatan total, fallback realisasi, dan migrasi v1", () => {
  const s = preset(),
    a = { ...blankRow(), id: "a", billing: "monthly" as const, price: 1 },
    b = { ...a, id: "b" };
  s.rows = [a, b];
  s.start = "";
  s.end = "";
  s.days = 10;
  expect(summary(s).total).toBe(1);
  expect(roundTotal(50000.00000000001, "ceil")).toBe(50000);
  expect(roundTotal(100000000000000.5, "floor")).toBe(100000000000000);
  s.basis = "actual";
  expect(summary(s).total).toBe(1);
  a.actualProvided = true;
  a.actual = 0;
  expect(summary(s).total).toBe(0);
  const old = JSON.parse(JSON.stringify(preset()));
  old.version = 1;
  delete old.serviceByMonth;
  old.rows.forEach((r: Record<string, unknown>) => {
    delete r.monthlyBasis;
    delete r.monthlyDivisor;
  });
  old.rows[0].billing = "monthly";
  old.start = "2026-10-19";
  old.end = "2026-10-30";
  old.rows[0].price = 3100000;
  const migrated = validateScenario(old);
  expect(migrated.version).toBe(2);
  expect(migrated.rows[0].monthlyDivisor).toBe("calendar");
  expect(planCost(migrated.rows[0], migrated)).toBe(1200000);
});
test("isi bulanan tanpa tanggal dan pembagian hari pelayanan di ponsel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/simulator-operasional");
  await page.getByLabel("👥 Jumlah penerima").fill("2600");
  await page.getByLabel("📅 Hari pelayanan").fill("12");
  await page
    .locator(".easy-main > summary")
    .filter({ hasText: "Isi biaya" })
    .click();
  const internet = page.locator(".easy-row").filter({ hasText: /^Internet/ });
  await internet.locator("summary").click();
  await expect(
    internet.getByRole("button", { name: "Per bulan" }),
  ).toHaveAttribute("aria-pressed", "true");
  await internet.getByLabel("Biaya per bulan (Rp)").fill("300000");
  await expect(internet).toContainText("120.000");
  await expect(page.locator(".sim-conclusion")).toContainText(
    "Tanggal belum lengkap",
  );
  await page.emulateMedia({ media: "print" });
  const printed = page
    .locator(".easy-print tbody tr")
    .filter({ hasText: "Internet" });
  await expect(printed).toContainText("tanpa tanggal: 12/30 (perkiraan)");
  await expect(printed).toContainText("Belum diisi");
  await page.emulateMedia({ media: "screen" });
  await internet.getByLabel("Tanggal awal periode").fill("2026-10-28");
  await internet.getByLabel("Tanggal akhir periode").fill("2026-11-03");
  await page.getByLabel("📅 Hari pelayanan").fill("5");
  await internet.getByLabel("Dasar jumlah hari").selectOption("service");
  await expect(page.locator(".sim-conclusion")).toContainText(
    "Lengkapi hari pelayanan per bulan",
  );
  await internet.getByLabel("Hari pelayanan 2026-10").fill("3");
  await internet.getByLabel("Hari pelayanan 2026-11").fill("2");
  await expect(internet).toContainText("50.000");
  await expect(page.locator(".sim-conclusion")).not.toContainText(
    "Lengkapi hari pelayanan per bulan",
  );
  await internet.getByLabel("Tanggal akhir periode").fill("2026-11-04");
  await expect(page.locator(".sim-conclusion")).toContainText(
    "Lengkapi hari pelayanan per bulan",
  );
  await expect(internet.getByLabel("Hari pelayanan 2026-10")).toHaveValue("");
});
test("skenario baru mempertahankan jenis, reset bersih, dan tabel ponsel bisa digeser", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/simulator-operasional");
  await page.getByLabel("👥 Jumlah penerima").fill("1000");
  await page
    .locator(".easy-main > summary")
    .filter({ hasText: "Isi biaya" })
    .click();
  const gas = page.locator(".easy-row").filter({ hasText: /^Gas/ });
  await gas.locator("summary").click();
  await gas.getByRole("button", { name: "Per porsi" }).click();
  await gas.getByLabel("Biaya per porsi (Rp)").fill("500");
  await page.getByRole("button", { name: "＋ Skenario baru" }).click();
  await expect(gas).toContainText("Per porsi");
  await gas.locator("summary").click();
  await expect(gas.getByLabel("Biaya per porsi (Rp)")).toHaveValue("");
  await page
    .locator(".easy-main > summary")
    .filter({ hasText: "Pilihan lain" })
    .click();
  await page.getByText("Bandingkan skenario", { exact: true }).click();
  const table = page.getByRole("region", { name: "Perbandingan skenario" });
  await expect(table).toBeVisible();
  expect(await table.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
    true,
  );
  await table.evaluate((el) => {
    el.scrollLeft = 100;
  });
  expect(await table.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  await page
    .getByText("Simpan, impor, ekspor atau cetak", { exact: true })
    .click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Reset skenario" }).click();
  await expect(page.getByLabel("👥 Jumlah penerima")).toHaveValue("");
  await expect(page.locator(".simulator")).not.toContainText(
    "Ard — perlu konfirmasi",
  );
});
test("impor lama menawarkan konversi internet dan menjaga nominal", async ({
  page,
}) => {
  const old = JSON.parse(JSON.stringify(preset()));
  old.version = 1;
  old.rows.forEach((r: Record<string, unknown>) => {
    delete r.monthlyDivisor;
    delete r.monthlyBasis;
  });
  delete old.serviceByMonth;
  await page.goto("/simulator-operasional");
  await page
    .locator(".easy-main > summary")
    .filter({ hasText: "Pilihan lain" })
    .click();
  await page
    .getByText("Simpan, impor, ekspor atau cetak", { exact: true })
    .click();
  const prompts: string[] = [];
  page.on("dialog", async (d) => {
    prompts.push(d.message());
    await d.accept();
  });
  await page.getByLabel("Impor skenario JSON").setInputFiles({
    name: "lama.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(old)),
  });
  await expect.poll(() => prompts.length).toBe(2);
  await expect(page.getByLabel("👥 Jumlah penerima")).toHaveValue("2600");
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem("djati:simulator-operasional:v1") || "{}",
          ).rows?.find((r: { name: string }) => r.name === "Internet")?.billing,
      ),
    )
    .toBe("monthly");
});

test("CSV mempertahankan rincian prorata dan realisasi kosong", () => {
  const s = preset(),
    r = {
      ...blankRow(),
      name: "Internet",
      billing: "monthly" as const,
      price: 300000,
    };
  s.rows = [r];
  s.days = 12;
  s.start = "";
  s.end = "";
  const csv = exportCSV(s);
  expect(csv).toContain(
    '"fixed30","calendar","tanpa tanggal: 12/30 (perkiraan)"',
  );
  expect(csv).toContain('"120000","",""');
});
test("impor format HTML lama menjaga angka tanpa menebak biaya bulanan", () => {
  const legacy = {
    version: 1,
    params: { pm: 2600, days: 10, rate: 3000, reserve: 5 },
    rows: [
      {
        id: 1,
        name: "Internet",
        category: "Utilitas",
        qty: 1,
        price: 369075,
        freq: 1,
        enabled: true,
      },
      {
        id: 2,
        name: "Honor relawan",
        category: "Honor & Insentif",
        qty: 1,
        price: 30850000,
        freq: 1,
        enabled: true,
      },
    ],
  };
  const s = parseScenario(JSON.stringify(legacy));
  expect(s.version).toBe(2);
  expect(s.pm).toBe(2600);
  expect(s.rows[0].billing).toBe("once");
  expect(s.rows[0].price).toBe(369075);
  expect(s.rows[1].category).toBe("Honor relawan");
  expect(summary(s).total).toBe(31219075);
});
test("format HTML lama dapat diimpor dan Internet diubah bulanan hanya dengan persetujuan", async ({
  page,
}) => {
  const legacy = {
    version: 1,
    params: { pm: 2600, days: 10, rate: 3000, reserve: 5 },
    rows: [
      {
        id: 1,
        name: "Internet",
        category: "Utilitas",
        qty: 1,
        price: 369075,
        freq: 1,
        enabled: true,
      },
    ],
  };
  await page.goto("/simulator-operasional");
  await page
    .locator(".easy-main > summary")
    .filter({ hasText: "Pilihan lain" })
    .click();
  await page
    .getByText("Simpan, impor, ekspor atau cetak", { exact: true })
    .click();
  const prompts: string[] = [];
  page.on("dialog", async (d) => {
    prompts.push(d.message());
    await d.accept();
  });
  await page.getByLabel("Impor skenario JSON").setInputFiles({
    name: "legacy.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(legacy)),
  });
  await expect.poll(() => prompts.length).toBe(2);
  await page
    .locator(".easy-main > summary")
    .filter({ hasText: "Isi biaya" })
    .click();
  const internet = page.locator(".easy-row").filter({ hasText: /^Internet/ });
  await expect(internet).toContainText("123.025");
  await internet.locator("summary").click();
  await expect(
    internet.getByRole("button", { name: "Per bulan" }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("realisasi kosong tidak mengabaikan alokasi bulanan yang belum lengkap", async ({
  page,
}) => {
  const s = preset();
  s.basis = "actual";
  s.start = "2026-10-28";
  s.end = "2026-11-03";
  s.days = 5;
  s.rows = [
    {
      ...blankRow(),
      name: "Internet",
      billing: "monthly",
      monthlyBasis: "service",
      monthlyDivisor: "fixed30",
      price: 300000,
    },
  ];
  await page.addInitScript(
    (value) => localStorage.setItem("djati:simulator-operasional:v1", value),
    JSON.stringify(s),
  );
  await page.goto("/simulator-operasional");
  await expect(page.locator(".sim-conclusion")).toContainText(
    "Lengkapi hari pelayanan per bulan",
  );
});

test("realisasi terisi tidak bergantung pada tanggal rencana", () => {
  const s = preset(),
    r = {
      ...blankRow(),
      billing: "monthly" as const,
      price: 300000,
      actual: 100000,
      actualProvided: true,
    };
  s.rows = [r];
  s.start = "";
  s.end = "";
  s.days = 12;
  s.basis = "actual";
  expect(summary(s).total).toBe(100000);
  expect(warnings(s).join(" ")).not.toContain("Tanggal belum lengkap");
  r.actualProvided = false;
  expect(summary(s).total).toBe(120000);
  expect(warnings(s).join(" ")).toContain("Tanggal belum lengkap");
});
