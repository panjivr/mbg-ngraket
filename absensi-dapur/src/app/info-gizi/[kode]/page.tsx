import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { getSppg } from "@/lib/sppg";
import { localDate } from "@/lib/time";
import {
  mergeInfoGizi,
  angkaId,
  rupiah,
  tanggalPanjang,
  GIZI_LABEL,
  KATEGORI_MENU,
  KATEGORI_MENU_LABEL,
  type InfoGiziIsi,
  type GiziPorsi,
  type KategoriMenu,
} from "@/lib/info-gizi";

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

function Kartu({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
      {children}
    </section>
  );
}

function KolomGizi({ judul, g }: { judul: string; g: GiziPorsi }) {
  return (
    <div className="flex-1 rounded-xl border border-black/10 bg-[#f7faf8] p-3">
      <p
        className="mb-2 text-center text-[11px] font-bold tracking-[0.12em]"
        style={{ color: HIJAU }}
      >
        {judul}
      </p>
      <dl className="space-y-1">
        {GIZI_LABEL.map(({ key, label, sat }) => (
          <div key={key} className="flex items-baseline justify-between gap-2">
            <dt className="text-[12px] text-slate-600">{label}</dt>
            <dd className="text-[13px] font-semibold tabular-nums text-slate-900">
              {angkaId(g[key])}{" "}
              <span className="text-[11px] font-normal text-slate-500">{sat}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function BarisMenu({
  kategori,
  items,
  tampilHarga,
}: {
  kategori: KategoriMenu;
  items: InfoGiziIsi["menu"];
  tampilHarga: boolean;
}) {
  if (!items.length) return null;
  return (
    <div className="border-t border-dashed border-black/10 py-2.5 first:border-t-0 first:pt-0">
      <p className="text-[10px] font-bold tracking-[0.14em] text-slate-400">
        {KATEGORI_MENU_LABEL[kategori]}
      </p>
      {items.map((m, i) => (
        <div key={i} className="mt-0.5 flex items-baseline justify-between gap-3">
          <p className="text-[15px] font-semibold leading-snug text-slate-900">{m.nama}</p>
          {tampilHarga && (m.harga_kecil > 0 || m.harga_besar > 0) && (
            <p className="shrink-0 text-right text-[11px] leading-tight text-slate-500">
              {m.harga_kecil > 0 && (
                <span className="block tabular-nums">PK {rupiah(m.harga_kecil)}</span>
              )}
              {m.harga_besar > 0 && m.harga_besar !== m.harga_kecil && (
                <span className="block tabular-nums">PB {rupiah(m.harga_besar)}</span>
              )}
            </p>
          )}
        </div>
      ))}
    </div>
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

  return (
    <main
      className="min-h-screen w-full px-4 py-6"
      style={{
        background: `linear-gradient(170deg, ${HIJAU} 0%, ${HIJAU_TUA} 55%, #021a10 100%)`,
      }}
    >
      <div className="mx-auto w-full max-w-md space-y-3">
        {/* Kop */}
        <header className="flex items-center gap-3 pb-1">
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
          <>
            {/* Porsi & tanggal */}
            <Kartu>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.14em] text-slate-400">
                    PORSI DISIAPKAN
                  </p>
                  <p
                    className="text-4xl font-black leading-none tabular-nums"
                    style={{ color: HIJAU }}
                  >
                    {angkaId(isi.porsi_total)}
                    <span className="ml-1 text-base font-bold">PORSI</span>
                  </p>
                </div>
                <p className="pb-1 text-right text-[11px] font-semibold leading-tight text-slate-500">
                  {tanggalPanjang(tanggal)}
                </p>
              </div>
              {isi.subjudul && <p className="mt-2 text-[12px] text-slate-600">{isi.subjudul}</p>}
            </Kartu>

            {/* Kandungan gizi */}
            <Kartu>
              <h2 className="mb-2 text-[11px] font-bold tracking-[0.14em] text-slate-400">
                KANDUNGAN GIZI PER PORSI
              </h2>
              <div className="flex gap-2">
                <KolomGizi judul="PORSI KECIL" g={isi.gizi_kecil} />
                <KolomGizi judul="PORSI BESAR" g={isi.gizi_besar} />
              </div>
            </Kartu>

            {/* Menu hari ini */}
            <Kartu>
              <h2 className="mb-2 text-[11px] font-bold tracking-[0.14em] text-slate-400">
                MENU HARI INI
              </h2>
              {isi.menu.length === 0 ? (
                <p className="py-3 text-center text-sm text-slate-500">Menu belum diisi.</p>
              ) : (
                KATEGORI_MENU.map((k) => (
                  <BarisMenu
                    key={k}
                    kategori={k}
                    items={isi.menu.filter((m) => m.kategori === k)}
                    tampilHarga={isi.tampil_harga}
                  />
                ))
              )}
            </Kartu>

            {/* Peringatan */}
            <section className="rounded-2xl border-2 border-[#fca5a5] bg-[#fef2f2] p-4 text-center">
              <p className="text-[13px] font-black leading-snug text-[#b91c1c]">
                {isi.peringatan_judul}
              </p>
              <p className="mt-1 text-[12px] leading-snug text-[#7f1d1d]">{isi.peringatan_teks}</p>
            </section>

            {/* Batas konsumsi */}
            <section className="rounded-2xl p-4 text-center" style={{ backgroundColor: EMAS }}>
              <p className="text-[11px] font-bold tracking-[0.16em] text-[#4a3b00]">
                BATAS AKHIR KONSUMSI
              </p>
              <p className="text-4xl font-black leading-none tabular-nums text-[#3b2f00]">
                {isi.batas_konsumsi} <span className="text-lg font-bold">{isi.zona}</span>
              </p>
            </section>

            {isi.catatan && (
              <Kartu>
                <p className="text-[12px] leading-relaxed text-slate-600">{isi.catatan}</p>
              </Kartu>
            )}
          </>
        )}

        <footer className="pt-1 text-center">
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
