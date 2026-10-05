import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const site = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://djati.web.id');
assert.equal(site.protocol, 'https:', 'Use the production HTTPS domain');
assert.notEqual(process.env.VERCEL_ENV, 'preview', 'Do not submit preview deployments');
const key = (await readFile(new URL('../public/indexnow-key.txt', import.meta.url), 'utf8')).trim();
assert.match(key, /^[a-f0-9]{32}$/);
const keyLocation = new URL('/indexnow-key.txt', site).href;
const keyResponse = await fetch(keyLocation, { signal: AbortSignal.timeout(20000) });
assert.equal(keyResponse.status, 200, 'Ownership file is not live yet');
assert.equal((await keyResponse.text()).trim(), key, 'Production ownership file does not match');
const sitemapResponse = await fetch(new URL('/sitemap.xml', site), { signal: AbortSignal.timeout(20000) });
assert.equal(sitemapResponse.status, 200, 'Sitemap unavailable');
const xml = await sitemapResponse.text();
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url);
assert(urlList.length > 0 && urlList.length <= 10000, 'Invalid URL count');
for (const url of urlList) {
  const target = new URL(url);
  assert.equal(target.origin, site.origin, 'Only this production host can be submitted');
  assert(!/^\/(admin|dapur|cetak|api|login|info-gizi|game)(\/|$)/.test(target.pathname), 'Private path in sitemap');
}
console.log(`Verified ownership file and ${urlList.length} public URLs on ${site.hostname}.`);
if (!process.argv.includes('--submit')) {
  console.log('Dry-run only. Add --submit after the changed pages are live.');
} else {
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: site.hostname, key, keyLocation, urlList }),
    signal: AbortSignal.timeout(30000),
  });
  assert([200,202].includes(response.status), `IndexNow rejected the request: HTTP ${response.status}`);
  console.log(`IndexNow HTTP ${response.status}: ${response.status === 200 ? 'URLs received' : 'URLs received; ownership validation pending'}. Indexing is not guaranteed.`);
}
