import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  const isAdminArea = pathname.startsWith("/admin");
  const isStaffArea = pathname.startsWith("/dapur");

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAdminArea && session.role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/dapur";
    return NextResponse.redirect(url);
  }

  // Staff area is open to both roles (admin may also check in if needed).
  void isStaffArea;
  return NextResponse.next();
}

export const config = {
  matcher: ["/dapur/:path*", "/admin/:path*"],
};
