#!/usr/bin/env node
/**
 * Reset seluruh data transaksi dari database.
 * Jalankan: node scripts/reset-transaksi.js
 */
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const rootDir = path.join(__dirname, '..');
const platformDbPath = path.join(rootDir, 'database.sqlite');
const tenantDbDir = path.join(rootDir, 'tenant_dbs');

function run(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
}

async function resetTransaksiInDb(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, async (err) => {
            if (err) return reject(err);
            try {
                const stmts = [
                    `DELETE FROM gl_journal_lines WHERE journal_id IN (
                        SELECT id FROM gl_journals WHERE (source_type = 'LAPKEU_SHEET' OR source_type = 'LAPKEU_IMPORT') AND source_ref LIKE 'Transaksi:%'
                    )`,
                    `DELETE FROM gl_journals WHERE (source_type = 'LAPKEU_SHEET' OR source_type = 'LAPKEU_IMPORT') AND source_ref LIKE 'Transaksi:%'`,
                    `DELETE FROM transactions WHERE source_ref LIKE 'Transaksi:%'`,
                    `DELETE FROM lapkeu_transactions WHERE source LIKE 'Transaksi:%'`,
                    `DELETE FROM lapkeu_sheet_rows WHERE sheet_name = 'Transaksi'`
                ];
                for (const sql of stmts) {
                    try { await run(db, sql); } catch (e) { /* tabel mungkin tidak ada */ }
                }
                db.close();
                resolve();
            } catch (e) {
                db.close();
                reject(e);
            }
        });
    });
}

async function main() {
    const dbs = [];
    if (fs.existsSync(platformDbPath)) dbs.push({ path: platformDbPath, name: 'platform' });
    if (fs.existsSync(tenantDbDir)) {
        const files = fs.readdirSync(tenantDbDir).filter(f => f.endsWith('.sqlite'));
        files.forEach(f => dbs.push({ path: path.join(tenantDbDir, f), name: f }));
    }
    if (dbs.length === 0) {
        console.log('Tidak ada database ditemukan.');
        return;
    }
    for (const { path: p, name } of dbs) {
        try {
            await resetTransaksiInDb(p);
            console.log(`[OK] ${name}: Data transaksi telah direset`);
        } catch (e) {
            console.error(`[GAGAL] ${name}:`, e.message);
        }
    }
}

main().catch(e => { console.error(e); process.exit(1); });
