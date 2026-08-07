import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  const isAdminArea = pathname.startsWith("/admin") || pathname.startsWith("/cetak");
  const isStaffArea = pathname.startsWith("/dapur");

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Catatan: flag izin di token (is_hr, akses_*) bisa "basi" — token berumur
  // 7 hari, sedangkan peran bisa diberikan/dicabut kapan saja. Middleware TIDAK
  // memutus akses HR berdasarkan flag basi itu (dulu menyebabkan tombol HR yang
  // tampil justru melempar admin ke /dapur). Penjagaan HR yang sebenarnya ada di
  // server component halaman (/admin/hr → cek is_hr terbaru dari DB) dan di route
  // API (requireHr, juga membaca DB), sehingga selalu akurat tanpa login ulang.
  if (isAdminArea && session.role !== "admin") {
    // Sub-admin scoped: hanya area yang sesuai aksesnya. Area HR ditangguhkan ke
    // halaman (yang mengecek is_hr terbaru) — non-HR tetap dilempar oleh layout
    // admin & page.tsx, jadi tidak ada data gaji yang bocor.
    const isDistribusi =
      pathname.startsWith("/admin/distribusi") ||
      pathname.startsWith("/cetak/distribusi") ||
      pathname.startsWith("/cetak/penerima");
    const isLaporan =
      pathname.startsWith("/admin/laporan") ||
      pathname.startsWith("/admin/gudang") ||
      pathname.startsWith("/cetak/laporan") ||
      pathname.startsWith("/cetak/dokumentasi") ||
      pathname.startsWith("/cetak/kilometer");
    const isHrArea = pathname.startsWith("/admin/hr");
    const allowed =
      (session.akses_distribusi === true && isDistribusi) ||
      (session.akses_laporan === true && isLaporan) ||
      isHrArea;
    if (!allowed) {
      const url = req.nextUrl.clone();
      url.pathname = "/dapur";
      return NextResponse.redirect(url);
    }
  }

  // Staff area is open to both roles (admin may also check in if needed).
  void isStaffArea;
  return NextResponse.next();
}

export const config = {
  matcher: ["/dapur/:path*", "/admin/:path*", "/cetak/:path*"],
};
