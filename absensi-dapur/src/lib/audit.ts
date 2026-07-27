import { query } from "./db";
import type { SessionData } from "./auth";

export interface AuditRow {
  id: number;
  user_nama: string;
  aksi: string;
  entitas: string;
  ringkasan: string;
  created_at: string;
}

/**
 * Catat satu aktivitas admin ke audit_log. Sengaja "best-effort": kegagalan
 * pencatatan TIDAK boleh menggagalkan aksi utama, jadi error hanya di-log.
 *
 * @param s        sesi admin yang melakukan aksi (untuk sppg_id, user, nama)
 * @param aksi     "buat" | "ubah" | "hapus" | dll
 * @param entitas  objek yang terpengaruh, mis. "Pegawai", "Harga Pagu"
 * @param ringkasan keterangan singkat perubahan (bebas)
 */
export async function catatAudit(
  s: Pick<SessionData, "uid" | "nama" | "sppg_id">,
  aksi: string,
  entitas: string,
  ringkasan: string,
): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_log (sppg_id, user_id, user_nama, aksi, entitas, ringkasan)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [s.sppg_id ?? null, s.uid ?? null, s.nama ?? "", aksi, entitas, ringkasan.slice(0, 500)],
    );
  } catch (err) {
    console.error("[absensi] gagal catat audit:", err instanceof Error ? err.message : err);
  }
}
