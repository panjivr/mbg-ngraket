import type { BoardRow, Komponen } from "@/lib/leaderboard";

function skorColor(s: number): string {
  if (s >= 85) return "text-emerald-300";
  if (s >= 70) return "text-gold-400";
  if (s >= 50) return "text-amber-300";
  return "text-rose-300";
}

// Rincian angka & persen tiap komponen skor — transparan agar tidak ada iri.
export default function SkorRincian({ r }: { r: BoardRow }) {
  return (
    <div className="space-y-2.5">
      <KomponenBar
        label="Ketepatan Waktu"
        bobot={55}
        k={r.ketepatan}
        rumus={`${r.tepat} tepat ÷ ${r.hadir} hadir`}
      />
      <KomponenBar
        label="Keaktifan"
        bobot={25}
        k={r.keaktifan}
        rumus={`${r.hadir} hadir ÷ ${r.op_days} hari operasional`}
      />
      <KomponenBar
        label="Kelengkapan Presensi"
        bobot={20}
        k={r.kelengkapan}
        rumus={`${r.selesai} clock-out ÷ ${r.hadir} hadir`}
      />
      <div className="flex flex-wrap items-center justify-between gap-1 border-t border-white/10 pt-2 text-sm">
        <span className="font-semibold text-slate-200">Total Skor</span>
        <span className={`font-bold ${skorColor(r.skor)}`}>
          {r.ketepatan.poin} + {r.keaktifan.poin} + {r.kelengkapan.poin} ={" "}
          <span className="text-lg">{r.skor.toFixed(1)}</span>
        </span>
      </div>
    </div>
  );
}

function KomponenBar({
  label,
  bobot,
  k,
  rumus,
}: {
  label: string;
  bobot: number;
  k: Komponen;
  rumus: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
        <span className="font-medium text-slate-300">
          {label} <span className="text-slate-500">(maks {bobot} poin)</span>
        </span>
        <span className="text-slate-400">
          {rumus} = <b className="text-slate-200">{k.pct}%</b> →{" "}
          <b className="text-gold-400">{k.poin} poin</b>
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gold-400"
          style={{ width: `${k.pct}%` }}
        />
      </div>
    </div>
  );
}
