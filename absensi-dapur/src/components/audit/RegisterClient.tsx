"use client";

/**
 * Register Temuan — daftar seluruh temuan audit lintas sesi. Menyediakan filter
 * (status / area / tingkat), panel detail per temuan, dan matriks follow-up
 * mingguan. Follow-up baru dikirim via POST /api/audit/temuan/{id}/followup; server
 * meng-escalate tingkat otomatis bila 3× berturut "masih_terjadi" dan mengembalikan
 * objek temuan terbaru sehingga badge di daftar ikut ter-update.
 */
import { useEffect, useMemo, useState } from "react";
import { getTemuan, getFollowup, buatFollowup } from "@/lib/audit-client";
import type { AuditTemuan, AuditTemuanFollowup, FollowupStatus, TemuanStatus } from "@/lib/audit-types";
import { KATEGORI_LABEL, type KategoriTemuan, type Tingkat } from "@/lib/audit-risk";
import RiskBadge from "./RiskBadge";

const STATUS_TEMUAN: { key: TemuanStatus; label: string; badge: string }[] = [
  { key: "open", label: "Open", badge: "bg-red-500/15 text-red-300 ring-red-500/30" },
  { key: "improvement", label: "Improvement", badge: "bg-amber-500/15 text-amber-300 ring-amber-500/30" },
  { key: "closed", label: "Closed", badge: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
];

const STATUS_FOLLOWUP: { key: FollowupStatus; label: string }[] = [
  { key: "belum_sesuai", label: "Belum Sesuai" },
  { key: "improvement", label: "Improvement" },
  { key: "closed", label: "Closed" },
  { key: "masih_terjadi", label: "Masih Terjadi" },
];

const TINGKAT_FILTER: { key: Tingkat; label: string }[] = [
  { key: "minor", label: "Minor" },
  { key: "mayor", label: "Mayor" },
  { key: "kritis", label: "Kritis" },
];

function statusMeta(status: string): { label: string; badge: string } {
  return STATUS_TEMUAN.find((s) => s.key === status) ?? { label: status, badge: "bg-white/5 text-slate-300 ring-white/10" };
}

function followupLabel(status: string): string {
  return STATUS_FOLLOWUP.find((s) => s.key === status)?.label ?? status;
}

function kategoriLabel(k: string): string {
  return KATEGORI_LABEL[k as KategoriTemuan] ?? k;
}

/** Tanggal hari ini (YYYY-MM-DD, zona lokal) untuk default input follow-up. */
function hariIni(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export default function RegisterClient() {
  const [temuan, setTemuan] = useState<AuditTemuan[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  // Filter
  const [fStatus, setFStatus] = useState<string>("");
  const [fArea, setFArea] = useState<string>("");
  const [fTingkat, setFTingkat] = useState<string>("");

  // Detail terpilih
  const [aktif, setAktif] = useState<AuditTemuan | null>(null);

  async function muat() {
    setLoading(true);
    setMsg(null);
    try {
      const r = await getTemuan({ status: fStatus || undefined, area: fArea.trim() || undefined });
      setTemuan(r.temuan);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tingkat difilter di klien (API hanya dukung status & area).
  const tampil = useMemo(
    () => (fTingkat ? temuan.filter((t) => t.tingkat === fTingkat) : temuan),
    [temuan, fTingkat],
  );

  const ringkas = useMemo(() => {
    const total = temuan.length;
    const open = temuan.filter((t) => t.status === "open").length;
    const kritis = temuan.filter((t) => t.tingkat === "kritis").length;
    return { total, open, kritis };
  }, [temuan]);

  /** Perbarui satu temuan di daftar + detail (dipakai setelah follow-up meng-escalate). */
  function gantiTemuan(next: AuditTemuan) {
    setTemuan((prev) => prev.map((t) => (t.id === next.id ? next : t)));
    setAktif((cur) => (cur && cur.id === next.id ? next : cur));
  }

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-ink-700 bg-ink-850 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gold-300">Register Temuan</h1>
            <p className="text-xs text-slate-500">Seluruh temuan audit dengan tindak lanjut mingguan.</p>
          </div>
          <div className="flex gap-3 text-center">
            <div className="rounded-lg bg-ink-900 px-3 py-1.5">
              <p className="text-base font-semibold tabular-nums text-slate-100">{ringkas.total}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Total</p>
            </div>
            <div className="rounded-lg bg-ink-900 px-3 py-1.5">
              <p className="text-base font-semibold tabular-nums text-red-300">{ringkas.open}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Open</p>
            </div>
            <div className="rounded-lg bg-ink-900 px-3 py-1.5">
              <p className="text-base font-semibold tabular-nums text-red-300">{ringkas.kritis}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Kritis</p>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <select
            value={fStatus}
            onChange={(e) => setFStatus(e.target.value)}
            className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-slate-100 focus:border-gold-500/40 focus:outline-none"
          >
            <option value="">Semua status</option>
            {STATUS_TEMUAN.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <input
            value={fArea}
            onChange={(e) => setFArea(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && muat()}
            placeholder="Filter area…"
            className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-gold-500/40 focus:outline-none"
          />
          <select
            value={fTingkat}
            onChange={(e) => setFTingkat(e.target.value)}
            className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-slate-100 focus:border-gold-500/40 focus:outline-none"
          >
            <option value="">Semua tingkat</option>
            {TINGKAT_FILTER.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={muat}
            className="rounded-lg bg-gold-500/15 px-4 py-2 text-sm font-semibold text-gold-300 ring-1 ring-gold-500/30 transition hover:bg-gold-500/25"
          >
            Terapkan
          </button>
        </div>
        {msg && <p className="mt-2 text-xs text-red-300">{msg}</p>}
      </header>

      {loading ? (
        <p className="py-16 text-center text-sm text-slate-500">Memuat temuan…</p>
      ) : tampil.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-850/50 p-10 text-center">
          <p className="text-sm text-slate-400">Tidak ada temuan yang cocok dengan filter.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink-700 bg-ink-850">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-700 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Area</th>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 font-medium">Tingkat</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {tampil.map((t) => {
                const sm = statusMeta(t.status);
                return (
                  <tr key={t.id} className="border-b border-ink-800 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-100">{t.area || "—"}</p>
                      {t.observasi && <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{t.observasi}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{kategoriLabel(t.kategori)}</td>
                    <td className="px-4 py-3">
                      <RiskBadge tingkat={t.tingkat} score={t.risk_score} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${sm.badge}`}>
                        {sm.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setAktif(t)}
                        className="rounded-lg border border-ink-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/5"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {aktif && <DetailTemuan temuan={aktif} onClose={() => setAktif(null)} onTemuanUpdated={gantiTemuan} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail + follow-up matrix (modal-style panel)
// ---------------------------------------------------------------------------

function DetailTemuan({
  temuan,
  onClose,
  onTemuanUpdated,
}: {
  temuan: AuditTemuan;
  onClose: () => void;
  onTemuanUpdated: (t: AuditTemuan) => void;
}) {
  const [followup, setFollowup] = useState<AuditTemuanFollowup[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  // Form follow-up baru
  const nextMinggu = followup.length + 1;
  const [status, setStatus] = useState<FollowupStatus>("belum_sesuai");
  const [tanggal, setTanggal] = useState(hariIni());
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getFollowup(temuan.id)
      .then((r) => alive && setFollowup(r.followup))
      .catch((e) => alive && setMsg(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [temuan.id]);

  // Peringatan eskalasi: 2× "masih_terjadi" beruntun → follow-up ke-3 akan escalate.
  const beruntunMasih = useMemo(() => {
    let n = 0;
    for (let i = followup.length - 1; i >= 0; i--) {
      if (followup[i].status === "masih_terjadi") n++;
      else break;
    }
    return n;
  }, [followup]);

  async function kirim() {
    setSaving(true);
    setMsg(null);
    try {
      const r = await buatFollowup(temuan.id, {
        minggu_ke: nextMinggu,
        tanggal_cek: tanggal,
        status,
        catatan: catatan.trim() || undefined,
      });
      setFollowup((prev) => [...prev, r.followup]);
      onTemuanUpdated(r.temuan); // badge tingkat/status bisa berubah karena eskalasi server
      setCatatan("");
      setStatus("belum_sesuai");
      setMsg("Tindak lanjut tersimpan.");
      setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-2xl border border-ink-700 bg-ink-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-ink-700 p-4 sm:p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-slate-100">{temuan.area || "Temuan"}</h2>
              <RiskBadge tingkat={temuan.tingkat} score={temuan.risk_score} />
              <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${statusMeta(temuan.status).badge}`}>
                {statusMeta(temuan.status).label}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{kategoriLabel(temuan.kategori)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-500 transition hover:bg-white/5 hover:text-slate-200"
            aria-label="Tutup"
          >
            Tutup
          </button>
        </div>

        {/* Isi temuan */}
        <div className="space-y-3 p-4 text-sm sm:p-5">
          <Field label="Observasi" value={temuan.observasi} />
          <Field label="Statement" value={temuan.statement_} />
          <Field label="Bukti" value={temuan.bukti} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Standar / SOP" value={temuan.standar_sop} />
            <Field label="Gap" value={temuan.gap} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Angka label="Kemungkinan" value={temuan.kemungkinan} />
            <Angka label="Dampak" value={temuan.dampak} />
            <Angka label="Risk Score" value={temuan.risk_score} />
          </div>
          <Field label="Rekomendasi" value={temuan.rekomendasi} />
        </div>

        {/* Follow-up matrix */}
        <div className="border-t border-ink-700 p-4 sm:p-5">
          <h3 className="mb-2 text-sm font-semibold text-gold-300">Tindak Lanjut Mingguan</h3>

          {loading ? (
            <p className="py-4 text-center text-xs text-slate-500">Memuat tindak lanjut…</p>
          ) : followup.length === 0 ? (
            <p className="rounded-lg border border-dashed border-ink-700 bg-ink-850/40 px-3 py-4 text-center text-xs text-slate-500">
              Belum ada tindak lanjut.
            </p>
          ) : (
            <ol className="space-y-2">
              {followup.map((f) => (
                <li key={f.id} className="flex items-start gap-3 rounded-lg border border-ink-700 bg-ink-850/50 p-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-[11px] font-semibold text-gold-300">
                    {f.minggu_ke}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset " +
                          (f.status === "closed"
                            ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                            : f.status === "improvement"
                              ? "bg-amber-500/15 text-amber-300 ring-amber-500/30"
                              : f.status === "masih_terjadi"
                                ? "bg-red-500/15 text-red-300 ring-red-500/30"
                                : "bg-white/5 text-slate-300 ring-white/10")
                        }
                      >
                        {followupLabel(f.status)}
                      </span>
                      {f.tanggal_cek && (
                        <span className="text-xs text-slate-500">{new Date(f.tanggal_cek).toLocaleDateString("id-ID")}</span>
                      )}
                    </div>
                    {f.catatan && <p className="mt-1 text-xs text-slate-400">{f.catatan}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {/* Form tambah follow-up */}
          {temuan.status !== "closed" && (
            <div className="mt-3 space-y-2 rounded-xl border border-ink-700 bg-ink-850/50 p-3">
              <p className="text-xs font-medium text-slate-400">Tambah tindak lanjut · Minggu ke-{nextMinggu}</p>
              {beruntunMasih >= 2 && (
                <p className="rounded-md bg-red-500/10 px-2 py-1 text-[11px] text-red-300 ring-1 ring-inset ring-red-500/20">
                  Sudah {beruntunMasih}× berturut &quot;Masih Terjadi&quot; — laporan berikutnya dengan status sama akan menaikkan tingkat risiko.
                </p>
              )}
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as FollowupStatus)}
                  className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-slate-100 focus:border-gold-500/40 focus:outline-none"
                >
                  {STATUS_FOLLOWUP.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-slate-100 focus:border-gold-500/40 focus:outline-none"
                />
              </div>
              <textarea
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                rows={2}
                placeholder="Catatan tindak lanjut (opsional)…"
                className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-gold-500/40 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={kirim}
                  disabled={saving}
                  className="rounded-lg bg-gold-500/15 px-4 py-2 text-sm font-semibold text-gold-300 ring-1 ring-gold-500/30 transition hover:bg-gold-500/25 disabled:opacity-50"
                >
                  {saving ? "Menyimpan…" : "Simpan tindak lanjut"}
                </button>
                {msg && <span className="text-xs text-gold-300">{msg}</span>}
              </div>
            </div>
          )}
          {temuan.status === "closed" && msg && <p className="mt-2 text-xs text-gold-300">{msg}</p>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-200">{value || "—"}</p>
    </div>
  );
}

function Angka({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-ink-850/60 px-3 py-2 text-center">
      <p className="text-base font-semibold tabular-nums text-slate-100">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}
