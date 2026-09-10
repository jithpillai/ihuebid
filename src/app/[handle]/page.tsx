import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { ListingCard } from "@/components/listing-card";
import { EmptyState, icons } from "@/components/ui/empty-state";
import { Pill } from "@/components/ui/pill";
import { Stat, StatRow } from "@/components/ui/stat";
import { getPublicProfileByHandle, normalizeProfileLinks, toWhatsAppDigits } from "@/server/account/profile-service";
import { listPublicListingsForHandleWithStats } from "@/server/listings/listing-service";
import { cloudinaryImageUrl } from "@/server/media/cloudinary";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getPublicProfileByHandle(handle);
  if (!profile) return { title: "Creator not found" };
  return {
    title: profile.user.displayName,
    description: profile.bio ?? `Listings and market signals from ${profile.user.displayName}.`,
  };
}

export default async function CreatorProfilePage({ params }: Props) {
  const { handle } = await params;
  const profile = await getPublicProfileByHandle(handle);
  if (!profile) notFound();

  const listings = await listPublicListingsForHandleWithStats(profile.userId);
  const avatarUrl = profile.avatarPublicId
    ? cloudinaryImageUrl({ publicId: profile.avatarPublicId, deliveryType: "authenticated" })
    : null;

  const liveCount = listings.filter((listing) => listing.status === "LIVE").length;
  const closedCount = listings.filter((listing) => listing.status === "CLOSED").length;
  const totalResponses = listings.reduce((sum, listing) => sum + listing.responseCount, 0);

  const links = normalizeProfileLinks(profile.links);
  const socialLinks = [
    { key: "website", label: "Website", url: links.website },
    { key: "instagram", label: "Instagram", url: links.instagram },
    { key: "facebook", label: "Facebook", url: links.facebook },
    { key: "youtube", label: "YouTube", url: links.youtube },
  ].filter((link): link is { key: string; label: string; url: string } => Boolean(link.url));
  const whatsAppHref = profile.contactPhone ? `https://wa.me/${toWhatsAppDigits(profile.contactPhone)}` : null;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      {/* Banner */}
      <div className="relative -mx-4 h-40 overflow-hidden border-b border-border sm:-mx-6 sm:h-48 lg:-mx-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 [background:radial-gradient(60%_120%_at_20%_0%,color-mix(in_oklab,var(--accent)_28%,transparent),transparent),linear-gradient(120deg,color-mix(in_oklab,var(--accent)_12%,transparent),transparent)]"
        />
      </div>

      <div className="relative -mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-3xl border-4 border-bg bg-muted sm:size-28">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" fill sizes="112px" className="object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-2xl font-black text-subtle-fg">
              {profile.user.displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="pb-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black text-fg sm:text-3xl">{profile.user.displayName}</h1>
            {profile.verificationStatus === "MANUAL_VERIFIED" && <Pill tone="accent">Verified</Pill>}
          </div>
          {profile.brandName && <p className="mt-1 text-sm font-bold text-muted-fg">{profile.brandName}</p>}
          <p className="mt-1 text-sm font-semibold text-subtle-fg">bid.ihue.in/{profile.handle}</p>
        </div>
      </div>

      {profile.bio && <p className="mt-5 max-w-2xl text-base leading-7 text-body">{profile.bio}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-fg">
        {profile.location && (
          <span className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden="true">
              <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            {profile.location}
          </span>
        )}
        {whatsAppHref && (
          <a
            href={whatsAppHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-3 py-1 font-semibold text-body transition hover:border-accent hover:text-fg"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.004c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm5.8 14.06c-.24.68-1.42 1.32-1.95 1.36-.5.04-.5.4-3.15-.66-2.66-1.05-4.34-3.76-4.47-3.94-.13-.18-1.07-1.42-1.07-2.71 0-1.29.68-1.92.92-2.19.24-.26.52-.33.7-.33.17 0 .35 0 .5.01.16.01.38-.06.59.45.24.59.81 2.03.88 2.18.07.15.12.32.02.5-.09.18-.14.29-.28.45-.14.16-.29.36-.42.48-.14.13-.28.28-.12.55.16.26.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.21 1.36.27.13.43.11.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.22.59-.13.24.09 1.51.71 1.77.84.26.13.43.2.5.31.06.11.06.64-.18 1.32Z" />
            </svg>
            WhatsApp
          </a>
        )}
        {socialLinks.map((link) => (
          <a
            key={link.key}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-accent-soft-fg hover:underline"
          >
            {link.label}
          </a>
        ))}
      </div>

      {listings.length > 0 && (
        <StatRow className="mt-6 max-w-md">
          <Stat label="Live" value={liveCount} />
          <Stat label="Closed" value={closedCount} />
          <Stat label="Responses" value={totalResponses} />
        </StatRow>
      )}

      <h2 className="mt-12 text-lg font-black text-fg">Listings</h2>
      {listings.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={icons.tag}
          title="No published listings yet"
          body={`When ${profile.user.displayName} publishes a listing, it will show up here.`}
        />
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => {
            const cover = listing.mediaAssets[0];
            return (
              <ListingCard
                key={listing.id}
                href={`/${profile.handle}/${listing.publicId}`}
                title={listing.title}
                coverUrl={cover ? cloudinaryImageUrl({ publicId: cover.publicId }) : null}
                status={listing.status}
                responseCount={listing.responseCount}
                meta={listing.locationText ?? undefined}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
