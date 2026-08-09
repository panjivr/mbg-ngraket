"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Lapisan penekan kebocoran slip gaji (deterrent, BUKAN blokir mutlak).
 *
 * Penting — jujur soal batasan: di web murni (browser HP) TIDAK ADA API yang
 * bisa memblokir screenshot seperti Netflix (itu pakai DRM/FLAG_SECURE native),
 * dan TIDAK ADA cara mencegah foto pakai HP lain. Komponen ini menekan &
 * menelusuri kebocoran:
 *   1. Watermark nama + waktu melintang → pembocor ketahuan bila disebar.
 *   2. Tirai gelap otomatis saat halaman kehilangan fokus / pindah aplikasi.
 *   3. Matikan klik-kanan, seret gambar, dan seleksi teks.
 *   4. (Opt-in, eksperimental) Sensor kamera depan: bila terlihat ≥2 wajah
 *      (kemungkinan ada yang mengintip/memotret), layar digelapkan. Berjalan
 *      100% di perangkat, tidak mengirim gambar ke mana pun. Hanya jalan bila
 *      karyawan menyalakannya & mengizinkan kamera; mati bila ditolak/tak
 *      didukung browser. TIDAK bisa dijamin akurat.
 *
 * Aktif hanya untuk tampilan karyawan; mode cetak admin melewati komponen ini.
 */

const XML_ESC: Record<string, string> = {
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  "'": "&apos;",
  '"': "&quot;",
};
const escXml = (s: string) => s.replace(/[<>&'"]/g, (c) => XML_ESC[c]);

function buildWatermark(text: string): string {
  const t = escXml(text);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='170'>` +
    `<text x='0' y='95' transform='rotate(-28 150 85)' ` +
    `font-family='sans-serif' font-size='15' font-weight='600' fill='%230f172a'>${t}</text>` +
    `</svg>`;
  return `url("data:image/svg+xml,${svg.replace(/#/g, "%23")}")`;
}

// Tipe minimal Shape Detection API (FaceDetector) — belum ada di lib.dom.
interface DetectedFace {
  boundingBox: DOMRectReadOnly;
}
interface FaceDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedFace[]>;
}
interface FaceDetectorCtor {
  new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }): FaceDetectorLike;
}

const DETEKSI_MS = 800; // jeda antar-pindai wajah

export default function SlipShield({
  nama,
  nip,
  active = true,
  children,
}: {
  nama: string;
  nip?: string | null;
  active?: boolean;
  children: ReactNode;
}) {
  const [tertutup, setTertutup] = useState(false); // pindah aplikasi / blur
  const [ancaman, setAncaman] = useState(false); // sensor kamera: ≥2 wajah
  const [sensorOn, setSensorOn] = useState(false);
  const [sensorErr, setSensorErr] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const didukung =
    typeof window !== "undefined" &&
    "FaceDetector" in window &&
    !!navigator.mediaDevices?.getUserMedia;

  // Cap waktu buka (ketertelusuran) — dihitung sekali saat mount.
  const [dibuka] = useState(() =>
    new Date().toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  );

  // Tirai gelap saat halaman kehilangan fokus / pindah aplikasi.
  useEffect(() => {
    if (!active) return;
    const sembunyi = () => setTertutup(true);
    const tampil = () => setTertutup(false);
    const onVis = () => (document.hidden ? sembunyi() : tampil());
    window.addEventListener("blur", sembunyi);
    window.addEventListener("focus", tampil);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("blur", sembunyi);
      window.removeEventListener("focus", tampil);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [active]);

  // Sensor kamera (opt-in): nyala hanya bila sensorOn. Semua lokal di perangkat.
  useEffect(() => {
    if (!active || !sensorOn) return;
    const Ctor = (window as unknown as { FaceDetector?: FaceDetectorCtor }).FaceDetector;
    if (!Ctor || !navigator.mediaDevices?.getUserMedia) {
      setSensorErr("Browser ini tidak mendukung sensor kamera.");
      setSensorOn(false);
      return;
    }

    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let busy = false;
    let batal = false;
    const detektor = new Ctor({ fastMode: true, maxDetectedFaces: 5 });

    const mulai = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        if (batal) return;
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play().catch(() => {});
        timer = setInterval(async () => {
          if (busy || batal) return;
          const vid = videoRef.current;
          if (!vid || vid.readyState < 2) return;
          busy = true;
          try {
            const wajah = await detektor.detect(vid);
            if (!batal) setAncaman(wajah.length >= 2);
          } catch {
            /* pindai gagal sesekali — abaikan, coba lagi tick berikutnya */
          } finally {
            busy = false;
          }
        }, DETEKSI_MS);
      } catch {
        if (!batal) {
          setSensorErr("Izin kamera ditolak — sensor tidak aktif.");
          setSensorOn(false);
        }
      }
    };
    mulai();

    return () => {
      batal = true;
      if (timer) clearInterval(timer);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      setAncaman(false);
    };
  }, [active, sensorOn]);

  if (!active) return <>{children}</>;

  const mark = `${nama}${nip ? " · " + nip : ""} · RAHASIA · ${dibuka}`;
  const gelap = tertutup || ancaman;

  return (
    <div
      className="relative select-none"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" }}
    >
      {/* Kontrol sensor kamera (opt-in) */}
      <div className="mx-auto mb-3 flex max-w-[720px] flex-col gap-1 px-3">
        {didukung ? (
          <button
            type="button"
            onClick={() => {
              setSensorErr(null);
              setSensorOn((s) => !s);
            }}
            aria-pressed={sensorOn}
            className={
              "inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition " +
              (sensorOn
                ? "border-green-500/40 bg-green-500/15 text-green-300"
                : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10")
            }
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
            {sensorOn ? "Sensor kamera AKTIF — ketuk untuk matikan" : "Aktifkan sensor kamera (eksperimental)"}
          </button>
        ) : (
          <p className="text-center text-[11px] text-slate-500">
            Sensor kamera tidak didukung di browser ini.
          </p>
        )}
        {sensorErr && <p className="text-center text-[11px] text-amber-400">{sensorErr}</p>}
        {sensorOn && !sensorErr && (
          <p className="text-center text-[11px] text-slate-500">
            Kamera depan dipakai lokal untuk mendeteksi orang lain. Tidak ada gambar yang dikirim/disimpan.
          </p>
        )}
      </div>

      {/* Video kamera tersembunyi (hanya untuk analisis, tidak ditampilkan) */}
      <video ref={videoRef} muted playsInline className="pointer-events-none absolute h-px w-px opacity-0" aria-hidden />

      {/* Area slip yang dilindungi — tirai gelap hanya menutup ini, bukan tombol kontrol */}
      <div className="relative">
        {children}

        {/* Watermark melintang — tampak di layar & ikut terbawa saat di-screenshot/foto */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.10]"
          style={{ backgroundImage: buildWatermark(mark), backgroundRepeat: "repeat" }}
        />

        {/* Tirai gelap: pindah aplikasi ATAU sensor kamera mendeteksi orang lain */}
        {gelap && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black px-6 text-center text-white">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-9 w-9 opacity-90"
            >
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V8a5 5 0 0 1 10 0v3" />
            </svg>
            <p className="text-sm font-semibold">
              {ancaman ? "Terdeteksi kemungkinan orang/kamera lain" : "Slip disembunyikan"}
            </p>
            <p className="max-w-xs text-xs leading-relaxed text-white/70">
              {ancaman
                ? "Pastikan tidak ada yang melihat layar. Slip muncul lagi saat aman."
                : "Kembali ke aplikasi untuk melihat slip. Dokumen ini rahasia dan tidak untuk dibagikan."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
