export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted ${className}`} aria-hidden="true" />;
}

// Shown at the top of every route-level loading screen so a slow transition
// reads as "loading" rather than "stuck".
export function LoadingBanner({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-16 z-10 mb-6 flex items-center justify-center gap-2.5 rounded-full border border-border bg-surface/90 px-4 py-2 text-sm font-bold text-muted-fg shadow-sm backdrop-blur"
    >
      <span
        aria-hidden="true"
        className="size-4 shrink-0 animate-spin rounded-full border-2 border-accent/30 border-t-accent"
      />
      {label}
    </div>
  );
}
