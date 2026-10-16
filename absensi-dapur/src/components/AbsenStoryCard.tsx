"use client";

import { useRef, useState } from "react";
import type { Quote } from "@/lib/quotes";

/**
 * Kartu "story" hasil absen untuk dibagikan ke WhatsApp/IG (Story) — pengganti
 * screenshot manual. Menampilkan branding unit, status (masuk/pulang), jam besar,
 * jam masuk & pulang, status telat, durasi kerja, tanggal, nama, dan kutipan.
 * Dirender ke PNG via html-to-image lalu dibagikan (Web Share API, fallback unduh).
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function fmtJam(iso: string | null, tz?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}
function fmtTanggal(iso: string, tz?: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("id-ID", { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
}
function fmtDurasi(inIso: string | null, outIso: string | null): string | null {
  if (!inIso || !outIso) return null;
  const ms = new Date(outIso).getTime() - new Date(inIso).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const totalMin = Math.round(ms / 60000);
  const j = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${j}j ${m}m`;
}

export default function AbsenStoryCard({
  nama,
  unit,
  jenis,
  logoUrl,
  action,
  checkIn,
  checkOut,
  status,
  quote,
  tz,
  onReshuffle,
}: {
  nama: string;
  unit: string;
  jenis?: string;
  logoUrl?: string;
  action: "masuk" | "pulang";
  checkIn: string | null;
  checkOut: string | null;
  status?: string | null;
  quote: Quote | null;
  tz?: string;
  onReshuffle?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"share" | "save" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const perusahaan = jenis === "perusahaan";
  const bg = perusahaan ? "linear-gradient(160deg,#1c2230 0%,#0f1117 100%)" : "linear-gradient(160deg,#0e1f55 0%,#071e49 100%)";
  const baseBg = perusahaan ? "#0f1117" : "#071e49";
  const accent = perusahaan ? "#818cf8" : "#f3c349";
  const masuk = action === "masuk";
  const statusLabel = masuk ? "ABSEN MASUK" : "ABSEN PULANG";
  const telat = status === "Terlambat";
  const bigIso = (masuk ? checkIn : checkOut) || checkIn || checkOut || new Date().toISOString();
  const durasi = fmtDurasi(checkIn, checkOut);

  const initials = (nama || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "•";
  const filename = `absen-${action}-${(nama || "pegawai").replace(/\s+/g, "-").toLowerCase()}.png`;

  async function render(): Promise<Blob | null> {
    if (!ref.current) return null;
    const { toBlob } = await import("html-to-image");
    return toBlob(ref.current, { pixelRatio: 3, cacheBust: true, backgroundColor: baseBg });
  }

  async function share() {
    setBusy("share");
    setMsg(null);
    try {
      const blob = await render();
      if (!blob) throw new Error("render");
      const file = new File([blob], filename, { type: "image/png" });
      const teks = `${statusLabel} • Masuk ${fmtJam(checkIn, tz)}${checkOut ? ` • Pulang ${fmtJam(checkOut, tz)}` : ""} • ${nama}`;
      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: statusLabel, text: teks });
      } else {
        downloadBlob(blob, filename);
        setMsg("Perangkat tidak mendukung bagikan langsung — gambar diunduh, silakan unggah ke Story/WA.");
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setMsg("Gagal membuat gambar. Coba lagi.");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy("save");
    setMsg(null);
    try {
      const blob = await render();
      if (!blob) throw new Error("render");
      downloadBlob(blob, filename);
      setMsg("Gambar disimpan ke perangkat/galeri Anda.");
    } catch {
      setMsg("Gagal menyimpan gambar. Coba lagi.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-center overflow-x-auto">
        <div
          ref={ref}
          style={{ width: 340, background: bg, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
          className="relative shrink-0 overflow-hidden rounded-3xl text-white"
        >
          {/* Aura dekoratif */}
          <div style={{ position: "absolute", top: -70, right: -50, width: 200, height: 200, borderRadius: "9999px", background: accent, opacity: 0.18, filter: "blur(40px)" }} />
          <div style={{ position: "absolute", bottom: -60, left: -40, width: 180, height: 180, borderRadius: "9999px", background: "#38bdf8", opacity: 0.14, filter: "blur(40px)" }} />

          <div className="relative flex flex-col gap-3.5 px-5 pb-6 pt-7">
            {/* Branding unit — nama lengkap, tidak dipotong */}
            <div className="flex items-center gap-2.5">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URL / aset dinamis.
                <img src={logoUrl} alt="" width={40} height={40} style={{ width: 40, height: 40 }} className="shrink-0 rounded-xl bg-white/10 object-contain" />
              ) : perusahaan ? (
                <span style={{ width: 40, height: 40, background: accent, color: "#0f1117" }} className="grid shrink-0 place-items-center rounded-xl text-sm font-extrabold">{initials}</span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- aset same-origin.
                <img src="/bgn-logo.webp" alt="" width={40} height={40} style={{ width: 40, height: 40 }} className="shrink-0 rounded-full bg-white object-contain" />
              )}
              <div className="min-w-0 leading-tight">
                <p className="text-[13px] font-bold leading-snug" style={{ wordBreak: "break-word" }}>{unit || (perusahaan ? "Perusahaan" : "Dapur MBG")}</p>
                <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: accent }}>
                  {perusahaan ? "Absensi Kantor" : "Absensi Dapur MBG"}
                </p>
              </div>
            </div>

            {/* Status + jam besar */}
            <div className="mt-1 text-center">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold"
                style={{ background: masuk ? "#10b98122" : "#f59e0b22", color: masuk ? "#6ee7b7" : "#fcd34d" }}
              >
                {masuk ? "✅" : "👋"} {statusLabel}
              </span>
              <p className="mt-2 text-[58px] font-black leading-none tracking-tight tabular-nums">{fmtJam(bigIso, tz)}</p>
              <p className="mt-1 text-[11px] text-white/70">WIB · {fmtTanggal(bigIso, tz)}</p>
            </div>

            {/* Info lengkap: masuk / pulang / durasi */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-white/[0.06] px-2 py-2">
                <p className="text-[9px] uppercase tracking-wide text-white/50">Masuk</p>
                <p className="text-base font-bold tabular-nums">{fmtJam(checkIn, tz)}</p>
                {status && (
                  <span
                    className="mt-0.5 inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold"
                    style={{ background: telat ? "#ef444433" : "#10b98133", color: telat ? "#fca5a5" : "#6ee7b7" }}
                  >
                    {status}
                  </span>
                )}
              </div>
              <div className="rounded-xl bg-white/[0.06] px-2 py-2">
                <p className="text-[9px] uppercase tracking-wide text-white/50">Pulang</p>
                <p className="text-base font-bold tabular-nums">{fmtJam(checkOut, tz)}</p>
              </div>
              <div className="rounded-xl bg-white/[0.06] px-2 py-2">
                <p className="text-[9px] uppercase tracking-wide text-white/50">Durasi</p>
                <p className="text-base font-bold tabular-nums">{durasi || "—"}</p>
              </div>
            </div>

            {/* Nama — tidak dipotong */}
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-white/50">Karyawan</p>
              <p className="text-lg font-extrabold leading-snug" style={{ wordBreak: "break-word" }}>{nama}</p>
            </div>

            {/* Kutipan */}
            {quote && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <p className="text-sm italic leading-relaxed text-white/95">“{quote.teks}”</p>
                <p className="mt-1.5 text-[11px] text-white/60">— {quote.sumber}{quote.kategori ? ` · ${quote.kategori}` : ""}</p>
              </div>
            )}

            <p className="text-center text-[10px] text-white/40">Dibuat otomatis oleh Absensi MBG</p>
          </div>
        </div>
      </div>

      {/* Tombol aksi */}
      <div className="flex flex-wrap gap-2">
        <button onClick={share} disabled={!!busy} className="btn-gold flex-1">
          {busy === "share" ? "Menyiapkan…" : "📤 Bagikan ke WA / Story"}
        </button>
        <button onClick={save} disabled={!!busy} className="btn-ghost flex-1">
          {busy === "save" ? "Menyimpan…" : "⬇ Simpan Gambar"}
        </button>
      </div>
      {onReshuffle && (
        <button onClick={onReshuffle} className="w-full text-center text-xs text-slate-400 hover:text-slate-200">
          ↻ Ganti kutipan
        </button>
      )}
      {msg && <p className="text-center text-xs text-slate-400">{msg}</p>}
    </div>
  );
}
