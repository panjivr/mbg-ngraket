"use client";

/**
 * Alert Absensi — panel ringkas di dashboard admin yang menampilkan pegawai
 * TELAT dan yang BELUM absen masuk hari ini (per nama), plus tombol nudge WA.
 * Data read-only dari /api/admin/alert-absensi; nudge memakai share-sheet
 * WhatsApp (wa.me/?text=) tanpa gateway berbayar & tanpa ubah data/skema.
 */
import { useCallback, useEffect, useState } from "react";

interface TelatItem {
  nama: string;
  jabatan: string | null;
  check_in: string | null;
}
interface BelumItem {
  nama: string;
  jabatan: string | null;
}
interface Data {
  tanggal: string;
  telat: TelatItem[];
  belum: BelumItem[];
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

/** Buka share-sheet WhatsApp berisi pengingat untuk yang belum absen. */
function nudgeBelum(belum: BelumItem[]): void {
  if (belum.length === 0) return;
  const daftar = belum.map((b) => `• ${b.nama}`).join("\n");
  const teks =
    `*Pengingat Absensi Hari Ini*\n\n` +
    `Mohon segera lakukan absen masuk (clock-in) bagi yang belum:\n${daftar}\n\n` +
    `Terima kasih 🙏`;
  window.open(
    `https://wa.me/?text=${encodeURIComponent(teks)}`,
    "_blank",
    "noopener,noreferrer",
  );
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
  const { telat, belum } = data;
  if (telat.length === 0 && belum.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
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

      {/* Belum absen */}
      {belum.length > 0 && (
        <div className="card border-red-500/30 bg-red-500/[0.06] p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-red-500/15 text-red-300">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8 12h8" />
                </svg>
              </span>
              <p className="text-sm font-semibold text-red-200">
                Belum absen · {belum.length}
              </p>
            </div>
            <button
              type="button"
              onClick={() => nudgeBelum(belum)}
              title="Kirim pengingat ke grup / broadcast WhatsApp"
              className="btn-ghost inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-emerald-300"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.38a9.85 9.85 0 0 0 4.74 1.2h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7A9.82 9.82 0 0 0 12.04 2Zm0 1.8c2.16 0 4.19.84 5.72 2.37a8.04 8.04 0 0 1 2.37 5.72c0 4.46-3.63 8.09-8.1 8.09-1.48 0-2.93-.4-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.03 8.03 0 0 1-1.24-4.32c0-4.46 3.63-8.09 8.1-8.09Zm4.68 10.24c-.26-.13-1.51-.75-1.75-.83-.24-.09-.4-.13-.58.13-.17.26-.66.83-.81 1-.15.17-.3.2-.55.07-.26-.13-1.08-.4-2.06-1.27-.76-.68-1.28-1.52-1.43-1.78-.15-.26-.02-.4.11-.53.12-.12.26-.3.39-.46.13-.15.17-.26.26-.44.09-.17.04-.33-.02-.46-.07-.13-.58-1.4-.8-1.92-.21-.5-.42-.43-.58-.44l-.5-.01c-.17 0-.44.07-.67.33-.24.26-.9.88-.9 2.15 0 1.27.92 2.5 1.05 2.67.13.17 1.8 2.76 4.37 3.87.61.26 1.09.42 1.46.54.61.2 1.17.17 1.62.1.49-.07 1.51-.62 1.72-1.21.21-.6.21-1.1.15-1.21-.06-.11-.24-.17-.5-.3Z" />
              </svg>
              Ingatkan
            </button>
          </div>
          <ul className="scroll-x mt-3 max-h-40 space-y-1.5 overflow-y-auto pr-1 text-sm">
            {belum.map((b, i) => (
              <li key={i} className="min-w-0 truncate">
                {b.nama}
                {b.jabatan && <span className="text-slate-500"> · {b.jabatan}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
