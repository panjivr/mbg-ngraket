import { query } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { ok, route } from "@/lib/api";
import { localDate } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOA = [
  "Barakallahu fii umrik! 🎂 Semoga Allah memberkahi umurmu, memudahkan rezekimu, menyehatkan badanmu, dan menjadikan setiap masakan dari tanganmu penuh berkah untuk anak-anak negeri.",
  "Selamat ulang tahun! 🎉 Semoga panjang umur, sehat selalu, dilapangkan rezekinya, dikabulkan cita-citanya, dan selalu dalam lindungan Allah SWT. Terima kasih sudah menjadi bagian penting dapur ini.",
  "Barakallahu fii umrik! 🌟 Semoga bertambahnya usia menjadi bertambahnya iman, ilmu, dan amal. Semoga keluargamu selalu diberi kesehatan dan kebahagiaan dunia akhirat.",
  "Selamat bertambah usia! 🎈 Semoga Allah mengampuni dosa-dosamu, menerangi jalan hidupmu, dan menjadikan sisa umurmu penuh manfaat bagi sesama. Sehat dan bahagia selalu!",
  "Happy milad! 🕊️ Semoga setiap tetes keringatmu di dapur menjadi ladang pahala, umurmu berkah, hatimu lapang, dan senyummu tak pernah pudar. Aamiin ya rabbal 'alamin.",
];

export const GET = route(async () => {
  const session = await requireSession();
  const sppg = await getSppg(session.sppg_id as number);
  const today = localDate(sppg?.tz || "Asia/Jakarta");

  const row = (
    await query<{ nama: string; tanggal_lahir: string | null }>(
      `SELECT nama, tanggal_lahir FROM users WHERE id = $1`,
      [session.uid],
    )
  )[0];

  const tglLahir = row?.tanggal_lahir ? String(row.tanggal_lahir).slice(0, 10) : null;
  const isBirthday = !!tglLahir && tglLahir.slice(5) === today.slice(5);
  if (!isBirthday) return ok({ birthday: false });

  const usia =
    parseInt(today.slice(0, 4), 10) - parseInt(tglLahir!.slice(0, 4), 10);
  const pesan = DOA[parseInt(today.slice(8, 10), 10) % DOA.length];
  return ok({ birthday: true, nama: row.nama, usia, pesan, tanggal: today });
});
