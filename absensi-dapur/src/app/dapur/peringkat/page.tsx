import StaffLeaderboard from "@/components/StaffLeaderboard";

export const dynamic = "force-dynamic";

export default function PeringkatPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">🏆 Papan Peringkat</h1>
      <StaffLeaderboard />
      <p className="text-xs text-slate-400">
        Skor kinerja 0–100 dihitung dari ketepatan waktu, keaktifan kehadiran,
        dan kelengkapan presensi selama periode berjalan.
      </p>
    </div>
  );
}
