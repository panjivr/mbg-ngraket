import { blokirJikaPerusahaan } from "@/lib/guard-perusahaan";

export const dynamic = "force-dynamic";

// Cetak dokumen pemasok (PO/faktur) = khas dapur/SPPG → tidak untuk perusahaan.
export default async function CetakSupplierLayout({ children }: { children: React.ReactNode }) {
  await blokirJikaPerusahaan("/admin");
  return <>{children}</>;
}
