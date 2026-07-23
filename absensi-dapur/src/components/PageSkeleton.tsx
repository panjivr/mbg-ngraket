// Skeleton ringan untuk loading.tsx — memberi umpan balik instan saat navigasi
// halaman dinamis (SSR), sehingga terasa cepat meski data masih dimuat.
export default function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-4" aria-hidden>
      <div className="h-7 w-52 rounded-lg bg-white/10" />
      <div className="card space-y-3 p-4">
        <div className="h-4 w-1/3 rounded bg-white/10" />
        <div className="h-9 w-full rounded-lg bg-white/5" />
      </div>
      <div className="card divide-y divide-white/5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-9 w-9 shrink-0 rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-2/5 rounded bg-white/10" />
              <div className="h-3 w-1/4 rounded bg-white/5" />
            </div>
            <div className="h-6 w-14 rounded bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
