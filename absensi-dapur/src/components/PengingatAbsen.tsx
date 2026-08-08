"use client";

import { useEffect, useState, type ReactNode } from "react";

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
        <div className="card flex items-start gap-3 border-l-4 border-l-amber-500 p-4">
          <span className="mt-0.5 shrink-0 text-amber-500">
            <ReminderIcon>
              <circle cx="12" cy="13" r="8" />
              <path d="M12 9v4l2.5 1.5M5 3 2.5 5.5M19 3l2.5 2.5" />
            </ReminderIcon>
          </span>
          <div className="text-sm">
            <p className="font-semibold text-slate-100">Kamu belum absen masuk</p>
            <p className="mt-0.5 leading-relaxed text-slate-400">
              Rekan kerjamu sudah absen masuk
              {data.jamTemanMasuk ? ` sejak jam ${jam(data.jamTemanMasuk)}` : ""}.
              Jangan lupa absen ya!
            </p>
          </div>
        </div>
      )}
      {data.belumPulang && (
        <div className="card flex items-start gap-3 border-l-4 border-l-sky-500 p-4">
          <span className="mt-0.5 shrink-0 text-sky-500">
            <ReminderIcon>
              <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
            </ReminderIcon>
          </span>
          <div className="text-sm">
            <p className="font-semibold text-slate-100">Kamu belum absen pulang</p>
            <p className="mt-0.5 leading-relaxed text-slate-400">
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

function ReminderIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
