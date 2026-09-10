import type { ReactNode } from "react";

// Native <details> disclosure — collapsed by default, no client JS. Styled to
// match the other dashboard cards (rounded-3xl border, bg-surface).
export function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  className = "mt-6",
  contentClassName = "px-7 pb-7",
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className={`group rounded-3xl border border-border bg-surface shadow-sm ${className}`}>
      <summary className="flex cursor-pointer list-none items-start gap-3 p-7 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-black uppercase tracking-wide text-subtle-fg">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-fg">{description}</p>}
        </div>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-subtle-fg transition-transform duration-200 group-open:rotate-180"
        >
          <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className={contentClassName}>{children}</div>
    </details>
  );
}
