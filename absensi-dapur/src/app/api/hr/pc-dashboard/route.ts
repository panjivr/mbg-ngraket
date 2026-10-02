import { query } from "@/lib/db";
import { requireHr } from "@/lib/session";
import { ok, route } from "@/lib/api";
import type { Pertanyaan } from "@/lib/people-culture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN = 5; // ambang anonimitas agregat

export const GET = route(async () => {
  const hr = await requireHr();

  // Karyawan + divisi
  const users = await query<{ id: number; divisi: string | null }>(
    `SELECT u.id, d.nama AS divisi FROM users u LEFT JOIN divisi d ON d.id=u.divisi_id WHERE u.sppg_id=$1 AND u.aktif=TRUE`,
    [hr.sppg_id],
  );
  const divisiOf = new Map(users.map((u) => [u.id, u.divisi || "Tanpa divisi"]));

  // PERCEPTION: survey Suara/Pulse → mean per kategori (overall + per divisi).
  const surveys = await query<{ id: number; pertanyaan: Pertanyaan[] }>(
    `SELECT id, pertanyaan FROM pc_survey WHERE sppg_id=$1`, [hr.sppg_id],
  );
  const codeKat = new Map<string, string>();
  for (const s of surveys) for (const q of s.pertanyaan) if (q.tipe === "likert5") codeKat.set(`${s.id}:${q.code}`, q.kategori);
  const jwb = await query<{ survey_id: number; user_id: number; jawaban: Record<string, unknown> }>(
    `SELECT survey_id, user_id, jawaban FROM pc_jawaban j WHERE EXISTS (SELECT 1 FROM pc_survey s WHERE s.id=j.survey_id AND s.sppg_id=$1)`,
    [hr.sppg_id],
  );
  const katAll = new Map<string, { sum: number; n: number }>();
  const katDiv = new Map<string, Map<string, { sum: number; n: number }>>(); // divisi -> kategori
  const divResp = new Map<string, Set<number>>();
  for (const j of jwb) {
    const div = divisiOf.get(j.user_id) || "Tanpa divisi";
    if (!divResp.has(div)) divResp.set(div, new Set()); divResp.get(div)!.add(j.user_id);
    for (const [code, v] of Object.entries(j.jawaban || {})) {
      const kat = codeKat.get(`${j.survey_id}:${code}`); if (!kat) continue;
      const n = Number(v); if (!(n >= 1 && n <= 5)) continue;
      const a = katAll.get(kat) || { sum: 0, n: 0 }; a.sum += n; a.n++; katAll.set(kat, a);
      if (!katDiv.has(div)) katDiv.set(div, new Map());
      const dm = katDiv.get(div)!; const b = dm.get(kat) || { sum: 0, n: 0 }; b.sum += n; b.n++; dm.set(kat, b);
    }
  }
  const totalResp = new Set(jwb.map((j) => j.user_id)).size;
  const perKategori = [...katAll.entries()]
    .map(([kat, a]) => ({ kategori: kat, mean: a.n ? Math.round((a.sum / a.n) * 100) / 100 : null, n: a.n }))
    .sort((a, b) => (a.mean ?? 9) - (b.mean ?? 9));
  const teamHealth = [...katDiv.entries()].map(([div, dm]) => {
    const cukup = (divResp.get(div)?.size || 0) >= MIN;
    return {
      divisi: div, responden: divResp.get(div)?.size || 0, cukup,
      kategori: cukup ? [...dm.entries()].map(([k, a]) => ({ kategori: k, mean: a.n ? Math.round((a.sum / a.n) * 100) / 100 : null })).sort((a, b) => (a.mean ?? 9) - (b.mean ?? 9)) : [],
    };
  }).sort((a, b) => a.divisi.localeCompare(b.divisi));

  // RECOGNITION: perilaku paling diapresiasi (90 hari).
  const rec = await query<{ kategori: string; c: number }>(
    `SELECT kategori, count(*)::int AS c FROM pc_recognition WHERE sppg_id=$1 AND created_at > now()-interval '90 days' GROUP BY kategori ORDER BY c DESC LIMIT 8`,
    [hr.sppg_id],
  );

  // REPORTED: insiden per status/urgensi/kategori (laporan ≠ pelanggaran terbukti).
  const inc = await query<{ status: string; urgensi: string; kategori: string }>(`SELECT status, urgensi, kategori FROM pc_incident WHERE sppg_id=$1`, [hr.sppg_id]);
  const openStatus = new Set(["SUBMITTED", "TRIAGED", "UNDER_REVIEW", "NEED_MORE_INFO", "ACTION_REQUIRED"]);
  const incidentOpen = inc.filter((i) => openStatus.has(i.status)).length;
  const incidentHigh = inc.filter((i) => (i.urgensi === "tinggi" || i.urgensi === "darurat") && openStatus.has(i.status)).length;
  const incidentVerified = inc.filter((i) => i.status === "RESOLVED").length;
  const incKat = new Map<string, number>(); for (const i of inc) incKat.set(i.kategori, (incKat.get(i.kategori) || 0) + 1);
  const incidentRecurring = [...incKat.entries()].filter(([, c]) => c >= 3).map(([k, c]) => ({ kategori: k, c }));

  // ACTIONS
  const act = await query<{ status: string; overdue: boolean }>(
    `SELECT status, (deadline IS NOT NULL AND deadline < CURRENT_DATE AND status NOT IN ('DONE','REVIEWED')) AS overdue FROM pc_action WHERE sppg_id=$1`,
    [hr.sppg_id],
  );
  const actionOpen = act.filter((a) => !["DONE", "REVIEWED"].includes(a.status)).length;
  const actionOverdue = act.filter((a) => a.overdue).length;

  // ALERT ENGINE (pola → trigger review manusia, bukan hukuman otomatis)
  const alerts: { tipe: string; pesan: string; level: string }[] = [];
  for (const k of perKategori) {
    if (k.mean != null && k.n >= MIN && k.mean < 3.0) alerts.push({ tipe: "SKOR RENDAH", pesan: `${k.kategori} ${k.mean}/5 — perlu ditinjau.`, level: "warn" });
  }
  const ps = perKategori.find((k) => /psikologis/i.test(k.kategori));
  if (ps?.mean != null && ps.n >= MIN && ps.mean < 3.2) alerts.push({ tipe: "RASA AMAN PSIKOLOGIS", pesan: `Rasa aman psikologis ${ps.mean}/5 di bawah ambang.`, level: "danger" });
  for (const r of incidentRecurring) alerts.push({ tipe: "LAPORAN BERULANG", pesan: `Kategori "${r.kategori}" muncul ${r.c}×.`, level: "warn" });
  if (actionOverdue > 0) alerts.push({ tipe: "ACTION PLAN", pesan: `${actionOverdue} action plan melewati tenggat.`, level: "warn" });
  if (incidentHigh > 0) alerts.push({ tipe: "INSIDEN PRIORITAS", pesan: `${incidentHigh} laporan urgensi tinggi/darurat belum tertangani.`, level: "danger" });

  return ok({
    karyawan: users.length,
    perception: { totalResponden: totalResp, cukup: totalResp >= MIN, perKategori: totalResp >= MIN ? perKategori : [] },
    teamHealth,
    recognition: rec,
    incident: { open: incidentOpen, high: incidentHigh, verified: incidentVerified, recurring: incidentRecurring },
    action: { open: actionOpen, overdue: actionOverdue },
    alerts,
  });
});
