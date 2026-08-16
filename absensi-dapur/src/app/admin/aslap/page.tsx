import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";
import CetakHub from "@/components/CetakHub";
import { TEMPLATE_ASLAP, KELOMPOK_ASLAP } from "@/lib/aslap";

export const dynamic = "force-dynamic";

/**
 * Hub formulir Asisten Lapangan (distribusi). Admin penuh ATAU sub-admin
 * dengan akses "distribusi". Flag dibaca ulang dari DB.
 */
export default async function AslapHubPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") {
    const r = await query<{ akses_distribusi: boolean }>(
      `SELECT akses_distribusi FROM users WHERE id = $1`,
      [session.uid],
    );
    if (!r[0]?.akses_distribusi) redirect("/dapur");
  }

  return (
    <CetakHub
      badge="Asisten Lapangan"
      judul="Formulir Distribusi Lapangan"
      deskripsi="Pilih formulir serah terima & monitoring distribusi, isi bidang yang disorot, lalu cetak sebagai PDF. Tanggal terisi otomatis. Format resmi SPPG Ngraket Balong Ponorogo."
      basePath="/cetak/aslap"
      templates={TEMPLATE_ASLAP}
      grup={KELOMPOK_ASLAP}
      penanggungJawab={session.nama ?? "Admin"}
      aksenBanner="sky"
    />
  );
}
