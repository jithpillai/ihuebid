import type { AggregateResultData, ConfidenceLevel } from "@/server/listings/aggregation";

const CONFIDENCE_STYLE: Record<ConfidenceLevel, string> = {
  LOW: "bg-zinc-100 text-zinc-600",
  MEDIUM: "bg-blue-50 text-blue-700",
  HIGH: "bg-blue-600 text-white",
};

const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  LOW: "Low confidence",
  MEDIUM: "Medium confidence",
  HIGH: "High confidence",
};

const COMPARISON_STYLE: Record<string, string> = {
  GREEN: "bg-green-50 text-green-700 border-green-200",
  YELLOW: "bg-amber-50 text-amber-700 border-amber-200",
  RED: "bg-red-50 text-red-700 border-red-200",
  PURPLE: "bg-purple-50 text-purple-700 border-purple-200",
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
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-center text-sm text-zinc-400">
        No responses yet.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-wide text-zinc-400">{title}</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${CONFIDENCE_STYLE[data.confidence]}`}>
          {CONFIDENCE_LABEL[data.confidence]}
        </span>
      </div>

      <p className="mt-3 text-3xl font-black text-zinc-900">{formatter.format(data.consensus!)}</p>
      <p className="mt-1 text-sm text-zinc-500">
        Likely range <span className="font-semibold text-zinc-700">{formatter.format(data.band![0])} – {formatter.format(data.band![1])}</span>
        {" · "}{data.count} {data.count === 1 ? "response" : "responses"}
      </p>

      <div className="mt-5 flex h-16 items-end gap-1">
        {data.distribution.map((bin, index) => (
          <div
            key={index}
            className="flex-1 rounded-t bg-blue-200"
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
