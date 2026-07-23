import AbsenPanel from "@/components/AbsenPanel";
import StaffLeaderboard from "@/components/StaffLeaderboard";
import PengumumanCard from "@/components/PengumumanCard";

export const dynamic = "force-dynamic";

export default function DapurPage() {
  return (
    <div className="space-y-4">
      <PengumumanCard />
      <AbsenPanel />
      <StaffLeaderboard compact />
    </div>
  );
}
