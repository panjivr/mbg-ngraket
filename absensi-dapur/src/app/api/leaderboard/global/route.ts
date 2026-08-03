import { requireSession } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { computeGlobalBoard } from "@/lib/leaderboard";
import { ok, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Papan peringkat GLOBAL lintas dapur: gabungan seluruh dapur yang sudah
// mempublikasikan periode papannya. Menyertakan `me` + `myDapur` agar baris
// pengguna sendiri tersorot tepat (user_id bisa sama antar dapur, jadi harus
// dicocokkan bersama nama dapur asal).
export const GET = route(async () => {
  const s = await requireSession();
  const [board, sppg] = await Promise.all([
    computeGlobalBoard(),
    getSppg(s.sppg_id as number),
  ]);
  return ok({ me: s.uid, myDapur: sppg?.nama || null, board });
});
