import { requireSession } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import { getKartuPegawai } from "@/lib/kartu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const session = await requireSession();
  const kartu = await getKartuPegawai(session.uid);
  if (!kartu) return fail(404, "Data kartu tidak ditemukan.");
  return ok({ kartu });
});
