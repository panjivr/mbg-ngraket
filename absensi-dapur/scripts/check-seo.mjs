import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');

function load(file, env, marketing) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  vm.runInNewContext(code, { exports, URL, process: { env }, require: name => {
    assert.equal(name, '@/lib/marketing'); return marketing;
  } });
  return exports;
}
for (const mode of ['production', 'preview']) {
  const env = { VERCEL_ENV: mode, NEXT_PUBLIC_SITE_URL: 'https://djati.web.id' };
  const marketing = load('src/lib/marketing.ts', env);
  const meta = marketing.publicMetadata('/fitur', 'Fitur', 'Deskripsi');
  assert.equal(meta.robots.index, mode === 'production');
  assert.equal(meta.alternates.canonical, 'https://djati.web.id/fitur');
  const sitemap = load('src/app/sitemap.ts', env, marketing).default();
  const robots = load('src/app/robots.ts', env, marketing).default();
  if (mode === 'preview') {
    assert.equal(sitemap.length, 0); assert.equal(robots.rules.disallow, '/');
  } else {
    assert.equal(sitemap.length, 9);
    for (const item of sitemap) assert(!/\/(admin|dapur|cetak|api|login)(\/|$)/.test(item.url));
    assert(robots.rules.some(r => r.userAgent === 'OAI-SearchBot'));
  }
  console.log(`PASS ${mode}: metadata, canonical, sitemap, robots`);
}

const port = '3010';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', port, '--hostname', '127.0.0.1'], { stdio: 'ignore' });
const base = `http://127.0.0.1:${port}`;
try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { if ((await fetch(base)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert(ready, 'Production server did not start');
  const { PUBLIC_PATHS } = load('src/lib/marketing.ts', { VERCEL_ENV: 'production' });
  const linked = new Set();
  for (const path of PUBLIC_PATHS) {
    const response = await fetch(base + path); assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.match(html, /name="robots" content="index, follow"/, path);
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    assert.equal(canonical, 'https://djati.web.id' + (path === '/' ? '' : path));
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, path);
    assert.match(html, /data-cta="request-demo"/, path);
    const schemas = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)];
    assert(schemas.length > 0, path);
    for (const [, data] of schemas) JSON.parse(data);
    for (const [, href] of html.matchAll(/<a[^>]*href="([^"#]+)"/g)) {
      if (href.startsWith('/')) linked.add(href.split('#')[0]);
    }
    console.log(`PASS ${path}: HTTP, canonical, H1, JSON-LD, CTA`);
  }
  for (const path of PUBLIC_PATHS) assert(linked.has(path), `Missing internal link: ${path}`);
  const xml = await (await fetch(base + '/sitemap.xml')).text();
  assert.equal((xml.match(/<loc>/g) || []).length, PUBLIC_PATHS.length);
  const robots = await (await fetch(base + '/robots.txt')).text();
  assert.match(robots, /User-Agent: OAI-SearchBot/i); assert.match(robots, /Disallow: \/admin/);
  const login = await fetch(base + '/login');
  assert.match(login.headers.get('x-robots-tag'), /noindex/);
  assert.match(await login.text(), /name="robots" content="noindex, nofollow"/);
  const image = await fetch(base + '/opengraph-image');
  assert.equal(image.headers.get('content-type'), 'image/png');
  const bytes = Buffer.from(await image.arrayBuffer());
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  fs.writeFileSync('/tmp/djati-og.png', bytes);
  assert.equal((await fetch(base + '/solusi/tidak-ada')).status, 404);
  console.log('PASS internal links, sitemap, private noindex, OpenGraph PNG, unknown solution 404');
} finally {
  server.kill('SIGTERM');
}
