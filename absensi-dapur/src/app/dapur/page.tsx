import AbsenPanel from "@/components/AbsenPanel";
import StaffLeaderboard from "@/components/StaffLeaderboard";
import PengumumanCard from "@/components/PengumumanCard";
import BebanHariIni from "@/components/BebanHariIni";
import PengingatAPD from "@/components/PengingatAPD";
import DapurQuickMenu from "@/components/DapurQuickMenu";
import DapurHero from "@/components/DapurHero";
import { getSession } from "@/lib/session";
import { getUserAccess } from "@/lib/user-access";

export const dynamic = "force-dynamic";

export default async function DapurPage() {
  const session = await getSession();
  const me = session ? await getUserAccess(session.uid) : null;
  // Perusahaan/kantor: sembunyikan komponen khas dapur (pengingat APD & beban
  // distribusi). Fitur absensi & lainnya tetap relevan untuk karyawan kantor.
  const perusahaan = me?.sppg_jenis === "perusahaan";

  return (
    <div className="space-y-4">
      <DapurHero />
      <PengumumanCard />
      {!perusahaan && <PengingatAPD />}
      {!perusahaan && <BebanHariIni />}
      <AbsenPanel />
      <DapurQuickMenu />
      <StaffLeaderboard compact />
    </div>
  );
}
