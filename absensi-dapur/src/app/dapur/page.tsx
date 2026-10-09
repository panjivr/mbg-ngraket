import AbsenPanel from "@/components/AbsenPanel";
import StaffLeaderboard from "@/components/StaffLeaderboard";
import PengumumanCard from "@/components/PengumumanCard";
import BebanHariIni from "@/components/BebanHariIni";
import PengingatAPD from "@/components/PengingatAPD";
import DapurQuickMenu from "@/components/DapurQuickMenu";
import DapurHero from "@/components/DapurHero";

export const dynamic = "force-dynamic";

export default function DapurPage() {
  return (
    <div className="space-y-4">
      <DapurHero />
      <PengumumanCard />
      <PengingatAPD />
      <BebanHariIni />
      <AbsenPanel />
      <DapurQuickMenu />
      <StaffLeaderboard compact />
    </div>
  );
}
