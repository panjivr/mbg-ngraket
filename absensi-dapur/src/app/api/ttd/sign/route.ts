import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { signTteToken } from "@/lib/tte";
import { ok, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Terbitkan token tanda tangan elektronik untuk dokumen cetak (dipakai QR).
 * Identitas unit diambil dari sesi login (tidak bisa dipalsukan dari klien).
 */
export const POST = route(async (req: NextRequest) => {
  const s = await requireSession();
  const sppg = await getSppg(s.sppg_id as number);
  const b = await req.json().catch(() => ({}));
  const w = String(b.waktu ?? "");
  const j = String(b.jenis ?? "Dokumen").slice(0, 120);
  const token = signTteToken({ u: sppg?.nama || "", w, j, iss: Date.now() });
  return ok({ token });
});
