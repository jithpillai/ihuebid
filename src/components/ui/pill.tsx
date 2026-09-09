import type { ReactNode } from "react";

type ListingStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "LIVE"
  | "PAUSED"
  | "CLOSED"
  | "CANCELLED";

const STATUS_STYLE: Record<string, string> = {
  LIVE: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-emerald-500/25",
  DRAFT: "bg-muted text-muted-fg ring-border",
  SCHEDULED: "bg-amber-500/12 text-amber-700 dark:text-amber-300 ring-amber-500/25",
  PAUSED: "bg-amber-500/12 text-amber-700 dark:text-amber-300 ring-amber-500/25",
  CLOSED: "bg-zinc-500/12 text-zinc-600 dark:text-zinc-300 ring-zinc-500/25",
  CANCELLED: "bg-red-500/12 text-red-700 dark:text-red-300 ring-red-500/25",
};

const STATUS_LABEL: Record<string, string> = {
  LIVE: "Live",
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  PAUSED: "Paused",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

export function Pill({ tone = "neutral", children }: { tone?: "neutral" | "accent"; children: ReactNode }) {
  const style =
    tone === "accent"
      ? "bg-accent-soft text-accent-soft-fg ring-accent/20"
      : "bg-muted text-muted-fg ring-border";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${style}`}>
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: ListingStatus | string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${
        STATUS_STYLE[status] ?? STATUS_STYLE.DRAFT
      }`}
    >
      {status === "LIVE" && <span className="size-1.5 rounded-full bg-current" />}
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
