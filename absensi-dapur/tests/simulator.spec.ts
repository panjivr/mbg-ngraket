import { expect, test } from "@playwright/test";
import { preset } from "../src/lib/simulator/model";
const openOptions = async (page: import("@playwright/test").Page) => {
  await page
    .locator(".easy-main > summary")
    .filter({ hasText: "Pilihan lain" })
    .click();
};
test("akses publik, honor sekali, penyimpanan dan proteksi admin", async ({
  page,
  request,
}) => {
  const s = preset();
  await page.addInitScript((value) => {
    if (!sessionStorage.getItem("seeded-test")) {
      localStorage.setItem("djati:simulator-operasional:v1", value);
      sessionStorage.setItem("seeded-test", "yes");
    }
  }, JSON.stringify(s));
  const errors: string[] = [],
    api: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api/")) api.push(r.url());
  });
  await page.goto("/");
  await page.getByRole("link", { name: "Buka simulator anggaran →" }).click();
  await expect(page).toHaveURL(/\/simulator-operasional$/);
  await expect(page.locator(".sim-conclusion")).toContainText("48.950.000");
  await openOptions(page);
  await page.getByText("Simulasi honor relawan", { exact: true }).click();
  await page.getByLabel("Cara menghitung honor").selectOption("actual");
  await page
    .getByLabel("Total honor yang ingin dimasukkan (Rp)")
    .fill("30850000");
  page.on("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Gunakan hasil ini di anggaran" })
    .click();
  await expect(page.locator(".sim-conclusion")).toContainText("18.100.000");
  await page
    .getByRole("button", { name: "Gunakan hasil ini di anggaran" })
    .click();
  await expect(page.locator(".sim-conclusion")).toContainText("18.100.000");
  await page.getByLabel("👥 Jumlah penerima").fill("2000");
  await expect(page.getByRole("status").first()).toHaveText(
    "Tersimpan lokal pada browser ini.",
  );
  await page.reload();
  await expect(page.getByLabel("👥 Jumlah penerima")).toHaveValue("2000");
  expect(api).toEqual([]);
  expect(errors).toEqual([]);
  const response = await request.get("/admin", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toContain("/login");
});
test("impor konfirmasi, teks aman, dan ekspor JSON/CSV", async ({ page }) => {
  await page.goto("/simulator-operasional");
  await openOptions(page);
  await page
    .getByText("Simpan, impor, ekspor atau cetak", { exact: true })
    .click();
  const s = preset();
  s.name = "=SUM(A1)";
  s.rows[0].name = "<img src=x onerror=alert(1)>";
  const file = {
    name: "scenario.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(s)),
  };
  let dialogs = 0;
  page.on("dialog", async (d) => {
    dialogs++;
    await d.dismiss();
  });
  await page.getByLabel("Impor skenario JSON").setInputFiles(file);
  await expect.poll(() => dialogs).toBe(2);
  page.removeAllListeners("dialog");
  await expect(page.getByLabel("👥 Jumlah penerima")).toHaveValue("");
  page.on("dialog", async (d) => {
    if (d.message().startsWith("Biaya berikut")) await d.dismiss();
    else await d.accept();
  });
  await page.getByLabel("Impor skenario JSON").setInputFiles(file);
  await expect(page.getByLabel("👥 Jumlah penerima")).toHaveValue("2600");
  page.removeAllListeners("dialog");
  await expect(page.locator(".simulator img")).toHaveCount(0);
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
      buffer: Buffer.from('{"version":99}'),
    });
  await expect(page.locator(".sim-negative[role=alert]")).toContainText(
    "Versi skema",
  );
});
test("ponsel, desktop dan cetak menampilkan semua biaya", async ({ page }) => {
  await page.goto("/simulator-operasional");
  await expect(page.getByRole("status").first()).not.toHaveText(
    "Memuat penyimpanan lokal…",
  );
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".easy-print")).toBeVisible();
  await expect(page.locator(".easy-print tbody tr")).toHaveCount(11);
});
test("penyimpanan ditolak tetap bisa menghitung dan memberi peringatan", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("quota", "QuotaExceededError");
    };
  });
  await page.goto("/simulator-operasional");
  await page.getByLabel("👥 Jumlah penerima").fill("1000");
  await expect(page.locator(".easy-parameters")).toContainText("3.000.000");
  await expect(page.getByRole("status").first()).toContainText(
    "Gagal menyimpan lokal",
  );
});
