import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { ListingCard } from "@/components/listing-card";
import { EmptyState, icons } from "@/components/ui/empty-state";
import { Pill } from "@/components/ui/pill";
import { Stat, StatRow } from "@/components/ui/stat";
import { getPublicProfileByHandle } from "@/server/account/profile-service";
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
          <p className="mt-1 text-sm font-semibold text-subtle-fg">bid.ihue.in/{profile.handle}</p>
        </div>
      </div>

      {profile.bio && <p className="mt-5 max-w-2xl text-base leading-7 text-body">{profile.bio}</p>}
      {profile.location && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-fg">
          <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden="true">
            <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          {profile.location}
        </p>
      )}

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
