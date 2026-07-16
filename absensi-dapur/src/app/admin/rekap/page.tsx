"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { durasiMenit, fmtDurasi } from "@/lib/time";
import FotoAbsen from "@/components/FotoAbsen";

interface RekapRow {
  id: number;
  user_id: number;
  nama: string;
  jabatan: string | null;
  nip: string | null;
  divisi_nama: string | null;
  shift_masuk: string | null;
  shift_pulang: string | null;
  tanggal: string;
  check_in: string | null;
  check_out: string | null;
  status_masuk: string | null;
  check_in_jarak: number | null;
  check_out_jarak: number | null;
  lokasi: string | null;
}

interface EmployeeLite {
  id: number;
  nama: string;
  divisi_nama: string | null;
}

// Form absen manual (untuk pegawai yang lupa absen masuk).
interface ManualForm {
  user_id: string;
  tanggal: string;
  jam_masuk: string;
  jam_pulang: string;
}

// Form edit jam masuk/pulang satu catatan yang sudah ada.
interface EditForm {
  id: number;
  nama: string;
  tanggal: string;
  jam_masuk: string;
  jam_pulang: string;
}

function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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

function fmtDate(v: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(v + "T00:00:00"));
}

// ISO timestamp -> "HH:mm" pada zona Asia/Jakarta (kosong bila null/invalid).
function toHHmm(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export default function RekapPage() {
  const today = jakartaToday();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<RekapRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [q, setQ] = useState("");
  const [divisiFilter, setDivisiFilter] = useState("");
  const [sortBy, setSortBy] = useState<"waktu" | "nama" | "divisi" | "status">("waktu");

  // Daftar pegawai (dimuat sekali) untuk pilihan di modal absen manual.
  const [employees, setEmployees] = useState<EmployeeLite[]>([]);

  // Modal absen manual.
  const [manual, setManual] = useState<ManualForm | null>(null);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // Modal edit satu catatan.
  const [edit, setEdit] = useState<EditForm | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/attendance?from=${from}&to=${to}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      setRows(data.rekap || []);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  // Muat daftar pegawai sekali (untuk pilihan pada modal absen manual).
  useEffect(() => {
    let alive = true;
    fetch("/api/admin/employees", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { employees?: EmployeeLite[] }) => {
        if (alive) setEmployees(d.employees || []);
      })
      .catch(() => {
        /* diamkan; modal tetap bisa dibuka meski kosong */
      });
    return () => {
      alive = false;
    };
  }, []);

  // Tutup absen pulang pegawai yang lupa menekan tombol pulang.
  async function tutupAbsen(id: number, nama: string) {
    if (
      !confirm(
        `Tutup absen pulang untuk "${nama}"?\nJam pulang dicatat sesuai jadwal shift-nya (atau sekarang bila shift belum berakhir).`,
      )
    )
      return;
    const res = await fetch(`/api/admin/attendance/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "force_checkout" }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Gagal menutup absen.");
      return;
    }
    await load();
  }

  // Buka modal absen manual (default tanggal = filter "Dari" atau hari ini).
  function openManual() {
    setManualError(null);
    setManual({
      user_id: "",
      tanggal: from || today,
      jam_masuk: "",
      jam_pulang: "",
    });
  }

  // Simpan absen manual → POST /api/admin/attendance.
  async function saveManual() {
    if (!manual) return;
    if (!manual.user_id) {
      setManualError("Pilih pegawai terlebih dahulu.");
      return;
    }
    if (!manual.jam_masuk) {
      setManualError("Jam masuk wajib diisi.");
      return;
    }
    setManualSaving(true);
    setManualError(null);
    try {
      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: Number(manual.user_id),
          tanggal: manual.tanggal,
          jam_masuk: manual.jam_masuk,
          jam_pulang: manual.jam_pulang || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setManualError(data.error || "Gagal menyimpan absen manual.");
        return;
      }
      setManual(null);
      await load();
    } catch {
      setManualError("Tidak dapat terhubung ke server.");
    } finally {
      setManualSaving(false);
    }
  }

  // Buka modal edit dengan jam masuk/pulang saat ini (HH:mm, Asia/Jakarta).
  function openEdit(r: RekapRow) {
    setEditError(null);
    setEdit({
      id: r.id,
      nama: r.nama,
      tanggal: r.tanggal,
      jam_masuk: toHHmm(r.check_in),
      jam_pulang: toHHmm(r.check_out),
    });
  }

  // Simpan perubahan jam → PUT /api/admin/attendance/:id { action:"edit" }.
  async function saveEdit() {
    if (!edit) return;
    if (!edit.jam_masuk) {
      setEditError("Jam masuk wajib diisi.");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/admin/attendance/${edit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          jam_masuk: edit.jam_masuk,
          jam_pulang: edit.jam_pulang || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data.error || "Gagal menyimpan perubahan.");
        return;
      }
      setEdit(null);
      await load();
    } catch {
      setEditError("Tidak dapat terhubung ke server.");
    } finally {
      setEditSaving(false);
    }
  }

  // Opsi divisi untuk filter (unik, urut abjad).
  const divisiOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.divisi_nama) set.add(r.divisi_nama);
    return [...set].sort((a, b) => a.localeCompare(b, "id"));
  }, [rows]);

  // Tampilan setelah filter (nama/divisi) & urut (waktu/nama/divisi/status).
  const view = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let v = rows.filter((r) => {
      const okNama = !needle || r.nama.toLowerCase().includes(needle);
      const okDiv = !divisiFilter || (r.divisi_nama || "") === divisiFilter;
      return okNama && okDiv;
    });
    v = [...v].sort((a, b) => {
      if (sortBy === "nama") return a.nama.localeCompare(b.nama, "id");
      if (sortBy === "divisi")
        return (a.divisi_nama || "~").localeCompare(b.divisi_nama || "~", "id") ||
          a.nama.localeCompare(b.nama, "id");
      if (sortBy === "status")
        return (a.status_masuk || "~").localeCompare(b.status_masuk || "~", "id");
      // waktu: terbaru dulu (tanggal lalu jam masuk)
      const ta = `${a.tanggal} ${a.check_in || ""}`;
      const tb = `${b.tanggal} ${b.check_in || ""}`;
      return tb.localeCompare(ta);
    });
    return v;
  }, [rows, q, divisiFilter, sortBy]);

  const ringkasan = useMemo(() => {
    let totalMenit = 0;
    let terlambat = 0;
    let selesai = 0;
    for (const r of view) {
      totalMenit += durasiMenit(r.check_in, r.check_out);
      if (r.status_masuk === "Terlambat") terlambat += 1;
      if (r.check_out) selesai += 1;
    }
    return { totalMenit, terlambat, selesai };
  }, [view]);

  async function unduhPdf() {
    if (!view.length) return;
    setPdfBusy(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFontSize(14);
      doc.setTextColor(14, 31, 85);
      doc.text("Rekap Absensi Dapur — Badan Gizi Nasional", 14, 15);
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(`Periode: ${fmtDate(from)} s/d ${fmtDate(to)}`, 14, 21);
      doc.text(
        `Dicetak: ${new Intl.DateTimeFormat("id-ID", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date())}`,
        14,
        26,
      );

      const body = view.map((r) => [
        fmtDate(r.tanggal),
        r.nama,
        r.divisi_nama || "-",
        r.shift_masuk && r.shift_pulang ? `${r.shift_masuk}-${r.shift_pulang}` : "-",
        fmtTime(r.check_in),
        r.status_masuk || "-",
        fmtTime(r.check_out),
        fmtDurasi(durasiMenit(r.check_in, r.check_out)),
      ]);

      autoTable(doc, {
        startY: 31,
        head: [
          ["Tanggal", "Nama", "Divisi", "Jadwal", "Masuk", "Status", "Pulang", "Durasi"],
        ],
        body,
        styles: { fontSize: 8, cellPadding: 1.8 },
        headStyles: { fillColor: [14, 31, 85], textColor: 255 },
        alternateRowStyles: { fillColor: [243, 246, 252] },
      });

      const finalY =
        (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
        31;
      doc.setFontSize(10);
      doc.setTextColor(20);
      doc.text(
        `Total: ${view.length} catatan · Total jam kerja: ${fmtDurasi(
          ringkasan.totalMenit,
        )} · Terlambat: ${ringkasan.terlambat}`,
        14,
        finalY + 8,
      );

      doc.save(`absensi-dapur_${from}_sd_${to}.pdf`);
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Rekap Absensi</h1>
        <button onClick={openManual} className="btn-gold">
          ➕ Absen Manual
        </button>
      </div>

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label">Dari Tanggal</label>
          <input
            type="date"
            className="input"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Sampai Tanggal</label>
          <input
            type="date"
            className="input"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <button onClick={load} className="btn-ghost" disabled={loading}>
          {loading ? "Memuat…" : "Tampilkan"}
        </button>
        <div className="ml-auto flex gap-2">
          <a href={`/api/admin/export-xlsx?from=${from}&to=${to}`} className="btn-ghost">
            ⬇ Excel
          </a>
          <button onClick={unduhPdf} className="btn-gold" disabled={pdfBusy || !view.length}>
            {pdfBusy ? "Menyiapkan…" : "⬇ PDF"}
          </button>
        </div>
      </div>

      {/* Filter & urutan */}
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[160px] flex-1">
          <label className="label">Cari Nama</label>
          <input
            className="input"
            value={q}
            placeholder="Ketik nama pegawai…"
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Divisi</label>
          <select
            className="input"
            value={divisiFilter}
            onChange={(e) => setDivisiFilter(e.target.value)}
          >
            <option value="">Semua Divisi</option>
            {divisiOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Urutkan</label>
          <select
            className="input"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="waktu">Waktu (terbaru)</option>
            <option value="nama">Nama (A–Z)</option>
            <option value="divisi">Divisi (A–Z)</option>
            <option value="status">Status</option>
          </select>
        </div>
        {(q || divisiFilter || sortBy !== "waktu") && (
          <button
            onClick={() => {
              setQ("");
              setDivisiFilter("");
              setSortBy("waktu");
            }}
            className="btn-ghost"
          >
            Reset
          </button>
        )}
      </div>

      {/* Ringkasan jam kerja */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-slate-400">Total Catatan</p>
          <p className="mt-1 text-2xl font-bold">{rows.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400">Total Jam Kerja</p>
          <p className="mt-1 text-2xl font-bold text-gold-400">
            {fmtDurasi(ringkasan.totalMenit)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400">Shift Selesai</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">{ringkasan.selesai}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400">Terlambat</p>
          <p className="mt-1 text-2xl font-bold text-amber-300">{ringkasan.terlambat}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-white/5 px-4 py-3 text-sm text-slate-400">
          {view.length} dari {rows.length} catatan
        </div>
        {loading ? (
          <p className="p-6 text-center text-slate-400">Memuat…</p>
        ) : view.length === 0 ? (
          <p className="p-6 text-center text-slate-400">
            {rows.length === 0
              ? "Tidak ada data pada rentang ini."
              : "Tidak ada catatan yang cocok dengan filter."}
          </p>
        ) : (
          <div className="scroll-x overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr className="border-b border-white/5">
                  <th className="px-4 py-2.5">Tanggal</th>
                  <th className="px-4 py-2.5">Nama</th>
                  <th className="px-4 py-2.5">Divisi</th>
                  <th className="px-4 py-2.5">Lokasi</th>
                  <th className="px-4 py-2.5">Jadwal</th>
                  <th className="px-4 py-2.5">Masuk</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Pulang</th>
                  <th className="px-4 py-2.5">Durasi</th>
                  <th className="px-4 py-2.5 text-right">Foto</th>
                  <th className="px-4 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {view.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5 whitespace-nowrap">{fmtDate(r.tanggal)}</td>
                    <td className="px-4 py-2.5 font-medium">{r.nama}</td>
                    <td className="px-4 py-2.5">{r.divisi_nama || "—"}</td>
                    <td className="px-4 py-2.5 text-slate-400">{r.lokasi || "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-400">
                      {r.shift_masuk && r.shift_pulang
                        ? `${r.shift_masuk}–${r.shift_pulang}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5">{fmtTime(r.check_in)}</td>
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
                    <td className="px-4 py-2.5">
                      {r.check_in && !r.check_out ? (
                        <button
                          onClick={() => tutupAbsen(r.id, r.nama)}
                          className="btn-ghost px-2 py-0.5 text-[11px]"
                          title="Tutup absen pulang (untuk yang lupa menekan pulang)"
                        >
                          ⏹ Tutup
                        </button>
                      ) : (
                        fmtTime(r.check_out)
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gold-400">
                      {fmtDurasi(durasiMenit(r.check_in, r.check_out))}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end">
                        <FotoAbsen id={r.id} nama={r.nama} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end">
                        <button
                          onClick={() => openEdit(r)}
                          className="btn-ghost px-2.5 py-1 text-xs"
                          title="Edit jam masuk / pulang"
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Absen Manual */}
      {manual && (
        <div
          className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4"
          onClick={() => setManual(null)}
        >
          <div
            className="card w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">Absen Manual</h2>
            <p className="mt-1 text-xs text-slate-400">
              Catat kehadiran pegawai yang lupa menekan tombol absen masuk.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Pegawai</label>
                <select
                  className="input"
                  value={manual.user_id}
                  onChange={(e) => setManual({ ...manual, user_id: e.target.value })}
                >
                  <option value="">— Pilih Pegawai —</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nama}
                      {emp.divisi_nama ? ` — ${emp.divisi_nama}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Tanggal</label>
                <input
                  type="date"
                  className="input"
                  value={manual.tanggal}
                  onChange={(e) => setManual({ ...manual, tanggal: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Jam Masuk</label>
                  <input
                    type="time"
                    required
                    className="input"
                    value={manual.jam_masuk}
                    onChange={(e) => setManual({ ...manual, jam_masuk: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Jam Pulang (opsional)</label>
                  <input
                    type="time"
                    className="input"
                    value={manual.jam_pulang}
                    onChange={(e) => setManual({ ...manual, jam_pulang: e.target.value })}
                  />
                </div>
              </div>

              {manualError && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {manualError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={() => setManual(null)} className="btn-ghost flex-1">
                  Batal
                </button>
                <button
                  onClick={saveManual}
                  className="btn-gold flex-1"
                  disabled={manualSaving}
                >
                  {manualSaving ? "Menyimpan…" : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Absensi */}
      {edit && (
        <div
          className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4"
          onClick={() => setEdit(null)}
        >
          <div
            className="card w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">Edit Absensi</h2>
            <p className="mt-1 text-xs text-slate-400">
              {edit.nama} · {fmtDate(edit.tanggal)}
            </p>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Jam Masuk</label>
                  <input
                    type="time"
                    className="input"
                    value={edit.jam_masuk}
                    onChange={(e) => setEdit({ ...edit, jam_masuk: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Jam Pulang (opsional)</label>
                  <input
                    type="time"
                    className="input"
                    value={edit.jam_pulang}
                    onChange={(e) => setEdit({ ...edit, jam_pulang: e.target.value })}
                  />
                </div>
              </div>

              {editError && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {editError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={() => setEdit(null)} className="btn-ghost flex-1">
                  Batal
                </button>
                <button
                  onClick={saveEdit}
                  className="btn-gold flex-1"
                  disabled={editSaving}
                >
                  {editSaving ? "Menyimpan…" : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
