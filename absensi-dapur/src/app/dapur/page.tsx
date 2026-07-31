import AbsenPanel from "@/components/AbsenPanel";
import StaffLeaderboard from "@/components/StaffLeaderboard";
import PengumumanCard from "@/components/PengumumanCard";
import BebanHariIni from "@/components/BebanHariIni";

export const dynamic = "force-dynamic";

export default function DapurPage() {
  return (
    <div className="space-y-4">
      <PengumumanCard />
      <BebanHariIni />
      <AbsenPanel />
      <StaffLeaderboard compact />
    </div>
  );
}
