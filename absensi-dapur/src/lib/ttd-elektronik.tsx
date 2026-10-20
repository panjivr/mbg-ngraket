"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Tanda tangan elektronik untuk dokumen cetak (/cetak/*).
 * - Checklist di layar: pakai TTD elektronik atau tidak (kalau tidak → ruang
 *   kosong untuk tanda tangan basah, seperti sebelumnya).
 * - Waktu TTD: Otomatis (saat ini) atau Manual (pilih hari/tanggal/jam).
 * - Stempel menyesuaikan kolomnya: jabatan/title di atas & nama di bawah tetap
 *   milik kolom itu (mis. Ahli Gizi, Kepala Dapur, Koordinator Lapangan) —
 *   stempel hanya mengisi ruang tanda tangan di tengah. Tanpa barcode/link.
 */

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function fmtWaktu(d: Date): string {
  if (!d || Number.isNaN(d.getTime())) return "";
  const jam = String(d.getHours()).padStart(2, "0");
  const mnt = String(d.getMinutes()).padStart(2, "0");
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()} · ${jam}.${mnt} WIB`;
}

interface Ctx {
  aktif: boolean;
  label: string;
  mode: "auto" | "manual";
  manual: string;
  keterangan: boolean;
  /** QR verifikasi (data URL) — "" bila belum siap. */
  qr: string;
  setAktif: (v: boolean) => void;
  setMode: (m: "auto" | "manual") => void;
  setManual: (s: string) => void;
  setKeterangan: (v: boolean) => void;
}

const FALLBACK: Ctx = {
  aktif: false, label: "", mode: "auto", manual: "", keterangan: true, qr: "",
  setAktif() {}, setMode() {}, setManual() {}, setKeterangan() {},
};

const TtdContext = createContext<Ctx | null>(null);

export function TtdProvider({ children }: { children: ReactNode }) {
  const [aktif, setAktif] = useState(true);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [manual, setManual] = useState("");
  const [keterangan, setKeterangan] = useState(true);
  // Waktu "saat ini" dipaku saat halaman dibuka agar stabil di dokumen.
  const [autoAt] = useState(() => new Date());

  const [qr, setQr] = useState("");

  const label = useMemo(
    () => (mode === "manual" ? (manual ? fmtWaktu(new Date(manual)) : "") : fmtWaktu(autoAt)),
    [mode, manual, autoAt],
  );

  // Terbitkan token TTE (ber-HMAC di server) lalu buat QR verifikasi.
  const waktuIso = mode === "manual" ? (manual ? new Date(manual).toISOString() : "") : autoAt.toISOString();
  useEffect(() => {
    if (!aktif || !waktuIso) {
      setQr("");
      return;
    }
    let batal = false;
    (async () => {
      try {
        const jenis = (typeof document !== "undefined" && document.title) || "Dokumen";
        const res = await fetch("/api/ttd/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ waktu: waktuIso, jenis }),
        });
        const d = await res.json();
        if (batal || !d?.token) return;
        const url = `${window.location.origin}/verifikasi?t=${encodeURIComponent(d.token)}`;
        const QR = (await import("qrcode")).default;
        const dataUrl = await QR.toDataURL(url, { margin: 1, width: 180, errorCorrectionLevel: "M" });
        if (!batal) setQr(dataUrl);
      } catch {
        if (!batal) setQr("");
      }
    })();
    return () => {
      batal = true;
    };
  }, [aktif, waktuIso]);

  const val = useMemo<Ctx>(
    () => ({ aktif, label, mode, manual, keterangan, qr, setAktif, setMode, setManual, setKeterangan }),
    [aktif, label, mode, manual, keterangan, qr],
  );
  return <TtdContext.Provider value={val}>{children}</TtdContext.Provider>;
}

function useTtd(): Ctx {
  return useContext(TtdContext) ?? FALLBACK;
}

/**
 * Stempel TTD elektronik — menggantikan ruang tanda tangan di tengah kolom.
 * Bila nonaktif, tampilkan ruang kosong (tinggiKosong) untuk tanda tangan basah.
 */
export function StempelTtd({ tinggiKosong = "h-14" }: { tinggiKosong?: string }) {
  const { aktif, label, qr } = useTtd();
  if (!aktif) return <div className={tinggiKosong} />;
  return (
    <div className="my-1 flex flex-col items-center justify-center gap-0.5 py-1" style={{ color: "#0e1f55" }}>
      {qr ? (
        // eslint-disable-next-line @next/next/no-img-element -- QR data URL dinamis.
        <img src={qr} alt="QR tanda tangan elektronik" width={72} height={72} style={{ width: 72, height: 72 }} />
      ) : (
        <span
          className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{ borderColor: "#0e1f55" }}
        >
          ✔ Tanda Tangan Elektronik
        </span>
      )}
      {label && <span className="text-[9px] text-gray-700">{label}</span>}
      <span className="text-[9px] italic text-gray-600">Ditandatangani secara elektronik oleh</span>
    </div>
  );
}

/**
 * Keterangan keabsahan TTE (sekali per dokumen, di bawah blok tanda tangan).
 * Jujur secara hukum: ini TTE sah sebagai alat bukti (UU ITE), belum
 * tersertifikasi BSrE/PSrE. Bisa dimatikan lewat kontrol.
 */
export function KeteranganTtd({ className = "" }: { className?: string }) {
  const { aktif, keterangan } = useTtd();
  if (!aktif || !keterangan) return null;
  return (
    <p className={"mt-2 text-[9px] italic leading-snug text-gray-500 " + className}>
      Dokumen ini ditandatangani secara elektronik melalui sistem Absensi MBG. Tanda tangan
      elektronik sah sebagai alat bukti sesuai UU ITE (belum tersertifikasi BSrE/PSrE). Pindai QR
      pada tanda tangan untuk verifikasi.
    </p>
  );
}

/** Kontrol (checklist) TTD elektronik — tampil di layar, tidak ikut tercetak. */
export function TtdKontrol() {
  const { aktif, mode, manual, keterangan, setAktif, setMode, setManual, setKeterangan } = useTtd();
  return (
    <div className="ttd-kontrol no-print fixed right-3 top-3 z-50 w-60 rounded-xl border border-slate-300 bg-white/95 p-3 text-xs text-slate-800 shadow-lg backdrop-blur">
      <style>{`@media print{.ttd-kontrol{display:none!important}}`}</style>
      <label className="flex items-center gap-2 font-semibold">
        <input type="checkbox" className="h-4 w-4" checked={aktif} onChange={(e) => setAktif(e.target.checked)} />
        Pakai tanda tangan elektronik
      </label>
      <p className="mt-1 text-[10px] leading-snug text-slate-500">
        Jika tidak dicentang, ruang tanda tangan dibiarkan kosong untuk tanda tangan basah.
      </p>
      {aktif && (
        <div className="mt-2 space-y-1.5 border-t border-slate-200 pt-2">
          <p className="text-[11px] font-medium text-slate-500">Waktu tanda tangan</p>
          <label className="flex items-center gap-2">
            <input type="radio" name="ttd-mode" checked={mode === "auto"} onChange={() => setMode("auto")} />
            Otomatis (saat ini)
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="ttd-mode" checked={mode === "manual"} onChange={() => setMode("manual")} />
            Manual (pilih hari &amp; tanggal)
          </label>
          {mode === "manual" && (
            <input
              type="datetime-local"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              className="w-full rounded border border-slate-300 px-1.5 py-1"
            />
          )}
          <label className="mt-1 flex items-center gap-2 border-t border-slate-200 pt-2">
            <input type="checkbox" checked={keterangan} onChange={(e) => setKeterangan(e.target.checked)} />
            Tampilkan keterangan keabsahan
          </label>
        </div>
      )}
    </div>
  );
}
