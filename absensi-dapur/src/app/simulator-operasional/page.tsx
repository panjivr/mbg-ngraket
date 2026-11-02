import Link from "next/link";
import MarketingShell from "@/components/marketing/MarketingShell";
import Simulator from "@/components/simulator/Simulator";
import { publicMetadata } from "@/lib/marketing";
import "./simulator.css";
const baseMetadata = publicMetadata(
  "/simulator-operasional",
  "Simulator Anggaran Operasional SPPG | Djati",
  "Simulasikan pagu, biaya operasional, honor dan cadangan SPPG tanpa login. Data contoh anonim; skenario disimpan lokal pada browser.",
);
export const metadata = { ...baseMetadata, openGraph: { ...baseMetadata.openGraph, images: [{ url: "/simulator-operasional/opengraph-image", width: 1200, height: 630, alt: "Simulator anggaran operasional SPPG" }] }, twitter: { card: "summary_large_image" as const, images: ["/simulator-operasional/opengraph-image"] } };
export default function SimulatorPage() {
  return (
    <MarketingShell>
      <nav aria-label="Breadcrumb" className="sim-breadcrumb">
        <Link href="/">← Beranda</Link>
        <span> / Simulator operasional</span>
      </nav>
      <Simulator />
    </MarketingShell>
  );
}
