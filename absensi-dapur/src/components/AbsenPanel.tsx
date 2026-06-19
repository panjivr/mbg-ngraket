"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { haversineMeters } from "@/lib/geo";

interface SettingsLite {
  nama_dapur: string;
  alamat: string;
  lat: number;
  lng: number;
  radius_m: number;
  geofence_aktif: boolean;
  selfie_wajib: boolean;
  jam_masuk: string;
  jam_pulang: string;
  tz: string;
}

interface ShiftInfo {
  divisi_nama: string | null;
  jobdesk: string | null;
  jam_masuk: string;
  jam_pulang: string;
  toleransi_menit: number;
  lintas_hari: boolean;
}

interface AbsRow {
  id: number;
  check_in: string | null;
  check_out: string | null;
  status_masuk: string | null;
  shift_masuk: string | null;
  shift_pulang: string | null;
}

type Phase = "masuk" | "pulang";
type Geo = { lat: number; lng: number; accuracy: number };

export default function AbsenPanel() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SettingsLite | null>(null);
  const [shift, setShift] = useState<ShiftInfo | null>(null);
  const [current, setCurrent] = useState<AbsRow | null>(null);
  const [last, setLast] = useState<AbsRow | null>(null);
  const [tanggal, setTanggal] = useState("");

  const [now, setNow] = useState<Date>(new Date());
  const [geo, setGeo] = useState<Geo | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadToday = useCallback(async () => {
    const res = await fetch("/api/attendance/today", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setSettings(data.settings);
    setShift(data.shift);
    setCurrent(data.current);
    setLast(data.last);
    setTanggal(data.tanggal);
  }, []);

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Perangkat tidak mendukung GPS.");
      return;
    }
    setGeoBusy(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGeoBusy(false);
      },
      (err) => {
        setGeoBusy(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Izin lokasi ditolak. Aktifkan GPS lalu coba lagi."
            : "Gagal membaca lokasi. Coba lagi.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  }, []);

  useEffect(() => {
    setLoading(true);
    loadToday().finally(() => setLoading(false));
    requestLocation();
  }, [loadToday, requestLocation]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  async function startCamera() {
    setMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraOn(true);
    } catch {
      setMessage({
        kind: "err",
        text: "Tidak bisa mengakses kamera. Izinkan akses kamera di browser.",
      });
    }
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const maxDim = 640;
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 640;
    const scale = Math.min(1, maxDim / Math.max(vw, vh));
    canvas.width = Math.round(vw * scale);
    canvas.height = Math.round(vh * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    setSelfie(dataUrl);
    stopCamera();
  }

  function retake() {
    setSelfie(null);
    startCamera();
  }

  const phase: Phase = current ? "pulang" : "masuk";
  const jarak =
    geo && settings ? haversineMeters(settings.lat, settings.lng, geo.lat, geo.lng) : null;
  const inRadius =
    !settings?.geofence_aktif || (jarak !== null && jarak <= settings.radius_m);
  const needSelfie = !!settings?.selfie_wajib;

  const requirementsOk =
    (!settings?.geofence_aktif || (!!geo && inRadius)) &&
    (!needSelfie || !!selfie);

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/attendance/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: geo?.lat ?? null,
          lng: geo?.lng ?? null,
          selfie,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ kind: "err", text: data.error || "Gagal menyimpan absensi." });
        return;
      }
      const label = data.action === "check_out" ? "Absen pulang" : "Absen masuk";
      setMessage({ kind: "ok", text: `${label} berhasil dicatat. Terima kasih!` });
      setSelfie(null);
      await loadToday();
    } catch {
      setMessage({ kind: "err", text: "Tidak dapat terhubung ke server." });
    } finally {
      setSubmitting(false);
    }
  }

  const jamSekarang = settings
    ? new Intl.DateTimeFormat("id-ID", {
        timeZone: settings.tz,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(now)
    : "--:--:--";

  const tanggalTampil = tanggal
    ? new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: settings?.tz,
      }).format(new Date(tanggal + "T00:00:00"))
    : "";

  if (loading) {
    return <div className="card p-6 text-center text-slate-400">Memuat…</div>;
  }

  const actionLabel = phase === "masuk" ? "Absen Masuk" : "Absen Pulang";
  const summary = current ?? last;

  return (
    <div className="space-y-4">
      {/* Jam & lokasi dapur */}
      <div className="card p-6 text-center">
        <p className="text-xs uppercase tracking-wide text-slate-400">
          {settings?.nama_dapur}
        </p>
        <p className="mt-3 font-mono text-5xl font-bold tracking-tight text-gold-400">
          {jamSekarang}
        </p>
        <p className="mt-2 text-sm text-slate-400">{tanggalTampil}</p>
      </div>

      {/* Info shift / divisi */}
      {shift && (
        <div className="card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Shift Anda</p>
              <p className="mt-0.5 text-sm font-semibold">
                {shift.divisi_nama || "Umum (jam global dapur)"}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-semibold text-gold-400">
                {shift.jam_masuk}–{shift.jam_pulang}
              </p>
              {shift.lintas_hari && (
                <span className="badge bg-ember-500/15 text-ember-400">lintas hari</span>
              )}
            </div>
          </div>
          {shift.jobdesk && (
            <div className="mt-3 rounded-lg border border-white/5 bg-ink-900/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                📋 Uraian Tugas (Jobdesk)
              </p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-200">
                {shift.jobdesk}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sedang bekerja */}
      {current && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-200">
          ● Sedang dalam shift — masuk {fmtTime(current.check_in, settings?.tz)}. Jangan
          lupa absen pulang setelah selesai.
        </p>
      )}

      {/* Status lokasi */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">📍 Lokasi</p>
          <button
            onClick={requestLocation}
            className="btn-ghost px-2.5 py-1 text-xs"
            disabled={geoBusy}
          >
            {geoBusy ? "Mendeteksi…" : "Perbarui"}
          </button>
        </div>
        {geoError ? (
          <p className="mt-2 text-sm text-red-300">{geoError}</p>
        ) : geo ? (
          <div className="mt-2 text-sm">
            {settings?.geofence_aktif ? (
              <p className={inRadius ? "text-emerald-300" : "text-red-300"}>
                {inRadius ? "✓ Anda di area dapur" : "✗ Di luar area dapur"} ·{" "}
                <span className="text-slate-400">
                  {jarak} m dari titik dapur (maks {settings.radius_m} m)
                </span>
              </p>
            ) : (
              <p className="text-slate-400">
                Validasi lokasi nonaktif · {jarak ?? "?"} m dari dapur
              </p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-400">
            {geoBusy ? "Mendeteksi lokasi…" : "Lokasi belum terdeteksi."}
          </p>
        )}
      </div>

      {/* Kamera / selfie wajah */}
      {needSelfie && (
        <div className="card p-4">
          <p className="mb-3 text-sm font-semibold">📸 Foto Wajah</p>
          <div className="overflow-hidden rounded-xl bg-ink-900">
            {selfie ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selfie} alt="Foto wajah" className="mx-auto max-h-72" />
            ) : (
              <video
                ref={videoRef}
                playsInline
                muted
                className={
                  "mx-auto max-h-72 w-full object-cover " + (cameraOn ? "" : "hidden")
                }
              />
            )}
            {!cameraOn && !selfie && (
              <div className="grid h-44 place-items-center text-sm text-slate-500">
                Kamera belum aktif
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="mt-3 flex gap-2">
            {!cameraOn && !selfie && (
              <button onClick={startCamera} className="btn-ghost flex-1">
                Aktifkan Kamera
              </button>
            )}
            {cameraOn && !selfie && (
              <button onClick={capture} className="btn-gold flex-1">
                Ambil Foto
              </button>
            )}
            {selfie && (
              <button onClick={retake} className="btn-ghost flex-1">
                Ambil Ulang
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pesan */}
      {message && (
        <p
          className={
            "rounded-xl border px-4 py-3 text-sm " +
            (message.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/30 bg-red-500/10 text-red-200")
          }
        >
          {message.text}
        </p>
      )}

      {/* Tombol aksi */}
      <button
        onClick={submit}
        disabled={!requirementsOk || submitting}
        className={
          "w-full rounded-2xl py-5 text-lg font-bold transition active:scale-[0.99] " +
          (phase === "masuk"
            ? "bg-emerald-500 text-ink-950 hover:bg-emerald-400"
            : "bg-gold-500 text-white hover:bg-gold-400") +
          " disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {submitting ? "Menyimpan…" : actionLabel}
      </button>

      {!requirementsOk && (
        <p className="text-center text-xs text-slate-500">
          {settings?.geofence_aktif && (!geo || !inRadius)
            ? "Pastikan lokasi terdeteksi & berada di area dapur. "
            : ""}
          {needSelfie && !selfie ? "Ambil foto wajah dulu sebelum absen." : ""}
        </p>
      )}

      {/* Ringkasan shift */}
      <div className="card p-4">
        <p className="mb-2 text-sm font-semibold">
          {current ? "Shift Berjalan" : "Shift Terakhir"}
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-ink-900/60 p-3">
            <p className="text-xs text-slate-400">Jam Masuk</p>
            <p className="mt-0.5 font-semibold">{fmtTime(summary?.check_in, settings?.tz)}</p>
            {summary?.status_masuk && (
              <span
                className={
                  "badge mt-1 " +
                  (summary.status_masuk === "Terlambat"
                    ? "bg-red-500/15 text-red-300"
                    : "bg-emerald-500/15 text-emerald-300")
                }
              >
                {summary.status_masuk}
              </span>
            )}
          </div>
          <div className="rounded-lg bg-ink-900/60 p-3">
            <p className="text-xs text-slate-400">Jam Pulang</p>
            <p className="mt-0.5 font-semibold">{fmtTime(summary?.check_out, settings?.tz)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmtTime(value: string | null | undefined, tz?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}
