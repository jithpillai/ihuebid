import type { AggregateResultData, ConfidenceLevel } from "@/server/listings/aggregation";

const CONFIDENCE_STYLE: Record<ConfidenceLevel, string> = {
  LOW: "bg-muted text-muted-fg",
  MEDIUM: "bg-accent-soft text-accent-soft-fg",
  HIGH: "bg-accent text-accent-fg",
};

const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  LOW: "Low confidence",
  MEDIUM: "Medium confidence",
  HIGH: "High confidence",
};

const COMPARISON_STYLE: Record<string, string> = {
  GREEN: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  YELLOW: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  RED: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
  PURPLE: "border-purple-500/25 bg-purple-500/10 text-purple-700 dark:text-purple-300",
};

export function AggregateResult({
  data,
  currency,
  showComparison = true,
  title = "Market signal",
}: {
  data: AggregateResultData;
  currency: string;
  showComparison?: boolean;
  title?: string;
}) {
  const formatter = new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 });
  const maxBinCount = Math.max(1, ...data.distribution.map((bin) => bin.count));

  if (data.count === 0) {
    return (
      <div className="rounded-2xl border border-border bg-muted/50 p-5 text-center text-sm text-subtle-fg">
        No responses yet.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-black uppercase tracking-[0.14em] text-subtle-fg">{title}</h3>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${CONFIDENCE_STYLE[data.confidence]}`}>
          {CONFIDENCE_LABEL[data.confidence]}
        </span>
      </div>

      <p className="tnum mt-3 text-3xl font-black text-fg">{formatter.format(data.consensus!)}</p>
      <p className="mt-1 text-sm text-muted-fg">
        Likely range{" "}
        <span className="tnum font-semibold text-body">
          {formatter.format(data.band![0])} – {formatter.format(data.band![1])}
        </span>
        {" · "}
        {data.count} {data.count === 1 ? "response" : "responses"}
      </p>

      <div className="mt-5 flex h-16 items-end gap-1">
        {data.distribution.map((bin, index) => (
          <div
            key={index}
            className="flex-1 rounded-t bg-accent/25"
            style={{ height: `${Math.max(4, (bin.count / maxBinCount) * 100)}%` }}
            title={`${formatter.format(bin.rangeLow)} – ${formatter.format(bin.rangeHigh)}: ${bin.count}`}
          />
        ))}
      </div>

      {showComparison && data.comparison && (
        <p className={`mt-4 rounded-xl border px-4 py-2.5 text-sm font-semibold ${COMPARISON_STYLE[data.comparison.tier]}`}>
          {data.comparison.label}
        </p>
      )}
    </div>
  );
}
