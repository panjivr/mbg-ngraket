"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({
  href,
  label,
  exact = false,
}: {
  href: string;
  label: string;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={
        "rounded-lg px-3 py-2 text-sm font-medium transition " +
        (active
          ? "bg-gold-500/15 text-gold-400"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-100")
      }
    >
      {label}
    </Link>
  );
}
