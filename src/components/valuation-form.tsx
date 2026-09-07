"use client";

import { useMemo, useState } from "react";

import { PriceSlider } from "@/components/price-slider";
import type { ListingStatus } from "@/generated/prisma/client";

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

  const [value, setValue] = useState(defaultValue);
  const [hasResponded, setHasResponded] = useState(initialValue !== null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  if (status !== "LIVE") {
    return (
      <p className="rounded-2xl bg-zinc-100 px-5 py-3.5 text-center text-sm font-semibold text-zinc-500">
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
        body: JSON.stringify({ value }),
      });
      const result = await response.json() as { ok: boolean; message?: string; value?: number };
      if (!response.ok || !result.ok || result.value === undefined) throw new Error(result.message ?? "Unable to submit your estimate.");
      setValue(result.value);
      setHasResponded(true);
      setJustSaved(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit your estimate.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <p className="text-sm font-semibold text-zinc-500">What is this worth to you?</p>
      <div className="mt-4">
        <PriceSlider value={value} range={{ min, max, step: increment }} onChange={setValue} formatValue={formatValue} disabled={loading} />
      </div>
      <div className="mt-2 flex justify-between text-xs font-semibold text-zinc-400" style={{ width: 240 }}>
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="mt-6 w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? "Submitting…" : hasResponded ? "Update your estimate" : "Submit your estimate"}
      </button>
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      {justSaved && !error && (
        <p className="mt-3 text-sm font-semibold text-blue-600">Thanks — your estimate has been recorded.</p>
      )}
      {hasResponded && !justSaved && !error && (
        <p className="mt-3 text-xs text-zinc-400">You can come back and adjust this anytime while the listing is live.</p>
      )}
    </div>
  );
}
