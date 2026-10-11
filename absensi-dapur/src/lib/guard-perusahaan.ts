import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUserAccess } from "@/lib/user-access";

/**
 * Penjaga server: alihkan pengguna unit "perusahaan" dari halaman yang khusus
 * dapur/SPPG (mis. Berita Acara Akuntan & dokumen pemasok). Fitur ini memang
 * tidak relevan untuk kantor/usaha, jadi tidak boleh diakses walau lewat URL
 * langsung — bukan sekadar disembunyikan dari navigasi.
 */
export async function blokirJikaPerusahaan(to = "/admin"): Promise<void> {
  const session = await getSession();
  if (!session) return;
  const me = await getUserAccess(session.uid);
  if (me?.sppg_jenis === "perusahaan") redirect(to);
}
