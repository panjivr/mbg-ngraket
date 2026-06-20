"use client";

import { useEffect, useRef, useState } from "react";
import KartuShare from "@/components/KartuShare";
import type { KartuPegawai as Kartu } from "@/lib/types";
import RamalanLengkap from "@/components/RamalanLengkap";
import ShioFengshuiLengkap from "@/components/ShioFengshuiLengkap";
import ChaldeanLengkap from "@/components/ChaldeanLengkap";

const MAX_BIO = 200;

async function fileToDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
  const img = new Image();
  img.src = dataUrl;
  await img.decode().catch(() => {});
  const max = 480;
  const w = img.width || max;
  const h = img.height || max;
  const scale = Math.min(1, max / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export default function ProfilPage() {
  const [kartu, setKartu] = useState<Kartu | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/me/card", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.kartu) {
        setKartu(data.kartu);
        setFoto(data.kartu.foto_profil ?? null);
        setBio(data.kartu.bio ?? "");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    try {
      const url = await fileToDataUrl(file);
      setFoto(url);
    } catch {
      setMsg({ kind: "err", text: "Gagal membaca gambar." });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foto_profil: foto, bio }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ kind: "err", text: data.error || "Gagal menyimpan profil." });
        return;
      }
      setMsg({ kind: "ok", text: "Profil tersimpan." });
      await load();
    } catch {
      setMsg({ kind: "err", text: "Tidak dapat terhubung ke server." });
    } finally {
      setSaving(false);
    }
  }

  // Kartu pratinjau memakai foto/bio yang sedang diedit.
  const preview: Kartu | null = kartu
    ? { ...kartu, foto_profil: foto, bio: bio.trim() || null }
    : null;

  if (loading) {
    return <div className="card p-6 text-center text-slate-400">Memuat…</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold">Kartu & Profil Saya</h1>
        <p className="text-sm text-slate-400">
          Atur foto & bio, lalu bagikan kartumu ke WhatsApp/Instagram atau simpan ke galeri.
        </p>
      </div>

      {preview && <KartuShare data={preview} />}

      {/* Ramalan kepribadian lengkap (dari tanggal lahir yang diisi admin) */}
      {kartu &&
        (kartu.tanggal_lahir ? (
          <RamalanLengkap tgl={kartu.tanggal_lahir} nama={kartu.nama} />
        ) : (
          <div className="card p-4 text-sm text-slate-400">
            🔮 Ramalan belum tersedia. Minta admin mengisi tanggal lahirmu untuk melihat
            ramalan kepribadian lengkapmu.
          </div>
        ))}

      {/* Shio & Fengshui (ilmu Tionghoa) — tampil setelah weton */}
      {kartu?.tanggal_lahir && (
        <ShioFengshuiLengkap
          nama={kartu.nama}
          tgl={kartu.tanggal_lahir}
          jenisKelamin={kartu.jenis_kelamin}
        />
      )}

      {/* Numerologi Chaldean — setelah Shio & Fengshui */}
      {kartu?.tanggal_lahir && (
        <ChaldeanLengkap nama={kartu.nama} tgl={kartu.tanggal_lahir} />
      )}

      <div className="card space-y-4 p-4">
        <p className="text-sm font-semibold">Ubah Profil</p>

        <div>
          <label className="label">Foto Profil</label>
          <div className="flex items-center gap-3">
            <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-ink-900">
              {foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={foto} alt="Pratinjau" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-slate-500">Kosong</span>
              )}
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="btn-ghost px-3 py-1.5 text-xs"
              >
                Pilih / Ambil Foto
              </button>
              {foto && (
                <button
                  onClick={() => setFoto(null)}
                  className="btn-ghost px-3 py-1.5 text-xs text-red-300"
                >
                  Hapus Foto
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={onPickFile}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Di ponsel, tombol ini bisa langsung membuka kamera. Gambar otomatis diperkecil.
          </p>
        </div>

        <div>
          <label className="label">Bio / Status</label>
          <textarea
            className="input min-h-[72px] resize-y"
            maxLength={MAX_BIO}
            value={bio}
            placeholder="mis. Juru masak yang suka tantangan menu baru 🍳"
            onChange={(e) => setBio(e.target.value)}
          />
          <p className="mt-1 text-right text-[11px] text-slate-500">
            {bio.length}/{MAX_BIO}
          </p>
        </div>

        {msg && (
          <p
            className={
              "rounded-lg border px-3 py-2 text-sm " +
              (msg.kind === "ok"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-red-500/30 bg-red-500/10 text-red-200")
            }
          >
            {msg.text}
          </p>
        )}

        <button onClick={save} disabled={saving} className="btn-gold w-full">
          {saving ? "Menyimpan…" : "Simpan Profil"}
        </button>
      </div>
    </div>
  );
}
