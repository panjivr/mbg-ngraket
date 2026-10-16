"use client";

import { useRef, useState } from "react";
import type { Quote } from "@/lib/quotes";

/**
 * Kartu "story" hasil absen untuk dibagikan ke WhatsApp/IG (Story) — pengganti
 * screenshot manual. Menampilkan branding unit, status (masuk/pulang), jam besar,
 * tanggal, nama, dan kutipan. Dirender ke PNG via html-to-image lalu dibagikan
 * (Web Share API, dengan fallback unduh). Tema mengikuti jenis unit.
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

function fmtJam(iso: string, tz?: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("id-ID", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}
function fmtTanggal(iso: string, tz?: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("id-ID", { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
}

export default function AbsenStoryCard({
  nama,
  unit,
  jenis,
  logoUrl,
  action,
  waktuIso,
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
  waktuIso: string;
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
  const accent = perusahaan ? "#818cf8" : "#f3c349"; // indigo vs emas
  const masuk = action === "masuk";
  const statusLabel = masuk ? "ABSEN MASUK" : "ABSEN PULANG";
  const telat = status === "Terlambat";

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
      const teks = `${statusLabel} • ${fmtJam(waktuIso, tz)} • ${nama}`;
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
        {/* Kartu story (rasio ~9:16) */}
        <div
          ref={ref}
          style={{ width: 324, background: bg, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
          className="relative shrink-0 overflow-hidden rounded-3xl text-white"
        >
          {/* Aura dekoratif */}
          <div style={{ position: "absolute", top: -70, right: -50, width: 200, height: 200, borderRadius: "9999px", background: accent, opacity: 0.18, filter: "blur(40px)" }} />
          <div style={{ position: "absolute", bottom: -60, left: -40, width: 180, height: 180, borderRadius: "9999px", background: "#38bdf8", opacity: 0.14, filter: "blur(40px)" }} />

          <div className="relative flex flex-col gap-4 px-6 pb-6 pt-7">
            {/* Branding unit */}
            <div className="flex items-center gap-2.5">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URL / aset dinamis.
                <img src={logoUrl} alt="" width={40} height={40} style={{ width: 40, height: 40 }} className="rounded-xl bg-white/10 object-contain" />
              ) : perusahaan ? (
                <span style={{ width: 40, height: 40, background: accent, color: "#0f1117" }} className="grid place-items-center rounded-xl text-sm font-extrabold">{initials}</span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- aset same-origin.
                <img src="/bgn-logo.webp" alt="" width={40} height={40} style={{ width: 40, height: 40 }} className="rounded-full bg-white object-contain" />
              )}
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-bold">{unit || (perusahaan ? "Perusahaan" : "Dapur MBG")}</p>
                <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: accent }}>
                  {perusahaan ? "Absensi Kantor" : "Absensi Dapur MBG"}
                </p>
              </div>
            </div>

            {/* Status + jam besar */}
            <div className="mt-2 text-center">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold"
                style={{ background: masuk ? "#10b98122" : "#f59e0b22", color: masuk ? "#6ee7b7" : "#fcd34d" }}
              >
                {masuk ? "✅" : "👋"} {statusLabel}
              </span>
              <p className="mt-3 text-[64px] font-black leading-none tracking-tight tabular-nums">{fmtJam(waktuIso, tz)}</p>
              <p className="mt-1 text-xs text-white/70">WIB · {fmtTanggal(waktuIso, tz)}</p>
              {masuk && status && (
                <span
                  className="mt-2 inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold"
                  style={{ background: telat ? "#ef444422" : "#10b98122", color: telat ? "#fca5a5" : "#6ee7b7" }}
                >
                  {status}
                </span>
              )}
            </div>

            {/* Nama */}
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-white/50">Karyawan</p>
              <p className="truncate text-lg font-extrabold">{nama}</p>
            </div>

            {/* Kutipan */}
            {quote && (
              <div className="mt-1 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <p className="text-sm italic leading-relaxed text-white/95">“{quote.teks}”</p>
                <p className="mt-1.5 text-[11px] text-white/60">— {quote.sumber}{quote.kategori ? ` · ${quote.kategori}` : ""}</p>
              </div>
            )}

            <p className="mt-1 text-center text-[10px] text-white/40">Dibuat otomatis oleh Absensi MBG</p>
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
