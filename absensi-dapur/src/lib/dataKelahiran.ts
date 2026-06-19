/**
 * Data kelahiran 49 karyawan (sumber: PDF data karyawan). Dipakai untuk
 * MELENGKAPI akun yang SUDAH ADA (dicocokkan berdasarkan nama) — bukan untuk
 * membuat akun baru. Tanggal sudah diverifikasi konsisten dengan NIK KTP.
 */
export interface DataKelahiran {
  nama: string;
  tempat_lahir: string;
  tanggal_lahir: string; // YYYY-MM-DD
}

export const DATA_KELAHIRAN: DataKelahiran[] = [
  { nama: "SYLVANIA NABILA ARSANTI", tempat_lahir: "Ponorogo", tanggal_lahir: "2001-06-03" },
  { nama: "PANJI VATORROHMAN", tempat_lahir: "Ponorogo", tanggal_lahir: "2002-03-29" },
  { nama: "PARWOTO", tempat_lahir: "Ponorogo", tanggal_lahir: "1976-01-27" },
  { nama: "SUMARNO", tempat_lahir: "Ponorogo", tanggal_lahir: "1980-08-18" },
  { nama: "ALDO DWI KURNIAWAN", tempat_lahir: "Ponorogo", tanggal_lahir: "2000-02-08" },
  { nama: "MUHAMMAD NUR HUDA", tempat_lahir: "Ponorogo", tanggal_lahir: "2001-10-10" },
  { nama: "BAMBANG MURTOYO", tempat_lahir: "Ponorogo", tanggal_lahir: "1988-11-22" },
  { nama: "NASHRUL MUBAROK", tempat_lahir: "Ponorogo", tanggal_lahir: "1991-09-21" },
  { nama: "MARTOGI M.M SIGALINGGING", tempat_lahir: "Payakumbuh", tanggal_lahir: "1993-04-26" },
  { nama: "MUHAMMAD HUPRON JAINUL NGALIM", tempat_lahir: "Ponorogo", tanggal_lahir: "2006-02-05" },
  { nama: "ERFAN DWI SAPUTRA", tempat_lahir: "Ponorogo", tanggal_lahir: "2005-07-08" },
  { nama: "ELIK ERNAWATI", tempat_lahir: "Ponorogo", tanggal_lahir: "1982-08-21" },
  { nama: "ISMIATUN", tempat_lahir: "Ponorogo", tanggal_lahir: "1986-07-17" },
  { nama: "SAMSIDAH", tempat_lahir: "Ponorogo", tanggal_lahir: "1987-01-03" },
  { nama: "APRIANTI", tempat_lahir: "Ponorogo", tanggal_lahir: "1989-04-27" },
  { nama: "MULYONO", tempat_lahir: "Ponorogo", tanggal_lahir: "1994-03-05" },
  { nama: "AZIS SUHADA", tempat_lahir: "Ponorogo", tanggal_lahir: "1993-12-07" },
  { nama: "AFIFAT RAWAIDA CANDRA DEWI", tempat_lahir: "Ponorogo", tanggal_lahir: "1996-04-15" },
  { nama: "LINA EKA WIJAYANTI", tempat_lahir: "Ponorogo", tanggal_lahir: "2000-05-22" },
  { nama: "ANDIK KUSMIRANTO", tempat_lahir: "Ponorogo", tanggal_lahir: "1996-07-14" },
  { nama: "NUR ILMA TRI AGUSTIN", tempat_lahir: "Ponorogo", tanggal_lahir: "2004-08-09" },
  { nama: "SITI AMINAH", tempat_lahir: "Ponorogo", tanggal_lahir: "1980-09-08" },
  { nama: "SITI FUTIMAH", tempat_lahir: "Ponorogo", tanggal_lahir: "1982-06-22" },
  { nama: "SITI NURUL FATHUL JANAH", tempat_lahir: "Ponorogo", tanggal_lahir: "1983-07-20" },
  { nama: "SUTRISNO", tempat_lahir: "Ponorogo", tanggal_lahir: "1992-05-03" },
  { nama: "MITA NURMALASARI", tempat_lahir: "Ponorogo", tanggal_lahir: "1991-10-13" },
  { nama: "NOVITA KHOIRIYATUL FARIDA", tempat_lahir: "Ponorogo", tanggal_lahir: "1992-10-30" },
  { nama: "BAYU EKO PAMBUDI", tempat_lahir: "Ponorogo", tanggal_lahir: "1996-05-11" },
  { nama: "HAMDAN ROSYIDUL BUSYRO", tempat_lahir: "Ponorogo", tanggal_lahir: "2001-03-27" },
  { nama: "RAHMAD ANGGI WILDA SAPUTRA", tempat_lahir: "Ponorogo", tanggal_lahir: "2003-06-02" },
  { nama: "WIJI HARTUTIK", tempat_lahir: "Ponorogo", tanggal_lahir: "1982-06-09" },
  { nama: "RISSA EFRATA", tempat_lahir: "Maluku", tanggal_lahir: "1988-05-23" },
  { nama: "KIKI DWI PRILAWANTI", tempat_lahir: "Ponorogo", tanggal_lahir: "1990-04-01" },
  { nama: "SETI WINARTO", tempat_lahir: "Ponorogo", tanggal_lahir: "1991-07-15" },
  { nama: "PRADES ADY PRAYOGA", tempat_lahir: "Ponorogo", tanggal_lahir: "1995-11-17" },
  { nama: "RAHMANIKA PUTRI VALENTINA", tempat_lahir: "Ponorogo", tanggal_lahir: "1997-04-12" },
  { nama: "MYTA SABRINA WIJAYANTI", tempat_lahir: "Denpasar", tanggal_lahir: "1996-06-09" },
  { nama: "RAHMA DWI NUGROHO", tempat_lahir: "Ponorogo", tanggal_lahir: "1999-10-23" },
  { nama: "KRISNA ADJIE SAMPOERNA", tempat_lahir: "Ponorogo", tanggal_lahir: "1999-07-11" },
  { nama: "FRADA ERINA DWI MAHARANI", tempat_lahir: "Ponorogo", tanggal_lahir: "2000-11-06" },
  { nama: "SUMARMI", tempat_lahir: "Ponorogo", tanggal_lahir: "1968-07-07" },
  { nama: "SITI KOMARIYAH", tempat_lahir: "Ponorogo", tanggal_lahir: "1984-07-03" },
  { nama: "TRI MURTININGSIH", tempat_lahir: "Ponorogo", tanggal_lahir: "1986-02-14" },
  { nama: "DEWI PUSPITASARI", tempat_lahir: "Ponorogo", tanggal_lahir: "1985-06-01" },
  { nama: "ENDANG SULISTYO NINGSIH", tempat_lahir: "Ponorogo", tanggal_lahir: "1988-03-13" },
  { nama: "AYU DIYAN RESTIKA", tempat_lahir: "Ponorogo", tanggal_lahir: "1990-03-08" },
  { nama: "LEO BINTANG AKBAR", tempat_lahir: "Ponorogo", tanggal_lahir: "1998-03-21" },
  { nama: "EMA AMELIYA", tempat_lahir: "Ponorogo", tanggal_lahir: "1998-01-13" },
  { nama: "ARRIZAL DIWA MUZZAKI", tempat_lahir: "Ponorogo", tanggal_lahir: "2004-01-17" },
];
