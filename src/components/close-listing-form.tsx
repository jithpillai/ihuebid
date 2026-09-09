"use client";

import { FormEvent, useState } from "react";

import { PendingOverlay } from "@/components/pending-feedback";

type Outcome = "SOLD" | "NOT_SOLD" | "REMOVED";
type ClosureVisibility = "SHOW_OUTCOME" | "CLOSED_ONLY";

export function CloseListingForm({ listingId }: { listingId: string }) {
  const [outcome, setOutcome] = useState<Outcome>("SOLD");
  const [finalPrice, setFinalPrice] = useState("");
  const [note, setNote] = useState("");
  const [closureVisibility, setClosureVisibility] = useState<ClosureVisibility>("SHOW_OUTCOME");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/listings/${listingId}/close`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          outcome,
          finalPrice: outcome === "SOLD" && finalPrice ? Number(finalPrice) : undefined,
          note,
          closureVisibility,
        }),
      });
      const result = await response.json() as { ok: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Unable to close this listing.");
      window.location.reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to close this listing.");
      setLoading(false);
      setConfirming(false);
    }
  }

  return (
    <form onSubmit={submit} className="relative space-y-4">
      <PendingOverlay show={loading} label="Closing…" />
      <label className="block text-sm font-semibold text-body">
        Outcome
        <select
          value={outcome}
          onChange={(event) => setOutcome(event.target.value as Outcome)}
          className="mt-2 w-full rounded-2xl border border-border-strong bg-surface px-4 py-3 text-fg outline-none focus:border-accent"
        >
          <option value="SOLD">Sold</option>
          <option value="NOT_SOLD">Not sold</option>
          <option value="REMOVED">Removed</option>
        </select>
      </label>
      {outcome === "SOLD" && (
        <label className="block text-sm font-semibold text-body">
          Final price <span className="font-normal text-subtle-fg">(optional)</span>
          <input
            type="number"
            value={finalPrice}
            onChange={(event) => setFinalPrice(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-border-strong bg-surface px-4 py-3 text-fg outline-none focus:border-accent"
          />
        </label>
      )}
      <label className="block text-sm font-semibold text-body">
        Note <span className="font-normal text-subtle-fg">(optional)</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          maxLength={500}
          className="mt-2 w-full resize-none rounded-2xl border border-border-strong bg-surface px-4 py-3 text-fg outline-none focus:border-accent"
        />
      </label>
      <label className="block text-sm font-semibold text-body">
        Public page shows
        <select
          value={closureVisibility}
          onChange={(event) => setClosureVisibility(event.target.value as ClosureVisibility)}
          className="mt-2 w-full rounded-2xl border border-border-strong bg-surface px-4 py-3 text-fg outline-none focus:border-accent"
        >
          <option value="SHOW_OUTCOME">The outcome and final price</option>
          <option value="CLOSED_ONLY">Only that it&rsquo;s closed</option>
        </select>
      </label>
      {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
      <button
        disabled={loading}
        type="submit"
        className={`w-full rounded-2xl px-5 py-3.5 text-sm font-black transition disabled:cursor-wait disabled:opacity-60 ${confirming ? "bg-red-600 text-white hover:bg-red-500" : "bg-fg text-bg hover:opacity-90"}`}
      >
        {loading ? "Closing…" : confirming ? "Confirm — this can't be undone" : "Close listing"}
      </button>
      {confirming && !loading && (
        <button type="button" onClick={() => setConfirming(false)} className="w-full text-center text-xs font-semibold text-subtle-fg hover:text-muted-fg">
          Cancel
        </button>
      )}
    </form>
  );
}
