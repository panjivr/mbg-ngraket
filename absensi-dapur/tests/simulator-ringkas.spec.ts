import { expect, test } from '@playwright/test';
test('ringkasan biaya dan jumlah pengurangan mengikuti input', async ({ page }) => {
  await page.goto('/simulator-operasional');
  await expect(page.locator('.sim-conclusion h2')).toHaveText('Isi biaya dulu');
  await page.locator('.easy-main > summary').filter({hasText:'Isi biaya'}).click();
  const gas=page.locator('.easy-row').filter({hasText:/^Gas/});
  await gas.locator('summary').click();await gas.getByLabel('Biaya sekali / periode (Rp)').fill('90000000');
  await expect(page.locator('.sim-conclusion h2')).toHaveText('Melebihi pagu');
  await expect(page.locator('.sim-conclusion')).toContainText('Kurangi total biaya minimal');
  await expect(page.locator('.sim-conclusion')).toContainText('Gas');
  await page.getByLabel('👥 Jumlah penerima').fill('0');
  await expect(page.locator('.sim-conclusion h2')).toHaveText('Pagu belum tersedia');
});
