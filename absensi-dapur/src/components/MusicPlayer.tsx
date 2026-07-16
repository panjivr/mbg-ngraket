"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "musik-latar";
const VOLUME = 0.12;

type MusicPlayerProps = {
  src: string;
};

export default function MusicPlayer({ src }: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  // Keep the icon in sync with the real audio element state, and configure
  // subtle looping playback. Runs once; cleans up on unmount.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.loop = true;
    audio.volume = VOLUME;

    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.pause();
    };
  }, []);

  // Restore the saved preference. Browsers block autoplay until a user
  // gesture, so if play() is rejected we wait for the first pointer/key
  // event and resume then (only if the user still opted in).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = audioRef.current;
    if (!audio) return;

    if (window.localStorage.getItem(STORAGE_KEY) !== "1") return;

    const resumeHandler = () => {
      window.removeEventListener("pointerdown", resumeHandler);
      window.removeEventListener("keydown", resumeHandler);
      if (window.localStorage.getItem(STORAGE_KEY) === "1") {
        void audio.play().catch(() => {});
      }
    };

    void audio.play().catch(() => {
      // Autoplay blocked — arm a one-time listener for the first gesture.
      setPlaying(false);
      window.addEventListener("pointerdown", resumeHandler, { once: true });
      window.addEventListener("keydown", resumeHandler, { once: true });
    });

    return () => {
      window.removeEventListener("pointerdown", resumeHandler);
      window.removeEventListener("keydown", resumeHandler);
    };
  }, []);

  const toggle = useCallback(() => {
    if (typeof window === "undefined") return;
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      window.localStorage.setItem(STORAGE_KEY, "0");
    } else {
      window.localStorage.setItem(STORAGE_KEY, "1");
      void audio.play().catch(() => {});
    }
  }, [playing]);

  return (
    <>
      <audio ref={audioRef} src={src} loop preload="none" />
      <button
        type="button"
        onClick={toggle}
        aria-pressed={playing}
        aria-label={playing ? "Musik latar aktif" : "Musik latar mati"}
        title="Musik latar"
        className="fixed bottom-4 left-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-lg leading-none shadow-lg backdrop-blur transition-colors hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
      >
        <span aria-hidden="true">{playing ? "🎵" : "🔇"}</span>
      </button>
    </>
  );
}
