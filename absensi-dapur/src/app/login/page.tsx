"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import BgnLogo from "@/components/BgnLogo";

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
    <div className="card grid w-full max-w-3xl overflow-hidden md:grid-cols-2">
      {/* Panel branding (kiri) ala portal resmi BGN */}
      <div className="relative hidden flex-col justify-between bg-gradient-to-br from-ink-800 to-ink-950 p-8 md:flex">
        <div className="flex items-center gap-3">
          <BgnLogo size={52} />
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-wide">BADAN GIZI NASIONAL</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              Republik Indonesia
            </p>
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-extrabold leading-tight">
            Sistem Manajemen{" "}
            <span className="bg-gradient-to-r from-gold-400 to-ember-400 bg-clip-text text-transparent">
              Operasional
            </span>{" "}
            Absensi Dapur
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Platform terintegrasi untuk mendukung operasional dapur Program Makan
            Bergizi Gratis yang lebih efektif dan efisien.
          </p>
        </div>
        <p className="text-[11px] text-slate-500">
          © {new Date().getFullYear()} Badan Gizi Nasional
        </p>
      </div>

      {/* Form (kanan) */}
      <div className="p-7 sm:p-9">
        <div className="mb-6 flex flex-col items-center text-center md:hidden">
          <BgnLogo size={64} />
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Badan Gizi Nasional
          </p>
        </div>
        <h1 className="text-center text-2xl font-bold md:text-left">Silakan Login</h1>
        <p className="mt-1 text-center text-sm text-slate-400 md:text-left">
          Masuk menggunakan akun yang diberikan admin.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="username">
              Nama Akun
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
              Kata Sandi
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
            {loading ? "Memproses…" : "Sign In"}
          </button>
        </form>

        <Link
          href="/"
          className="mt-5 block text-center text-xs text-slate-500 hover:text-slate-300"
        >
          ← Kembali ke beranda
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-1 bg-gradient-to-r from-emas-500 via-gold-500 to-emas-500" />
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
