"use client";

import { FormEvent, useState } from "react";

export function HandleForm({ initialHandle }: { initialHandle: string }) {
  const [handle, setHandle] = useState(initialHandle);
  const [savedHandle, setSavedHandle] = useState(initialHandle);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/account/handle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      const result = await response.json() as { ok: boolean; message?: string; handle?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Unable to save your handle.");
      setSavedHandle(result.handle ?? handle);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save your handle.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex-1">
        <div className="flex items-center rounded-2xl border border-border-strong bg-surface pl-4 focus-within:border-accent">
          <span className="text-sm text-subtle-fg">bid.ihue.in/</span>
          <input
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
            placeholder="your-handle"
            className="w-full rounded-2xl bg-transparent py-3.5 pr-4 text-fg outline-none placeholder:text-subtle-fg"
          />
        </div>
        {error && <p role="alert" className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
        {!error && savedHandle && (
          <p className="mt-2 text-sm text-subtle-fg">Currently live at bid.ihue.in/{savedHandle}</p>
        )}
      </div>
      <button
        disabled={loading || handle === savedHandle}
        type="submit"
        className="rounded-2xl bg-accent px-5 py-3.5 text-sm font-black text-accent-fg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Saving…" : "Save handle"}
      </button>
    </form>
  );
}
