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

interface DetResult {
  detection?: { score?: number };
  expressions: Record<string, number>;
  age?: number;
  gender?: string;
  genderProbability?: number;
}
interface LoadNet {
  loadFromUri: (u: string) => Promise<void>;
}
interface FaceApiNS {
  nets: {
    tinyFaceDetector: LoadNet;
    ssdMobilenetv1: LoadNet;
    faceExpressionNet: LoadNet;
    faceLandmark68Net: LoadNet;
    ageGenderNet: LoadNet;
  };
  TinyFaceDetectorOptions: new (opts?: {
    inputSize?: number;
    scoreThreshold?: number;
  }) => unknown;
  SsdMobilenetv1Options: new (opts?: {
    minConfidence?: number;
    maxResults?: number;
  }) => unknown;
  detectSingleFace: (
    input: HTMLImageElement,
    opts: unknown,
  ) => {
    withFaceLandmarks: () => {
      withFaceExpressions: () => {
        withAgeAndGender: () => Promise<DetResult | undefined>;
      };
    };
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

interface FaceApiBundle {
  api: FaceApiNS;
  ssd: boolean; // apakah detektor SSD MobileNet v1 (lebih akurat) tersedia
}

let faceApiPromise: Promise<FaceApiBundle> | null = null;

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

function getFaceApi(): Promise<FaceApiBundle> {
  if (!faceApiPromise) {
    faceApiPromise = (async () => {
      await loadScript(CDN_SCRIPT);
      const api = (window as unknown as { faceapi?: FaceApiNS }).faceapi;
      if (!api) throw new Error("faceapi tidak tersedia");
      // Muat model untuk deteksi + landmark + ekspresi + usia/gender agar
      // analisa wajah lebih presisi. Detektor utama SSD MobileNet v1 dimuat
      // secara opsional: bila HANYA model itu gagal, deteksi tetap jalan
      // memakai TinyFaceDetector sebagai cadangan (fail-safe).
      let ssd = true;
      await Promise.all([
        api.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        api.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        api.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        api.nets.ageGenderNet.loadFromUri(MODEL_URL),
        // Bungkus agar galat sinkron maupun asinkron tidak menggagalkan yang lain.
        Promise.resolve()
          .then(() => api.nets.ssdMobilenetv1.loadFromUri(MODEL_URL))
          .catch(() => {
            ssd = false;
          }),
      ]);
      return { api, ssd };
    })().catch((e) => {
      faceApiPromise = null; // izinkan retry di percobaan berikutnya
      throw e;
    });
  }
  return faceApiPromise;
}

interface MoodData {
  mood: string;
  confidence: number; // 0..1 keyakinan ekspresi dominan
  faceScore: number; // 0..1 keyakinan deteksi wajah
  age: number | null;
  gender: string | null;
  genderProb: number | null;
}
type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "noface" }
  | { kind: "unavailable" }
  | { kind: "result"; data: MoodData };

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
        const { api: faceapi, ssd } = await getFaceApi();
        // Baca gambar pada resolusi asli (data URL selfie apa adanya). Bila
        // dekode gagal atau ukurannya sangat kecil, tetap lanjutkan — detektor
        // akan menilai sendiri; alur absensi tidak boleh terhambat.
        const img = new Image();
        img.src = selfie;
        await img.decode().catch(() => {});

        // Detektor utama: SSD MobileNet v1 (lebih akurat). Bila modelnya tidak
        // tersedia atau tidak menemukan wajah, jatuh ke TinyFaceDetector dengan
        // input lebih besar + ambang lebih rendah. Semua diikuti landmark +
        // ekspresi + usia/gender.
        let det: DetResult | undefined;
        if (ssd) {
          det = await faceapi
            .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
            .withFaceLandmarks()
            .withFaceExpressions()
            .withAgeAndGender();
        }
        if (!det) {
          det = await faceapi
            .detectSingleFace(
              img,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.3 }),
            )
            .withFaceLandmarks()
            .withFaceExpressions()
            .withAgeAndGender();
        }
        if (!alive) return;
        if (!det || !det.expressions) {
          setStatus({ kind: "noface" });
          return;
        }
        const sorted = Object.entries(det.expressions).sort((a, b) => b[1] - a[1]);
        const top = sorted[0];
        const key = top?.[0] && MOODS[top[0]] ? top[0] : "neutral";
        setStatus({
          kind: "result",
          data: {
            mood: key,
            confidence: top?.[1] ?? 0,
            faceScore: det.detection?.score ?? 0,
            age: typeof det.age === "number" ? Math.round(det.age) : null,
            gender: det.gender ?? null,
            genderProb:
              typeof det.genderProbability === "number" ? det.genderProbability : null,
          },
        });
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
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <span className="text-3xl leading-none">{MOODS[status.data.mood].emoji}</span>
              <div>
                <p className="font-semibold text-ember-200">
                  Terdeteksi: {MOODS[status.data.mood].label}{" "}
                  <span className="text-xs font-normal text-slate-400">
                    ({Math.round(status.data.confidence * 100)}% yakin)
                  </span>
                </p>
                <p className="mt-0.5 leading-relaxed text-slate-200">
                  {MOODS[status.data.mood].pesan}
                  {restReminder}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {status.data.age != null && (
                <span className="rounded-md bg-white/5 px-2 py-0.5 text-slate-300">
                  Perkiraan usia ~{status.data.age} th
                </span>
              )}
              {status.data.gender && (
                <span className="rounded-md bg-white/5 px-2 py-0.5 text-slate-300">
                  {status.data.gender === "male" ? "Laki-laki" : "Perempuan"}
                  {status.data.genderProb != null
                    ? ` (${Math.round(status.data.genderProb * 100)}%)`
                    : ""}
                </span>
              )}
              <span className="rounded-md bg-white/5 px-2 py-0.5 text-slate-300">
                Kualitas wajah {Math.round(status.data.faceScore * 100)}%
              </span>
              {status.data.faceScore > 0.9 && (
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
                  Deteksi akurat
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-[10px] text-slate-500">
        Analisa wajah (ekspresi, perkiraan usia/gender) berjalan di perangkatmu — privasi
        terjaga, hasil tidak disimpan; hanya untuk menyemangati.
      </p>
    </div>
  );
}
