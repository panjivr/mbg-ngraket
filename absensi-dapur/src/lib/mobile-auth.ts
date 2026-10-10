import { createHash, randomBytes, randomUUID } from "node:crypto";
import { query } from "./db";
import type { SessionData } from "./auth";

export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export async function loginRateLimited(username:string):Promise<boolean> {
  const limits = await query<{attempts:number}>(`INSERT INTO mobile_login_limits(key,attempts,until_at)
    VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET
    attempts=CASE WHEN mobile_login_limits.until_at<now() THEN 1 ELSE mobile_login_limits.attempts+1 END,
    until_at=CASE WHEN mobile_login_limits.until_at<now() THEN now()+interval '15 minutes' ELSE mobile_login_limits.until_at END
    RETURNING attempts`, [tokenHash(username)]);
  return limits[0].attempts>10;
}
export function newMobileTokens() {
  return { access_token: randomBytes(32).toString("base64url"), refresh_token: randomBytes(32).toString("base64url"), expires_in: 900 };
}
export async function createMobileSession(userId: number) {
  const tokens = newMobileTokens();
  await query(`INSERT INTO mobile_sessions(id,user_id,access_hash,refresh_hash,access_until,refresh_until)
    VALUES($1,$2,$3,$4,now()+interval '15 minutes',now()+interval '30 days')`,
  [randomUUID(), userId, tokenHash(tokens.access_token), tokenHash(tokens.refresh_token)]);
  return tokens;
}
export async function verifyMobileToken(token: string): Promise<SessionData | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const rows = await query<SessionData>(`SELECT u.id AS uid,u.username,u.nama,u.role,u.sppg_id,
    u.is_super,u.is_hr,u.akses_distribusi,u.akses_laporan,u.akses_keuangan,u.akses_gizi,u.akses_audit,u.akses_gudang_keluar
    FROM mobile_sessions m JOIN users u ON u.id=m.user_id JOIN sppg s ON s.id=u.sppg_id
    WHERE m.access_hash=$1 AND m.revoked_at IS NULL AND m.access_until>now()
      AND m.refresh_until>now() AND u.aktif=TRUE AND u.role='staff' AND s.aktif=TRUE`, [tokenHash(token)]);
  return rows[0] ?? null;
}
