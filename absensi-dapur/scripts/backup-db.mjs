#!/usr/bin/env node
/**
 * Backup SELURUH database Postgres (Supabase/Neon/apa pun) ke satu file JSON.
 *
 * Cara pakai (jalankan di komputermu, BUKAN di server):
 *   1. Ambil connection string dari Supabase → Project Settings → Database →
 *      "Connection string" (URI). Contoh:
 *      postgres://postgres:PASSWORD@db.xxxx.supabase.co:5432/postgres
 *   2. Jalankan:
 *        DATABASE_URL="postgres://..."  node scripts/backup-db.mjs
 *      (atau taruh DATABASE_URL di .env.local lalu: npm run db:backup)
 *
 * Hasil: file  backup/backup-YYYYMMDD-HHmm.json  berisi semua tabel + baris.
 * File ini bisa dipakai untuk restore (lihat scripts/restore-db.mjs) ke Postgres
 * gratis (mis. Neon) — jadi kamu tak terikat Supabase berbayar.
 *
 * Aman: hanya MEMBACA (SELECT). Tidak mengubah data apa pun.
 */
import { Pool } from "pg";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  "";
if (!url) {
  console.error("❌ Set DATABASE_URL dulu. Contoh:\n   DATABASE_URL=\"postgres://...\" node scripts/backup-db.mjs");
  process.exit(1);
}

const ssl = /localhost|127\.0\.0\.1|::1|sslmode=disable/.test(url) ? false : { rejectUnauthorized: false };
const pool = new Pool({ connectionString: url, ssl, max: 2 });

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

try {
  // 1. Daftar semua tabel di schema public.
  const { rows: tables } = await pool.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  if (tables.length === 0) {
    console.error("❌ Tidak ada tabel di schema public. Cek DATABASE_URL.");
    process.exit(1);
  }

  const dump = { _meta: { at: new Date().toISOString(), source: url.replace(/:[^:@/]+@/, ":***@"), tables: tables.length }, data: {} };
  let totalRows = 0;

  for (const { tablename } of tables) {
    const { rows } = await pool.query(`SELECT * FROM "${tablename}"`);
    dump.data[tablename] = rows;
    totalRows += rows.length;
    console.log(`  • ${tablename}: ${rows.length} baris`);
  }

  if (!existsSync("backup")) await mkdir("backup");
  const file = `backup/backup-${stamp()}.json`;
  await writeFile(file, JSON.stringify(dump, null, 2), "utf8");

  console.log(`\n✅ Backup selesai: ${file}`);
  console.log(`   ${tables.length} tabel · ${totalRows} baris total.`);
  console.log(`   Simpan file ini baik-baik. Restore dengan: node scripts/restore-db.mjs ${file}`);
} catch (e) {
  console.error("❌ Gagal backup:", e.message);
  process.exit(1);
} finally {
  await pool.end();
}
