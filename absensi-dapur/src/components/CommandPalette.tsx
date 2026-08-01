"use client";

/**
 * Command Palette (Ctrl/Cmd+K) — pencarian & navigasi cepat antar halaman admin.
 * Daftar tujuan mengikuti akses/paket yang sama seperti AdminNav (flag diteruskan
 * dari server layout), jadi tidak pernah menampilkan menu yang tidak boleh dibuka.
 * Murni navigasi klien — tidak mengubah data atau sistem yang sudah berjalan.
 */
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Flags {
  fullAdmin: boolean;
  aksesDistribusi: boolean;
  aksesLaporan: boolean;
  isHr: boolean;
  isSuper: boolean;
  fitur: string[];
}
interface Dest {
  label: string;
  href: string;
  group: string;
  keywords: string;
  show: boolean;
}

function buildDests(f: Flags): Dest[] {
  const has = (k: string) => f.fitur.includes(k);
  const raw: Dest[] = [
    { label: "Dashboard", href: "/admin", group: "Utama", keywords: "beranda home ringkasan", show: f.fullAdmin },
    { label: "Distribusi", href: "/admin/distribusi", group: "Operasional", keywords: "kirim antar sekolah porsi", show: f.aksesDistribusi && has("distribusi") },
    { label: "Menu", href: "/admin/menu", group: "Operasional", keywords: "makanan resep hidangan", show: f.aksesDistribusi && has("distribusi") },
    { label: "Jadwal & Belanja", href: "/admin/jadwal-menu", group: "Operasional", keywords: "belanja bahan periode rencana", show: f.aksesDistribusi && has("distribusi") },
    { label: "Laporan Harian", href: "/admin/laporan", group: "Operasional", keywords: "penerimaan harian catatan", show: f.aksesLaporan && has("distribusi") },
    { label: "Ahli Gizi", href: "/admin/ahli-gizi", group: "Operasional", keywords: "nutrisi kalori gizi", show: f.fullAdmin && has("ahli_gizi") },
    { label: "Gudang", href: "/admin/gudang", group: "Operasional", keywords: "stok inventaris bahan", show: (f.fullAdmin || f.aksesLaporan) && has("gudang") },
    { label: "Pegawai", href: "/admin/pegawai", group: "Kepegawaian", keywords: "staf karyawan tim absen", show: f.fullAdmin && has("pegawai") },
    { label: "Divisi", href: "/admin/divisi", group: "Kepegawaian", keywords: "bagian departemen grup", show: f.fullAdmin && has("pegawai") },
    { label: "Leaderboard", href: "/admin/leaderboard", group: "Kepegawaian", keywords: "peringkat ranking kinerja", show: f.fullAdmin && has("pegawai") },
    { label: "Event", href: "/admin/event", group: "Kepegawaian", keywords: "acara kegiatan agenda", show: f.fullAdmin && has("pegawai") },
    { label: "SOP", href: "/admin/sop", group: "Kepegawaian", keywords: "prosedur panduan aturan", show: f.fullAdmin && has("pegawai") },
    { label: "Jadwal Kerja", href: "/admin/jadwal", group: "Kepegawaian", keywords: "shift jam kerja", show: f.fullAdmin && has("pegawai") },
    { label: "Izin", href: "/admin/izin", group: "Kepegawaian", keywords: "cuti sakit absen izin", show: f.fullAdmin && has("pegawai") },
    { label: "Pengumuman", href: "/admin/pengumuman", group: "Kepegawaian", keywords: "broadcast info berita", show: f.fullAdmin && has("pegawai") },
    { label: "HR / Gaji", href: "/admin/hr", group: "Kepegawaian", keywords: "payroll upah sdm", show: f.isHr && has("hr") },
    { label: "Rekap", href: "/admin/rekap", group: "Keuangan", keywords: "laporan absensi ekspor", show: f.fullAdmin },
    { label: "Gaji", href: "/admin/gaji", group: "Keuangan", keywords: "payroll upah bayar", show: f.fullAdmin },
    { label: "Slip", href: "/admin/slip", group: "Keuangan", keywords: "slip gaji cetak", show: f.fullAdmin },
    { label: "Akuntan", href: "/admin/akuntan", group: "Keuangan", keywords: "pembukuan kas jurnal", show: f.fullAdmin && has("akuntan") },
    { label: "Aktivitas", href: "/admin/audit", group: "Sistem", keywords: "log audit riwayat", show: f.fullAdmin },
    { label: "Pengaturan", href: "/admin/pengaturan", group: "Sistem", keywords: "setting konfigurasi profil dapur", show: f.fullAdmin },
    { label: "Dashboard Dapur", href: "/admin/pusat/dashboard", group: "Semua Dapur", keywords: "pusat monitoring semua", show: f.isSuper },
    { label: "Rekap Absensi Pusat", href: "/admin/pusat", group: "Semua Dapur", keywords: "pusat rekap semua dapur", show: f.isSuper },
    { label: "Kelola Dapur", href: "/admin/sppg", group: "Semua Dapur", keywords: "sppg tambah dapur langganan", show: f.isSuper },
  ];
  return raw.filter((d) => d.show);
}

function norm(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s]/g, "");
}

export default function CommandPalette(flags: Flags) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const dests = useMemo(() => buildDests(flags), [flags]);

  const results = useMemo(() => {
    const term = norm(q.trim());
    if (!term) return dests;
    const words = term.split(/\s+/);
    return dests.filter((d) => {
      const hay = norm(`${d.label} ${d.group} ${d.keywords}`);
      return words.every((w) => hay.includes(w));
    });
  }, [q, dests]);

  // Buka/tutup dengan Ctrl+K / Cmd+K (dan Esc untuk tutup).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onToggle = () => setOpen((v) => !v);
    window.addEventListener("keydown", onKey);
    window.addEventListener("cmdk:toggle", onToggle);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("cmdk:toggle", onToggle);
    };
  }, []);

  // Reset & fokus saat dibuka.
  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      const id = window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  // Jaga index aktif tetap valid saat hasil berubah.
  useEffect(() => {
    setActive((a) => (a >= results.length ? 0 : a));
  }, [results.length]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = results[active];
      if (it) go(it.href);
    }
  };

  // Gulir item aktif ke tampilan.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Pencarian cepat"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 text-slate-400" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Cari halaman… (mis. pegawai, rekap, gaji)"
            className="w-full bg-transparent py-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
            aria-label="Ketik untuk mencari halaman"
          />
          <kbd className="hidden shrink-0 rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-slate-400 sm:block">
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500">Tidak ada halaman yang cocok.</p>
          ) : (
            results.map((d, i) => (
              <button
                key={d.href}
                type="button"
                data-idx={i}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(d.href)}
                className={
                  "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition " +
                  (i === active ? "bg-gold-500/15 text-gold-300" : "text-slate-200 hover:bg-white/5")
                }
              >
                <span className="font-medium">{d.label}</span>
                <span className="shrink-0 text-[11px] text-slate-500">{d.group}</span>
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/10 px-3 py-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-white/15 px-1 py-0.5">↑</kbd>
            <kbd className="rounded border border-white/15 px-1 py-0.5">↓</kbd>
            navigasi
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-white/15 px-1 py-0.5">↵</kbd>
            buka
          </span>
        </div>
      </div>
    </div>
  );
}
