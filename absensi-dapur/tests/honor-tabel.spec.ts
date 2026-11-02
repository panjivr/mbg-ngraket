import { expect,test } from '@playwright/test';
test('tabel divisi dan opsi pengurangan dihitung tanpa otomatis mengubah anggaran',async({page})=>{
 await page.setViewportSize({width:390,height:850});await page.goto('/simulator-operasional');await page.getByLabel('👥 Jumlah penerima').fill('2600');await page.getByLabel('📅 Hari pelayanan').fill('5');
 await page.locator('.easy-main > summary').filter({hasText:'Pilihan lain'}).click();await page.getByText('Simulasi honor relawan',{exact:true}).click();await page.getByLabel('Cara menghitung honor').selectOption('roles');
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'＋ Tambah divisi / orang'}).click();
 for(const [i,name,people,days,rate] of [[1,'Aslap',1,5,200000],[2,'Admin',4,5,140000],[3,'Pengolahan',9,5,125000]] as const){await page.getByLabel(`Divisi ${i}`).fill(name);await page.getByLabel(`Orang ${i}`,{exact:true}).fill(String(people));await page.getByLabel(`Hari ${i}`).fill(String(days));await page.getByLabel(`Tarif ${i}`).fill(String(rate));}
 await expect(page.locator('.sim-honor-total')).toContainText('9.425.000');await expect(page.locator('.sim-conclusion')).toContainText('Dalam pagu: Rp 0');
 await page.getByLabel('Kurangi orang 3').fill('5');await page.getByLabel('Analisis pengurangan tarif per orang per hari (Rp)').fill('10000');await expect(page.getByText(/Hasil opsi:/)).toContainText('5.850.000');
 await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('djati:simulator-operasional:v1') || '{}').honor?.optionReduction)).toBe(10000); await page.reload(); await page.locator('.easy-main > summary').filter({hasText:'Pilihan lain'}).click(); await page.getByText('Simulasi honor relawan',{exact:true}).click(); await expect(page.getByLabel('Kurangi orang 3')).toHaveValue('5'); await expect(page.getByText(/Hasil opsi:/)).toContainText('5.850.000');
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Gunakan hasil opsi di anggaran'}).click();await expect(page.locator('.sim-conclusion')).toContainText('5.850.000');
});
