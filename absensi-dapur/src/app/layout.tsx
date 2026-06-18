import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Absensi Dapur MBG",
  description:
    "Sistem absensi digital dapur MBG — clock in/out dengan verifikasi selfie & lokasi GPS, rekap dan ekspor untuk admin.",
  applicationName: "Absensi Dapur MBG",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#070f29",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
