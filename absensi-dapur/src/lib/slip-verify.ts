import crypto from "crypto";
import QRCode from "qrcode";
import type { Slip } from "@/lib/slip";

/**
 * Tanda tangan elektronik slip gaji berbasis QR.
 * Token = base64url(payload-JSON) + "." + base64url(HMAC-SHA256(payload, AUTH_SECRET)).
 * Stateless & terverifikasi: siapa pun yang memindai QR membuka /verifikasi-slip
 * yang memeriksa HMAC-nya — bila valid, isi slip (nama, periode, total, status
 * tanda tangan) dipastikan asli & tidak diubah. Tidak memuat data sensitif di
 * luar yang sudah tampil di slip.
 */
export interface SlipVerifyPayload {
  /** Unit/dapur */ u: string;
  /** Nama karyawan */ n: string;
  /** Jabatan */ j: string;
  /** Periode from */ pf: string;
  /** Periode to */ pt: string;
  /** Total diterima (Rp) */ tot: number;
  /** Diterima karyawan pada (ISO) atau "" */ emp: string;
  /** Disahkan HR — nama atau "" */ hr: string;
  /** Disahkan HR pada (ISO) atau "" */ hrt: string;
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

export function signSlipToken(p: SlipVerifyPayload): string {
  const data = b64url(Buffer.from(JSON.stringify(p), "utf8"));
  const sig = b64url(crypto.createHmac("sha256", secret()).update(data).digest());
  return `${data}.${sig}`;
}

export function verifySlipToken(token: string): SlipVerifyPayload | null {
  const [data, sig] = String(token || "").split(".");
  if (!data || !sig) return null;
  const expected = b64url(crypto.createHmac("sha256", secret()).update(data).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(fromB64url(data).toString("utf8")) as SlipVerifyPayload;
  } catch {
    return null;
  }
}

/** Bangun payload tanda tangan dari slip + nama unit. */
export function slipPayload(slip: Slip, dapur: string): SlipVerifyPayload {
  return {
    u: dapur || "",
    n: slip.user.nama,
    j: slip.user.jabatan || "",
    pf: slip.periode.from,
    pt: slip.periode.to,
    tot: Math.round(slip.total),
    emp: slip.confirmed_at || "",
    hr: slip.hr_signed_nama || "",
    hrt: slip.hr_signed_at || "",
    iss: Date.now(),
  };
}

/**
 * Bangun URL verifikasi + QR (data URL PNG) untuk disematkan pada slip.
 * `origin` diambil dari request agar tautan memakai domain yang benar.
 */
export async function buildSlipVerification(
  slip: Slip,
  dapur: string,
  origin: string,
): Promise<{ verifyUrl: string; verifyQr: string }> {
  const token = signSlipToken(slipPayload(slip, dapur));
  const verifyUrl = `${origin.replace(/\/+$/, "")}/verifikasi-slip?t=${encodeURIComponent(token)}`;
  const verifyQr = await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 240,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });
  return { verifyUrl, verifyQr };
}
