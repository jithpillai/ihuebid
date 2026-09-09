import type { LabelHTMLAttributes, ReactNode } from "react";

/** Shared control classes so every form input looks identical and themes cleanly. */
export const inputClass =
  "w-full rounded-2xl border border-border-strong bg-surface px-4 py-3 text-fg outline-none transition placeholder:text-subtle-fg focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-60";

export const selectClass = `${inputClass} pr-10`;

export const textareaClass = `${inputClass} resize-none`;

export function Field({
  label,
  hint,
  error,
  optional,
  children,
  className = "",
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
}) {
  return (
    <label className={`block text-sm font-semibold text-body ${className}`} {...props}>
      <span className="mb-2 inline-flex items-center gap-1.5">
        {label}
        {optional && <span className="font-normal text-subtle-fg">(optional)</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1.5 block text-xs font-normal text-subtle-fg">{hint}</span>}
      {error && (
        <span role="alert" className="mt-1.5 block text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </label>
  );
}
