"use client";

import { useEffect, useState } from "react";

/**
 * Asisten AI deteksi ekspresi wajah. Memuat face-api.js dari CDN (di browser
 * pengguna) secara lazy, lalu memberi sapaan ramah sesuai mood. Dirancang
 * "fail-safe": bila model/CDN gagal dimuat, komponen hanya menampilkan pesan
 * lembut dan TIDAK pernah mengganggu alur absensi.
 */

type Phase = "masuk" | "pulang";

const CDN_SCRIPT = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js";
const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

interface FaceApiNS {
  nets: {
    tinyFaceDetector: { loadFromUri: (u: string) => Promise<void> };
    faceExpressionNet: { loadFromUri: (u: string) => Promise<void> };
  };
  TinyFaceDetectorOptions: new () => unknown;
  detectSingleFace: (
    input: HTMLImageElement,
    opts: unknown,
  ) => {
    withFaceExpressions: () => Promise<
      { expressions: Record<string, number> } | undefined
    >;
  };
}

const MOODS: Record<string, { emoji: string; label: string; pesan: string }> = {
  happy: {
    emoji: "😊",
    label: "Bahagia",
    pesan: "Senyummu cerah hari ini! Energi positifmu pasti menular ke tim. Pertahankan ya! 🌟",
  },
  sad: {
    emoji: "😢",
    label: "Sedih",
    pesan: "Kamu terlihat sedikit murung. Semoga harimu membaik — jangan ragu berbagi cerita dengan rekan kerja. 💙",
  },
  angry: {
    emoji: "😠",
    label: "Kesal",
    pesan: "Sepertinya ada yang mengganjal. Tarik napas sejenak dulu, kamu pasti bisa melewatinya. 🙏",
  },
  fearful: {
    emoji: "😟",
    label: "Cemas",
    pesan: "Tenang, semuanya akan baik-baik saja. Kerjakan satu per satu, kamu hebat! 💪",
  },
  disgusted: {
    emoji: "😕",
    label: "Kurang nyaman",
    pesan: "Kalau sedang kurang nyaman, istirahat sebentar tidak apa-apa. Jaga kesehatanmu ya. 🍵",
  },
  surprised: {
    emoji: "😮",
    label: "Terkejut",
    pesan: "Wah, ada kejutan? Tetap fokus dan hati-hati saat bekerja ya. ✨",
  },
  neutral: {
    emoji: "🙂",
    label: "Tenang",
    pesan: "Kamu tampak tenang dan siap. Selamat bekerja, semoga harimu lancar! 👍",
  },
};

let faceApiPromise: Promise<FaceApiNS> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-faceapi]");
    if (existing) {
      if (existing.dataset.loaded === "1") return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("load")));
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.faceapi = "1";
    s.addEventListener("load", () => {
      s.dataset.loaded = "1";
      resolve();
    });
    s.addEventListener("error", () => reject(new Error("load")));
    document.head.appendChild(s);
  });
}

function getFaceApi(): Promise<FaceApiNS> {
  if (!faceApiPromise) {
    faceApiPromise = (async () => {
      await loadScript(CDN_SCRIPT);
      const api = (window as unknown as { faceapi?: FaceApiNS }).faceapi;
      if (!api) throw new Error("faceapi tidak tersedia");
      await api.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await api.nets.faceExpressionNet.loadFromUri(MODEL_URL);
      return api;
    })().catch((e) => {
      faceApiPromise = null; // izinkan retry di percobaan berikutnya
      throw e;
    });
  }
  return faceApiPromise;
}

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "noface" }
  | { kind: "unavailable" }
  | { kind: "result"; mood: string };

export default function MoodAI({
  selfie,
  phase,
}: {
  selfie: string | null;
  phase: Phase;
}) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    if (!selfie) {
      setStatus({ kind: "idle" });
      return;
    }
    let alive = true;
    setStatus({ kind: "loading" });

    (async () => {
      try {
        const faceapi = await getFaceApi();
        const img = new Image();
        img.src = selfie;
        await img.decode().catch(() => {});
        const det = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
          .withFaceExpressions();
        if (!alive) return;
        if (!det || !det.expressions) {
          setStatus({ kind: "noface" });
          return;
        }
        const top = Object.entries(det.expressions).sort((a, b) => b[1] - a[1])[0];
        const key = top?.[0] && MOODS[top[0]] ? top[0] : "neutral";
        setStatus({ kind: "result", mood: key });
      } catch {
        if (alive) setStatus({ kind: "unavailable" });
      }
    })();

    return () => {
      alive = false;
    };
  }, [selfie, phase]);

  const restReminder =
    phase === "pulang"
      ? " Kamu sudah bekerja keras hari ini — jangan lupa istirahat dan pulihkan tenaga ya. 😴"
      : "";

  return (
    <div className="card border-ember-500/20 bg-ember-500/5 p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-ember-500/15 text-sm">
          🤖
        </span>
        <p className="text-sm font-semibold">Asisten AI · Suasana Hati</p>
      </div>

      <div className="mt-3 text-sm">
        {status.kind === "idle" && (
          <p className="text-slate-400">
            Ambil foto wajah dulu, nanti Asisten AI memberi sapaan sesuai ekspresimu.
          </p>
        )}
        {status.kind === "loading" && (
          <p className="flex items-center gap-2 text-slate-300">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-ember-400 border-t-transparent" />
            Membaca ekspresi wajahmu…
          </p>
        )}
        {status.kind === "noface" && (
          <p className="text-slate-400">
            Wajah belum terdeteksi jelas. Tidak masalah — absenmu tetap tercatat. 🙂
          </p>
        )}
        {status.kind === "unavailable" && (
          <p className="text-slate-400">
            Deteksi suasana hati belum bisa dimuat sekarang. Tetap semangat bekerja ya! 💪
            {restReminder}
          </p>
        )}
        {status.kind === "result" && (
          <div className="flex items-start gap-3">
            <span className="text-3xl leading-none">{MOODS[status.mood].emoji}</span>
            <div>
              <p className="font-semibold text-ember-200">
                Terdeteksi: {MOODS[status.mood].label}
              </p>
              <p className="mt-0.5 leading-relaxed text-slate-200">
                {MOODS[status.mood].pesan}
                {restReminder}
              </p>
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-[10px] text-slate-500">
        Deteksi berjalan di perangkatmu (privasi terjaga); hanya untuk menyemangati, tidak disimpan.
      </p>
    </div>
  );
}
