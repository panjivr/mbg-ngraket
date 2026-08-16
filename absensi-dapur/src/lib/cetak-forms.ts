/**
 * Tipe & palet aksen bersama untuk semua hub formulir cetak per-peran
 * (kepala dapur, asisten lapangan, chef, dst.). Setiap peran punya katalog
 * template sendiri di `lib/<peran>.ts` dan halaman cetak di
 * `/cetak/<peran>/<slug>`, tetapi semuanya memakai kartu hub yang sama
 * (`components/CetakHub`) supaya konsisten & hemat kode.
 */

/** Warna aksen kartu — dipetakan ke kelas Tailwind lengkap di AKSEN_PALETTE. */
export type WarnaAksen =
  | "emerald"
  | "green"
  | "lime"
  | "teal"
  | "cyan"
  | "sky"
  | "blue"
  | "indigo"
  | "violet"
  | "fuchsia"
  | "pink"
  | "rose"
  | "orange"
  | "amber";

export interface CetakTemplate {
  slug: string;
  /** Nama singkat di kartu hub. */
  judul: string;
  /** Judul dokumen (heading kop cetak). */
  heading: string;
  /** Nomor surat/BA. Kosongkan untuk formulir non-bernomor. */
  nomor?: string;
  deskripsi: string;
  ikon: string;
  /** Cetak mendatar untuk formulir lebar. */
  landscape?: boolean;
  /** Warna aksen kartu. Default mengikuti aksen hub. */
  warna?: WarnaAksen;
}

export interface CetakGrup {
  label: string;
  ket: string;
  slugs: string[];
}

/**
 * Aksen warna kartu — kelas Tailwind LENGKAP (tidak boleh di-concat dinamis
 * agar tidak ter-purge saat build produksi).
 */
export const AKSEN_PALETTE: Record<
  WarnaAksen,
  { ikon: string; garis: string; ring: string; teks: string }
> = {
  emerald: { ikon: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30", garis: "from-emerald-500/70", ring: "hover:ring-emerald-500/40 hover:shadow-emerald-500/10", teks: "group-hover:text-emerald-200" },
  green: { ikon: "bg-green-500/15 text-green-300 ring-green-500/30", garis: "from-green-500/70", ring: "hover:ring-green-500/40 hover:shadow-green-500/10", teks: "group-hover:text-green-200" },
  lime: { ikon: "bg-lime-500/15 text-lime-300 ring-lime-500/30", garis: "from-lime-500/70", ring: "hover:ring-lime-500/40 hover:shadow-lime-500/10", teks: "group-hover:text-lime-200" },
  teal: { ikon: "bg-teal-500/15 text-teal-300 ring-teal-500/30", garis: "from-teal-500/70", ring: "hover:ring-teal-500/40 hover:shadow-teal-500/10", teks: "group-hover:text-teal-200" },
  cyan: { ikon: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30", garis: "from-cyan-500/70", ring: "hover:ring-cyan-500/40 hover:shadow-cyan-500/10", teks: "group-hover:text-cyan-200" },
  sky: { ikon: "bg-sky-500/15 text-sky-300 ring-sky-500/30", garis: "from-sky-500/70", ring: "hover:ring-sky-500/40 hover:shadow-sky-500/10", teks: "group-hover:text-sky-200" },
  blue: { ikon: "bg-blue-500/15 text-blue-300 ring-blue-500/30", garis: "from-blue-500/70", ring: "hover:ring-blue-500/40 hover:shadow-blue-500/10", teks: "group-hover:text-blue-200" },
  indigo: { ikon: "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30", garis: "from-indigo-500/70", ring: "hover:ring-indigo-500/40 hover:shadow-indigo-500/10", teks: "group-hover:text-indigo-200" },
  violet: { ikon: "bg-violet-500/15 text-violet-300 ring-violet-500/30", garis: "from-violet-500/70", ring: "hover:ring-violet-500/40 hover:shadow-violet-500/10", teks: "group-hover:text-violet-200" },
  fuchsia: { ikon: "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/30", garis: "from-fuchsia-500/70", ring: "hover:ring-fuchsia-500/40 hover:shadow-fuchsia-500/10", teks: "group-hover:text-fuchsia-200" },
  pink: { ikon: "bg-pink-500/15 text-pink-300 ring-pink-500/30", garis: "from-pink-500/70", ring: "hover:ring-pink-500/40 hover:shadow-pink-500/10", teks: "group-hover:text-pink-200" },
  rose: { ikon: "bg-rose-500/15 text-rose-300 ring-rose-500/30", garis: "from-rose-500/70", ring: "hover:ring-rose-500/40 hover:shadow-rose-500/10", teks: "group-hover:text-rose-200" },
  orange: { ikon: "bg-orange-500/15 text-orange-300 ring-orange-500/30", garis: "from-orange-500/70", ring: "hover:ring-orange-500/40 hover:shadow-orange-500/10", teks: "group-hover:text-orange-200" },
  amber: { ikon: "bg-amber-500/15 text-amber-300 ring-amber-500/30", garis: "from-amber-500/70", ring: "hover:ring-amber-500/40 hover:shadow-amber-500/10", teks: "group-hover:text-amber-200" },
};

/** Cari template dalam katalog peran mana pun. */
export function findTemplate(
  daftar: readonly CetakTemplate[],
  slug: string,
): CetakTemplate | undefined {
  return daftar.find((t) => t.slug === slug);
}
