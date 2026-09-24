import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import { bersihkanSkor, simpanSkor, statSaya } from "@/lib/game";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Statistik game milik sendiri (rekor terbaik, jumlah main, peringkat global).
export const GET = route(async () => {
  const s = await requireSession();
  return ok(await statSaya(s.uid));
});

// Kirim skor setelah permainan selesai (atau saat rekor baru tercapai).
export const POST = route(async (req: NextRequest) => {
  const s = await requireSession();
  const body = await req.json().catch(() => null);
  const skor = bersihkanSkor(body?.skor);
  if (skor == null) return fail(400, "Skor tidak valid.");
  const selesai = body?.reason === "over";
  const stat = await simpanSkor(s.uid, skor, selesai);
  return ok(stat);
});
