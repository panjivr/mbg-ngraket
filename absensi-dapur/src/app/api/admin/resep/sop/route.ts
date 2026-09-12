import { NextRequest } from "next/server";
import { requireAkses } from "@/lib/session";
import { ok, route } from "@/lib/api";
import { getSteps, ALAT_DEFAULT, DIVISI_DEFAULT } from "@/lib/resep-sop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?ids=R001,R002 — langkah SOP untuk resep terpilih + default alat & divisi.
export const GET = route(async (req: NextRequest) => {
  await requireAkses(["distribusi", "gizi", "laporan", "keuangan"]);
  const idsParam = req.nextUrl.searchParams.get("ids") || "";
  const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 60);
  return ok({ steps: getSteps(ids), alat: ALAT_DEFAULT, divisi: DIVISI_DEFAULT });
});
