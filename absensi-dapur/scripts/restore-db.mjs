#!/usr/bin/env node
/**
 * Restore hasil backup (JSON dari scripts/backup-db.mjs) ke Postgres tujuan —
 * mis. Neon gratis, agar bisa lepas dari Supabase berbayar.
 *
 * LANGKAH:
 *   1. Buat database Postgres gratis (Neon: neon.tech → New Project).
 *   2. Jalankan aplikasi sekali dengan DATABASE_URL Neon supaya SKEMA tabel
 *      dibuat otomatis (app membuat tabel saat pertama diakses). ATAU biarkan
 *      skrip ini yang membuat — TIDAK; skrip ini hanya mengisi data ke tabel
 *      yang sudah ada. Jadi pastikan skema sudah ada dulu.
 *   3. Restore data:
 *        DATABASE_URL="postgres://...neon..."  node scripts/restore-db.mjs backup/backup-XXXX.json
 *
 * Skrip meng-KOSONGKAN tiap tabel target (TRUNCATE) lalu memasukkan baris dari
 * backup, menonaktifkan cek foreign-key selama proses, lalu menyetel ulang
 * sequence id. Data lama di target akan tergantikan oleh isi backup.
 */
import { Pool } from "pg";
import { readFile } from "node:fs/promises";

const file = process.argv[2];
if (!file) {
  console.error("Pakai: node scripts/restore-db.mjs <file-backup.json>");
  process.exit(1);
}
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
if (!url) {
  console.error("❌ Set DATABASE_URL (database TUJUAN) dulu.");
  process.exit(1);
}

const ssl = /localhost|127\.0\.0\.1|::1|sslmode=disable/.test(url) ? false : { rejectUnauthorized: false };
const pool = new Pool({ connectionString: url, ssl, max: 2 });
const dump = JSON.parse(await readFile(file, "utf8"));
const data = dump.data || {};
const tabel = Object.keys(data);

const client = await pool.connect();
try {
  await client.query("SET session_replication_role = replica"); // matikan cek FK
  let total = 0;
  for (const t of tabel) {
    const rows = data[t] || [];
    // Hanya restore tabel yang ADA di tujuan.
    const ada = await client.query(`SELECT to_regclass($1) AS r`, [`public.${t}`]);
    if (!ada.rows[0]?.r) {
      console.log(`  · lewati ${t} (tabel belum ada di tujuan)`);
      continue;
    }
    await client.query(`TRUNCATE "${t}" RESTART IDENTITY CASCADE`);
    for (const row of rows) {
      const cols = Object.keys(row);
      if (cols.length === 0) continue;
      const ph = cols.map((_, i) => `$${i + 1}`).join(",");
      const names = cols.map((c) => `"${c}"`).join(",");
      await client.query(`INSERT INTO "${t}" (${names}) VALUES (${ph})`, cols.map((c) => row[c]));
    }
    // Setel ulang sequence id (bila ada kolom id serial).
    if (rows.some((r) => "id" in r)) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence($1,'id'), COALESCE((SELECT MAX(id) FROM "${t}"),1))`,
        [t],
      ).catch(() => {});
    }
    total += rows.length;
    console.log(`  • ${t}: ${rows.length} baris`);
  }
  await client.query("SET session_replication_role = DEFAULT");
  console.log(`\n✅ Restore selesai: ${tabel.length} tabel · ${total} baris.`);
} catch (e) {
  console.error("❌ Gagal restore:", e.message);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
