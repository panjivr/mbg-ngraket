"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * Tanda tangan elektronik untuk dokumen cetak (/cetak/*).
 * - Checklist di layar: pakai TTD elektronik atau tidak (kalau tidak → ruang
 *   kosong untuk tanda tangan basah).
 * - Waktu TTD: Otomatis (saat ini) atau Manual (pilih hari/tanggal/jam).
 * - Tiap stempel menandatangani ATAS NAMA kolomnya sendiri (nama & jabatan yang
 *   tampil di dokumen, mis. Ahli Gizi / Koordinator Lapangan / Kepala SPPG) —
 *   BUKAN akun admin yang login. QR per-kolom menyimpan isi dokumen agar hasil
 *   scan sesuai berkas & menampilkan penanda tangan yang benar.
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

/** Jenis/judul dokumen dari heading pertama di area cetak (atau judul tab). */
function jenisDokumen(): string {
  if (typeof document === "undefined") return "Dokumen";
  const root = document.getElementById("cetak-konten");
  const h = root?.querySelector("h1,h2,h3")?.textContent?.trim();
  return (h || document.title || "Dokumen").slice(0, 160);
}

/**
 * Ambil ISI dokumen cetak sebagai teks (mewakili berkas) untuk disimpan &
 * ditampilkan saat QR diverifikasi. Nilai input/contentEditable ikut terbaca;
 * kontrol & tombol (.no-print) dibuang.
 */
function ambilKonten(): string {
  if (typeof document === "undefined") return "";
  const src = document.getElementById("cetak-konten");
  if (!src) return "";
  const clone = src.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("input,textarea,select").forEach((el) => {
    const v = (el as HTMLInputElement).value || "";
    el.replaceWith(document.createTextNode(v));
  });
  clone.querySelectorAll(".no-print,button,svg").forEach((e) => e.remove());
  clone.style.position = "absolute";
  clone.style.left = "-99999px";
  clone.style.top = "0";
  clone.style.width = (src.clientWidth || 720) + "px";
  document.body.appendChild(clone);
  const txt = clone.innerText || clone.textContent || "";
  document.body.removeChild(clone);
  return txt.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 60000);
}

interface Ctx {
  aktif: boolean;
  label: string;
  waktuIso: string;
  mode: "auto" | "manual";
  manual: string;
  keterangan: boolean;
  setAktif: (v: boolean) => void;
  setMode: (m: "auto" | "manual") => void;
  setManual: (s: string) => void;
  setKeterangan: (v: boolean) => void;
  /** Daftarkan fungsi flush (sinkron isi dokumen) milik tiap stempel. */
  registerFlush: (fn: () => void) => () => void;
}

const FALLBACK: Ctx = {
  aktif: false, label: "", waktuIso: "", mode: "auto", manual: "", keterangan: true,
  setAktif() {}, setMode() {}, setManual() {}, setKeterangan() {}, registerFlush: () => () => {},
};

const TtdContext = createContext<Ctx | null>(null);

export function TtdProvider({ children }: { children: ReactNode }) {
  const [aktif, setAktif] = useState(true);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [manual, setManual] = useState("");
  const [keterangan, setKeterangan] = useState(true);
  const [autoAt] = useState(() => new Date());

  const label = useMemo(
    () => (mode === "manual" ? (manual ? fmtWaktu(new Date(manual)) : "") : fmtWaktu(autoAt)),
    [mode, manual, autoAt],
  );
  const waktuIso = mode === "manual" ? (manual ? new Date(manual).toISOString() : "") : autoAt.toISOString();

  const flushes = useRef(new Set<() => void>());
  const registerFlush = useCallback((fn: () => void) => {
    flushes.current.add(fn);
    return () => {
      flushes.current.delete(fn);
    };
  }, []);

  // Satu listener: sinkronkan isi dokumen semua stempel saat diisi/diubah &
  // tepat sebelum mencetak.
  useEffect(() => {
    if (!aktif) return;
    const root = document.getElementById("cetak-konten");
    if (!root) return;
    let timer: number | undefined;
    const runAll = () => flushes.current.forEach((f) => f());
    const onInput = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(runAll, 1500);
    };
    root.addEventListener("input", onInput, true);
    window.addEventListener("beforeprint", runAll);
    return () => {
      root.removeEventListener("input", onInput, true);
      window.removeEventListener("beforeprint", runAll);
      window.clearTimeout(timer);
    };
  }, [aktif]);

  const val = useMemo<Ctx>(
    () => ({ aktif, label, waktuIso, mode, manual, keterangan, setAktif, setMode, setManual, setKeterangan, registerFlush }),
    [aktif, label, waktuIso, mode, manual, keterangan, registerFlush],
  );
  return <TtdContext.Provider value={val}>{children}</TtdContext.Provider>;
}

function useTtd(): Ctx {
  return useContext(TtdContext) ?? FALLBACK;
}

/**
 * Stempel TTD elektronik satu penanda tangan. `nama` & `peran` = identitas yang
 * tampil di dokumen (bukan akun login). Menerbitkan QR per-kolom yang menyimpan
 * isi dokumen + penanda tangan tsb. Bila nonaktif → ruang kosong (tinggiKosong).
 */
export function StempelTtd({
  nama = "",
  peran = "",
  tinggiKosong = "h-14",
}: {
  nama?: string;
  peran?: string;
  tinggiKosong?: string;
}) {
  const { aktif, label, waktuIso, registerFlush } = useTtd();
  const [qr, setQr] = useState("");
  const idRef = useRef("");
  // Simpan nilai terbaru untuk flush.
  const dataRef = useRef({ nama, peran, waktuIso });
  dataRef.current = { nama, peran, waktuIso };

  useEffect(() => {
    if (!aktif || !waktuIso) {
      setQr("");
      idRef.current = "";
      return;
    }
    let batal = false;
    (async () => {
      try {
        const res = await fetch("/api/ttd/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nama, peran, jenis: jenisDokumen(), waktu: waktuIso, konten: ambilKonten() }),
        });
        const d = await res.json();
        if (batal || !d?.id) return;
        idRef.current = d.id;
        const url = `${window.location.origin}/verifikasi?id=${d.id}`;
        const QR = (await import("qrcode")).default;
        const dataUrl = await QR.toDataURL(url, { margin: 1, width: 180, errorCorrectionLevel: "M" });
        if (!batal) setQr(dataUrl);
      } catch {
        /* abaikan */
      }
    })();
    return () => {
      batal = true;
    };
  }, [aktif, waktuIso, nama, peran]);

  // Flush isi dokumen terbaru untuk catatan stempel ini.
  useEffect(() => {
    const fn = () => {
      if (!idRef.current) return;
      const { nama: n, peran: p, waktuIso: w } = dataRef.current;
      fetch("/api/ttd/sign", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: idRef.current, nama: n, peran: p, jenis: jenisDokumen(), waktu: w, konten: ambilKonten() }),
        keepalive: true,
      }).catch(() => {});
    };
    return registerFlush(fn);
  }, [registerFlush]);

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

/** Keterangan keabsahan TTE (sekali per dokumen, di bawah blok tanda tangan). */
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
