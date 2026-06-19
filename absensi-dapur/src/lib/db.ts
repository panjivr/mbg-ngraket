import { Pool, types, type PoolClient, type QueryResultRow } from "pg";
import { hashPassword } from "./password";

// Kembalikan kolom DATE (OID 1082) sebagai string "YYYY-MM-DD" apa adanya,
// bukan objek Date (yang akan terserialisasi jadi ISO timestamp dengan TZ).
types.setTypeParser(types.builtins.DATE, (v) => v);

/**
 * Single shared connection pool. Cached on `globalThis` so it survives
 * hot-reload in dev and is reused across serverless invocations on Vercel.
 */
declare global {
  // eslint-disable-next-line no-var
  var __absensiPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __absensiSchemaReady: Promise<void> | undefined;
}

function connectionString(): string {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    "";
  if (!url) {
    throw new Error(
      "DATABASE_URL belum diset. Hubungkan Postgres (Vercel Postgres / Neon / Supabase) atau isi .env.local.",
    );
  }
  return url;
}

function needsSsl(url: string): boolean {
  if (/sslmode=disable/.test(url)) return false;
  if (/localhost|127\.0\.0\.1|::1/.test(url)) return false;
  return true;
}

export function getPool(): Pool {
  if (!global.__absensiPool) {
    const url = connectionString();
    global.__absensiPool = new Pool({
      connectionString: url,
      ssl: needsSsl(url) ? { rejectUnauthorized: false } : false,
      // Kecil agar aman di lingkungan serverless (banyak instance) dan tidak
      // menghabiskan kuota koneksi Postgres (Neon/Supabase free tier).
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      allowExitOnIdle: true,
    });
    global.__absensiPool.on("error", (err) => {
      console.error("[absensi] pool error:", err.message);
    });
  }
  return global.__absensiPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  await ensureSchema();
  const res = await getPool().query<T>(text, params as never[]);
  return res.rows;
}

export async function queryRaw<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await getPool().query<T>(text, params as never[]);
  return res.rows;
}

export async function withClient<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

/**
 * Idempotently create the schema, run lightweight migrations and seed defaults.
 * Cached per-instance so it runs only once. A transaction-level advisory lock
 * prevents two concurrent cold starts from racing each other.
 */
export function ensureSchema(): Promise<void> {
  if (!global.__absensiSchemaReady) {
    global.__absensiSchemaReady = doEnsureSchema().catch((err) => {
      global.__absensiSchemaReady = undefined;
      throw err;
    });
  }
  return global.__absensiSchemaReady;
}

async function doEnsureSchema(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(7263011)");

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

    // --- Divisi: jam kerja/shift per divisi (mendukung shift lintas hari) ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS divisi (
        id              SERIAL PRIMARY KEY,
        nama            TEXT NOT NULL UNIQUE,
        jam_masuk       TEXT NOT NULL DEFAULT '07:00',
        jam_pulang      TEXT NOT NULL DEFAULT '15:00',
        toleransi_menit INTEGER NOT NULL DEFAULT 10,
        warna           TEXT,
        aktif           BOOLEAN NOT NULL DEFAULT TRUE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // users -> divisi
    await client.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS divisi_id INTEGER REFERENCES divisi(id) ON DELETE SET NULL`,
    );

    // divisi -> jobdesk (uraian tugas yang diisi admin)
    await client.query(
      `ALTER TABLE divisi ADD COLUMN IF NOT EXISTS jobdesk TEXT`,
    );

    // users -> foto profil & bio/status (untuk kartu pegawai)
    await client.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS foto_profil TEXT`,
    );
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`);

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

    // --- Migrasi attendance: dari "per hari" ke "per shift/jam" ---
    // Kolom shift baru (snapshot jadwal + tanggal kerja shift).
    await client.query(
      `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS shift_tanggal DATE`,
    );
    await client.query(
      `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS divisi_id INTEGER`,
    );
    await client.query(
      `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS shift_masuk TEXT`,
    );
    await client.query(
      `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS shift_pulang TEXT`,
    );
    // Backfill tanggal kerja shift untuk baris lama.
    await client.query(
      `UPDATE attendance SET shift_tanggal = tanggal WHERE shift_tanggal IS NULL`,
    );
    // Lepas batasan unik per-hari & izinkan tanggal kosong (shift berbasis jam).
    await client.query(
      `ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_user_id_tanggal_key`,
    );
    await client.query(
      `ALTER TABLE attendance ALTER COLUMN tanggal DROP NOT NULL`,
    );

    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_attendance_tanggal ON attendance (tanggal)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_attendance_shift ON attendance (shift_tanggal)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance (user_id)`,
    );

    // Seed singleton settings row.
    await client.query(
      `INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`,
    );

    // Seed contoh divisi (hanya bila tabel divisi masih kosong). Termasuk
    // satu shift malam lintas hari sebagai contoh (22:00 -> 08:00).
    const divCount = await client.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM divisi`,
    );
    if (Number(divCount.rows[0].c) === 0) {
      // [nama, jam_masuk, jam_pulang, toleransi, jobdesk]
      const sampleDiv: Array<[string, string, string, number, string]> = [
        [
          "Persiapan Bahan",
          "05:00",
          "13:00",
          10,
          "Menerima & memeriksa bahan baku; mencuci, mengupas, dan memotong bahan; menimbang porsi sesuai menu; menjaga kebersihan area persiapan.",
        ],
        [
          "Dapur / Masak",
          "06:00",
          "14:00",
          10,
          "Memasak menu sesuai standar gizi & resep; mengontrol rasa dan kematangan; menjaga higiene saat memasak; merapikan peralatan masak.",
        ],
        [
          "Distribusi",
          "09:00",
          "17:00",
          10,
          "Mengemas makanan per porsi; mengecek jumlah paket; mengantar ke titik distribusi; mencatat serah-terima paket makanan.",
        ],
        [
          "Kebersihan",
          "13:00",
          "21:00",
          10,
          "Mencuci peralatan masak & makan; membersihkan lantai dan area dapur; mengelola sampah; sanitasi akhir sebelum tutup.",
        ],
        [
          "Keamanan Malam",
          "22:00",
          "08:00",
          15,
          "Menjaga keamanan area dapur pada malam hari; memeriksa pintu, gas, dan listrik; mencatat kejadian; serah-terima dengan shift pagi.",
        ],
      ];
      for (const [nama, jm, jp, tol, jobdesk] of sampleDiv) {
        await client.query(
          `INSERT INTO divisi (nama, jam_masuk, jam_pulang, toleransi_menit, jobdesk)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT (nama) DO NOTHING`,
          [nama, jm, jp, tol, jobdesk],
        );
      }
    }

    // Seed initial admin + sample kitchen staff only when the table is empty.
    const { rows } = await client.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM users`,
    );
    if (Number(rows[0].c) === 0) {
      const adminUser = process.env.SEED_ADMIN_USERNAME || "admin";
      const adminPass = process.env.SEED_ADMIN_PASSWORD || "admin123";
      const adminNama = process.env.SEED_ADMIN_NAMA || "Administrator Dapur";
      const adminHash = await hashPassword(adminPass);

      await client.query(
        `INSERT INTO users (nama, username, password_hash, role, jabatan)
         VALUES ($1, $2, $3, 'admin', 'Kepala Dapur')`,
        [adminNama, adminUser, adminHash],
      );

      const staffPass = await hashPassword("dapur123");
      // [nama, username, jabatan, nip, nama_divisi]
      const sampleStaff: Array<[string, string, string, string, string]> = [
        ["Siti Aminah", "siti", "Juru Masak", "DPR-001", "Dapur / Masak"],
        ["Budi Santoso", "budi", "Asisten Juru Masak", "DPR-002", "Dapur / Masak"],
        ["Rina Wulandari", "rina", "Staf Persiapan Bahan", "DPR-003", "Persiapan Bahan"],
        ["Joko Prasetyo", "joko", "Staf Distribusi", "DPR-004", "Distribusi"],
        ["Dewi Lestari", "dewi", "Staf Kebersihan", "DPR-005", "Kebersihan"],
      ];
      for (const [nama, username, jabatan, nip, divNama] of sampleStaff) {
        await client.query(
          `INSERT INTO users (nama, username, password_hash, role, jabatan, nip, divisi_id)
           VALUES ($1, $2, $3, 'staff', $4, $5,
                   (SELECT id FROM divisi WHERE nama = $6))`,
          [nama, username, staffPass, jabatan, nip, divNama],
        );
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
