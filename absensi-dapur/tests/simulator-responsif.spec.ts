import { expect, test } from '@playwright/test';
for (const width of [320, 360, 390, 768, 1024, 1440]) {
 test(`simulator dapat dipakai pada lebar ${width}px`, async ({page}) => {
  await page.setViewportSize({width,height:850});
  await page.goto('/simulator-operasional');await page.getByLabel('👥 Jumlah penerima').fill('2600');
  await expect(page.getByLabel('📅 Berapa hari?')).toBeVisible();
  await page.getByLabel('📅 Berapa hari?').fill('10');
  await page.locator('.easy-main > summary').filter({hasText:'Isi biaya'}).click();
  const gas=page.locator('.easy-row').filter({hasText:/^Gas/});
  await gas.locator('summary').click();
  await gas.getByRole('button',{name:'☀ Per hari'}).click();
  await gas.getByLabel('Biaya per hari (Rp)').fill('100000');
  await expect(page.locator('.sim-conclusion')).toContainText('77.000.000');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), 'halaman tidak boleh meluap ke samping').toBe(true);
  const rect=await gas.getByRole('button',{name:'☀ Per hari'}).boundingBox();
  expect(rect?.height).toBeGreaterThanOrEqual(44);
 });
}
test('teks panjang dan perbesaran tidak melebar keluar halaman',async({page})=>{
 await page.setViewportSize({width:320,height:800});await page.goto('/simulator-operasional');await page.getByLabel('👥 Jumlah penerima').fill('2600');
 await page.locator('.easy-main > summary').filter({hasText:'Isi biaya'}).click();
 const gas=page.locator('.easy-row').filter({hasText:/^Gas/});await gas.locator('summary').click();
 await gas.getByLabel('Nama biaya').fill('NamaBiaya'.repeat(15));
 await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('kolom nol kosong, bisa diisi dan dikosongkan tanpa mengubah perhitungan',async({page})=>{
 await page.setViewportSize({width:390,height:800});await page.goto('/simulator-operasional');await page.getByLabel('👥 Jumlah penerima').fill('2600');
 await page.locator('.easy-main > summary').filter({hasText:'Isi biaya'}).click();
 const gas=page.locator('.easy-row').filter({hasText:/^Gas/});await gas.locator('summary').click();
 const input=gas.getByLabel('Biaya sekali (Rp)');
 await expect(input).toHaveValue('');await expect(input).toHaveAttribute('placeholder','Isi angka');
 await input.fill('125000');await expect(page.locator('.sim-conclusion')).toContainText('7.675.000');
 await input.clear();await expect(input).toHaveValue('');await expect(page.locator('.sim-conclusion')).toContainText('Isi biaya dulu');
 await input.fill('0.5');await expect(input).toHaveValue('0.5');
});
