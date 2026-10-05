"use client";
import { usePathname } from "next/navigation";
import MusicPlayer from "@/components/MusicPlayer";
import { PUBLIC_PATHS } from "@/lib/marketing";
export default function ContextualMusicPlayer({ src }: { src: string }) {
  const pathname = usePathname();
  return PUBLIC_PATHS.includes(pathname) ? null : <MusicPlayer src={src}/>;
}
