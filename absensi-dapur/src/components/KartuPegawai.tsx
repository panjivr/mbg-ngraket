import { fmtDurasi } from "@/lib/time";
import { kartuMistik } from "@/lib/kesimpulan";
import type { KartuPegawai as Kartu } from "@/lib/types";

function initials(nama: string) {
  const p = nama.trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
}

function fmtBulanTahun(v: string) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" }).format(d);
}

/**
 * Kartu pegawai bergaya kartu koleksi (holografik). Lebar tetap 340px agar
 * hasil ekspor gambar konsisten saat dibagikan.
 */
export default function KartuPegawai({ data }: { data: Kartu }) {
  const stars = Array.from({ length: 5 }, (_, i) => i < data.bintang);
  const mistik = kartuMistik(data.nama, data.tanggal_lahir, data.jenis_kelamin);

  return (
    <div className="relative w-[340px] rounded-2xl bg-gradient-to-br from-emas-400 via-gold-400 to-emas-500 p-[3px] shadow-[0_18px_50px_-12px_rgba(224,169,46,0.5)]">
      {/* kilau holografik */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-30 mix-blend-screen"
        style={{
          backgroundImage:
            "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.55) 45%, rgba(91,139,255,0.4) 55%, transparent 70%)",
        }}
      />
      <div className="relative overflow-hidden rounded-[14px] bg-gradient-to-b from-ink-800 to-ink-950 p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold leading-tight text-white">
              {data.nama}
            </p>
            <p className="text-[11px] text-slate-300">{data.jabatan || "Tim Dapur MBG"}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[9px] font-bold uppercase tracking-wider text-emas-300">
              Jam Kerja
            </p>
            <p className="font-mono text-lg font-black leading-none text-emas-300">
              {fmtDurasi(data.total_menit) === "—" ? "0m" : fmtDurasi(data.total_menit)}
            </p>
          </div>
        </div>

        {/* Bintang */}
        <div className="mt-1 flex items-center gap-0.5 text-sm">
          {stars.map((on, i) => (
            <span key={i} className={on ? "text-emas-300" : "text-white/20"}>
              ★
            </span>
          ))}
          <span className="ml-1.5 text-[10px] text-slate-400">
            ketepatan {data.ketepatan}%
          </span>
        </div>

        {/* Foto */}
        <div className="relative mt-2 aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-ink-700 to-ink-900">
          {data.foto_profil ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.foto_profil}
              alt={`Foto ${data.nama}`}
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="grid h-full w-full place-items-center">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-gold-500/25 text-2xl font-black text-gold-300">
                {initials(data.nama)}
              </span>
            </div>
          )}
          {/* badge divisi + lambang */}
          <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-emas-200 backdrop-blur-sm">
            {data.divisi_nama || "Umum"}
          </span>
          <img
            src="/bgn-logo.webp"
            alt=""
            className="absolute right-2 top-2 h-8 w-8 rounded-full bg-white/90 object-contain ring-1 ring-emas-400/60"
          />
        </div>

        {/* Tipe / jadwal */}
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="rounded-md bg-gold-500/20 px-2 py-0.5 font-semibold text-gold-300">
            {data.divisi_nama || "Tanpa Divisi"}
          </span>
          <span className="font-mono text-slate-300">
            {data.jam_masuk && data.jam_pulang
              ? `${data.jam_masuk}–${data.jam_pulang}`
              : "Jam fleksibel"}
          </span>
        </div>

        {/* Statistik */}
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
          <Stat label="Shift" value={String(data.jumlah_shift)} />
          <Stat label="Tepat" value={String(data.tepat)} tone="text-emerald-300" />
          <Stat label="Sejak" value={fmtBulanTahun(data.created_at)} />
        </div>

        {/* Jobdesk */}
        <div className="mt-2 rounded-lg border border-emas-400/20 bg-emas-400/5 p-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-emas-300">
            ⚔ Jobdesk
          </p>
          <p className="mt-0.5 line-clamp-3 text-[11px] leading-snug text-slate-200">
            {data.jobdesk || "Mendukung operasional dapur MBG sesuai arahan."}
          </p>
        </div>

        {/* Bio */}
        {data.bio && (
          <p className="mt-2 line-clamp-2 text-[11px] italic leading-snug text-slate-300">
            “{data.bio}”
          </p>
        )}

        {/* Primbon: Weton · Shio · Numerologi + Kesimpulan */}
        {mistik && (
          <div className="mt-2 rounded-lg border border-emas-400/25 bg-gradient-to-br from-emas-400/10 to-gold-500/5 p-2">
            <div className="flex flex-wrap gap-1">
              {mistik.weton && (
                <span className="rounded-md bg-black/30 px-1.5 py-0.5 text-[9px] font-semibold text-emas-200">
                  🔮 {mistik.weton}
                  {mistik.neptu ? ` · ${mistik.neptu}` : ""}
                </span>
              )}
              {mistik.headline && (
                <span className="rounded-md bg-black/30 px-1.5 py-0.5 text-[9px] font-semibold text-emas-200">
                  {mistik.shioEmoji ? mistik.shioEmoji + " " : "🧧 "}
                  {mistik.headline}
                </span>
              )}
              {mistik.angka != null && (
                <span className="rounded-md bg-black/30 px-1.5 py-0.5 text-[9px] font-semibold text-emas-200">
                  🔢 Angka {mistik.angka}
                  {mistik.planet ? ` · ${mistik.planet}` : ""}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[9px] font-bold uppercase tracking-wider text-emas-300">
              ✦ Kesimpulan
            </p>
            <p className="text-[10px] font-semibold leading-snug text-white">
              {mistik.peran}
            </p>
            {mistik.bidang && (
              <p className="text-[10px] leading-snug text-slate-200">
                Bidang cocok: {mistik.bidang}
              </p>
            )}
            {mistik.kekuatan && (
              <p className="text-[10px] leading-snug text-slate-300">
                Kekuatan: {mistik.kekuatan}
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-1.5 text-[9px] text-slate-400">
          <span>NIP {data.nip || "—"}</span>
          <span className="font-semibold tracking-wide text-emas-300/80">
            ABSENSI DAPUR · BGN
          </span>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "text-white",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg bg-white/5 px-1 py-1.5">
      <p className={"text-sm font-bold leading-none " + tone}>{value}</p>
      <p className="mt-0.5 text-[9px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
