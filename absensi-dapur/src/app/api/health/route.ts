import { getPool } from "@/lib/db";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cek kesehatan ringan: ping database (SELECT 1). Publik & cepat — dipakai untuk
 * memantau apakah situs + DB hidup (mis. buka /api/health dari HP). Tidak
 * menyentuh data sensitif dan tidak menjalankan migrasi.
 */
export const GET = route(async () => {
  const t0 = Date.now();
  try {
    await getPool().query("SELECT 1");
    return ok({ status: "ok", db: "up", ms: Date.now() - t0 });
  } catch (e) {
    return fail(503, "Database tidak dapat dihubungi: " + ((e as Error)?.message || "unknown"));
  }
});
