export type Role = "admin" | "staff";

export interface Divisi {
  id: number;
  nama: string;
  jam_masuk: string;
  jam_pulang: string;
  toleransi_menit: number;
  warna: string | null;
  jobdesk: string | null;
  aktif: boolean;
  created_at: string;
  /** Turunan: shift melewati tengah malam (jam_pulang <= jam_masuk). */
  lintas_hari?: boolean;
  jumlah_staf?: number;
}

export interface User {
  id: number;
  nama: string;
  username: string;
  role: Role;
  jabatan: string | null;
  nip: string | null;
  aktif: boolean;
  created_at: string;
  divisi_id: number | null;
  divisi_nama?: string | null;
  foto_profil?: string | null;
  bio?: string | null;
}

/** Data kartu pegawai (gaya kartu koleksi) untuk dibagikan. */
export interface KartuPegawai {
  id: number;
  nama: string;
  jabatan: string | null;
  nip: string | null;
  divisi_nama: string | null;
  jobdesk: string | null;
  jam_masuk: string | null;
  jam_pulang: string | null;
  foto_profil: string | null;
  bio: string | null;
  created_at: string;
  total_menit: number;
  jumlah_shift: number;
  tepat: number;
  terlambat: number;
  ketepatan: number;
  bintang: number;
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
  tanggal: string | null;
  shift_tanggal: string | null;
  divisi_id: number | null;
  shift_masuk: string | null;
  shift_pulang: string | null;
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
  divisi_nama?: string | null;
}
