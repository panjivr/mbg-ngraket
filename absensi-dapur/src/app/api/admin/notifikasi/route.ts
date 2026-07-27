import { query } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { ok, route } from "@/lib/api";
import { localDate } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type NotifLevel = "danger" | "warning" | "info";
export interface Notif {
  id: string;
  level: NotifLevel;
  icon: string;
  judul: string;
  detail: string;
  href: string;
}

const rupiah = (n: number) => "Rp " + new Intl.NumberFormat("id-ID").format(n);

/**
 * Pusat notifikasi/pengingat operasional untuk admin & sub-admin, di-scope
 * per dapur (sppg_id) dan per hak akses. Semua data ditarik dari tabel yang
 * sudah ada (barang, izin, kasbon, distribusi, laporan, users) — tanpa skema
 * baru. Item diurutkan: danger → warning → info.
 */
export const GET = route(async () => {
  const s = await requireSession();
  const sppgId = s.sppg_id as number;
  const sppg = await getSppg(sppgId);
  const tanggal = localDate(sppg?.tz || "Asia/Jakarta");

  // Hak akses: tentukan area mana yang relevan bagi user ini.
  const fullAdmin = s.role === "admin";
  let aksesDistribusi = fullAdmin;
  let aksesLaporan = fullAdmin;
  let isHr = fullAdmin;
  if (!fullAdmin) {
    const r = (
      await query<{ akses_distribusi: boolean; akses_laporan: boolean; is_hr: boolean }>(
        `SELECT akses_distribusi, akses_laporan, is_hr FROM users WHERE id = $1`,
        [s.uid],
      )
    )[0];
    aksesDistribusi = !!r?.akses_distribusi;
    aksesLaporan = !!r?.akses_laporan;
    isHr = !!r?.is_hr;
  }
  const lihatGudang = fullAdmin || aksesLaporan;

  const notif: Notif[] = [];

  const [gud, izinRow, kasbonRow, distRow, lapRow, ultahRows] = await Promise.all([
    lihatGudang
      ? query<{ habis: string; menipis: string }>(
          `SELECT COUNT(*) FILTER (WHERE stok <= 0)::text AS habis,
                  COUNT(*) FILTER (WHERE stok > 0 AND stok <= stok_min)::text AS menipis
             FROM barang WHERE sppg_id = $1 AND aktif = TRUE`,
          [sppgId],
        )
      : Promise.resolve([]),
    fullAdmin || isHr
      ? query<{ c: string }>(
          `SELECT COUNT(*)::text AS c FROM izin WHERE sppg_id = $1 AND status = 'pending'`,
          [sppgId],
        )
      : Promise.resolve([]),
    fullAdmin || isHr
      ? query<{ c: string; total: string }>(
          `SELECT COUNT(*)::text AS c, COALESCE(SUM(jumlah),0)::text AS total
             FROM kasbon WHERE sppg_id = $1 AND lunas = FALSE`,
          [sppgId],
        )
      : Promise.resolve([]),
    aksesDistribusi
      ? query<{ c: string }>(
          `SELECT COUNT(*)::text AS c FROM distribusi WHERE sppg_id = $1 AND tanggal = $2`,
          [sppgId, tanggal],
        )
      : Promise.resolve([]),
    aksesLaporan
      ? query<{ c: string }>(
          `SELECT COUNT(*)::text AS c FROM laporan
             WHERE sppg_id = $1 AND tanggal = $2 AND isi <> '{}'::jsonb`,
          [sppgId, tanggal],
        )
      : Promise.resolve([]),
    fullAdmin
      ? query<{ nama: string }>(
          `SELECT nama FROM users
             WHERE sppg_id = $1 AND aktif = TRUE AND tanggal_lahir IS NOT NULL
               AND to_char(tanggal_lahir, 'MM-DD') = to_char($2::date, 'MM-DD')
             ORDER BY nama`,
          [sppgId, tanggal],
        )
      : Promise.resolve([]),
  ]);

  // --- Stok gudang ---
  const habis = Number(gud[0]?.habis || 0);
  const menipis = Number(gud[0]?.menipis || 0);
  if (habis > 0)
    notif.push({
      id: "stok-habis",
      level: "danger",
      icon: "📦",
      judul: `${habis} barang stok habis`,
      detail: "Segera lakukan pembelian / barang masuk.",
      href: "/admin/gudang",
    });
  if (menipis > 0)
    notif.push({
      id: "stok-menipis",
      level: "warning",
      icon: "📦",
      judul: `${menipis} barang menipis`,
      detail: "Stok di bawah batas minimum.",
      href: "/admin/gudang",
    });

  // --- Izin pending ---
  const izinPending = Number(izinRow[0]?.c || 0);
  if (izinPending > 0)
    notif.push({
      id: "izin-pending",
      level: "warning",
      icon: "📝",
      judul: `${izinPending} pengajuan izin menunggu`,
      detail: "Butuh persetujuan / penolakan admin.",
      href: "/admin/izin",
    });

  // --- Kasbon belum lunas ---
  const kasbonCount = Number(kasbonRow[0]?.c || 0);
  const kasbonTotal = Number(kasbonRow[0]?.total || 0);
  if (kasbonCount > 0)
    notif.push({
      id: "kasbon",
      level: "info",
      icon: "💰",
      judul: `${kasbonCount} kasbon belum lunas`,
      detail: `Total ${rupiah(kasbonTotal)} menunggu pelunasan.`,
      href: "/admin/hr",
    });

  // --- Distribusi hari ini belum diinput ---
  if (aksesDistribusi && Number(distRow[0]?.c || 0) === 0)
    notif.push({
      id: "distribusi-kosong",
      level: "warning",
      icon: "🚚",
      judul: "Distribusi hari ini belum diinput",
      detail: "Isi menu & jumlah porsi untuk hari ini.",
      href: "/admin/distribusi",
    });

  // --- Laporan harian hari ini belum diisi ---
  if (aksesLaporan && Number(lapRow[0]?.c || 0) === 0)
    notif.push({
      id: "laporan-kosong",
      level: "warning",
      icon: "📋",
      judul: "Laporan harian belum diisi",
      detail: "Lengkapi laporan kegiatan hari ini.",
      href: "/admin/laporan",
    });

  // --- Ulang tahun hari ini ---
  if (ultahRows.length > 0)
    notif.push({
      id: "ultah",
      level: "info",
      icon: "🎂",
      judul:
        ultahRows.length === 1
          ? `${ultahRows[0].nama} berulang tahun hari ini`
          : `${ultahRows.length} pegawai berulang tahun hari ini`,
      detail: ultahRows.map((u) => u.nama).join(", "),
      href: "/admin/pegawai",
    });

  const rank: Record<NotifLevel, number> = { danger: 0, warning: 1, info: 2 };
  notif.sort((a, b) => rank[a.level] - rank[b.level]);

  const perluAksi = notif.filter((n) => n.level !== "info").length;
  return ok({ tanggal, notif, count: notif.length, perluAksi });
});
