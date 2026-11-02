import { expect, test } from '@playwright/test';
test('biaya harian dikalikan hari dan biaya periode tetap',async({page})=>{
 await page.goto('/simulator-operasional');
 await expect(page.getByLabel('Jumlah hari pelayanan',{exact:true})).toHaveValue('1');
 await page.getByText('Isi atau ubah daftar biaya').click();
 await page.getByLabel('Jenis biaya Gas',{exact:true}).selectOption('daily');
 await page.getByLabel('Harga satuan Gas',{exact:true}).fill('100000');
 await page.getByLabel('Harga satuan Listrik',{exact:true}).fill('300000');
 await expect(page.getByText(/Biaya harian Rp/)).toContainText('400.000');
 await page.getByLabel('Jumlah hari pelayanan',{exact:true}).fill('10');
 await expect(page.getByText(/Biaya harian Rp/)).toContainText('1.300.000');
 await expect(page.getByText(/Biaya harian Rp/)).toContainText('300.000');
 await expect(page.getByRole('status')).toHaveText('Tersimpan lokal pada browser ini.');
 await page.reload();await expect(page.getByLabel('Jumlah hari pelayanan',{exact:true})).toHaveValue('10');
 await page.getByText('Isi atau ubah daftar biaya').click();await expect(page.getByLabel('Jenis biaya Gas',{exact:true})).toHaveValue('daily');
});
