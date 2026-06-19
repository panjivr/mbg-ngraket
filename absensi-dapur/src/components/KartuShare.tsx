"use client";

import { useRef, useState } from "react";
import KartuPegawai from "./KartuPegawai";
import type { KartuPegawai as Kartu } from "@/lib/types";

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

/**
 * Menampilkan kartu pegawai + tombol bagikan (Web Share API ke WA/IG) dan
 * simpan ke galeri (unduh PNG). Gambar dirender dari DOM via html-to-image
 * (dimuat lazy).
 */
export default function KartuShare({ data }: { data: Kartu }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"share" | "save" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const filename = `kartu-${(data.nama || "pegawai")
    .replace(/\s+/g, "-")
    .toLowerCase()}.png`;

  async function render(): Promise<Blob | null> {
    if (!ref.current) return null;
    const { toBlob } = await import("html-to-image");
    return toBlob(ref.current, {
      pixelRatio: 2.5,
      cacheBust: true,
      backgroundColor: "#070f29",
    });
  }

  async function share() {
    setBusy("share");
    setMsg(null);
    try {
      const blob = await render();
      if (!blob) throw new Error("render");
      const file = new File([blob], filename, { type: "image/png" });
      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: `Kartu ${data.nama}`,
          text: `Kartu Pegawai Dapur MBG — ${data.nama}`,
        });
      } else {
        downloadBlob(blob, filename);
        setMsg(
          "Perangkat tidak mendukung bagikan langsung — kartu diunduh, silakan kirim manual ke WA/IG.",
        );
      }
    } catch (e) {
      // Pengguna membatalkan share -> AbortError; abaikan.
      if ((e as Error)?.name !== "AbortError") {
        setMsg("Gagal membuat gambar kartu. Coba lagi.");
      }
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
      setMsg("Kartu disimpan ke perangkat/galeri Anda.");
    } catch {
      setMsg("Gagal menyimpan kartu. Coba lagi.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-center">
        <div ref={ref}>
          <KartuPegawai data={data} />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={share} disabled={!!busy} className="btn-gold flex-1">
          {busy === "share" ? "Menyiapkan…" : "📤 Bagikan ke WA/IG"}
        </button>
        <button onClick={save} disabled={!!busy} className="btn-ghost flex-1">
          {busy === "save" ? "Menyimpan…" : "⬇ Simpan ke Galeri"}
        </button>
      </div>
      {msg && <p className="text-center text-xs text-slate-400">{msg}</p>}
    </div>
  );
}
