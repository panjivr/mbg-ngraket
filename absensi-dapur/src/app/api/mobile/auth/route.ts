import { NextRequest } from "next/server";
import { query, withClient } from "@/lib/db";
import { tokenHash, newMobileTokens, createMobileSession, loginRateLimited } from "@/lib/mobile-auth";
import { verifyPassword } from "@/lib/password";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (req: NextRequest) => {
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return fail(400, "Permintaan tidak valid.");
  if (b.action === "refresh" || b.action === "logout") {
    if (typeof b.refresh_token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(b.refresh_token)) return fail(401, "Sesi tidak valid.");
    const result = await withClient(async c => {
      await c.query("BEGIN");
      try {
        const m = (await c.query<{id:string;user_id:number}>(`SELECT m.id,m.user_id FROM mobile_sessions m
          JOIN users u ON u.id=m.user_id JOIN sppg s ON s.id=u.sppg_id
          WHERE m.refresh_hash=$1 AND m.revoked_at IS NULL AND m.refresh_until>now()
            AND u.aktif=TRUE AND u.role='staff' AND s.aktif=TRUE FOR UPDATE OF m`, [tokenHash(b.refresh_token)])).rows[0];
        if (!m) { await c.query("ROLLBACK"); return null; }
        if (b.action === "logout") {
          await c.query("UPDATE mobile_sessions SET revoked_at=now() WHERE id=$1", [m.id]);
          await c.query("COMMIT"); return { logged_out: true };
        }
        const tokens = newMobileTokens();
        await c.query(`UPDATE mobile_sessions SET access_hash=$1,refresh_hash=$2,access_until=now()+interval '15 minutes' WHERE id=$3`,
          [tokenHash(tokens.access_token), tokenHash(tokens.refresh_token), m.id]);
        await c.query("COMMIT"); return tokens;
      } catch (e) { await c.query("ROLLBACK"); throw e; }
    });
    return result ? ok(result, {headers:{"Cache-Control":"no-store"}}) : fail(401, "Sesi berakhir. Login ulang.");
  }
  if (b.action !== "login" || typeof b.username !== "string" || typeof b.password !== "string"
      || !b.username.trim() || b.username.length > 100 || !b.password || b.password.length > 128) return fail(400, "Username/password tidak valid.");
  const username = b.username.trim().toLowerCase();
  // Persistent account throttle works across serverless instances; untrusted IP headers are not used.
  if (await loginRateLimited(username)) return fail(429, "Terlalu banyak percobaan. Tunggu 15 menit.");
  const user = (await query<{id:number;password_hash:string}>(`SELECT u.id,u.password_hash FROM users u
    JOIN sppg s ON s.id=u.sppg_id WHERE lower(u.username)=$1 AND u.aktif=TRUE AND u.role='staff' AND s.aktif=TRUE`, [username]))[0];
  if (!user || !(await verifyPassword(b.password, user.password_hash))) return fail(401, "Username atau password salah.");
  return ok(await createMobileSession(user.id), {headers:{"Cache-Control":"no-store"}});
});
