import { query } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ok, route } from "@/lib/api";
import type { Sop } from "@/lib/sop-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Semua pengguna yang sudah login boleh membaca SOP aktif milik dapurnya.
export const GET = route(async () => {
  const s = await requireSession();
  const rows = await query<Sop>(
    `SELECT * FROM sop
      WHERE sppg_id = $1 AND aktif = TRUE
      ORDER BY urutan ASC, kode ASC, id ASC`,
    [s.sppg_id],
  );
  return ok({ sop: rows });
});
