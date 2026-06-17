#!/usr/bin/env node
/**
 * Inisialisasi & seed database Absensi Dapur (idempotent).
 *
 * Pemakaian:
 *   DATABASE_URL=postgres://... node scripts/init-db.mjs
 * atau set DATABASE_URL di .env.local / .env lalu jalankan `npm run db:init`.
 *
 * Catatan: aplikasi juga membuat skema otomatis saat request pertama, jadi
 * skrip ini bersifat opsional (berguna untuk dev lokal & verifikasi koneksi).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// --- Loader .env sederhana (tanpa dependensi) ---
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!url) {
  console.error("✗ DATABASE_URL belum diset. Isi .env.local atau set env var.");
  process.exit(1);
}

const needsSsl =
  !/sslmode=disable/.test(url) && !/localhost|127\.0\.0\.1|::1/.test(url);

const client = new pg.Client({
  connectionString: url,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
});

async function main() {
  await client.connect();
  console.log("→ Terhubung ke PostgreSQL.");

  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      nama          TEXT NOT NULL,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'staff',
      jabatan       TEXT,
      nip           TEXT,
      aktif         BOOLEAN NOT NULL DEFAULT TRUE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id              INTEGER PRIMARY KEY DEFAULT 1,
      nama_dapur      TEXT NOT NULL DEFAULT 'Dapur MBG',
      alamat          TEXT NOT NULL DEFAULT '',
      lat             DOUBLE PRECISION NOT NULL DEFAULT -7.8657,
      lng             DOUBLE PRECISION NOT NULL DEFAULT 111.4625,
      radius_m        INTEGER NOT NULL DEFAULT 150,
      geofence_aktif  BOOLEAN NOT NULL DEFAULT TRUE,
      selfie_wajib    BOOLEAN NOT NULL DEFAULT TRUE,
      jam_masuk       TEXT NOT NULL DEFAULT '07:00',
      jam_pulang      TEXT NOT NULL DEFAULT '15:00',
      tz              TEXT NOT NULL DEFAULT 'Asia/Jakarta',
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT settings_singleton CHECK (id = 1)
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id              SERIAL PRIMARY KEY,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tanggal         DATE NOT NULL,
      check_in        TIMESTAMPTZ,
      check_out       TIMESTAMPTZ,
      status_masuk    TEXT,
      check_in_lat    DOUBLE PRECISION,
      check_in_lng    DOUBLE PRECISION,
      check_in_jarak  DOUBLE PRECISION,
      check_out_lat   DOUBLE PRECISION,
      check_out_lng   DOUBLE PRECISION,
      check_out_jarak DOUBLE PRECISION,
      selfie_in       TEXT,
      selfie_out      TEXT,
      catatan         TEXT,
      UNIQUE (user_id, tanggal)
    );
  `);

  await client.query(
    `CREATE INDEX IF NOT EXISTS idx_attendance_tanggal ON attendance (tanggal)`,
  );
  await client.query(
    `CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance (user_id)`,
  );
  await client.query(
    `INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`,
  );

  const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM users`);
  if (rows[0].c === 0) {
    const adminUser = process.env.SEED_ADMIN_USERNAME || "admin";
    const adminPass = process.env.SEED_ADMIN_PASSWORD || "admin123";
    const adminNama = process.env.SEED_ADMIN_NAMA || "Administrator Dapur";
    const adminHash = await bcrypt.hash(adminPass, 10);
    await client.query(
      `INSERT INTO users (nama, username, password_hash, role, jabatan)
       VALUES ($1, $2, $3, 'admin', 'Kepala Dapur')`,
      [adminNama, adminUser, adminHash],
    );

    const staffHash = await bcrypt.hash("dapur123", 10);
    const staff = [
      ["Siti Aminah", "siti", "Juru Masak", "DPR-001"],
      ["Budi Santoso", "budi", "Asisten Juru Masak", "DPR-002"],
      ["Rina Wulandari", "rina", "Staf Persiapan Bahan", "DPR-003"],
      ["Joko Prasetyo", "joko", "Staf Distribusi", "DPR-004"],
      ["Dewi Lestari", "dewi", "Staf Kebersihan", "DPR-005"],
    ];
    for (const [nama, username, jabatan, nip] of staff) {
      await client.query(
        `INSERT INTO users (nama, username, password_hash, role, jabatan, nip)
         VALUES ($1, $2, $3, 'staff', $4, $5)`,
        [nama, username, staffHash, jabatan, nip],
      );
    }
    console.log(`✓ Seed selesai. Admin: ${adminUser} / ${adminPass}`);
    console.log("✓ 5 staf contoh dibuat (password: dapur123).");
  } else {
    console.log(`✓ Tabel sudah ada (${rows[0].c} pengguna). Tidak ada seed ulang.`);
  }

  console.log("✓ Inisialisasi database selesai.");
}

main()
  .catch((err) => {
    console.error("✗ Gagal:", err.message);
    process.exitCode = 1;
  })
  .finally(() => client.end());
