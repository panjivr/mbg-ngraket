"use client";

/**
 * Penjaga akses berbasis paket langganan: bila halaman admin yang dibuka butuh
 * fitur di luar paket dapur, alihkan ke dashboard. Nav sudah menyembunyikan
 * menu terkunci; ini menutup akses via URL langsung.
 */
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { RUTE_FITUR } from "@/lib/paket";

export default function PaketGuard({ fitur }: { fitur: string[] }) {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    const rule = RUTE_FITUR.find((r) => pathname.startsWith(r.prefix));
    if (rule && !fitur.includes(rule.fitur)) router.replace("/admin?terkunci=1");
  }, [pathname, fitur, router]);
  return null;
}
