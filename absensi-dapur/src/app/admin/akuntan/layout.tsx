import { blokirJikaPerusahaan } from "@/lib/guard-perusahaan";

export const dynamic = "force-dynamic";

// Berita Acara / Akuntan = fitur khas dapur/SPPG → tidak untuk unit perusahaan.
export default async function AkuntanLayout({ children }: { children: React.ReactNode }) {
  await blokirJikaPerusahaan("/admin");
  return <>{children}</>;
}
