import { expect, test } from '@playwright/test';
test('biaya harian dikalikan hari dan biaya periode tetap',async({page})=>{
 await page.goto('/simulator-operasional');await page.getByLabel('👥 Jumlah penerima').fill('2600');
 await expect(page.getByLabel('📅 Hari pelayanan')).toHaveValue('1');
 await page.locator('.easy-main > summary').filter({hasText:'Isi biaya'}).click();
 const gas=page.locator('.easy-row').filter({hasText:/^Gas/});
 await gas.locator('summary').click();await gas.getByRole('button',{name:'☀ Per hari'}).click();
 await gas.getByLabel('Biaya per hari (Rp)').fill('100000');
 const listrik=page.locator('.easy-row').filter({hasText:/^Listrik/});
 await listrik.locator('summary').click();await listrik.getByRole('button',{name:'Sekali',exact:true}).click();await listrik.getByLabel('Biaya sekali (Rp)').fill('300000');
 await expect(page.locator('.sim-conclusion')).toContainText('7.400.000');
 await page.getByLabel('📅 Hari pelayanan').fill('10');
 await expect(page.locator('.sim-conclusion')).toContainText('76.700.000');
 await expect(page.getByRole('status')).toHaveText('Tersimpan lokal pada browser ini.');
 await page.reload();await expect(page.getByLabel('📅 Hari pelayanan')).toHaveValue('10');
 await page.locator('.easy-main > summary').filter({hasText:'Isi biaya'}).click();await gas.locator('summary').click();
 await expect(gas.getByRole('button',{name:'☀ Per hari'})).toHaveAttribute('aria-pressed','true');
});
