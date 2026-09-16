import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { getSppg } from "@/lib/sppg";
import { localDate } from "@/lib/time";
import {
  mergeInfoGizi,
  angkaId,
  tanggalPanjang,
  KATEGORI_MENU,
  KATEGORI_MENU_LABEL,
  DESAIN_RASIO,
  DESAIN_LEBAR,
  DESAIN_TINGGI,
  type InfoGiziIsi,
  type KategoriMenu,
} from "@/lib/info-gizi";
import { PorsiTabs, Countdown, ShareButton } from "./Interaktif";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Halaman ini publik tapi "tidak terdaftar": hanya ditemukan lewat scan QR,
// jadi mesin pencari sengaja tidak diizinkan mengindeks.
export const metadata: Metadata = {
  title: "Informasi Gizi Harian",
  robots: { index: false, follow: false },
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const HIJAU_TUA = "#04341f";
const HIJAU = "#0b6b3a";
const EMAS = "#f5c518";

/**
 * Latar berlapis: gradien utama + dua cahaya radial (emas di atas, hijau muda
 * di bawah) supaya halaman tidak terlihat rata saat dipindai di layar HP.
 */
const LATAR = [
  "radial-gradient(120% 60% at 50% -10%, rgba(245,197,24,0.22) 0%, rgba(245,197,24,0) 60%)",
  "radial-gradient(90% 50% at 0% 100%, rgba(16,185,129,0.20) 0%, rgba(16,185,129,0) 65%)",
  `linear-gradient(170deg, ${HIJAU} 0%, ${HIJAU_TUA} 55%, #021a10 100%)`,
].join(", ");

function Kartu({ children }: { children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white/[0.97] shadow-[0_14px_36px_rgba(0,0,0,0.30)] ring-1 ring-black/5">
      <div className="h-1 w-full bg-gradient-to-r from-[#0b6b3a] via-[#16a34a] to-[#f5c518]" />
      <div className="p-4">{children}</div>
    </section>
  );
}

function JudulBagian({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2.5 flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] text-slate-500">
      <span className="h-3 w-1 rounded-full" style={{ backgroundColor: EMAS }} />
      {children}
    </h2>
  );
}

function BarisMenu({
  kategori,
  items,
}: {
  kategori: KategoriMenu;
  items: InfoGiziIsi["menu"];
}) {
  if (!items.length) return null;
  return (
    <div className="border-t border-dashed border-black/10 py-2.5 first:border-t-0 first:pt-0">
      <p className="text-[10px] font-bold tracking-[0.14em] text-slate-400">
        {KATEGORI_MENU_LABEL[kategori]}
      </p>
      {items.map((m, i) => (
        <div key={i} className="mt-0.5 flex items-baseline gap-2">
          <span
            aria-hidden
            className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: HIJAU }}
          />
          <p className="text-[15px] font-semibold leading-snug text-slate-900">{m.nama}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Poster harian 4:5. Tingginya selalu mengikuti lebar kolom (aspect-ratio),
 * jadi tidak ada layout shift saat gambar selesai dimuat.
 */
function Desain({ src, tanggal }: { src: string; tanggal: string }) {
  return (
    <figure className="lg:order-1 lg:sticky lg:top-6">
      <div className="overflow-hidden rounded-2xl bg-black/20 shadow-[0_18px_50px_rgba(0,0,0,0.45)] ring-1 ring-white/15">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`Desain menu ${tanggalPanjang(tanggal)}`}
          width={DESAIN_LEBAR}
          height={DESAIN_TINGGI}
          className="block w-full object-cover"
          style={{ aspectRatio: DESAIN_RASIO }}
        />
      </div>
    </figure>
  );
}

export default async function InfoGiziPublikPage({
  params,
  searchParams,
}: {
  params: Promise<{ kode: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { kode } = await params;
  const { t } = await searchParams;

  const sppgId = Number(kode);
  if (!Number.isInteger(sppgId) || sppgId <= 0) notFound();
  const sppg = await getSppg(sppgId);
  if (!sppg || !sppg.aktif) notFound();

  const tz = sppg.tz || "Asia/Jakarta";
  const tanggal = t && DATE_RE.test(t) ? t : localDate(tz);

  const row = (
    await query<{ isi: Partial<InfoGiziIsi> }>(
      `SELECT isi FROM info_gizi WHERE sppg_id = $1 AND tanggal = $2`,
      [sppgId, tanggal],
    )
  )[0];

  const isi = mergeInfoGizi(row?.isi);
  const tersedia = !!row && isi.aktif;
  const namaSppg = (sppg.nama || "").replace(/^SPPG\s+/i, "");

  // Poster disimpan per tanggal, jadi otomatis berganti tiap hari tanpa
  // mengubah QR. Mode menentukan posisinya terhadap kartu rincian.
  const adaDesain = tersedia && !!isi.desain;
  const desain = adaDesain ? <Desain src={isi.desain} tanggal={tanggal} /> : null;
  const tampilRincian = !adaDesain || isi.desain_mode !== "saja";
  const duaKolom = adaDesain && tampilRincian;

  return (
    <main className="min-h-screen w-full px-4 py-6" style={{ background: LATAR }}>
      <div className={`mx-auto w-full ${duaKolom ? "max-w-md lg:max-w-5xl" : "max-w-md"}`}>
        {/* Kop */}
        <header className="mb-3 flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/bgn-logo.webp"
            alt="Logo BGN"
            className="shrink-0 object-contain"
            style={{ height: 52, width: 52 }}
          />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-white/70">
              {isi.instansi}
            </p>
            <h1 className="text-xl font-black leading-tight text-white">{isi.judul}</h1>
            <p className="truncate text-[12px] font-semibold" style={{ color: EMAS }}>
              SPPG {namaSppg.toUpperCase()}
            </p>
          </div>
        </header>

        {!tersedia ? (
          <Kartu>
            <p className="py-6 text-center text-sm text-slate-600">
              Informasi gizi untuk <b>{tanggalPanjang(tanggal)}</b> belum dipublikasikan.
              <br />
              Silakan pindai ulang nanti.
            </p>
          </Kartu>
        ) : (
          <div
            className={
              duaKolom
                ? "space-y-3 lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-5 lg:space-y-0"
                : "space-y-3"
            }
          >
            {isi.desain_mode !== "bawah" && desain}

            {tampilRincian && (
              <div className="space-y-3 lg:order-2">
                {/* Porsi & tanggal */}
                <Kartu>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.14em] text-slate-400">
                        PORSI DISIAPKAN
                      </p>
                      <p className="bg-gradient-to-br from-[#0b6b3a] to-[#16a34a] bg-clip-text text-4xl font-black leading-none tabular-nums text-transparent">
                        {angkaId(isi.porsi_total)}
                        <span className="ml-1 text-base font-bold">PORSI</span>
                      </p>
                    </div>
                    <p className="pb-1 text-right text-[11px] font-semibold leading-tight text-slate-500">
                      {tanggalPanjang(tanggal)}
                    </p>
                  </div>
                  {isi.subjudul && (
                    <p className="mt-2 text-[12px] text-slate-600">{isi.subjudul}</p>
                  )}
                </Kartu>

                {/* Kandungan gizi — tab per kelompok porsi (interaktif) */}
                <Kartu>
                  <JudulBagian>KANDUNGAN GIZI PER PORSI</JudulBagian>
                  <PorsiTabs gizi={isi.gizi} />
                  <p className="mt-2.5 text-[10px] leading-snug text-slate-400">
                    Ketuk kelompok porsi untuk melihat rincian gizinya.
                  </p>
                </Kartu>

                {/* Menu hari ini */}
                <Kartu>
                  <JudulBagian>MENU HARI INI</JudulBagian>
                  {isi.menu.length === 0 ? (
                    <p className="py-3 text-center text-sm text-slate-500">Menu belum diisi.</p>
                  ) : (
                    KATEGORI_MENU.map((k) => (
                      <BarisMenu
                        key={k}
                        kategori={k}
                        items={isi.menu.filter((m) => m.kategori === k)}
                      />
                    ))
                  )}
                </Kartu>

                {/* Peringatan */}
                <section className="rounded-2xl border-2 border-[#fca5a5] bg-gradient-to-b from-[#fff5f5] to-[#fee2e2] p-4 text-center shadow-[0_10px_28px_rgba(185,28,28,0.18)]">
                  <p className="text-[13px] font-black leading-snug text-[#b91c1c]">
                    {isi.peringatan_judul}
                  </p>
                  <p className="mt-1 text-[12px] leading-snug text-[#7f1d1d]">
                    {isi.peringatan_teks}
                  </p>
                </section>

                {/* Batas konsumsi */}
                <section
                  className="rounded-2xl p-4 text-center shadow-[0_12px_30px_rgba(245,197,24,0.25)]"
                  style={{
                    background: `linear-gradient(160deg,#ffe486 0%,${EMAS} 55%,#e0ac00 100%)`,
                  }}
                >
                  <p className="text-[11px] font-bold tracking-[0.16em] text-[#4a3b00]">
                    BATAS AKHIR KONSUMSI
                  </p>
                  <p className="text-4xl font-black leading-none tabular-nums text-[#3b2f00]">
                    {isi.batas_konsumsi} <span className="text-lg font-bold">{isi.zona}</span>
                  </p>
                  <Countdown batas={isi.batas_konsumsi} zona={isi.zona} />
                </section>

                {isi.catatan && (
                  <Kartu>
                    <p className="text-[12px] leading-relaxed text-slate-600">{isi.catatan}</p>
                  </Kartu>
                )}
              </div>
            )}

            {isi.desain_mode === "bawah" && desain}
          </div>
        )}

        <footer className="pt-4 text-center">
          {tersedia && (
            <div className="mb-3">
              <ShareButton judul={`${isi.judul} — SPPG ${namaSppg}`} />
            </div>
          )}
          {isi.sosmed && (
            <p className="text-[13px] font-semibold" style={{ color: EMAS }}>
              {isi.sosmed}
            </p>
          )}
          {sppg.alamat && (
            <p className="mt-1 text-[11px] leading-snug text-white/60">{sppg.alamat}</p>
          )}
        </footer>
      </div>
    </main>
  );
}
