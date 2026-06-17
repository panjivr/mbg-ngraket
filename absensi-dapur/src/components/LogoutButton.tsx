"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton({
  className = "btn-ghost",
}: {
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={logout} className={className} disabled={loading}>
      {loading ? "Keluar…" : "Keluar"}
    </button>
  );
}
