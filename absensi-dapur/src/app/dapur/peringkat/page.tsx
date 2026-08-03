import StaffLeaderboard from "@/components/StaffLeaderboard";

export const dynamic = "force-dynamic";

export default function PeringkatPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">🏆 Papan Peringkat</h1>
      <StaffLeaderboard />
      <p className="text-xs text-slate-400">
        Skor kinerja 0–100 dihitung dari ketepatan waktu, keaktifan kehadiran,
        dan kelengkapan presensi selama periode berjalan. Pakai tab{" "}
        <span className="text-gold-300">Dapur ini</span> untuk peringkat dapur
        sendiri, atau <span className="text-gold-300">Global</span> untuk
        gabungan semua dapur.
      </p>
    </div>
  );
}
