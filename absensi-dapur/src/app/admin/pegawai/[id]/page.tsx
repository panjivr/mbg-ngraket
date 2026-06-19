"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import KartuShare from "@/components/KartuShare";
import { fmtDurasi } from "@/lib/time";
import { formatTanggalIndo } from "@/lib/weton";
import RamalanLengkap from "@/components/RamalanLengkap";
import ShioFengshuiLengkap from "@/components/ShioFengshuiLengkap";
import type { KartuPegawai as Kartu } from "@/lib/types";

interface Akun {
  username: string;
  role: string;
  aktif: boolean;
}
interface RiwayatRow {
  id: number;
  tanggal: string | null;
  check_in: string | null;
  check_out: string | null;
  status_masuk: string | null;
  divisi_nama: string | null;
}
interface ReportData {
  kartu: Kartu;
  akun: Akun | null;
  riwayat: RiwayatRow[];
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
function fmtDate(v: string | null) {
  if (!v) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(v + "T00:00:00"));
}
function umur(tgl: string | null): string {
  if (!tgl) return "—";
  const d = new Date(tgl + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  let y = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) y -= 1;
  return `${y} tahun`;
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 py-2 text-sm last:border-0">
      <span className="text-slate-400">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  );
}

export default function LaporanPegawaiPage() {
  const params = useParams();
  const id = String(params.id);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/employees/${id}/report`, { cache: "no-store" })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) setErr(j.error || "Gagal memuat laporan.");
        else setData(j);
      })
      .catch(() => setErr("Tidak dapat terhubung ke server."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="card p-6 text-center text-slate-400">Memuat laporan…</div>;
  if (err || !data)
    return (
      <div className="space-y-4">
        <Link href="/admin/pegawai" className="btn-ghost px-4 py-1.5 text-sm">
          ← Kembali
        </Link>
        <div className="card p-6 text-center text-red-300">{err || "Data tidak ada."}</div>
      </div>
    );

  const { kartu, akun, riwayat } = data;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/admin/pegawai" className="btn-ghost px-4 py-1.5 text-sm">
          ← Kembali
        </Link>
        <h1 className="text-base font-bold text-slate-300">Laporan Pegawai (A–Z)</h1>
      </div>

      {/* Identitas ringkas */}
      <div className="card flex items-center gap-4 p-5">
        <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-ink-900">
          {kartu.foto_profil ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={kartu.foto_profil} alt={kartu.nama} className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg font-bold text-gold-300">
              {kartu.nama.slice(0, 2).toUpperCase()}
            </span>
          )}
        </span>
        <div className="min-w-0">
          <p className="text-lg font-extrabold">{kartu.nama}</p>
          <p className="text-sm text-slate-400">{kartu.jabatan || "Tim Dapur MBG"}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {kartu.divisi_nama && (
              <span className="badge bg-gold-500/15 text-gold-400">{kartu.divisi_nama}</span>
            )}
            {akun && (
              <span
                className={
                  "badge " +
                  (akun.aktif
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-red-500/15 text-red-300")
                }
              >
                {akun.aktif ? "Aktif" : "Nonaktif"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Data diri */}
        <div className="card p-5">
          <p className="mb-2 text-sm font-semibold">🧾 Data Diri</p>
          <Row k="Nama Lengkap" v={kartu.nama} />
          <Row k="Username" v={akun?.username || "—"} />
          <Row k="Peran" v={akun?.role === "admin" ? "Admin" : "Staf"} />
          <Row k="NIP" v={kartu.nip || "—"} />
          <Row k="Jabatan" v={kartu.jabatan || "—"} />
          <Row k="Tempat Lahir" v={kartu.tempat_lahir || "—"} />
          <Row k="Tanggal Lahir" v={formatTanggalIndo(kartu.tanggal_lahir)} />
          <Row k="Umur" v={umur(kartu.tanggal_lahir)} />
          <Row k="Bergabung" v={fmtDate(kartu.created_at?.slice(0, 10) || null)} />
          <Row k="Bio" v={kartu.bio || "—"} />
        </div>

        {/* Ramalan kepribadian lengkap (weton) */}
        {kartu.tanggal_lahir ? (
          <RamalanLengkap tgl={kartu.tanggal_lahir} nama={kartu.nama} />
        ) : (
          <div className="card p-5 text-sm text-slate-400">
            🔮 Tanggal lahir belum diisi. Lengkapi di menu Pegawai → Edit untuk melihat
            ramalan kepribadian.
          </div>
        )}

        {/* Shio & Fengshui (ilmu Tionghoa) — setelah weton */}
        {kartu.tanggal_lahir && (
          <ShioFengshuiLengkap
            nama={kartu.nama}
            tgl={kartu.tanggal_lahir}
            jenisKelamin={kartu.jenis_kelamin}
          />
        )}

        {/* Jadwal & tugas */}
        <div className="card p-5">
          <p className="mb-2 text-sm font-semibold">🗂️ Jadwal & Tugas</p>
          <Row k="Divisi" v={kartu.divisi_nama || "—"} />
          <Row
            k="Jam Shift"
            v={
              kartu.jam_masuk && kartu.jam_pulang
                ? `${kartu.jam_masuk}–${kartu.jam_pulang}`
                : "Jam global"
            }
          />
          <div className="mt-2">
            <p className="text-xs text-slate-400">Jobdesk</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-200">
              {kartu.jobdesk || "Belum diisi."}
            </p>
          </div>
        </div>

        {/* Statistik kehadiran */}
        <div className="card p-5">
          <p className="mb-2 text-sm font-semibold">📊 Statistik Kehadiran</p>
          <Row k="Total Shift" v={kartu.jumlah_shift} />
          <Row k="Tepat Waktu" v={<span className="text-emerald-300">{kartu.tepat}</span>} />
          <Row k="Terlambat" v={<span className="text-amber-300">{kartu.terlambat}</span>} />
          <Row k="Ketepatan" v={`${kartu.ketepatan}%`} />
          <Row k="Total Jam Kerja" v={<span className="text-gold-300">{fmtDurasi(kartu.total_menit)}</span>} />
          <Row
            k="Rata-rata / Shift"
            v={fmtDurasi(kartu.jumlah_shift ? Math.round(kartu.total_menit / kartu.jumlah_shift) : 0)}
          />
          <Row k="Peringkat" v={"★".repeat(kartu.bintang) + "☆".repeat(5 - kartu.bintang)} />
        </div>
      </div>

      {/* Riwayat terakhir */}
      <div className="card overflow-hidden">
        <div className="border-b border-white/5 px-4 py-3 text-sm font-semibold">
          🕓 Riwayat Kehadiran Terakhir
        </div>
        {riwayat.length === 0 ? (
          <p className="p-6 text-center text-slate-400">Belum ada catatan absensi.</p>
        ) : (
          <div className="scroll-x overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr className="border-b border-white/5">
                  <th className="px-4 py-2.5">Tanggal</th>
                  <th className="px-4 py-2.5">Divisi</th>
                  <th className="px-4 py-2.5">Masuk</th>
                  <th className="px-4 py-2.5">Pulang</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {riwayat.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5 whitespace-nowrap">{fmtDate(r.tanggal)}</td>
                    <td className="px-4 py-2.5 text-slate-400">{r.divisi_nama || "—"}</td>
                    <td className="px-4 py-2.5">{fmtTime(r.check_in)}</td>
                    <td className="px-4 py-2.5">{fmtTime(r.check_out)}</td>
                    <td className="px-4 py-2.5">
                      {r.status_masuk ? (
                        <span
                          className={
                            "badge " +
                            (r.status_masuk === "Terlambat"
                              ? "bg-red-500/15 text-red-300"
                              : "bg-emerald-500/15 text-emerald-300")
                          }
                        >
                          {r.status_masuk}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Kartu pegawai */}
      <div className="card p-5">
        <p className="mb-3 text-sm font-semibold">🪪 Kartu Pegawai</p>
        <KartuShare data={kartu} />
      </div>
    </div>
  );
}
