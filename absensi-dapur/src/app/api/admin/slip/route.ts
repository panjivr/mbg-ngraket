import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { computeSlip } from "@/lib/slip";
import { ok, fail, route } from "@/lib/api";
import { localDate } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const GET = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const sp = req.nextUrl.searchParams;
  const sppg = await getSppg(admin.sppg_id as number);
  const today = localDate(sppg?.tz || "Asia/Jakarta");
  const from = DATE_RE.test(sp.get("from") || "") ? sp.get("from")! : today;
  const to = DATE_RE.test(sp.get("to") || "") ? sp.get("to")! : today;
  const userId = parseInt(sp.get("user") || "", 10);
  if (!Number.isFinite(userId)) return fail(400, "Pegawai tidak valid.");
  if (from > to) return fail(400, "Rentang tanggal tidak valid.");

  const slip = await computeSlip(admin.sppg_id as number, userId, from, to);
  if (!slip) return fail(404, "Pegawai tidak ditemukan.");
  return ok({ slip, dapur: sppg?.nama || "" });
});
