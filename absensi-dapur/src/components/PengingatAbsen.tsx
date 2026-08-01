"use client";

import { useEffect, useState } from "react";

interface Data {
  belumMasuk: boolean;
  belumPulang: boolean;
  jamTemanMasuk: string | null;
  jamTemanPulang: string | null;
}

function jam(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Banner pengingat absen personal. Muncul di halaman utama dapur bila rekan
 * kerja sudah absen tapi pegawai ini belum (masuk / pulang). Read-only —
 * hanya menampilkan pengingat, tidak mengubah data absensi.
 */
export default function PengingatAbsen() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/me/pengingat", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d) setData(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!data || (!data.belumMasuk && !data.belumPulang)) return null;

  return (
    <div className="space-y-2">
      {data.belumMasuk && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3">
          <span className="text-lg">⏰</span>
          <div className="text-sm">
            <p className="font-semibold text-amber-200">Kamu belum absen masuk</p>
            <p className="text-amber-100/80">
              Rekan kerjamu sudah absen masuk
              {data.jamTemanMasuk ? ` sejak jam ${jam(data.jamTemanMasuk)}` : ""}.
              Jangan lupa absen ya!
            </p>
          </div>
        </div>
      )}
      {data.belumPulang && (
        <div className="flex items-start gap-3 rounded-xl border border-sky-400/40 bg-sky-400/10 p-3">
          <span className="text-lg">🌙</span>
          <div className="text-sm">
            <p className="font-semibold text-sky-200">Kamu belum absen pulang</p>
            <p className="text-sky-100/80">
              Rekan kerjamu sudah absen pulang
              {data.jamTemanPulang ? ` sejak jam ${jam(data.jamTemanPulang)}` : ""}.
              Ingat absen pulang sebelum pergi.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
