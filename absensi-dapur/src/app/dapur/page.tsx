import AbsenPanel from "@/components/AbsenPanel";
import StaffLeaderboard from "@/components/StaffLeaderboard";
import PengumumanCard from "@/components/PengumumanCard";
import BebanHariIni from "@/components/BebanHariIni";
import PengingatAbsen from "@/components/PengingatAbsen";
import HariIstimewa from "@/components/HariIstimewa";
import DapurQuickMenu from "@/components/DapurQuickMenu";
import DapurHero from "@/components/DapurHero";

export const dynamic = "force-dynamic";

export default function DapurPage() {
  return (
    <div className="space-y-5">
      <DapurHero />
      <HariIstimewa />
      <PengumumanCard />
      <PengingatAbsen />
      <BebanHariIni />
      <AbsenPanel />
      <DapurQuickMenu />
      <StaffLeaderboard compact />
    </div>
  );
}
