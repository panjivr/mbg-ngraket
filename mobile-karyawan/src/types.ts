export type Attendance = {id:number; tanggal:string; check_in:string|null; check_out:string|null; status_masuk:string|null; shift_masuk?:string; shift_pulang?:string};
export type Shift = {id:number;nama:string;jam_masuk:string;jam_pulang:string;lintas_hari?:boolean};
export type Today = {
  current:Attendance|null; last:Attendance|null; tanggal:string;
  shift:{divisi_nama:string|null;jobdesk:string|null;jam_masuk:string;jam_pulang:string;lintas_hari:boolean}|null;
  shifts:Shift[];
  schedule?:{libur:boolean;keterangan:string|null}|null;
  event:{id:number;nama:string;lat:number|null;lng:number|null;jam_masuk:string;jam_pulang:string}|null;
  settings:{nama_dapur:string;alamat:string;lat:number|null;lng:number|null;selfie_wajib:boolean;geofence_aktif:boolean;radius_m:number;tz:string}|null;
};
export type Schedule = {tanggal:string;jam_masuk:string|null;jam_pulang:string|null;keterangan:string|null;libur:boolean;reminder_at:string|null};
export type Leave = {id:number;jenis:string;tanggal_mulai:string;tanggal_selesai:string;alasan:string;status:string;catatan_admin:string|null};
export type Correction = {id:number;attendance_id:number;check_in:string;check_out:string|null;alasan:string;status:string;catatan_admin:string|null};
export type Announcement = {id:number;judul:string;isi:string;gambar:string|null;dibaca:boolean};
export type Notice = {key:string;title:string;body:string;at:string;read:boolean};
export type Profile = {nama:string;username:string;jabatan:string|null;bio:string|null;foto_profil:string|null};
export type SlipResponse = {visible:boolean;pesan?:string;dapur?:string;slip?:{
  user:{nama:string;nip:string|null;jabatan:string|null;bpjs_tk:boolean};
  periode:{from:string;to:string};hadir:number;telat:number;lembur_hari:number;total:number;
  upah_kehadiran:number;upah_lembur:number;potongan:number;kasbon:number;confirmed_at:string|null;nb:string;
  hari:{tanggal:string;status:string;upah:number;lembur:boolean;catatan:string}[];
  kasbon_items:{id:number;tanggal:string;jumlah:number;keterangan:string}[];
}};
