import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";
import AuditWorkspace from "@/components/audit/AuditWorkspace";

export const dynamic = "force-dynamic";

/**
 * Hub Audit Dapur — hanya untuk admin penuh atau pemegang akses `akses_audit`
 * (Auditor QC). Flag dibaca ulang dari DB agar pemberian/pencabutan akses langsung
 * berlaku tanpa login ulang, sama pola dengan Ahli Gizi.
 */
export default async function AuditDapurPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") {
    const r = await query<{ akses_audit: boolean }>(
      `SELECT akses_audit FROM users WHERE id = $1`,
      [session.uid],
    );
    if (!r[0]?.akses_audit) redirect("/dapur");
  }

  return <AuditWorkspace auditorNama={session.nama ?? "Auditor"} />;
}
