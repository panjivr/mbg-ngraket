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
  bio: string | null;
}

export const GET = route(async () => {
  const session = await requireSession();
  const row = (
    await query<ProfilRow>(
      `SELECT id, nama, username, jabatan, foto_profil, bio FROM users WHERE id = $1`,
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
  if (!hasFoto && !hasBio) return fail(400, "Tidak ada perubahan.");

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
  params.push(session.uid);

  const row = (
    await query<ProfilRow>(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${params.length}
       RETURNING id, nama, username, jabatan, foto_profil, bio`,
      params,
    )
  )[0];
  return ok({ profil: row });
});
