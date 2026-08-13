"use client";

/**
 * Badge tingkat risiko (minor/mayor/kritis) — memakai warna dari tingkatMeta
 * agar konsisten dengan API & register. Dipakai di panel temuan & register.
 */
import { tingkatMeta, type Tingkat } from "@/lib/audit-risk";

export default function RiskBadge({ tingkat, score }: { tingkat: Tingkat | string; score?: number }) {
  const meta = tingkatMeta(tingkat as Tingkat);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${meta.badge}`}
      title={`Tingkat ${meta.label}${score != null ? ` · skor ${score}` : ""}`}
    >
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
      {score != null && <span className="tabular-nums opacity-80">· {score}</span>}
    </span>
  );
}
