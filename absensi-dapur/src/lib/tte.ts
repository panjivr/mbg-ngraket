import crypto from "crypto";

/**
 * Token tanda tangan elektronik (self-hosted) untuk dokumen cetak.
 * Payload di-tandatangani HMAC-SHA256 dengan AUTH_SECRET → tidak bisa dipalsukan.
 * Dipindai dari QR pada dokumen menuju /verifikasi untuk memastikan keaslian.
 */
export interface TtePayload {
  /** Unit/dapur */ u: string;
  /** Waktu tanda tangan (ISO) */ w: string;
  /** Jenis/judul dokumen */ j: string;
  /** Diterbitkan (epoch ms) */ iss: number;
}

function secret(): string {
  return process.env.AUTH_SECRET || "mbg-dev-secret-change-me";
}
function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function signTteToken(p: TtePayload): string {
  const data = b64url(Buffer.from(JSON.stringify(p), "utf8"));
  const sig = b64url(crypto.createHmac("sha256", secret()).update(data).digest());
  return `${data}.${sig}`;
}

export function verifyTteToken(token: string): TtePayload | null {
  const [data, sig] = String(token || "").split(".");
  if (!data || !sig) return null;
  const expected = b64url(crypto.createHmac("sha256", secret()).update(data).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(fromB64url(data).toString("utf8")) as TtePayload;
  } catch {
    return null;
  }
}
