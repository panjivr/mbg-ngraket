import {query} from "./db";
import {localDate,addDays,shiftDate,isOvernight,localTime,minutesOfDay} from "./time";
import type {EventAbsensi} from "./types";

// Shared by the status screen and attendance mutation, including the previous night's event.
export async function attendanceEvent(uid:number,sppgId:number,tz:string,now=new Date()) {
  const open=(await query<EventAbsensi>(`SELECT e.* FROM attendance a JOIN event_absensi e ON e.id=a.event_id
    WHERE a.user_id=$1 AND a.check_in IS NOT NULL AND a.check_out IS NULL AND e.sppg_id=$2
    ORDER BY a.check_in DESC LIMIT 1`,[uid,sppgId]))[0];
  if(open)return open;
  const today=localDate(tz,now);
  const events=await query<EventAbsensi>(`SELECT * FROM event_absensi
    WHERE aktif=TRUE AND sppg_id=$2 AND tanggal BETWEEN $4 AND $1
      AND (NOT EXISTS(SELECT 1 FROM event_peserta ep WHERE ep.event_id=event_absensi.id)
        OR EXISTS(SELECT 1 FROM event_peserta ep WHERE ep.event_id=event_absensi.id AND ep.user_id=$3))
    ORDER BY tanggal ASC,id DESC`,[today,sppgId,uid,addDays(today,-1)]);
  return events.find(e=>shiftDate(now,e.jam_masuk,e.jam_pulang,tz)===e.tanggal) ?? null;
}
export type WorkSchedule={tanggal:string;jam_masuk:string|null;jam_pulang:string|null;libur:boolean;keterangan:string|null};
export async function workSchedule(uid:number,tz:string,now=new Date()) {
  const today=localDate(tz,now);
  const rows=await query<WorkSchedule>(`SELECT tanggal,jam_masuk,jam_pulang,libur,keterangan FROM jadwal_kerja
    WHERE user_id=$1 AND tanggal BETWEEN $2 AND $3 ORDER BY tanggal ASC`,[uid,addDays(today,-1),today]);
  return rows.find(s=>s.tanggal<today && !s.libur && s.jam_masuk && s.jam_pulang && isOvernight(s.jam_masuk,s.jam_pulang)
    && minutesOfDay(localTime(tz,now))<minutesOfDay(s.jam_pulang))
    ?? rows.find(s=>s.tanggal===today) ?? null;
}
