import { TtdProvider, TtdKontrol } from "@/lib/ttd-elektronik";

/**
 * Layout bersama semua dokumen cetak: menyediakan konteks tanda tangan
 * elektronik + kontrol (checklist pakai/tidak, waktu otomatis/manual) yang
 * tampil di layar namun tidak ikut tercetak.
 */
export default function CetakLayout({ children }: { children: React.ReactNode }) {
  return (
    <TtdProvider>
      <TtdKontrol />
      <div id="cetak-konten">{children}</div>
    </TtdProvider>
  );
}
