"use client";

import { Suspense } from "react";
import LoginCard from "@/components/LoginCard";

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
        <LoginCard />
      </Suspense>
    </main>
  );
}
