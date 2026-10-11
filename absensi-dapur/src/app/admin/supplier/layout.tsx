import { blokirJikaPerusahaan } from "@/lib/guard-perusahaan";

export const dynamic = "force-dynamic";

// Dokumen pemasok (PO/faktur) = fitur khas dapur/SPPG → tidak untuk perusahaan.
export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  await blokirJikaPerusahaan("/admin");
  return <>{children}</>;
}
