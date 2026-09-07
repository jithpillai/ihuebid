"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { PendingOverlay } from "@/components/pending-feedback";

const googleErrors: Record<string, string> = {
  google_cancelled: "Google sign-in was cancelled.",
  google_invalid_flow: "The Google sign-in attempt expired or was invalid. Please try again.",
  google_unavailable: "Google sign-in is temporarily unavailable. Continue with email instead.",
  google_failed: "Google could not complete sign-in. Continue with email or try again.",
};

export function EmailLogin({ returnTo = "/", googleError }: { returnTo?: string; googleError?: string }) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [error, setError] = useState("");
  const [developmentCode, setDevelopmentCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Please wait…");

  async function requestOtp(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoadingLabel("Sending secure code…");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/email/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json() as { ok: boolean; message?: string; email?: string; developmentCode?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Unable to send a code.");
      setEmail(result.email ?? email);
      setDevelopmentCode(result.developmentCode ?? "");
      setStep("otp");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send a code.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoadingLabel("Verifying email…");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      });
      const result = await response.json() as { ok: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Unable to verify the code.");
      window.location.assign(returnTo);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Unable to verify the code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={step === "email" ? requestOtp : verifyOtp} className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-7 shadow-xl shadow-zinc-200/60">
      <PendingOverlay show={loading} label={loadingLabel} />
      {step === "email" && (
        <>
          <Link
            onClick={() => { setLoadingLabel("Opening Google sign-in…"); setLoading(true); }}
            href={`/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-zinc-300 bg-white px-5 py-3.5 text-sm font-black text-zinc-900 transition hover:bg-zinc-50"
          >
            <span aria-hidden="true" className="text-base font-black">G</span>
            Continue with Google
          </Link>
          {googleError && googleErrors[googleError] && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{googleErrors[googleError]}</p>}
          <div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-zinc-200" /><span className="text-xs font-bold uppercase tracking-[.14em] text-zinc-400">or</span><span className="h-px flex-1 bg-zinc-200" /></div>
        </>
      )}
      <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Secure email sign in</p>
      <h2 className="mt-3 text-2xl font-black text-zinc-900">{step === "email" ? "Continue with email" : "Check your inbox"}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        {step === "email" ? "We'll use this for your ihue Bid account." : `Enter the six-digit code sent to ${email}.`}
      </p>
      {step === "email" ? (
        <label className="mt-6 block text-sm font-semibold text-zinc-700">
          Email address
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3.5 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500"
          />
        </label>
      ) : (
        <label className="mt-6 block text-sm font-semibold text-zinc-700">
          Verification code
          <input
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
            placeholder="6-digit code"
            className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3.5 text-center text-xl font-black tracking-[.35em] text-zinc-900 outline-none transition placeholder:text-zinc-300 focus:border-blue-500"
          />
        </label>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      {developmentCode && step === "otp" && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-700">
          Development code: <strong className="tracking-[.2em]">{developmentCode}</strong>
        </p>
      )}
      <button disabled={loading} type="submit" className="mt-6 w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60">
        {loading ? "Please wait…" : step === "email" ? "Send email code" : "Verify email"}
      </button>
      {step === "otp" && (
        <button type="button" onClick={() => setStep("email")} className="mt-4 w-full text-sm font-semibold text-zinc-500 hover:text-zinc-900">Use a different email</button>
      )}
      <p className="mt-5 text-center text-xs text-zinc-400">The code is shown on-screen only when the local mock provider is enabled.</p>
    </form>
  );
}
