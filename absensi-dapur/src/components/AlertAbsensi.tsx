"use client";

/**
 * Alert Absensi — panel ringkas di dashboard admin yang menampilkan pegawai
 * TELAT hari ini (per nama). Read-only dari /api/admin/alert-absensi.
 * Pengingat untuk yang belum absen kini ditangani otomatis lewat notifikasi
 * di HP tiap pegawai, jadi panel "belum absen" + broadcast WA dihapus.
 */
import { useCallback, useEffect, useState } from "react";

interface TelatItem {
  nama: string;
  jabatan: string | null;
  check_in: string | null;
}
interface Data {
  tanggal: string;
  telat: TelatItem[];
}

function fmtJam(v: string | null): string {
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

export default function AlertAbsensi() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/alert-absensi", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {
      /* diamkan — panel opsional, jangan ganggu dashboard */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Sembunyikan total saat memuat atau tidak ada masalah — tidak menambah noise.
  if (loading || !data) return null;
  const { telat } = data;
  if (telat.length === 0) return null;

  return (
    <div className="grid gap-3">
      {/* Terlambat */}
      {telat.length > 0 && (
        <div className="card border-amber-500/30 bg-amber-500/[0.06] p-4">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/15 text-amber-300">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </span>
            <p className="text-sm font-semibold text-amber-200">
              Terlambat hari ini · {telat.length}
            </p>
          </div>
          <ul className="scroll-x mt-3 max-h-40 space-y-1.5 overflow-y-auto pr-1 text-sm">
            {telat.map((t, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">
                  {t.nama}
                  {t.jabatan && <span className="text-slate-500"> · {t.jabatan}</span>}
                </span>
                <span className="shrink-0 tabular-nums text-amber-300">{fmtJam(t.check_in)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
