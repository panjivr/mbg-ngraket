import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', '3020', '--hostname', '127.0.0.1'], { stdio: 'ignore' });
let browser;
const base = 'http://127.0.0.1:3020';
const errors = [];
const paths = ['/', '/fitur', '/solusi/absensi-sppg', '/solusi/rekap-gaji', '/solusi/distribusi', '/panduan', '/panduan/memilih-aplikasi-sppg', '/panduan/rekap-absensi-shift-malam', '/tentang'];
try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(base)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert(ready, 'Production server did not start');
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const output = '/tmp/djati-visual'; fs.mkdirSync(output, { recursive: true });
  for (const width of [320, 375, 430, 768, 1024, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of paths) {
      await page.goto(base + path, { waitUntil: 'networkidle' });
      assert.equal(await page.locator('h1').count(), 1, `${width} ${path}: H1`);
      const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert(dimensions.scrollWidth <= dimensions.width + 1, `${width} ${path}: horizontal overflow ${JSON.stringify(dimensions)}`);
      const logo = page.locator('.mk-header img');
      assert(await logo.isVisible(), `${width} ${path}: logo visibility`);
      assert(await logo.evaluate(img => img.complete && img.naturalWidth > 0), `${width} ${path}: logo loaded`);
      assert.equal(await page.getByRole('button', { name: /Musik latar/ }).count(), 0, `${width} ${path}: public music control`);
      const size = await page.locator('.mk-header-actions [data-cta="request-demo"]').evaluate(a => ({ width: a.getBoundingClientRect().width, height: a.getBoundingClientRect().height }));
      assert(size.width >= 44 && size.height >= 44, `${width} ${path}: CTA touch size`);
      if ((path === '/' && [320, 768, 1280].includes(width)) || (path === '/fitur' && width === 768)) {
        await page.screenshot({ path: `${output}/${path === '/' ? 'home' : 'features'}-${width}.png`, fullPage: true });
      }
    }
    console.log(`PASS ${width}px: 9 public pages, no overflow, logo, H1, touch target`);
  }
  await page.goto(base + '/fitur');
  assert.equal(await page.getByRole('link', { name: 'Fitur', exact: true }).first().getAttribute('aria-current'), 'page');
  await page.getByRole('link', { name: 'Absensi dan jadwal', exact: true }).click();
  assert(page.url().endsWith('#modul-1'), 'Module navigation anchor');
  await page.goto(base + '/?utm_source=visual_test&utm_medium=qa&utm_campaign=demo');
  await page.getByRole('link', { name: 'Jelajahi fitur', exact: true }).click();
  await page.waitForURL(base + '/fitur');
  const requestDemo = page.locator('[data-placement="features-bottom"]');
  // Prevent opening an external tab while exercising the real CTA handler.
  await page.evaluate(() => document.addEventListener('click', event => event.preventDefault()));
  await requestDemo.click();
  const url = await requestDemo.getAttribute('href');
  assert(url.includes('wa.me/6285157503744'));
  assert(new URL(url).searchParams.get('text').includes('utm_source=visual_test'), 'UTM survives internal navigation');
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log('PASS active navigation, module anchor, session attribution, no browser runtime errors');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
