"use client";

import { FormEvent, useState } from "react";

import type { ProfileLinks } from "@/server/account/profile-service";

const inputClass =
  "mt-1.5 w-full rounded-2xl border border-border-strong bg-surface px-4 py-3 text-fg outline-none placeholder:text-subtle-fg focus:border-accent";

const LINK_FIELDS: { key: keyof ProfileLinks; label: string; placeholder: string }[] = [
  { key: "website", label: "Website", placeholder: "https://gettecar.in" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/…" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/…" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@…" },
];

export function ProfileDetailsForm({
  initialBio,
  initialLocation,
  initialBrandName,
  initialContactPhone,
  initialLinks,
}: {
  initialBio: string;
  initialLocation: string;
  initialBrandName: string;
  initialContactPhone: string;
  initialLinks: ProfileLinks;
}) {
  const [bio, setBio] = useState(initialBio);
  const [location, setLocation] = useState(initialLocation);
  const [brandName, setBrandName] = useState(initialBrandName);
  const [contactPhone, setContactPhone] = useState(initialContactPhone);
  const [links, setLinks] = useState<ProfileLinks>(initialLinks);
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setStatus("idle");
    setLoading(true);
    try {
      const response = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bio, location, brandName, contactPhone, links }),
      });
      const result = await response.json() as {
        ok: boolean;
        message?: string;
        profile?: { bio: string | null; location: string | null; brandName: string | null; contactPhone: string | null; links: ProfileLinks | null };
      };
      if (!response.ok || !result.ok || !result.profile) throw new Error(result.message ?? "Unable to save your profile.");
      setBio(result.profile.bio ?? "");
      setLocation(result.profile.location ?? "");
      setBrandName(result.profile.brandName ?? "");
      setContactPhone(result.profile.contactPhone ?? "");
      setLinks(result.profile.links ?? {});
      setStatus("saved");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save your profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm font-semibold text-body">
        Brand / dealership name <span className="font-normal text-subtle-fg">(optional)</span>
        <input value={brandName} onChange={(e) => setBrandName(e.target.value)} maxLength={120} placeholder="e.g. Gettecar" className={inputClass} />
      </label>

      <label className="block text-sm font-semibold text-body">
        City <span className="font-normal text-subtle-fg">(optional)</span>
        <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} placeholder="e.g. Bengaluru" className={inputClass} />
      </label>

      <label className="block text-sm font-semibold text-body">
        Contact number (WhatsApp) <span className="font-normal text-subtle-fg">(optional)</span>
        <input
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          inputMode="tel"
          maxLength={24}
          placeholder="e.g. 8590001090"
          className={inputClass}
        />
        <span className="mt-1 block text-xs text-subtle-fg">Shown on your public profile and used for the WhatsApp button.</span>
      </label>

      <label className="block text-sm font-semibold text-body">
        Short bio <span className="font-normal text-subtle-fg">(optional)</span>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500} className={`${inputClass} resize-none`} />
      </label>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-semibold text-body">Links <span className="font-normal text-subtle-fg">(optional)</span></legend>
        {LINK_FIELDS.map((field) => (
          <label key={field.key} className="block text-xs font-semibold text-subtle-fg">
            {field.label}
            <input
              value={links[field.key] ?? ""}
              onChange={(e) => setLinks((prev) => ({ ...prev, [field.key]: e.target.value }))}
              maxLength={300}
              placeholder={field.placeholder}
              className={inputClass}
            />
          </label>
        ))}
      </fieldset>

      {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
      {status === "saved" && !error && <p className="text-sm font-semibold text-accent-soft-fg">Saved.</p>}

      <button
        disabled={loading}
        type="submit"
        className="rounded-2xl bg-accent px-5 py-3 text-sm font-black text-accent-fg transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? "Saving…" : "Save profile details"}
      </button>
    </form>
  );
}
