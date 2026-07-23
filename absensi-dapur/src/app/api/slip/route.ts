import { requireSession } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { computeSlip } from "@/lib/slip";
import { query } from "@/lib/db";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Waktu sekarang di zona dapur sebagai string "YYYY-MM-DDTHH:MM" (bisa
// dibandingkan langsung dengan nilai datetime-local yang disimpan HR).
function nowLocal(tz: string): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)?.value || "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

function fmtLocal(s: string): string {
  const [d, t] = s.split("T");
  const [y, m, dd] = d.split("-");
  const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${Number(dd)} ${bulan[Number(m) - 1]} ${y} ${t}`;
}

// Cek apakah slip sedang boleh ditampilkan ke karyawan (diatur HR).
function windowInfo(
  sppg: {
    slip_aktif: boolean;
    slip_period_from: string | null;
    slip_period_to: string | null;
    slip_show_from: string | null;
    slip_show_until: string | null;
  },
  tz: string,
): { visible: boolean; pesan: string; from?: string; to?: string } {
  if (!sppg.slip_aktif || !sppg.slip_period_from || !sppg.slip_period_to) {
    return { visible: false, pesan: "Slip gaji belum tersedia. Menunggu penerbitan dari HR." };
  }
  const now = nowLocal(tz);
  if (sppg.slip_show_from && now < sppg.slip_show_from) {
    return { visible: false, pesan: "Slip gaji akan tersedia mulai " + fmtLocal(sppg.slip_show_from) + "." };
  }
  if (sppg.slip_show_until && now > sppg.slip_show_until) {
    return { visible: false, pesan: "Masa tampil slip gaji periode ini telah berakhir." };
  }
  return { visible: true, pesan: "", from: sppg.slip_period_from, to: sppg.slip_period_to };
}

export const GET = route(async () => {
  const s = await requireSession();
  const sppg = await getSppg(s.sppg_id as number);
  if (!sppg) return fail(404, "Data dapur tidak ditemukan.");
  const w = windowInfo(sppg, sppg.tz || "Asia/Jakarta");
  if (!w.visible) return ok({ visible: false, pesan: w.pesan });

  const slip = await computeSlip(s.sppg_id as number, s.uid, w.from!, w.to!);
  if (!slip) return fail(404, "Data tidak ditemukan.");
  // HR bisa menonaktifkan tampilan slip untuk pegawai tertentu.
  if (!slip.user.slip_show) {
    return ok({ visible: false, pesan: "Slip Anda belum diterbitkan oleh HR." });
  }
  return ok({ visible: true, slip, dapur: sppg.nama || "" });
});

// Karyawan mengonfirmasi telah menerima slip periode berjalan.
export const POST = route(async () => {
  const s = await requireSession();
  const sppg = await getSppg(s.sppg_id as number);
  if (!sppg) return fail(404, "Data dapur tidak ditemukan.");
  const w = windowInfo(sppg, sppg.tz || "Asia/Jakarta");
  if (!w.visible) return fail(403, "Slip tidak sedang ditampilkan.");
  await query(
    `INSERT INTO slip_konfirmasi (user_id, periode_from, periode_to)
     VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [s.uid, w.from, w.to],
  );
  return ok({ confirmed: true });
});
