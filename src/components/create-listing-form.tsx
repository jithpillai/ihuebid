"use client";

import { FormEvent, useState } from "react";

import { ListingFieldInputs } from "@/components/listing-field-inputs";
import { PendingOverlay } from "@/components/pending-feedback";

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
    <form onSubmit={submit} className="relative mt-8 space-y-6 rounded-3xl border border-zinc-200 bg-white p-7 shadow-xl shadow-zinc-200/60">
      <PendingOverlay show={loading} label="Creating…" />

      <div>
        <h2 className="text-sm font-black uppercase tracking-wide text-zinc-400">Listing basics</h2>
        <div className="mt-4 space-y-4">
          <label className="block text-sm font-semibold text-zinc-700">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={200}
              placeholder="e.g. 2021 Toyota Fortuner, Automatic"
              className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-500"
            />
          </label>
          <label className="block text-sm font-semibold text-zinc-700">
            Description <span className="font-normal text-zinc-400">(optional)</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              maxLength={4000}
              className="mt-2 w-full resize-none rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-blue-500"
            />
          </label>
          <label className="block text-sm font-semibold text-zinc-700">
            Location <span className="font-normal text-zinc-400">(optional)</span>
            <input
              value={locationText}
              onChange={(event) => setLocationText(event.target.value)}
              maxLength={300}
              placeholder="e.g. Bengaluru, Karnataka"
              className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-500"
            />
          </label>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-black uppercase tracking-wide text-zinc-400">Vehicle details</h2>
        <div className="mt-4">
          <ListingFieldInputs values={fieldValues} onChange={(key, value) => setFieldValues((prev) => ({ ...prev, [key]: value }))} />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-black uppercase tracking-wide text-zinc-400">Pricing</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-zinc-700">
            Currency
            <input
              value={currency}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              required
              maxLength={3}
              minLength={3}
              placeholder="INR"
              className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 uppercase text-zinc-900 outline-none focus:border-blue-500"
            />
          </label>
          <label className="block text-sm font-semibold text-zinc-700">
            Owner expected price <span className="font-normal text-zinc-400">(optional)</span>
            <input
              type="number"
              value={ownerExpectedPrice}
              onChange={(event) => setOwnerExpectedPrice(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-blue-500"
            />
          </label>
          <label className="block text-sm font-semibold text-zinc-700 sm:col-span-2">
            Owner price visibility
            <select
              value={ownerPriceVisibility}
              onChange={(event) => setOwnerPriceVisibility(event.target.value as typeof ownerPriceVisibility)}
              className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-blue-500"
            >
              <option value="NOT_SUPPLIED">Don&rsquo;t show — not supplied</option>
              <option value="VISIBLE">Show to everyone</option>
              <option value="HIDDEN_UNTIL_RESPONSE">Hide until a participant responds</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-zinc-700 sm:col-span-2">
            Audience results visibility
            <select
              value={resultVisibility}
              onChange={(event) => setResultVisibility(event.target.value as typeof resultVisibility)}
              className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-blue-500"
            >
              <option value="PUBLIC">Show consensus, range &amp; confidence to everyone</option>
              <option value="CREATOR_ONLY">Keep the results private — only I can see them</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-zinc-700">
            Response range minimum
            <input
              type="number"
              value={responseMin}
              onChange={(event) => setResponseMin(event.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-blue-500"
            />
          </label>
          <label className="block text-sm font-semibold text-zinc-700">
            Response range maximum
            <input
              type="number"
              value={responseMax}
              onChange={(event) => setResponseMax(event.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-blue-500"
            />
          </label>
          <label className="block text-sm font-semibold text-zinc-700">
            Response increment
            <input
              type="number"
              value={responseIncrement}
              onChange={(event) => setResponseIncrement(event.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-blue-500"
            />
          </label>
        </div>
      </div>

      {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
      <button disabled={loading} type="submit" className="w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60">
        {loading ? "Creating…" : "Create draft"}
      </button>
      <p className="text-center text-xs text-zinc-400">You&rsquo;ll add photos and publish on the next screen.</p>
    </form>
  );
}
