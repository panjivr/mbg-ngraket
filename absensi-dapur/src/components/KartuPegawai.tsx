import type { KartuPegawai as Kartu } from "@/lib/types";

function initials(nama: string) {
  const p = nama.trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
}

/**
 * Kartu tanda pegawai (ID card) — hanya menampilkan info penting: foto, nama,
 * jabatan, divisi, NIP, dan identitas dapur/BGN. Lebar tetap 340px agar hasil
 * ekspor gambar konsisten saat dicetak. Foto memakai penyesuaian zoom & posisi
 * (foto_zoom / foto_pos_x / foto_pos_y) supaya wajah tidak ke-crop.
 */
export default function KartuPegawai({ data }: { data: Kartu }) {
  const zoom = data.foto_zoom || 1;
  const posX = data.foto_pos_x ?? 50;
  const posY = data.foto_pos_y ?? 50;

  return (
    <div className="relative w-[340px] rounded-2xl bg-gradient-to-br from-emas-400 via-gold-400 to-emas-500 p-[3px] shadow-[0_18px_50px_-12px_rgba(224,169,46,0.5)]">
      <div className="relative overflow-hidden rounded-[14px] bg-gradient-to-b from-ink-800 to-ink-950">
        {/* Header instansi */}
        <div className="flex items-center gap-2 border-b border-white/10 bg-black/20 px-3 py-2">
          <img
            src="/bgn-logo.webp"
            alt=""
            className="h-9 w-9 shrink-0 rounded-full bg-white/90 object-contain ring-1 ring-emas-400/60"
            crossOrigin="anonymous"
          />
          <div className="min-w-0 leading-tight">
            <p className="text-[11px] font-black uppercase tracking-wide text-emas-300">
              Kartu Tanda Pegawai
            </p>
            <p className="truncate text-[9px] uppercase tracking-wider text-slate-400">
              Absensi Dapur · MBG · BGN
            </p>
          </div>
        </div>

        <div className="p-3">
          {/* Foto potret — adjustable agar wajah pas, tidak ke-crop */}
          <div className="relative mx-auto aspect-[3/4] w-[62%] overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-ink-700 to-ink-900">
            {data.foto_profil ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.foto_profil}
                alt={`Foto ${data.nama}`}
                className="h-full w-full object-cover"
                style={{ objectPosition: `${posX}% ${posY}%`, transform: `scale(${zoom})` }}
                crossOrigin="anonymous"
              />
            ) : (
              <div className="grid h-full w-full place-items-center">
                <span className="grid h-20 w-20 place-items-center rounded-full bg-gold-500/25 text-2xl font-black text-gold-300">
                  {initials(data.nama)}
                </span>
              </div>
            )}
            <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-emas-200 backdrop-blur-sm">
              {data.divisi_nama || "Umum"}
            </span>
          </div>

          {/* Nama & jabatan */}
          <div className="mt-3 text-center">
            <p className="truncate text-lg font-extrabold leading-tight text-white">
              {data.nama}
            </p>
            <p className="text-[12px] font-medium text-emas-300">
              {data.jabatan || "Tim Dapur MBG"}
            </p>
          </div>

          {/* Detail identitas */}
          <div className="mt-3 space-y-1.5 rounded-lg border border-white/10 bg-white/5 p-2.5">
            <Row label="NIP" value={data.nip || "—"} mono />
            <Row label="Divisi" value={data.divisi_nama || "Tanpa Divisi"} />
            <Row
              label="Jam Kerja"
              value={
                data.jam_masuk && data.jam_pulang
                  ? `${data.jam_masuk}–${data.jam_pulang}`
                  : "Fleksibel"
              }
              mono
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-black/20 px-3 py-1.5 text-[9px] text-slate-400">
          <span>Kartu resmi pegawai</span>
          <span className="font-semibold tracking-wide text-emas-300/80">
            ABSENSI DAPUR · BGN
          </span>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="shrink-0 uppercase tracking-wide text-slate-400">{label}</span>
      <span
        className={
          "min-w-0 truncate text-right font-semibold text-slate-100 " +
          (mono ? "font-mono" : "")
        }
      >
        {value}
      </span>
    </div>
  );
}
