"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { PriceSlider } from "@/components/price-slider";
import type { ListingStatus } from "@/generated/prisma/client";
import { positionalHint } from "@/lib/valuation-feedback";

export function ValuationForm({
  listingId,
  status,
  currency,
  min,
  max,
  increment,
  initialValue,
}: {
  listingId: string;
  status: ListingStatus;
  currency: string;
  min: number;
  max: number;
  increment: number;
  initialValue: number | null;
}) {
  const formatValue = useMemo(() => {
    const formatter = new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 });
    return (value: number) => formatter.format(value);
  }, [currency]);

  const defaultValue = useMemo(() => {
    if (initialValue !== null) return initialValue;
    const midpoint = min + (max - min) / 2;
    return min + Math.round((midpoint - min) / increment) * increment;
  }, [initialValue, min, max, increment]);

  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const hint = useMemo(() => positionalHint(value, min, max), [value, min, max]);
  const [hasResponded, setHasResponded] = useState(initialValue !== null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  // Honeypot: invisible to real visitors, a scraping bot that blindly fills
  // every input trips it. Never rendered visibly, never reachable by tab.
  const [company, setCompany] = useState("");

  if (status !== "LIVE") {
    return (
      <p className="rounded-2xl bg-muted px-5 py-3.5 text-center text-sm font-semibold text-muted-fg">
        {status === "PAUSED" ? "This listing isn't accepting responses right now." : "This listing is closed."}
      </p>
    );
  }

  async function submit() {
    setError("");
    setLoading(true);
    setJustSaved(false);
    try {
      const response = await fetch(`/api/listings/${listingId}/responses`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value, company }),
      });
      const result = await response.json() as { ok: boolean; message?: string; value?: number };
      if (!response.ok || !result.ok || result.value === undefined) throw new Error(result.message ?? "Unable to submit your estimate.");
      setValue(result.value);
      setHasResponded(true);
      setJustSaved(true);
      // Re-run the server component tree for this route so the "Market
      // signal" panel picks up the new response — it's fetched server-side
      // and won't otherwise know a submission just happened.
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit your estimate.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <input
        type="text"
        name="company"
        value={company}
        onChange={(event) => setCompany(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] size-px opacity-0"
      />
      <p className="text-sm font-semibold text-muted-fg">What is this worth to you?</p>
      <div className="mt-4">
        <PriceSlider value={value} range={{ min, max, step: increment }} onChange={setValue} formatValue={formatValue} disabled={loading} />
      </div>
      <div className="mt-2 flex justify-between text-xs font-semibold text-subtle-fg" style={{ width: 240 }}>
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
      <p className="mt-3 h-4 text-xs font-semibold text-amber-600">{hint}</p>
      <p className="mt-1 max-w-xs text-center text-xs text-subtle-fg">
        Give your honest opinion — the market signal is only useful if everyone answers what they&rsquo;d genuinely pay, not the lowest number they can get away with.
      </p>
      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="mt-6 w-full rounded-2xl bg-accent px-5 py-3.5 text-sm font-black text-accent-fg transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? "Submitting…" : hasResponded ? "Update your estimate" : "Submit your estimate"}
      </button>
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      {justSaved && !error && (
        <p className="mt-3 text-sm font-semibold text-accent-soft-fg">Thanks — your estimate has been recorded.</p>
      )}
      {hasResponded && !justSaved && !error && (
        <p className="mt-3 text-xs text-subtle-fg">You can come back and adjust this anytime while the listing is live.</p>
      )}
    </div>
  );
}
