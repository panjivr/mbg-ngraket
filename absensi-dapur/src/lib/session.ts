import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSession,
  verifySession,
  type SessionData,
} from "./auth";

/** Read + verify the session inside a Route Handler / Server Component. */
export async function getSession(): Promise<SessionData | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

export async function setSessionCookie(data: SessionData): Promise<void> {
  const token = await signSession(data);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

/** Require a session; throw 401-style sentinel handled by route wrapper. */
export async function requireSession(): Promise<SessionData> {
  const s = await getSession();
  if (!s) throw new HttpError(401, "Belum login.");
  return s;
}

export async function requireAdmin(): Promise<SessionData> {
  const s = await requireSession();
  if (s.role !== "admin") throw new HttpError(403, "Khusus admin.");
  return s;
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
