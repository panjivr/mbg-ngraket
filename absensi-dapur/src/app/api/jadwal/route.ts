import { query } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { ok, route } from "@/lib/api";
import { localDate } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Row {
  tanggal: string;
  jam_masuk: string | null;
  jam_pulang: string | null;
  keterangan: string | null;
  libur: boolean;
}

// Jadwal kerja karyawan sendiri, dari hari ini ke depan (± 3 minggu).
export const GET = route(async () => {
  const s = await requireSession();
  const sppg = await getSppg(s.sppg_id as number);
  const today = localDate(sppg?.tz || "Asia/Jakarta");
  const rows = await query<Row>(
    `SELECT tanggal, jam_masuk, jam_pulang, keterangan, libur
       FROM jadwal_kerja
      WHERE user_id = $1 AND tanggal >= $2
      ORDER BY tanggal ASC LIMIT 31`,
    [s.uid, today],
  );
  return ok({ jadwal: rows, today });
});
