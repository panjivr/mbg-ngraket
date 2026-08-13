import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";
import RegisterClient from "@/components/audit/RegisterClient";

export const dynamic = "force-dynamic";

/**
 * Register Temuan Audit — daftar seluruh temuan lintas sesi dengan filter, detail,
 * dan matriks follow-up mingguan. Akses sama dengan hub audit: admin penuh atau
 * pemegang `akses_audit`. Flag dibaca ulang dari DB (pola sama dengan Ahli Gizi).
 */
export default async function RegisterAuditPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") {
    const r = await query<{ akses_audit: boolean }>(
      `SELECT akses_audit FROM users WHERE id = $1`,
      [session.uid],
    );
    if (!r[0]?.akses_audit) redirect("/dapur");
  }

  return <RegisterClient />;
}
