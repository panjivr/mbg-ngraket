import { requireSession } from "@/lib/session";
import { ok, route } from "@/lib/api";
import {
  daftarTurnamen,
  papanGlobal,
  papanTurnamen,
  statSaya,
  type Turnamen,
  type TurnamenRow,
} from "@/lib/game";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Papan peringkat lengkap untuk halaman game karyawan:
// - papan global sepanjang masa
// - statistik pribadi (untuk menyorot baris sendiri)
// - turnamen yang sedang berlangsung beserta peringkatnya
export const GET = route(async () => {
  const s = await requireSession();
  const [global, saya, turnamen] = await Promise.all([
    papanGlobal(100),
    statSaya(s.uid),
    daftarTurnamen(),
  ]);

  const aktif = turnamen.filter((t) => t.status === "berlangsung");
  const papan = await Promise.all(
    aktif.map((t) => papanTurnamen(t.mulai, t.selesai, 50)),
  );
  const turnamenAktif: Array<Turnamen & { papan: TurnamenRow[] }> = aktif.map(
    (t, i) => ({ ...t, papan: papan[i] }),
  );

  return ok({
    me: s.uid,
    saya,
    global,
    turnamenAktif,
    turnamen,
  });
});
