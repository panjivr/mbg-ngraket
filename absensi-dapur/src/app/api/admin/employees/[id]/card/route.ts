import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import { getKartuPegawai } from "@/lib/kartu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req: NextRequest, ctx: Ctx) => {
  await requireAdmin();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  const kartu = await getKartuPegawai(id);
  if (!kartu) return fail(404, "Pegawai tidak ditemukan.");
  return ok({ kartu });
});
