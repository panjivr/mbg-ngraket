"use client";

/**
 * Tombol pemicu Command Palette (untuk yang tidak tahu pintasan Ctrl+K, mis. di HP).
 * Hanya mengirim event "cmdk:toggle" ke window — CommandPalette yang menangani.
 */
export default function CommandPaletteTrigger({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("cmdk:toggle"))}
      className={"btn-ghost inline-flex items-center gap-2 px-3 py-1.5 text-xs " + className}
      aria-label="Buka pencarian cepat"
      title="Pencarian cepat (Ctrl+K)"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="hidden sm:inline">Cari</span>
      <kbd className="hidden rounded border border-white/15 px-1 py-0.5 text-[9px] text-slate-400 md:inline">Ctrl K</kbd>
    </button>
  );
}
