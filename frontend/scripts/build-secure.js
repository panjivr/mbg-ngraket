#!/usr/bin/env node
/**
 * Build script: bundle, minify, and obfuscate JS for production.
 * Reduces readability of source code when viewing page source.
 *
 * Usage: node scripts/build-secure.js
 * Or: npm run build:secure
 */

const fs = require('fs');
const path = require('path');

const JS_DIR = path.join(__dirname, '..', 'js');
const VIEWS_DIR = path.join(JS_DIR, 'views');

const APP_ORDER = [
  'core.js',
  'auth.js',
  'views/dashboard.js',
  'views/production.js',
  'views/production_planner.js',
  'views/inventory.js',
  'views/menu.js',
  'views/nutrisurvey.js',
  'views/finance.js',
  'views/hr.js',
  'views/tasks.js',
  'views/settings.js',
  'views/reports.js',
  'views/pricing.js',
  'app.js',
];

const STAFF_ORDER = ['core.js', 'staff_attendance.js'];

function readFile(relPath) {
  const full = path.join(JS_DIR, relPath);
  if (!fs.existsSync(full)) {
    console.warn('Missing:', relPath);
    return '';
  }
  return fs.readFileSync(full, 'utf8') + '\n';
}

function bundle(order) {
  let out = '';
  for (const f of order) {
    out += readFile(f);
  }
  return out;
}

function simpleMinify(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}();,:])\s*/g, '$1')
    .trim();
}

async function minifyAndObfuscate(code) {
  try {
    const Terser = require('terser');
    const minified = await Terser.minify(code, {
      compress: { passes: 2 },
      mangle: { toplevel: true },
      format: { comments: false },
    });
    if (minified.error) throw minified.error;
    let result = minified.code;

    try {
      const JavaScriptObfuscator = require('javascript-obfuscator');
      const obfuscated = JavaScriptObfuscator.obfuscate(result, {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.5,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.2,
        debugProtection: false,
        disableConsoleOutput: false,
        identifierNamesGenerator: 'hexadecimal',
        rotateStringArray: true,
        selfDefending: true,
        shuffleStringArray: true,
        splitStrings: true,
        splitStringsChunkLength: 5,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayIndexShift: true,
        transformObjectKeys: true,
        unicodeEscapeSequence: false,
      });
      result = obfuscated.getObfuscatedCode();
    } catch (e) {
      console.warn('Obfuscation skipped (install javascript-obfuscator for full protection):', e.message);
    }

    return result;
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      console.warn('Run: cd frontend && npm install');
      console.warn('Falling back to simple minify (no obfuscation)');
      return simpleMinify(code);
    }
    throw e;
  }
}

async function main() {
  console.log('Building secure JS bundles...');

  const appBundle = bundle(APP_ORDER);
  const staffBundle = bundle(STAFF_ORDER);

  console.log('Minifying and obfuscating app bundle...');
  const appOut = await minifyAndObfuscate(appBundle);
  const appPath = path.join(JS_DIR, 'bundle.app.min.js');
  fs.writeFileSync(appPath, appOut, 'utf8');
  console.log('  -> js/bundle.app.min.js');

  console.log('Minifying and obfuscating staff bundle...');
  const staffOut = await minifyAndObfuscate(staffBundle);
  const staffPath = path.join(JS_DIR, 'bundle.staff.min.js');
  fs.writeFileSync(staffPath, staffOut, 'utf8');
  console.log('  -> js/bundle.staff.min.js');

  console.log('Done. Update app.html and staff.html to load bundle.*.min.js for production.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
