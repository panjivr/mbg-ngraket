"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal masuk.");
        return;
      }
      const role = data.user?.role;
      const dest = next || (role === "admin" ? "/admin" : "/dapur");
      router.replace(dest);
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card w-full max-w-sm p-7">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gold-500 text-2xl text-ink-950">
          🍲
        </span>
        <h1 className="mt-4 text-xl font-bold">Masuk Absensi Dapur</h1>
        <p className="mt-1 text-sm text-slate-400">
          Gunakan akun yang diberikan admin dapur.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            className="input"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="mis. siti"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="input"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button type="submit" className="btn-gold w-full py-3" disabled={loading}>
          {loading ? "Memproses…" : "Masuk"}
        </button>
      </form>

      <Link
        href="/"
        className="mt-5 block text-center text-xs text-slate-500 hover:text-slate-300"
      >
        ← Kembali ke beranda
      </Link>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <Suspense
        fallback={
          <div className="card w-full max-w-sm p-7 text-center text-slate-400">
            Memuat…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
