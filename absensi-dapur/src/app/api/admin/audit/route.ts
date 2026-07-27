import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ok, route } from "@/lib/api";
import type { AuditRow } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const url = new URL(req.url);
  const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get("limit") || "150", 10) || 150));
  const rows = await query<AuditRow>(
    `SELECT id, user_nama, aksi, entitas, ringkasan, created_at
       FROM audit_log
      WHERE sppg_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2`,
    [admin.sppg_id, limit],
  );
  return ok({ log: rows });
});
