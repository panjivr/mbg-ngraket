import { NextResponse } from "next/server";
import { HttpError } from "./session";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data as object, init);
}

export function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/** Wrap a route handler: turns thrown HttpError / unknown errors into JSON. */
export function route<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) {
        return fail(err.status, err.message);
      }
      console.error("[absensi] route error:", err);
      const msg =
        err instanceof Error ? err.message : "Terjadi kesalahan server.";
      return fail(500, msg);
    }
  };
}
