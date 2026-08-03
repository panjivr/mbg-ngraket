import type { Metadata, Viewport } from "next";
import "./globals.css";
import MusicPlayer from "@/components/MusicPlayer";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import ThemeLangProvider from "@/components/ThemeLangProvider";

// Skrip pra-paint: setel data-theme & data-lang dari localStorage sebelum React
// hydrate, supaya tidak ada kedip (FOUC) saat pengguna memilih tema terang.
const PREFS_BOOTSTRAP = `(function(){try{var t=localStorage.getItem("mbg-theme");if(t!=="light"&&t!=="dark")t="dark";var l=localStorage.getItem("mbg-lang");if(l!=="en"&&l!=="id")l="id";var e=document.documentElement;e.dataset.theme=t;e.dataset.lang=l;e.lang=l;}catch(_){}})();`;

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
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_BOOTSTRAP }} />
      </head>
      <body>
        <ThemeLangProvider>
          {children}
          <MusicPlayer src="/audio/musik-latar.mp3" />
          <ServiceWorkerRegistrar />
        </ThemeLangProvider>
      </body>
    </html>
  );
}
