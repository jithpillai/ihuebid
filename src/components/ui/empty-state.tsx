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
  hand: (
    <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
      <path
        d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11m0 0V4.5a1.5 1.5 0 0 1 3 0V11m0 0V6.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1.2a5 5 0 0 1-3.8-1.7l-3.3-3.8a1.6 1.6 0 0 1 2.3-2.2L9 12.5V11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 6.5a3 3 0 0 1 0 6m1.5 3.2A5.5 5.5 0 0 1 20.5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  bolt: (
    <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
      <path d="M4 12 20 4l-6 16-3-7-7-1Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="m8 12 3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};
