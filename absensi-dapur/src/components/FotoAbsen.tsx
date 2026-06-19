"use client";

import { useState } from "react";

interface Detail {
  id: number;
  nama: string;
  jabatan: string | null;
  selfie_in: string | null;
  selfie_out: string | null;
  check_in: string | null;
  check_out: string | null;
  check_in_jarak: number | null;
  check_out_jarak: number | null;
}

function fmtTime(v: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/**
 * Tombol kecil yang membuka modal berisi foto selfie absen masuk & pulang.
 * Detail (termasuk base64 selfie) diambil lazy saat diklik agar daftar admin
 * tetap ringan.
 */
export default function FotoAbsen({
  id,
  nama,
  label = "Foto",
}: {
  id: number;
  nama: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function show() {
    setOpen(true);
    if (detail) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/attendance/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal memuat foto.");
        return;
      }
      setDetail(data.detail);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={show}
        className="btn-ghost px-2.5 py-1 text-xs"
        title={`Lihat foto absen ${nama}`}
      >
        🖼 {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-30 grid place-items-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="card w-full max-w-lg p-5"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold">{nama}</h3>
                <p className="text-xs text-slate-400">
                  {detail?.jabatan || "Foto verifikasi absensi"}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="btn-ghost px-2.5 py-1 text-xs"
              >
                Tutup
              </button>
            </div>

            {loading ? (
              <p className="py-10 text-center text-slate-400">Memuat foto…</p>
            ) : error ? (
              <p className="py-10 text-center text-red-300">{error}</p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Figure
                  title="Masuk"
                  src={detail?.selfie_in ?? null}
                  caption={`${fmtTime(detail?.check_in ?? null)}${
                    detail?.check_in_jarak != null ? ` · ${detail.check_in_jarak} m` : ""
                  }`}
                />
                <Figure
                  title="Pulang"
                  src={detail?.selfie_out ?? null}
                  caption={`${fmtTime(detail?.check_out ?? null)}${
                    detail?.check_out_jarak != null ? ` · ${detail.check_out_jarak} m` : ""
                  }`}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Figure({
  title,
  src,
  caption,
}: {
  title: string;
  src: string | null;
  caption: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-ink-900/60">
      <div className="flex items-center justify-between px-3 py-2 text-xs">
        <span className="font-semibold">{title}</span>
        <span className="text-slate-400">{caption}</span>
      </div>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`Selfie ${title}`} className="aspect-square w-full object-cover" />
      ) : (
        <div className="grid aspect-square place-items-center text-xs text-slate-500">
          Tidak ada foto
        </div>
      )}
    </div>
  );
}
