"use client";

// Loader ringan face-api.js (dari CDN) khusus untuk filter wajah "lucu-lucu":
// hanya butuh tinyFaceDetector + 68 titik landmark. Fail-safe: bila gagal muat
// (offline/CDN), kembalikan null → filter dilewati, kamera & absensi tetap jalan.

export type Pt = { x: number; y: number };

interface Net {
  loadFromUri: (u: string) => Promise<void>;
}
interface LandmarkResult {
  landmarks?: { positions: Pt[] };
}
interface DetectTask {
  withFaceLandmarks: () => Promise<LandmarkResult | undefined>;
}
export interface FaceApi {
  nets: { tinyFaceDetector: Net; faceLandmark68Net: Net };
  detectSingleFace: (input: HTMLVideoElement, opts: unknown) => DetectTask;
  TinyFaceDetectorOptions: new (o: { inputSize?: number; scoreThreshold?: number }) => unknown;
}

const CDN_SCRIPT = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js";
const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

let apiPromise: Promise<FaceApi | null> | null = null;

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as unknown as { faceapi?: FaceApi }).faceapi) return resolve();
    const existing = document.querySelector<HTMLScriptElement>("script[data-faceapi]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("gagal")));
      return;
    }
    const s = document.createElement("script");
    s.src = CDN_SCRIPT;
    s.async = true;
    s.dataset.faceapi = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("gagal memuat face-api"));
    document.head.appendChild(s);
  });
}

/** Muat face-api + model sekali (di-cache). Null bila gagal. */
export function getFaceApiLite(): Promise<FaceApi | null> {
  if (!apiPromise) {
    apiPromise = (async () => {
      try {
        await loadScript();
        const api = (window as unknown as { faceapi?: FaceApi }).faceapi;
        if (!api) return null;
        await Promise.all([
          api.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          api.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);
        return api;
      } catch {
        return null;
      }
    })();
  }
  return apiPromise;
}

/** Deteksi 68 titik landmark wajah pada video (koordinat piksel native video). */
export async function detectLandmarks(
  api: FaceApi,
  video: HTMLVideoElement,
): Promise<Pt[] | null> {
  try {
    const det = await api
      .detectSingleFace(
        video,
        new api.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }),
      )
      .withFaceLandmarks();
    return det?.landmarks?.positions ?? null;
  } catch {
    return null;
  }
}
