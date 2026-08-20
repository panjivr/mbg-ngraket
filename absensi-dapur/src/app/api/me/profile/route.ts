import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FOTO_CHARS = 1_500_000; // ~1.1 MB base64
const MAX_BIO = 200;

interface ProfilRow {
  id: number;
  nama: string;
  username: string;
  jabatan: string | null;
  foto_profil: string | null;
  foto_zoom: number;
  foto_pos_x: number;
  foto_pos_y: number;
  bio: string | null;
}

const RETURNING_COLS =
  "id, nama, username, jabatan, foto_profil, foto_zoom, foto_pos_x, foto_pos_y, bio";

/** Batasi angka ke rentang [min, max]; kembalikan null bila bukan angka valid. */
function clampNum(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}

export const GET = route(async () => {
  const session = await requireSession();
  const row = (
    await query<ProfilRow>(
      `SELECT ${RETURNING_COLS} FROM users WHERE id = $1`,
      [session.uid],
    )
  )[0];
  if (!row) return fail(404, "Pengguna tidak ditemukan.");
  return ok({ profil: row });
});

export const PUT = route(async (req: NextRequest) => {
  const session = await requireSession();
  const body = await req.json().catch(() => ({}));

  const hasFoto = body.foto_profil !== undefined;
  const hasBio = body.bio !== undefined;
  const hasZoom = body.foto_zoom !== undefined;
  const hasPosX = body.foto_pos_x !== undefined;
  const hasPosY = body.foto_pos_y !== undefined;
  if (!hasFoto && !hasBio && !hasZoom && !hasPosX && !hasPosY) {
    return fail(400, "Tidak ada perubahan.");
  }

  let foto: string | null | undefined;
  if (hasFoto) {
    if (body.foto_profil === null || body.foto_profil === "") {
      foto = null;
    } else if (
      typeof body.foto_profil === "string" &&
      body.foto_profil.startsWith("data:image")
    ) {
      if (body.foto_profil.length > MAX_FOTO_CHARS) {
        return fail(413, "Ukuran foto terlalu besar. Coba foto yang lebih kecil.");
      }
      foto = body.foto_profil;
    } else {
      return fail(400, "Format foto tidak valid.");
    }
  }

  let bio: string | null | undefined;
  if (hasBio) {
    bio = body.bio == null ? null : String(body.bio).trim().slice(0, MAX_BIO) || null;
  }

  // Bangun UPDATE dinamis hanya untuk kolom yang dikirim.
  const sets: string[] = [];
  const params: unknown[] = [];
  if (hasFoto) {
    params.push(foto);
    sets.push(`foto_profil = $${params.length}`);
  }
  if (hasBio) {
    params.push(bio);
    sets.push(`bio = $${params.length}`);
  }
  if (hasZoom) {
    const zoom = clampNum(body.foto_zoom, 1, 3);
    if (zoom === null) return fail(400, "Nilai zoom foto tidak valid.");
    params.push(zoom);
    sets.push(`foto_zoom = $${params.length}`);
  }
  if (hasPosX) {
    const px = clampNum(body.foto_pos_x, 0, 100);
    if (px === null) return fail(400, "Posisi foto tidak valid.");
    params.push(px);
    sets.push(`foto_pos_x = $${params.length}`);
  }
  if (hasPosY) {
    const py = clampNum(body.foto_pos_y, 0, 100);
    if (py === null) return fail(400, "Posisi foto tidak valid.");
    params.push(py);
    sets.push(`foto_pos_y = $${params.length}`);
  }
  params.push(session.uid);

  const row = (
    await query<ProfilRow>(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${params.length}
       RETURNING ${RETURNING_COLS}`,
      params,
    )
  )[0];
  return ok({ profil: row });
});
