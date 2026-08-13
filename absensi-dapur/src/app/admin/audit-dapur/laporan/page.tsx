import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";
import LaporanClient from "@/components/audit/LaporanClient";

export const dynamic = "force-dynamic";

/**
 * Laporan Audit Dapur — dashboard rekap temuan lintas sesi + tautan cetak.
 * Akses sama dengan hub audit: admin penuh atau pemegang `akses_audit`. Flag
 * dibaca ulang dari DB (pola sama dengan Register & Ahli Gizi).
 */
export default async function LaporanAuditPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") {
    const r = await query<{ akses_audit: boolean }>(
      `SELECT akses_audit FROM users WHERE id = $1`,
      [session.uid],
    );
    if (!r[0]?.akses_audit) redirect("/dapur");
  }

  return <LaporanClient />;
}
