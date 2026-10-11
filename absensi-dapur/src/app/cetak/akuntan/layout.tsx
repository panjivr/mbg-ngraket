import { blokirJikaPerusahaan } from "@/lib/guard-perusahaan";

export const dynamic = "force-dynamic";

// Cetak Berita Acara Akuntan = khas dapur/SPPG → tidak untuk unit perusahaan.
export default async function CetakAkuntanLayout({ children }: { children: React.ReactNode }) {
  await blokirJikaPerusahaan("/admin");
  return <>{children}</>;
}
