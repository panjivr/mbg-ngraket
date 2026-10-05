import { expect, test } from '@playwright/test';

const widths = [320, 375, 390, 768, 1024, 1440, 1920];
for (const width of widths) {
  for (const theme of ['dark', 'light']) {
    for (const path of ['/', '/login']) {
      test(`${path} ${theme} ${width}px fits the viewport`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript(t => localStorage.setItem('mbg-theme', t), theme);
        await page.goto(path);
        await expect(page.locator('h1')).toBeVisible();
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(width);
        if (path === '/login' && width < 768) {
          expect(await page.locator('#username').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
        }
        await expect(page.locator('meta[name="viewport"]')).not.toHaveAttribute('content', /maximum-scale=1/);
      });
    }
  }
}

test('login exposes password state and actionable failure', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Nama pengguna', { exact: true }).fill('uji');
  await page.locator('#password').fill('contoh');
  const toggle = page.getByRole('button', { name: 'Tampilkan kata sandi' });
  await toggle.click();
  await expect(page.locator('#password')).toHaveAttribute('type', 'text');
  await expect(page.getByRole('button', { name: 'Sembunyikan kata sandi' })).toHaveAttribute('aria-pressed', 'true');
  await page.route('**/api/auth/login', route => route.fulfill({
    status: 401, contentType: 'application/json',
    body: JSON.stringify({ error: 'Nama pengguna atau kata sandi salah.' }),
  }));
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Nama pengguna atau kata sandi salah.');
  await expect(page.getByRole('button', { name: 'Masuk', exact: true })).toBeEnabled();
});

// Supply a read-only staging account's storage state for protected pages.
// These tests never submit attendance, payroll, or other production mutations.
test.describe('authenticated navigation', () => {
  test.skip(!process.env.UI_STORAGE_STATE, 'Requires UI_STORAGE_STATE from a staging account.');
  test.use({ storageState: process.env.UI_STORAGE_STATE });
  for (const width of widths) {
    test(`admin dropdown remains visible at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/admin');
      await expect(page.locator('#konten-utama')).toBeVisible();
      const nav = page.getByRole('navigation', { name: 'Navigasi administrasi' });
      for (const trigger of await nav.locator('button[aria-controls]').all()) {
        await trigger.click();
        const panel = page.locator(`#${await trigger.getAttribute('aria-controls')}`);
        const box = await panel.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
        await page.keyboard.press('Escape');
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      }
    });
  }
  test('staff menu closes with Escape and releases scroll lock', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dapur');
    await page.getByRole('button', { name: 'Menu lainnya' }).click();
    await expect(page.getByRole('dialog', { name: 'Menu lainnya' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Menu lainnya' })).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  });
});
