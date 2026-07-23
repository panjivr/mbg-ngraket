import { Pool, types, type PoolClient, type QueryResultRow } from "pg";
import { hashPassword } from "./password";
import { SOP_SEED } from "./sop-seed";
import { PENERIMA_SEED } from "./distribusi-seed";

// Kembalikan kolom DATE (OID 1082) sebagai string "YYYY-MM-DD" apa adanya,
// bukan objek Date (yang akan terserialisasi jadi ISO timestamp dengan TZ).
types.setTypeParser(types.builtins.DATE, (v) => v);

// Versi skema. Migrasi (82 statement DDL) dilewati saat versi tersimpan sama,
// sehingga cold start jauh lebih cepat (cukup 1 SELECT, bukan puluhan round-trip).
// WAJIB dinaikkan setiap ada perubahan skema (tabel/kolom/index/seed) baru.
const SCHEMA_VERSION = "2026-07-24.subadmin-roles";

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

    // Fast-path: lewati seluruh migrasi bila skema sudah pada versi terkini.
    await client.query(`CREATE TABLE IF NOT EXISTS app_meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)`);
    const verNow = (
      await client.query<{ v: string }>(`SELECT v FROM app_meta WHERE k = 'schema_version'`)
    ).rows[0]?.v;
    if (verNow === SCHEMA_VERSION) {
      await client.query("COMMIT");
      return;
    }

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

    // users -> tempat & tanggal lahir (untuk weton / laporan)
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS tempat_lahir TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS tanggal_lahir DATE`);

    // users -> jenis kelamin ('L'/'P') untuk analisa Shio & Fengshui (Angka Kua)
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS jenis_kelamin TEXT`);

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

    // --- Sub-shift per divisi (mis. Keamanan: pagi/siang/malam) ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS divisi_shift (
        id              SERIAL PRIMARY KEY,
        divisi_id       INTEGER NOT NULL REFERENCES divisi(id) ON DELETE CASCADE,
        nama            TEXT NOT NULL,
        jam_masuk       TEXT NOT NULL,
        jam_pulang      TEXT NOT NULL,
        toleransi_menit INTEGER NOT NULL DEFAULT 10,
        urutan          INTEGER NOT NULL DEFAULT 0,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_divisi_shift_divisi ON divisi_shift (divisi_id)`,
    );

    // --- Event absensi (mis. "General Cleaning" — semua serentak, hari tertentu) ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_absensi (
        id              SERIAL PRIMARY KEY,
        nama            TEXT NOT NULL,
        tanggal         DATE NOT NULL,
        jam_masuk       TEXT NOT NULL,
        jam_pulang      TEXT NOT NULL,
        toleransi_menit INTEGER NOT NULL DEFAULT 15,
        aktif           BOOLEAN NOT NULL DEFAULT TRUE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_event_tanggal ON event_absensi (tanggal)`,
    );
    // Titik GPS opsional per event — kalau diisi, peserta event absen di
    // koordinat ini; penjaga dapur tetap absen di titik dapur.
    await client.query(`ALTER TABLE event_absensi ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION`);
    await client.query(`ALTER TABLE event_absensi ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION`);
    await client.query(`ALTER TABLE event_absensi ADD COLUMN IF NOT EXISTS radius_m INTEGER`);
    await client.query(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS lokasi TEXT`);
    // Peserta event: bila terisi, event hanya berlaku untuk mereka.
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_peserta (
        event_id INTEGER NOT NULL REFERENCES event_absensi(id) ON DELETE CASCADE,
        user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (event_id, user_id)
      );
    `);

    // Jejak shift/event yang dipakai saat absen (untuk rekap).
    await client.query(
      `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS divisi_shift_id INTEGER`,
    );
    await client.query(
      `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS event_id INTEGER`,
    );
    // Self-healing: versi lawas pernah membuat FK event_id -> tabel "events"
    // (sudah tidak dipakai). Arahkan ulang ke event_absensi agar insert tidak
    // gagal foreign key.
    await client.query(`
      DO $mig$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          JOIN pg_class ft ON ft.oid = c.confrelid
          WHERE t.relname = 'attendance'
            AND c.conname = 'attendance_event_id_fkey'
            AND ft.relname <> 'event_absensi'
        ) THEN
          ALTER TABLE attendance DROP CONSTRAINT attendance_event_id_fkey;
          UPDATE attendance SET event_id = NULL
           WHERE event_id IS NOT NULL
             AND event_id NOT IN (SELECT id FROM event_absensi);
          ALTER TABLE attendance ADD CONSTRAINT attendance_event_id_fkey
            FOREIGN KEY (event_id) REFERENCES event_absensi(id) ON DELETE SET NULL;
        END IF;
      END
      $mig$;
    `);

    // Seed singleton settings row.
    await client.query(
      `INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`,
    );

    // ================= MULTI-DAPUR (SPPG) =================
    // Tiap SPPG/dapur punya konfigurasi (lokasi, geofence, jam, zona waktu)
    // sendiri. Semua akun/divisi/event/absensi terikat ke satu sppg_id.
    await client.query(`
      CREATE TABLE IF NOT EXISTS sppg (
        id              SERIAL PRIMARY KEY,
        nama            TEXT NOT NULL,
        alamat          TEXT NOT NULL DEFAULT '',
        lat             DOUBLE PRECISION NOT NULL DEFAULT -7.8657,
        lng             DOUBLE PRECISION NOT NULL DEFAULT 111.4625,
        radius_m        INTEGER NOT NULL DEFAULT 150,
        geofence_aktif  BOOLEAN NOT NULL DEFAULT TRUE,
        selfie_wajib    BOOLEAN NOT NULL DEFAULT TRUE,
        jam_masuk       TEXT NOT NULL DEFAULT '07:00',
        jam_pulang      TEXT NOT NULL DEFAULT '15:00',
        tz              TEXT NOT NULL DEFAULT 'Asia/Jakarta',
        aktif           BOOLEAN NOT NULL DEFAULT TRUE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    // --- SOP (Standar Operasional Prosedur) per dapur --- (butuh tabel sppg)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sop (
        id               SERIAL PRIMARY KEY,
        sppg_id          INTEGER REFERENCES sppg(id) ON DELETE CASCADE,
        kode             TEXT NOT NULL DEFAULT '',
        judul            TEXT NOT NULL,
        kategori         TEXT NOT NULL DEFAULT 'Umum',
        tujuan           TEXT NOT NULL DEFAULT '',
        ruang_lingkup    TEXT NOT NULL DEFAULT '',
        penanggung_jawab TEXT NOT NULL DEFAULT '',
        prosedur         TEXT NOT NULL DEFAULT '',
        referensi        TEXT NOT NULL DEFAULT '',
        urutan           INTEGER NOT NULL DEFAULT 0,
        aktif            BOOLEAN NOT NULL DEFAULT TRUE,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sop_sppg ON sop (sppg_id)`);

    // --- Distribusi: kepala SPPG & harga pagu per porsi ---
    await client.query(`ALTER TABLE sppg ADD COLUMN IF NOT EXISTS kepala_sppg TEXT NOT NULL DEFAULT ''`);
    await client.query(`ALTER TABLE sppg ADD COLUMN IF NOT EXISTS harga_besar INTEGER NOT NULL DEFAULT 10000`);
    await client.query(`ALTER TABLE sppg ADD COLUMN IF NOT EXISTS harga_kecil INTEGER NOT NULL DEFAULT 8000`);
    await client.query(`ALTER TABLE sppg ADD COLUMN IF NOT EXISTS harga_b3 INTEGER NOT NULL DEFAULT 8000`);
    await client.query(`ALTER TABLE sppg ADD COLUMN IF NOT EXISTS ahli_gizi TEXT NOT NULL DEFAULT 'Dyah Paramita Ratna Muda'`);
    await client.query(`ALTER TABLE sppg ADD COLUMN IF NOT EXISTS koordinator TEXT NOT NULL DEFAULT 'Panji Vatorrohman'`);

    // Master penerima (sekolah/SERDIK & kelompok B3 posyandu).
    await client.query(`
      CREATE TABLE IF NOT EXISTS penerima (
        id        SERIAL PRIMARY KEY,
        sppg_id   INTEGER REFERENCES sppg(id) ON DELETE CASCADE,
        jenis     TEXT NOT NULL DEFAULT 'serdik',
        nama      TEXT NOT NULL,
        jenjang   TEXT NOT NULL DEFAULT '',
        besar     INTEGER NOT NULL DEFAULT 0,
        kecil     INTEGER NOT NULL DEFAULT 0,
        b3        INTEGER NOT NULL DEFAULT 0,
        pj        INTEGER NOT NULL DEFAULT 0,
        jam_kirim TEXT NOT NULL DEFAULT '07:00',
        urutan    INTEGER NOT NULL DEFAULT 0,
        aktif     BOOLEAN NOT NULL DEFAULT TRUE
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_penerima_sppg ON penerima (sppg_id)`);

    // Satu hari distribusi + baris penerima (angka bisa di-adjust harian).
    await client.query(`
      CREATE TABLE IF NOT EXISTS distribusi (
        id         SERIAL PRIMARY KEY,
        sppg_id    INTEGER REFERENCES sppg(id) ON DELETE CASCADE,
        tanggal    DATE NOT NULL,
        driver     TEXT NOT NULL DEFAULT '',
        menu       TEXT NOT NULL DEFAULT '',
        catatan    TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (sppg_id, tanggal)
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS distribusi_item (
        id            SERIAL PRIMARY KEY,
        distribusi_id INTEGER NOT NULL REFERENCES distribusi(id) ON DELETE CASCADE,
        penerima_id   INTEGER NOT NULL REFERENCES penerima(id) ON DELETE CASCADE,
        besar         INTEGER NOT NULL DEFAULT 0,
        kecil         INTEGER NOT NULL DEFAULT 0,
        b3            INTEGER NOT NULL DEFAULT 0,
        ikut          BOOLEAN NOT NULL DEFAULT TRUE,
        UNIQUE (distribusi_id, penerima_id)
      );
    `);
    // Menu terstruktur untuk form Uji Organoleptik (grup + item), per jenis penerima.
    await client.query(`ALTER TABLE distribusi ADD COLUMN IF NOT EXISTS menu_sekolah JSONB NOT NULL DEFAULT '[]'::jsonb`);
    await client.query(`ALTER TABLE distribusi ADD COLUMN IF NOT EXISTS menu_posyandu JSONB NOT NULL DEFAULT '[]'::jsonb`);

    // Laporan Kegiatan Harian (isi terstruktur + foto dokumentasi), per tanggal.
    await client.query(`
      CREATE TABLE IF NOT EXISTS laporan (
        id         SERIAL PRIMARY KEY,
        sppg_id    INTEGER REFERENCES sppg(id) ON DELETE CASCADE,
        tanggal    DATE NOT NULL,
        isi        JSONB NOT NULL DEFAULT '{}'::jsonb,
        foto       JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (sppg_id, tanggal)
      );
    `);

    // Dokumentasi Foto Kegiatan (9 foto per kegiatan), per tanggal + nama kegiatan.
    await client.query(`
      CREATE TABLE IF NOT EXISTS dokumentasi (
        id         SERIAL PRIMARY KEY,
        sppg_id    INTEGER REFERENCES sppg(id) ON DELETE CASCADE,
        tanggal    DATE NOT NULL,
        kegiatan   TEXT NOT NULL DEFAULT '',
        foto       JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (sppg_id, tanggal, kegiatan)
      );
    `);

    // Data Kilometer Kendaraan: master kendaraan + entri KM harian (foto + angka).
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_driver BOOLEAN NOT NULL DEFAULT FALSE`);
    // Sub-admin scoped: akses khusus Distribusi / Laporan Harian (mirip driver).
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS akses_distribusi BOOLEAN NOT NULL DEFAULT FALSE`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS akses_laporan BOOLEAN NOT NULL DEFAULT FALSE`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS kendaraan (
        id        SERIAL PRIMARY KEY,
        sppg_id   INTEGER REFERENCES sppg(id) ON DELETE CASCADE,
        nopol     TEXT NOT NULL DEFAULT '',
        nama      TEXT NOT NULL DEFAULT '',
        konsumsi  NUMERIC NOT NULL DEFAULT 0,
        aktif     BOOLEAN NOT NULL DEFAULT TRUE,
        urutan    INTEGER NOT NULL DEFAULT 0
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS kilometer (
        id             SERIAL PRIMARY KEY,
        sppg_id        INTEGER REFERENCES sppg(id) ON DELETE CASCADE,
        kendaraan_id   INTEGER NOT NULL REFERENCES kendaraan(id) ON DELETE CASCADE,
        tanggal        DATE NOT NULL,
        km_berangkat   INTEGER NOT NULL DEFAULT 0,
        km_pulang      INTEGER NOT NULL DEFAULT 0,
        foto_berangkat TEXT NOT NULL DEFAULT '',
        foto_pulang    TEXT NOT NULL DEFAULT '',
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (kendaraan_id, tanggal)
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_kilometer_sppg_tgl ON kilometer (sppg_id, tanggal)`);

    await client.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS sppg_id INTEGER REFERENCES sppg(id) ON DELETE SET NULL`,
    );
    await client.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super BOOLEAN NOT NULL DEFAULT FALSE`,
    );
    await client.query(
      `ALTER TABLE divisi ADD COLUMN IF NOT EXISTS sppg_id INTEGER REFERENCES sppg(id) ON DELETE CASCADE`,
    );
    await client.query(
      `ALTER TABLE event_absensi ADD COLUMN IF NOT EXISTS sppg_id INTEGER REFERENCES sppg(id) ON DELETE CASCADE`,
    );
    // Nama divisi cukup unik PER dapur (bukan global lagi).
    await client.query(`ALTER TABLE divisi DROP CONSTRAINT IF EXISTS divisi_nama_key`);

    // Dapur #1 = data lama. Ambil konfigurasi dari settings singleton.
    await client.query(`
      INSERT INTO sppg (id, nama, alamat, lat, lng, radius_m, geofence_aktif,
                        selfie_wajib, jam_masuk, jam_pulang, tz)
      SELECT 1, nama_dapur, alamat, lat, lng, radius_m, geofence_aktif,
             selfie_wajib, jam_masuk, jam_pulang, tz
        FROM settings WHERE id = 1
      ON CONFLICT (id) DO NOTHING;
    `);
    await client.query(
      `SELECT setval(pg_get_serial_sequence('sppg','id'),
              GREATEST((SELECT COALESCE(MAX(id),1) FROM sppg), 1), true)`,
    );
    // Backfill data lama ke Dapur #1.
    await client.query(`UPDATE users SET sppg_id = 1 WHERE sppg_id IS NULL`);
    await client.query(`UPDATE divisi SET sppg_id = 1 WHERE sppg_id IS NULL`);
    await client.query(`UPDATE event_absensi SET sppg_id = 1 WHERE sppg_id IS NULL`);
    // Unik nama divisi per dapur.
    await client.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uniq_divisi_sppg_nama ON divisi (sppg_id, lower(nama))`,
    );
    // Jadikan admin pertama sebagai Super Admin bila belum ada super admin.
    await client.query(`
      UPDATE users SET is_super = TRUE
       WHERE id = (SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1)
         AND NOT EXISTS (SELECT 1 FROM users WHERE is_super = TRUE);
    `);

    // Seed 3 shift untuk divisi keamanan (bila tabel shift masih kosong) agar
    // petugas keamanan bisa memilih shift sendiri & tidak terhitung terlambat.
    const shiftCount = await client.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM divisi_shift`,
    );
    if (Number(shiftCount.rows[0].c) === 0) {
      const keamanan = await client.query<{ id: number }>(
        `SELECT id FROM divisi WHERE nama ILIKE '%keamanan%' ORDER BY id LIMIT 1`,
      );
      if (keamanan.rows[0]) {
        const kid = keamanan.rows[0].id;
        const shifts: Array<[string, string, string, number, number]> = [
          ["Shift 1 (Pagi)", "07:00", "15:00", 10, 1],
          ["Shift 2 (Siang)", "15:00", "23:00", 10, 2],
          ["Shift 3 (Malam)", "23:00", "07:00", 10, 3],
        ];
        for (const [nama, jm, jp, tol, urut] of shifts) {
          await client.query(
            `INSERT INTO divisi_shift (divisi_id, nama, jam_masuk, jam_pulang, toleransi_menit, urutan)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [kid, nama, jm, jp, tol, urut],
          );
        }
      }
    }

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
          `INSERT INTO divisi (nama, jam_masuk, jam_pulang, toleransi_menit, jobdesk, sppg_id)
           VALUES ($1, $2, $3, $4, $5, 1) ON CONFLICT DO NOTHING`,
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
        `INSERT INTO users (nama, username, password_hash, role, jabatan, sppg_id, is_super)
         VALUES ($1, $2, $3, 'admin', 'Kepala Dapur', 1, TRUE)`,
        [adminNama, adminUser, adminHash],
      );

      const staffPass = await hashPassword("dapur123");
      // [nama, username, jabatan, nip, nama_divisi, tempat_lahir, tanggal_lahir]
      const sampleStaff: Array<
        [string, string, string, string, string, string, string]
      > = [
        ["Siti Aminah", "siti", "Juru Masak", "DPR-001", "Dapur / Masak", "Ponorogo", "1980-09-08"],
        ["Budi Santoso", "budi", "Asisten Juru Masak", "DPR-002", "Dapur / Masak", "Ponorogo", "1990-05-11"],
        ["Rina Wulandari", "rina", "Staf Persiapan Bahan", "DPR-003", "Persiapan Bahan", "Ponorogo", "1995-12-02"],
        ["Joko Prasetyo", "joko", "Staf Distribusi", "DPR-004", "Distribusi", "Ponorogo", "1988-07-19"],
        ["Dewi Lestari", "dewi", "Staf Kebersihan", "DPR-005", "Kebersihan", "Ponorogo", "1992-03-25"],
      ];
      for (const [nama, username, jabatan, nip, divNama, tl, tgl] of sampleStaff) {
        await client.query(
          `INSERT INTO users (nama, username, password_hash, role, jabatan, nip, divisi_id, tempat_lahir, tanggal_lahir, sppg_id)
           VALUES ($1, $2, $3, 'staff', $4, $5,
                   (SELECT id FROM divisi WHERE nama = $6 AND sppg_id = 1), $7, $8, 1)`,
          [nama, username, staffPass, jabatan, nip, divNama, tl, tgl],
        );
      }
    }

    // Seed SOP awal (dari dokumen SOP SPPG) untuk dapur pertama, bila kosong.
    const sopCount = await client.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM sop`,
    );
    if (Number(sopCount.rows[0].c) === 0 && SOP_SEED.length > 0) {
      const firstSppg = await client.query<{ id: number }>(
        `SELECT id FROM sppg ORDER BY id ASC LIMIT 1`,
      );
      const sppgId = firstSppg.rows[0]?.id ?? 1;
      let urut = 1;
      for (const s of SOP_SEED) {
        await client.query(
          `INSERT INTO sop (sppg_id, kode, judul, kategori, tujuan, ruang_lingkup,
                            penanggung_jawab, prosedur, referensi, urutan)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            sppgId,
            s.kode,
            s.judul,
            s.kategori,
            s.tujuan,
            s.ruang_lingkup,
            s.penanggung_jawab,
            s.prosedur,
            s.referensi,
            urut++,
          ],
        );
      }
    }

    // Kepala SPPG default untuk dapur #1 (dari dokumen).
    await client.query(
      `UPDATE sppg SET kepala_sppg = 'Abdullah Indriawan' WHERE id = 1 AND (kepala_sppg IS NULL OR kepala_sppg = '')`,
    );

    // Seed master penerima (dari RAB) untuk dapur pertama, bila kosong.
    const penerimaCount = await client.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM penerima`,
    );
    if (Number(penerimaCount.rows[0].c) === 0 && PENERIMA_SEED.length > 0) {
      const firstSppg2 = await client.query<{ id: number }>(
        `SELECT id FROM sppg ORDER BY id ASC LIMIT 1`,
      );
      const sppgId2 = firstSppg2.rows[0]?.id ?? 1;
      let urut2 = 1;
      for (const p of PENERIMA_SEED) {
        await client.query(
          `INSERT INTO penerima (sppg_id, jenis, nama, jenjang, besar, kecil, b3, pj, jam_kirim, urutan)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [sppgId2, p.jenis, p.nama, p.jenjang, p.besar, p.kecil, p.b3, p.pj, p.jam_kirim, urut2++],
        );
      }
    }

    // Tandai skema sudah pada versi terkini agar cold start berikutnya cepat.
    await client.query(
      `INSERT INTO app_meta (k, v) VALUES ('schema_version', $1)
       ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v`,
      [SCHEMA_VERSION],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
