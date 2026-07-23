import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { computeSlip } from "@/lib/slip";
import { ok, fail, route } from "@/lib/api";
import { localDate } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Slip gaji milik sendiri.
export const GET = route(async (req: NextRequest) => {
  const s = await requireSession();
  const sp = req.nextUrl.searchParams;
  const sppg = await getSppg(s.sppg_id as number);
  const today = localDate(sppg?.tz || "Asia/Jakarta");
  const from = DATE_RE.test(sp.get("from") || "") ? sp.get("from")! : today;
  const to = DATE_RE.test(sp.get("to") || "") ? sp.get("to")! : today;
  if (from > to) return fail(400, "Rentang tanggal tidak valid.");

  const slip = await computeSlip(s.sppg_id as number, s.uid, from, to);
  if (!slip) return fail(404, "Data tidak ditemukan.");
  return ok({ slip, dapur: sppg?.nama || "" });
});
