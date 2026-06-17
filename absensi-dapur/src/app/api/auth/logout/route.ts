import { clearSessionCookie } from "@/lib/session";
import { ok, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async () => {
  await clearSessionCookie();
  return ok({ ok: true });
});
