"use client";

import { useState } from "react";

export function InterestedConfirmForm({ token, creatorDisplayName }: { token: string; creatorDisplayName: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  async function confirm() {
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/interested`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json() as { ok: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Unable to record your interest.");
      setConfirmed(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to record your interest.");
    } finally {
      setLoading(false);
    }
  }

  if (confirmed) {
    return (
      <p className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-semibold text-blue-700">
        Thanks — we&rsquo;ve let {creatorDisplayName} know you&rsquo;re still interested.
      </p>
    );
  }

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      <button
        type="button"
        disabled={loading}
        onClick={confirm}
        className="w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? "Sending…" : "I'm still interested"}
      </button>
      <p className="text-center text-xs text-zinc-400">This shares your email with {creatorDisplayName} — not with anyone else.</p>
      {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}
