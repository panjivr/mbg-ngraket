import { expect, test } from "@playwright/test";
import { preset } from "../src/lib/simulator/model";

test("public landing entry, live calculations, sync, persistence and privacy", async ({
  page,
  request,
}) => {
  const errors: string[] = [],
    api: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api/")) api.push(r.url());
  });
  await page.goto("/");
  await page.getByRole("link", { name: "Buka simulator anggaran →" }).click();
  await expect(page).toHaveURL(/\/simulator-operasional$/);
  await expect(
    page.getByRole("heading", { name: /Simulator Anggaran/ }),
  ).toBeVisible();
  const metrics = page.locator(".sim-metrics");
  await expect(metrics).toContainText("78.000.000");
  await expect(metrics).toContainText("29.050.000");
  page.on("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Gunakan contoh honor Rp30.850.000 sekali" })
    .click();
  await expect(metrics).toContainText("59.900.000");
  await expect(metrics).toContainText("18.100.000");
  await page
    .getByRole("button", { name: "Gunakan contoh honor Rp30.850.000 sekali" })
    .click();
  await expect(page.locator(".sim-expense")).toHaveCount(11);
  await page
    .getByLabel("Penerima manfaat / hari", { exact: true })
    .fill("2000");
  await expect(metrics).toContainText("60.000.000");
  await expect(page.getByRole("status")).toHaveText(
    "Tersimpan lokal pada browser ini.",
  );
  await page.reload();
  await expect(
    page.getByLabel("Penerima manfaat / hari", { exact: true }),
  ).toHaveValue("2000");
  expect(api).toEqual([]);
  expect(errors).toEqual([]);
  const response = await request.get("/admin", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toContain("/login");
});

test("edit, duplicate, disable, import confirmation, safe text, JSON and CSV downloads", async ({
  page,
}) => {
  await page.goto("/simulator-operasional");
  await expect(page.getByRole("status")).not.toHaveText(
    "Memuat penyimpanan lokal…",
  );
  const first = page.locator(".sim-expense").first();
  await first.getByText("Edit rincian").click();
  await first.getByLabel("Tarif satuan (Rp)", { exact: true }).fill("1000");
  await expect(first).toContainText("Rp 1.000");
  await first.getByRole("button", { name: "Duplikasi", exact: true }).click();
  await expect(page.locator(".sim-expense")).toHaveCount(11);
  await expect(page.getByLabel("Peringatan anggaran")).toBeVisible();
  await page
    .getByRole("button", { name: "Nonaktifkan semua", exact: true })
    .click();
  await expect(
    page.locator(".sim-metrics").getByText("Rp 0", { exact: true }).first(),
  ).toBeVisible();
  const s = preset();
  s.name = "=SUM(A1)";
  s.rows[0].name = "<img src=x onerror=alert(1)>";
  const file = {
    name: "scenario.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(s)),
  };
  page.once("dialog", (d) => d.dismiss());
  await page.getByLabel("Impor skenario JSON").setInputFiles(file);
  await expect(
    page.getByLabel("Nama skenario", { exact: true }),
  ).not.toHaveValue(s.name);
  page.once("dialog", (d) => d.accept());
  await page.getByLabel("Impor skenario JSON").setInputFiles(file);
  await expect(page.getByLabel("Nama skenario", { exact: true })).toHaveValue(
    s.name,
  );
  await expect(page.locator(".sim-expense img")).toHaveCount(0);
  for (const name of ["Ekspor JSON", "Ekspor CSV"]) {
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name, exact: true }).click();
    expect((await download).suggestedFilename()).toMatch(/\.(json|csv)$/);
  }
  await page
    .getByLabel("Impor skenario JSON")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":2}'),
    });
  await expect(page.locator(".sim-negative[role=alert]")).toContainText("Versi skema");
});

test("mobile, desktop and print include all expenses without page overflow", async ({
  page,
}) => {
  await page.goto("/simulator-operasional");
  await expect(page.getByRole("status")).not.toHaveText(
    "Memuat penyimpanan lokal…",
  );
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/simulator-${width}.png`,
      fullPage: true,
    });
  }
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".sim-print-table")).toBeVisible();
  await expect(page.locator(".sim-print-table tbody tr")).toHaveCount(10);
  await page.pdf({
    path: "artifacts/simulator.pdf",
    format: "A4",
    landscape: true,
    printBackground: true,
  });
});

test("storage denied keeps calculator usable with an explicit warning", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("quota", "QuotaExceededError");
    };
  });
  await page.goto("/simulator-operasional");
  await page
    .getByLabel("Penerima manfaat / hari", { exact: true })
    .fill("1000");
  await expect(page.locator(".sim-metrics")).toContainText("30.000.000");
  await expect(page.getByRole("status")).toContainText("Gagal menyimpan lokal");
});
