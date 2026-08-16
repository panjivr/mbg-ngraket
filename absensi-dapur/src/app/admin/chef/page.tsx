import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";
import CetakHub from "@/components/CetakHub";
import { TEMPLATE_CHEF, KELOMPOK_CHEF } from "@/lib/chef";

export const dynamic = "force-dynamic";

/**
 * Hub formulir Chef / Kepala Produksi. Admin penuh ATAU sub-admin dengan akses
 * "gizi" atau "laporan" (peran dapur produksi). Flag dibaca ulang dari DB.
 */
export default async function ChefHubPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") {
    const r = await query<{ akses_gizi: boolean; akses_laporan: boolean }>(
      `SELECT akses_gizi, akses_laporan FROM users WHERE id = $1`,
      [session.uid],
    );
    if (!r[0]?.akses_gizi && !r[0]?.akses_laporan) redirect("/dapur");
  }

  return (
    <CetakHub
      badge="Chef / Produksi"
      judul="Formulir Produksi Dapur"
      deskripsi="Pilih formulir perencanaan & kendali mutu produksi, isi bidang yang disorot, lalu cetak sebagai PDF. Tanggal terisi otomatis. Format resmi SPPG Ngraket Balong Ponorogo."
      basePath="/cetak/chef"
      templates={TEMPLATE_CHEF}
      grup={KELOMPOK_CHEF}
      penanggungJawab={session.nama ?? "Admin"}
      aksenBanner="amber"
    />
  );
}
