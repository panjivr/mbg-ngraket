import { expect, test } from '@playwright/test';
import { preset } from '../src/lib/simulator/model';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const key = 'djati:simulator-operasional:scenarios:v1';
test('impor pilihan, kapasitas arsip, dan ekspor semua menjaga data', async ({page}) => {
  const base = preset();
  const archived = Array.from({length:9},(_,i)=>({...base,name:`Lama ${i+1}`,savedAt:'2026-10-01T00:00:00.000Z'}));
  await page.addInitScript(({key, archived})=>localStorage.setItem(key,JSON.stringify(archived)),{key,archived});
  await page.goto('/simulator-operasional');
  await page.locator('.easy-main > summary').filter({hasText:'Pilihan lain'}).click();
  await page.getByText('Simpan, impor, ekspor atau cetak',{exact:true}).click();
  const entries = [1,2,3].map(i=>({...base,name:`Baru ${i}`}));
  await page.getByLabel('Impor skenario JSON').setInputFiles({name:'bundle.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:1,scenarios:entries}))});
  await expect(page.getByText('Pilih skenario yang akan diimpor')).toBeVisible();
  await expect(page.getByRole('button',{name:'Ganti skenario lama'})).toBeVisible();
  await page.getByRole('button',{name:'Lewati kelebihan'}).click();
  await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'[]').length,key)).toBe(10);
  const result = await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'[]'),key);
  expect(result[0].name).toBe('Lama 1'); expect(result[9].name).toBe('Baru 1');
  const download = page.waitForEvent('download'); await page.getByRole('button',{name:'Ekspor semua skenario'}).click();
  const file = await download; const text = await (await file.createReadStream()).toArray();
  const all = JSON.parse(Buffer.concat(text as Buffer[]).toString()); expect(all.scenarios).toHaveLength(11); expect(all.scenarios[10].name).toBe('Baru 1');
  await page.getByLabel('Impor skenario JSON').setInputFiles({name:'bundle.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:1,scenarios:entries}))});
  await page.getByLabel(/Ganti: Lama 1/).check(); await page.getByLabel(/Ganti: Lama 2/).check(); await page.getByLabel(/Ganti: Lama 3/).check();
  page.once('dialog',dialog=>dialog.accept()); await page.getByRole('button',{name:'Ganti skenario lama'}).click();
  await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'[]')[9]?.name,key)).toBe('Baru 3');
  expect((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'[]'),key))[0].name).toBe('Lama 4');
});

test('tabel terbaca dan laporan contoh berwarna muat dalam dua halaman', async ({page,request}) => {
  await page.setViewportSize({width:768,height:1024}); await page.goto('/simulator-operasional');
  await page.locator('.easy-main > summary').filter({hasText:'Pilihan lain'}).click(); await page.getByText('Simulasi honor relawan',{exact:true}).click();
  await page.getByLabel('Cara menghitung honor').selectOption('roles'); await page.getByRole('button',{name:'Muat contoh tabel'}).click();
  const width = await page.getByLabel('Divisi 1').evaluate(el=>el.getBoundingClientRect().width); expect(width).toBeGreaterThan(150);
  const region = page.getByRole('region',{name:'Tabel honor, geser ke samping'}); expect(await region.evaluate(el=>el.scrollWidth>el.clientWidth)).toBeTruthy();
  await page.emulateMedia({media:'print'}); const dir=mkdtempSync(join(tmpdir(),'sim-report-')); const path=join(dir,'laporan.pdf'); await page.pdf({path,format:'A4',printBackground:true});
  const info=execFileSync('pdfinfo',[path],{encoding:'utf8'}); const pages=Number(info.match(/^Pages:\s+(\d+)/m)?.[1]); expect(pages).toBeLessThanOrEqual(2);
  const text=execFileSync('pdftotext',[path,'-'],{encoding:'utf8'}); expect(text).toContain('Laporan simulasi anggaran'); expect(text).toContain('Koordinator admin'); expect(text).toContain('Rincian biaya');
  const response=await request.get('/simulator-operasional/opengraph-image'); expect(response.status()).toBe(200); expect(response.headers()['content-type']).toContain('image/png');
});
