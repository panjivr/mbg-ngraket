import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";
import CetakHub from "@/components/CetakHub";
import {
  TEMPLATE_KEPALA_DAPUR,
  KELOMPOK_KEPALA_DAPUR,
} from "@/lib/kepala-dapur";

export const dynamic = "force-dynamic";

/**
 * Hub formulir Kepala Dapur / Kepala SPPG. Admin penuh ATAU sub-admin dengan
 * akses "audit" (peran pengawasan operasional). Flag dibaca ulang dari DB.
 */
export default async function KepalaDapurHubPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") {
    const r = await query<{ akses_audit: boolean }>(
      `SELECT akses_audit FROM users WHERE id = $1`,
      [session.uid],
    );
    if (!r[0]?.akses_audit) redirect("/dapur");
  }

  return (
    <CetakHub
      badge="Kepala SPPG"
      judul="Formulir Operasional Kepala Dapur"
      deskripsi="Pilih formulir, isi bidang yang disorot, lalu cetak atau simpan sebagai PDF. Tanggal terisi otomatis. Mengikuti format resmi SPPG Ngraket Balong Ponorogo."
      basePath="/cetak/kepala-dapur"
      templates={TEMPLATE_KEPALA_DAPUR}
      grup={KELOMPOK_KEPALA_DAPUR}
      penanggungJawab={session.nama ?? "Admin"}
      aksenBanner="emerald"
    />
  );
}
