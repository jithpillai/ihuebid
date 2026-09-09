import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-3xl border border-border bg-surface shadow-sm shadow-black/[0.03] dark:shadow-black/20 ${className}`}
      {...props}
    />
  );
}

/** Small all-caps label used at the top of a card section. */
export function CardHeading({ className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={`text-xs font-black uppercase tracking-[0.14em] text-subtle-fg ${className}`}
      {...props}
    />
  );
}
