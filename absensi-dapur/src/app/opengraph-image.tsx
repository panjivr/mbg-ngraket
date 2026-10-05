import { ImageResponse } from "next/og";
export const alt = "Sistem Dapur MBG - aplikasi untuk staf, kepala, dan admin SPPG";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '70px', background: '#10243a', color: '#fff', fontFamily: 'sans-serif' }}>
    <div style={{ display: 'flex', fontSize: 25, color: '#9dc4ff' }}>SISTEM DAPUR MBG · DJATI.WEB.ID</div>
    <div style={{ display: 'flex', fontSize: 66, lineHeight: 1.1, fontWeight: 700, marginTop: 48 }}>Administrasi SPPG lebih terstruktur.</div>
    <div style={{ display: 'flex', fontSize: 30, color: '#d2dfed', marginTop: 35 }}>Absensi · Rekap & Gaji · Distribusi · Laporan</div>
    <div style={{ display: 'flex', fontSize: 23, color: '#9dc4ff', marginTop: 44 }}>Untuk staf, kepala, dan admin dapur MBG</div>
  </div>, size);
}
