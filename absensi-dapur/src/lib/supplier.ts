/**
 * Metadata dokumen Supplier (Nota Purchase Order & Invoice).
 * Dipakai hub `/admin/supplier` dan halaman cetak `/cetak/supplier/<slug>`.
 * Halaman cetak bersifat isi-lalu-cetak (contentEditable) + upload logo & norek,
 * tanpa DB (cetak / simpan sebagai PDF lewat browser). Berada di bawah fitur
 * "akuntan" (lihat RUTE_FITUR di lib/paket.ts).
 */
export type SupplierMode = "po" | "invoice";

export interface TemplateSupplier {
  slug: string;
  mode: SupplierMode;
  /** Judul kartu di hub. */
  judul: string;
  /** Judul besar di dokumen (heading). */
  heading: string;
  deskripsi: string;
  ikon: string;
}

export const TEMPLATE_SUPPLIER: TemplateSupplier[] = [
  {
    slug: "nota-po",
    mode: "po",
    judul: "Nota Purchase Order (PO)",
    heading: "PURCHASE ORDER",
    deskripsi:
      "Nota pemesanan barang ke supplier: kop perusahaan + logo, nomor PO, daftar barang, total, syarat & ketentuan.",
    ikon: "🧾",
  },
  {
    slug: "invoice",
    mode: "invoice",
    judul: "Invoice / Faktur Tagihan",
    heading: "INVOICE",
    deskripsi:
      "Faktur tagihan lengkap: logo & identitas supplier, rincian item, subtotal/pajak/total, info rekening (norek), dan catatan kecil di bawah.",
    ikon: "💳",
  },
];

export function getTemplateSupplier(slug: string): TemplateSupplier | undefined {
  return TEMPLATE_SUPPLIER.find((t) => t.slug === slug);
}
