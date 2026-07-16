// Tipe bersama untuk seluruh koleksi kutipan.
export interface Quote {
  teks: string;
  sumber: string;
  // Kategori tampilan opsional (mis. "Filsuf", "Al-Qur'an", "Pengusaha").
  kategori?: string;
}
