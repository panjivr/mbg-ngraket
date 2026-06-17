export type Role = "admin" | "staff";

export interface User {
  id: number;
  nama: string;
  username: string;
  role: Role;
  jabatan: string | null;
  nip: string | null;
  aktif: boolean;
  created_at: string;
}

export interface Settings {
  id: number;
  nama_dapur: string;
  alamat: string;
  lat: number;
  lng: number;
  radius_m: number;
  geofence_aktif: boolean;
  selfie_wajib: boolean;
  jam_masuk: string;
  jam_pulang: string;
  tz: string;
  updated_at: string;
}

export interface Attendance {
  id: number;
  user_id: number;
  tanggal: string;
  check_in: string | null;
  check_out: string | null;
  status_masuk: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_in_jarak: number | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  check_out_jarak: number | null;
  selfie_in: string | null;
  selfie_out: string | null;
  catatan: string | null;
}

export interface AttendanceWithUser extends Attendance {
  nama: string;
  jabatan: string | null;
  nip: string | null;
}
