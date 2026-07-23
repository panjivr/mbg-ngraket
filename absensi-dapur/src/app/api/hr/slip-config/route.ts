import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireHr } from "@/lib/session";
import { getSppg, invalidateSppg } from "@/lib/sppg";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export const GET = route(async () => {
  const hr = await requireHr();
  const sppg = await getSppg(hr.sppg_id as number);
  return ok({
    config: {
      period_from: sppg?.slip_period_from || null,
      period_to: sppg?.slip_period_to || null,
      show_from: sppg?.slip_show_from || null,
      show_until: sppg?.slip_show_until || null,
      aktif: !!sppg?.slip_aktif,
    },
  });
});

export const POST = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const b = await req.json().catch(() => ({}));
  const pf = b.period_from ? String(b.period_from) : "";
  const pt = b.period_to ? String(b.period_to) : "";
  const sf = b.show_from ? String(b.show_from) : "";
  const su = b.show_until ? String(b.show_until) : "";
  const aktif = Boolean(b.aktif);

  if (aktif) {
    if (!DATE_RE.test(pf) || !DATE_RE.test(pt)) return fail(400, "Periode slip belum lengkap.");
    if (pf > pt) return fail(400, "Tanggal periode tidak valid.");
  }
  if (sf && !DT_RE.test(sf)) return fail(400, "Waktu mulai tampil tidak valid.");
  if (su && !DT_RE.test(su)) return fail(400, "Waktu akhir tampil tidak valid.");
  if (sf && su && sf > su) return fail(400, "Jendela tampil tidak valid.");

  await query(
    `UPDATE sppg SET slip_period_from = $1, slip_period_to = $2,
            slip_show_from = $3, slip_show_until = $4, slip_aktif = $5 WHERE id = $6`,
    [pf || null, pt || null, sf || null, su || null, aktif, hr.sppg_id],
  );
  invalidateSppg(hr.sppg_id as number);
  return ok({ saved: true });
});
