import { expect, test } from '@playwright/test';
test('ringkasan biaya dan jumlah pengurangan mengikuti input', async ({ page }) => {
  await page.goto('/simulator-operasional');
  await expect(page.locator('.sim-conclusion h2')).toHaveText('Masih dalam pagu');
  await page.getByText('Isi atau ubah daftar biaya').click();
  await page.getByLabel('Harga satuan Gas').fill('90000000');
  await expect(page.locator('.sim-conclusion h2')).toHaveText('Melebihi pagu');
  await expect(page.locator('.sim-conclusion')).toContainText('Kurangi total biaya minimal');
  await expect(page.locator('.sim-conclusion')).toContainText('Gas');
  await page.getByLabel('Jumlah penerima manfaat', { exact: true }).fill('0');
  await expect(page.locator('.sim-conclusion h2')).toHaveText('Pagu belum tersedia');
});
