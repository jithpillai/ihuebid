"use client";

export function PendingOverlay({ show, label }: { show: boolean; label: string }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 z-50 grid place-items-center rounded-3xl bg-[#101419]/85 backdrop-blur-sm" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/50 px-5 py-3 text-sm font-bold text-white shadow-xl">
        <span aria-hidden="true" className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        {label}
      </div>
    </div>
  );
}
