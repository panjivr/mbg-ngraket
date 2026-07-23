import { requireSession } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { computeBoard } from "@/lib/leaderboard";
import { ok, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Papan peringkat versi karyawan: hanya periode yang dipublikasikan admin,
// tanpa baris yang disembunyikan. Menyertakan `me` untuk sorot baris sendiri.
export const GET = route(async () => {
  const s = await requireSession();
  const sppg = await getSppg(s.sppg_id as number);
  const from = sppg?.leaderboard_from || null;
  const to = sppg?.leaderboard_to || null;

  if (!from || !to) {
    return ok({ from: null, to: null, board: [], me: s.uid });
  }

  const { board } = await computeBoard(s.sppg_id as number, from, to);
  return ok({
    from,
    to,
    me: s.uid,
    board: board.filter((r) => !r.hidden),
  });
});
