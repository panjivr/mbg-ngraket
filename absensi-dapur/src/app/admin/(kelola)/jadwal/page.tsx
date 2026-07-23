"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface Pegawai {
  id: number;
  nama: string;
  divisi_nama: string | null;
}
interface JadwalRow {
  user_id: number;
  tanggal: string;
  jam_masuk: string | null;
  jam_pulang: string | null;
  keterangan: string | null;
  libur: boolean;
}

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
function sundayOf(iso: string): string {
  const d = parseISO(iso);
  return addDays(iso, -d.getDay());
}
function todayISO(): string {
  return toISO(new Date());
}
function fmtDay(iso: string): string {
  return String(parseISO(iso).getDate());
}

export default function JadwalPage() {
  const [weekStart, setWeekStart] = useState(() => sundayOf(todayISO()));
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [map, setMap] = useState<Map<string, JadwalRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<{ user_id: number; nama: string; tanggal: string } | null>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const from = days[0];
  const to = days[6];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/jadwal?from=${from}&to=${to}`, { cache: "no-store" });
      const data = await res.json();
      setPegawai(data.pegawai || []);
      const m = new Map<string, JadwalRow>();
      for (const j of data.jadwal || []) m.set(`${j.user_id}|${j.tanggal}`, j);
      setMap(m);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const cell = (uid: number, tgl: string) => map.get(`${uid}|${tgl}`);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">🗓️ Jadwal Kerja</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="btn-ghost px-3 py-1.5 text-sm">
            ← Minggu lalu
          </button>
          <button onClick={() => setWeekStart(sundayOf(todayISO()))} className="btn-ghost px-3 py-1.5 text-sm">
            Minggu ini
          </button>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="btn-ghost px-3 py-1.5 text-sm">
            Minggu depan →
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-400">
        Minggu {parseISO(from).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} –{" "}
        {parseISO(to).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}. Klik sel
        untuk mengatur shift, jam, atau libur.
      </p>

      <div className="card scroll-x overflow-x-auto">
        {loading ? (
          <p className="p-6 text-center text-slate-400">Memuat…</p>
        ) : (
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="border-b border-white/5 text-slate-400">
                <th className="sticky left-0 bg-ink-850 px-3 py-2 text-left">Pegawai</th>
                {days.map((d) => (
                  <th key={d} className="px-2 py-2 text-center">
                    <div>{HARI[parseISO(d).getDay()]}</div>
                    <div className={"text-[11px] " + (d === todayISO() ? "text-gold-400" : "text-slate-500")}>
                      {fmtDay(d)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pegawai.map((p) => (
                <tr key={p.id}>
                  <td className="sticky left-0 bg-ink-850 px-3 py-2">
                    <div className="font-medium text-slate-100">{p.nama}</div>
                    <div className="text-[11px] text-slate-500">{p.divisi_nama || "—"}</div>
                  </td>
                  {days.map((d) => {
                    const c = cell(p.id, d);
                    return (
                      <td key={d} className="px-1 py-1 text-center">
                        <button
                          onClick={() => setEdit({ user_id: p.id, nama: p.nama, tanggal: d })}
                          className={
                            "min-h-[42px] w-full rounded-md border px-1 py-1 text-[11px] transition " +
                            (c?.libur
                              ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                              : c
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                                : "border-white/10 text-slate-600 hover:bg-white/5")
                          }
                        >
                          {c?.libur ? (
                            "Libur"
                          ) : c ? (
                            <>
                              {c.jam_masuk && c.jam_pulang && (
                                <div className="font-medium">{c.jam_masuk}–{c.jam_pulang}</div>
                              )}
                              {c.keterangan && <div className="text-slate-300">{c.keterangan}</div>}
                            </>
                          ) : (
                            "+"
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {edit && (
        <CellEditor
          edit={edit}
          current={cell(edit.user_id, edit.tanggal)}
          onClose={() => setEdit(null)}
          onSaved={async () => {
            setEdit(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function CellEditor({
  edit,
  current,
  onClose,
  onSaved,
}: {
  edit: { user_id: number; nama: string; tanggal: string };
  current: JadwalRow | undefined;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [libur, setLibur] = useState(current?.libur ?? false);
  const [masuk, setMasuk] = useState(current?.jam_masuk ?? "");
  const [pulang, setPulang] = useState(current?.jam_pulang ?? "");
  const [ket, setKet] = useState(current?.keterangan ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/jadwal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: edit.user_id,
          tanggal: edit.tanggal,
          libur,
          jam_masuk: libur ? "" : masuk,
          jam_pulang: libur ? "" : pulang,
          keterangan: libur ? "" : ket,
        }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/jadwal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: edit.user_id, tanggal: edit.tanggal }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div className="card w-full max-w-sm space-y-3 p-4" onClick={(e) => e.stopPropagation()}>
        <div>
          <p className="text-sm font-bold">{edit.nama}</p>
          <p className="text-xs text-slate-400">
            {parseISO(edit.tanggal).toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={libur} onChange={(e) => setLibur(e.target.checked)} />
          🏖️ Libur
        </label>
        {!libur && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Jam Masuk</label>
                <input type="time" className="input" value={masuk} onChange={(e) => setMasuk(e.target.value)} />
              </div>
              <div>
                <label className="label">Jam Pulang</label>
                <input type="time" className="input" value={pulang} onChange={(e) => setPulang(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Keterangan (opsional)</label>
              <input className="input" placeholder="mis. Shift Pagi" value={ket} onChange={(e) => setKet(e.target.value)} />
            </div>
          </>
        )}
        <div className="flex justify-between gap-2 pt-1">
          <button onClick={clear} disabled={saving} className="btn-ghost text-rose-300">
            Kosongkan
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost">Batal</button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? "…" : "Simpan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
