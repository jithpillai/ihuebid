import type { ReactNode } from "react";

export function StatRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <dl className={`grid grid-cols-3 divide-x divide-border overflow-hidden rounded-2xl border border-border bg-surface ${className}`}>
      {children}
    </dl>
  );
}

export function Stat({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="px-4 py-3 sm:px-5 sm:py-4">
      <dd className="tnum text-xl font-black text-fg sm:text-2xl">{value}</dd>
      <dt className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-subtle-fg">{label}</dt>
    </div>
  );
}
