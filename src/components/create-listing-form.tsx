"use client";

import { FormEvent, useState } from "react";

import { ListingFieldInputs } from "@/components/listing-field-inputs";
import { PendingOverlay } from "@/components/pending-feedback";
import { hasSufficientFactsForSuggestion } from "@/server/ai/price-suggestion";
import { suggestListingDescription, suggestListingTitle } from "@/server/listings/templates/used-vehicle";

export function CreateListingForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationText, setLocationText] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [ownerExpectedPrice, setOwnerExpectedPrice] = useState("");
  const [ownerPriceVisibility, setOwnerPriceVisibility] = useState<"VISIBLE" | "HIDDEN_UNTIL_RESPONSE" | "NOT_SUPPLIED">("NOT_SUPPLIED");
  const [resultVisibility, setResultVisibility] = useState<"PUBLIC" | "CREATOR_ONLY">("PUBLIC");
  const [responseMin, setResponseMin] = useState("");
  const [responseMax, setResponseMax] = useState("");
  const [responseIncrement, setResponseIncrement] = useState("1000");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [suggestion, setSuggestion] = useState<{ low: number; high: number; rationale: string } | null>(null);
  const [suggestError, setSuggestError] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const canSuggest = hasSufficientFactsForSuggestion(fieldValues);

  // Offered as an "Apply" suggestion, never auto-filled — and only while the
  // field is still empty, so editing the details later can't overwrite what
  // the creator has already typed.
  const titleSuggestion = title.trim() === "" ? suggestListingTitle(fieldValues) : "";
  const descriptionSuggestion = description.trim() === "" ? suggestListingDescription(fieldValues) : "";

  async function suggestRange() {
    setSuggestError("");
    setSuggestion(null);
    setSuggesting(true);
    try {
      const response = await fetch("/api/listings/suggest-price", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currency, locationText, fieldValues }),
      });
      const result = await response.json() as { ok: boolean; message?: string; suggestion?: { low: number; high: number; rationale: string } };
      if (!response.ok || !result.ok || !result.suggestion) throw new Error(result.message ?? "Unable to suggest a range right now.");
      setSuggestion(result.suggestion);
    } catch (suggestErr) {
      setSuggestError(suggestErr instanceof Error ? suggestErr.message : "Unable to suggest a range right now.");
    } finally {
      setSuggesting(false);
    }
  }

  function useSuggestion() {
    if (!suggestion) return;
    setResponseMin(String(Math.round(suggestion.low)));
    setResponseMax(String(Math.round(suggestion.high)));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          locationText,
          currency,
          ownerExpectedPrice: ownerExpectedPrice ? Number(ownerExpectedPrice) : undefined,
          ownerPriceVisibility,
          resultVisibility,
          responseMin: Number(responseMin),
          responseMax: Number(responseMax),
          responseIncrement: Number(responseIncrement),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          fieldValues,
        }),
      });
      const result = await response.json() as { ok: boolean; message?: string; listing?: { id: string } };
      if (!response.ok || !result.ok || !result.listing) throw new Error(result.message ?? "Unable to create this listing.");
      window.location.assign(`/dashboard/listings/${result.listing.id}/edit`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create this listing.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="relative mt-8 space-y-6 rounded-3xl border border-border bg-surface p-7 shadow-xl shadow-black/5 dark:shadow-black/40">
      <PendingOverlay show={loading} label="Creating…" />

      <div>
        <h2 className="text-sm font-black uppercase tracking-wide text-subtle-fg">Vehicle details</h2>
        <div className="mt-4">
          <ListingFieldInputs values={fieldValues} onChange={(key, value) => setFieldValues((prev) => ({ ...prev, [key]: value }))} />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-black uppercase tracking-wide text-subtle-fg">Listing basics</h2>
        <p className="mt-1 text-xs text-subtle-fg">Built from the vehicle details above — tweak anything you like.</p>
        <div className="mt-4 space-y-4">
          <label className="block text-sm font-semibold text-body">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={200}
              placeholder="e.g. 2021 Toyota Fortuner, Automatic"
              className="mt-2 w-full rounded-2xl border border-border-strong bg-surface px-4 py-3 text-fg outline-none placeholder:text-subtle-fg focus:border-accent"
            />
            {titleSuggestion && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-accent-soft-fg/30 bg-accent-soft px-3 py-2">
                <span className="text-xs text-muted-fg">
                  Suggested: <span className="font-semibold text-fg">{titleSuggestion}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setTitle(titleSuggestion)}
                  className="rounded-lg bg-accent px-2.5 py-1 text-xs font-bold text-accent-fg transition hover:brightness-110"
                >
                  Apply
                </button>
              </div>
            )}
          </label>
          <label className="block text-sm font-semibold text-body">
            Description <span className="font-normal text-subtle-fg">(optional)</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              maxLength={4000}
              className="mt-2 w-full resize-none rounded-2xl border border-border-strong bg-surface px-4 py-3 text-fg outline-none focus:border-accent"
            />
            {descriptionSuggestion && (
              <div className="mt-2 rounded-xl border border-accent-soft-fg/30 bg-accent-soft px-3 py-2">
                <p className="text-xs text-muted-fg">
                  Suggested: <span className="font-semibold text-fg">{descriptionSuggestion}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setDescription(descriptionSuggestion)}
                  className="mt-2 rounded-lg bg-accent px-2.5 py-1 text-xs font-bold text-accent-fg transition hover:brightness-110"
                >
                  Apply
                </button>
              </div>
            )}
          </label>
          <label className="block text-sm font-semibold text-body">
            Location <span className="font-normal text-subtle-fg">(optional)</span>
            <input
              value={locationText}
              onChange={(event) => setLocationText(event.target.value)}
              maxLength={300}
              placeholder="e.g. Bengaluru, Karnataka"
              className="mt-2 w-full rounded-2xl border border-border-strong bg-surface px-4 py-3 text-fg outline-none placeholder:text-subtle-fg focus:border-accent"
            />
          </label>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-black uppercase tracking-wide text-subtle-fg">Pricing</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-body">
            Currency
            <input
              value={currency}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              required
              maxLength={3}
              minLength={3}
              placeholder="INR"
              className="mt-2 w-full rounded-2xl border border-border-strong bg-surface px-4 py-3 uppercase text-fg outline-none focus:border-accent"
            />
          </label>
          <label className="block text-sm font-semibold text-body">
            Owner expected price <span className="font-normal text-subtle-fg">(optional)</span>
            <input
              type="number"
              value={ownerExpectedPrice}
              onChange={(event) => setOwnerExpectedPrice(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-border-strong bg-surface px-4 py-3 text-fg outline-none focus:border-accent"
            />
          </label>
          <label className="block text-sm font-semibold text-body sm:col-span-2">
            Owner price visibility
            <select
              value={ownerPriceVisibility}
              onChange={(event) => setOwnerPriceVisibility(event.target.value as typeof ownerPriceVisibility)}
              className="mt-2 w-full rounded-2xl border border-border-strong bg-surface px-4 py-3 text-fg outline-none focus:border-accent"
            >
              <option value="NOT_SUPPLIED">Don&rsquo;t show — not supplied</option>
              <option value="VISIBLE">Show to everyone</option>
              <option value="HIDDEN_UNTIL_RESPONSE">Hide until a participant responds</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-body sm:col-span-2">
            Audience results visibility
            <select
              value={resultVisibility}
              onChange={(event) => setResultVisibility(event.target.value as typeof resultVisibility)}
              className="mt-2 w-full rounded-2xl border border-border-strong bg-surface px-4 py-3 text-fg outline-none focus:border-accent"
            >
              <option value="PUBLIC">Show consensus, range &amp; confidence to everyone</option>
              <option value="CREATOR_ONLY">Keep the results private — only I can see them</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={suggestRange}
              disabled={!canSuggest || suggesting}
              className="rounded-2xl border border-accent-soft-fg/30 bg-accent-soft px-4 py-2.5 text-sm font-bold text-accent-soft-fg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {suggesting ? "Asking Gemini…" : "Suggest a range (AI)"}
            </button>
            {!canSuggest && <p className="mt-1 text-xs text-subtle-fg">Fill in make, model, and model year first.</p>}
            {suggestError && <p role="alert" className="mt-2 text-sm font-semibold text-red-600">{suggestError}</p>}
            {suggestion && (
              <div className="mt-3 rounded-2xl border border-accent-soft-fg/30 bg-accent-soft p-4">
                <p className="text-sm font-bold text-fg">
                  Suggested range: {suggestion.low.toLocaleString("en-IN")} – {suggestion.high.toLocaleString("en-IN")} {currency}
                </p>
                <p className="mt-1 text-sm text-muted-fg">{suggestion.rationale}</p>
                <p className="mt-2 text-xs text-subtle-fg">Estimate only — not verified market data.</p>
                <button
                  type="button"
                  onClick={useSuggestion}
                  className="mt-3 rounded-xl bg-accent px-3 py-2 text-xs font-bold text-accent-fg transition hover:brightness-110"
                >
                  Use this range
                </button>
              </div>
            )}
          </div>
          <label className="block text-sm font-semibold text-body">
            Response range minimum
            <input
              type="number"
              value={responseMin}
              onChange={(event) => setResponseMin(event.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-border-strong bg-surface px-4 py-3 text-fg outline-none focus:border-accent"
            />
          </label>
          <label className="block text-sm font-semibold text-body">
            Response range maximum
            <input
              type="number"
              value={responseMax}
              onChange={(event) => setResponseMax(event.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-border-strong bg-surface px-4 py-3 text-fg outline-none focus:border-accent"
            />
          </label>
          <label className="block text-sm font-semibold text-body">
            Response increment
            <input
              type="number"
              value={responseIncrement}
              onChange={(event) => setResponseIncrement(event.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-border-strong bg-surface px-4 py-3 text-fg outline-none focus:border-accent"
            />
          </label>
        </div>
      </div>

      {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
      <button disabled={loading} type="submit" className="w-full rounded-2xl bg-accent px-5 py-3.5 text-sm font-black text-accent-fg transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60">
        {loading ? "Creating…" : "Create draft"}
      </button>
      <p className="text-center text-xs text-subtle-fg">You&rsquo;ll add photos and publish on the next screen.</p>
    </form>
  );
}
