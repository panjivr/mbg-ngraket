import AbsenPanel from "@/components/AbsenPanel";
import StaffLeaderboard from "@/components/StaffLeaderboard";

export const dynamic = "force-dynamic";

export default function DapurPage() {
  return (
    <div className="space-y-4">
      <AbsenPanel />
      <StaffLeaderboard compact />
    </div>
  );
}
