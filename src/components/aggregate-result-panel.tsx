"use client";

import { useState } from "react";

import { AggregateResult } from "@/components/aggregate-result";
import type { ListingAggregate } from "@/server/listings/aggregation";

export function AggregateResultPanel({
  aggregate,
  currency,
  showComparison = true,
  title = "Market signal",
}: {
  aggregate: ListingAggregate;
  currency: string;
  showComparison?: boolean;
  title?: string;
}) {
  const { all, named, counts, namedEstimates } = aggregate;
  const canFilter = counts.named > 0 && counts.anonymous > 0;
  const [namedOnly, setNamedOnly] = useState(false);
  const effective = namedOnly ? named : all;

  const formatter = new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 });

  return (
    <div className="flex flex-col gap-3">
      {canFilter && (
        <label className="flex items-center gap-2 self-end text-xs font-semibold text-muted-fg">
          <input
            type="checkbox"
            checked={namedOnly}
            onChange={(event) => setNamedOnly(event.target.checked)}
            className="size-4 rounded border-border-strong text-accent focus:ring-accent"
          />
          Skip anonymous ({counts.anonymous} hidden)
        </label>
      )}

      <AggregateResult data={effective} currency={currency} showComparison={showComparison} title={title} />

      {namedEstimates.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="text-xs font-black uppercase tracking-[0.14em] text-subtle-fg">
            Named estimates · {namedEstimates.length}
          </h3>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border">
            {namedEstimates.map((estimate, index) => (
              <li key={index} className="flex items-center justify-between gap-3 bg-surface px-4 py-2.5">
                <span className="truncate text-sm font-semibold text-fg">{estimate.name}</span>
                <span className="tnum shrink-0 text-sm font-bold text-body">{formatter.format(estimate.value)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-subtle-fg">
            These participants chose to show their name. Anonymous estimates still count toward the signal above unless
            &ldquo;Skip anonymous&rdquo; is on.
          </p>
        </div>
      )}
    </div>
  );
}
