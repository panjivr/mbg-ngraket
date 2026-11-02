import Link from "next/link";
import MarketingShell from "@/components/marketing/MarketingShell";
import Simulator from "@/components/simulator/Simulator";
import { publicMetadata } from "@/lib/marketing";
import "./simulator.css";
export const metadata = publicMetadata(
  "/simulator-operasional",
  "Simulator Anggaran Operasional SPPG | Djati",
  "Simulasikan pagu, biaya operasional, honor dan cadangan SPPG tanpa login. Data contoh anonim; skenario disimpan lokal pada browser.",
);
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
