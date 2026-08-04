import StaffLeaderboard from "@/components/StaffLeaderboard";

export const dynamic = "force-dynamic";

export default function PeringkatPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">🏆 Papan Peringkat</h1>
      <StaffLeaderboard />

      <div className="card space-y-2 p-4 text-xs text-slate-400">
        <p className="text-sm font-semibold text-slate-200">
          📊 Cara skor dihitung (0–100)
        </p>
        <p>
          Skor dijumlahkan dari 3 komponen berbasis <b>rasio</b> — jadi adil
          untuk yang jumlah hari kerjanya berbeda:
        </p>
        <ul className="space-y-1">
          <li>
            <b className="text-gold-300">Ketepatan waktu · maks 55</b> — jumlah
            hari datang tepat waktu ÷ jumlah hari hadir.
          </li>
          <li>
            <b className="text-gold-300">Keaktifan hadir · maks 25</b> — jumlah
            hari hadir ÷ hari operasional (izin resmi tidak menghukum skor).
          </li>
          <li>
            <b className="text-gold-300">Kelengkapan presensi · maks 20</b> —
            jumlah clock-out lengkap ÷ jumlah hari hadir.
          </li>
        </ul>
        <p>
          Ketuk nama siapa pun di papan untuk melihat rincian angkanya —
          semua transparan, tidak ada yang disembunyikan. Pakai tab{" "}
          <span className="text-gold-300">Dapur ini</span> untuk peringkat
          dapur sendiri, atau <span className="text-gold-300">Global</span>{" "}
          untuk gabungan semua dapur.
        </p>
      </div>
    </div>
  );
}
