import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  body,
  action,
  className = "",
}: {
  icon?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-3xl border border-dashed border-border-strong bg-surface/60 px-6 py-12 text-center ${className}`}
    >
      {icon && (
        <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent-soft-fg">
          {icon}
        </div>
      )}
      <p className="text-base font-black text-fg">{title}</p>
      {body && <p className="mt-1.5 max-w-sm text-sm text-muted-fg">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** A couple of reusable inline glyphs so we don't pull in an icon library. */
export const icons = {
  spark: (
    <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
      <path
        d="M12 3v4m0 10v4m9-9h-4M7 12H3m14.5-6.5-2.8 2.8M9.3 14.7l-2.8 2.8m11-.1-2.8-2.8M9.3 9.3 6.5 6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  tag: (
    <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
      <path
        d="M3.5 12.5 12 4h7v7l-8.5 8.5a2 2 0 0 1-2.8 0l-4.2-4.2a2 2 0 0 1 0-2.8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
      <path d="M4 20V10m6 10V4m6 16v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};
