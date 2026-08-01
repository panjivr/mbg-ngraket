import type { Metadata, Viewport } from "next";
import "./globals.css";
import MusicPlayer from "@/components/MusicPlayer";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "Absensi Dapur MBG",
  description:
    "Sistem absensi digital dapur MBG — clock in/out dengan verifikasi selfie & lokasi GPS, rekap dan ekspor untuk admin.",
  applicationName: "Absensi Dapur MBG",
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: "Absensi MBG",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/bgn-logo.webp", type: "image/webp" }],
    apple: [{ url: "/bgn-logo.webp" }],
  },
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
      <body>
        {children}
        <MusicPlayer src="/audio/musik-latar.mp3" />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
