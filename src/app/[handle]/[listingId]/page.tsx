import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { AggregateResultPanel } from "@/components/aggregate-result-panel";
import { NotifyOptInForm } from "@/components/notify-optin-form";
import { PendingLink } from "@/components/pending-link";
import { ValuationForm } from "@/components/valuation-form";
import { StatusPill } from "@/components/ui/pill";
import { getListingByPublicId } from "@/server/listings/listing-service";
import { getListingAggregate, getParticipantValuation } from "@/server/listings/response-service";
import { usedVehicleFieldByKey } from "@/server/listings/templates/used-vehicle";
import { cloudinaryImageUrl } from "@/server/media/cloudinary";
import { getParticipantIdentity } from "@/server/participant/identity-service";
import { getNotificationOptIn } from "@/server/participant/notification-service";

const CLOSURE_OUTCOME_LABEL: Record<string, string> = {
  SOLD: "Sold",
  NOT_SOLD: "Not sold",
  REMOVED: "Removed by the creator",
};

type Props = { params: Promise<{ handle: string; listingId: string }> };

async function loadListing(handle: string, listingId: string) {
  const listing = await getListingByPublicId(listingId);
  if (!listing || listing.creator.profile?.handle !== handle) return null;
  if (listing.status === "DRAFT" || listing.status === "CANCELLED") return null;
  return listing;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle, listingId } = await params;
  const listing = await loadListing(handle, listingId);
  if (!listing) return { title: "Listing not found" };
  const cover = listing.mediaAssets[0];
  const imageUrl = cover ? cloudinaryImageUrl({ publicId: cover.publicId }) : undefined;
  return {
    title: listing.title,
    description: listing.description ?? `What is a fair price for this ${listing.title}?`,
    openGraph: {
      title: listing.title,
      description: listing.description ?? `What is a fair price for this ${listing.title}?`,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function PublicListingPage({ params }: Props) {
  const { handle, listingId } = await params;
  const listing = await loadListing(handle, listingId);
  if (!listing) notFound();

  const currencyFormatter = new Intl.NumberFormat("en-IN", { style: "currency", currency: listing.currency, maximumFractionDigits: 0 });
  const vehicleFields = listing.fieldValues
    .map((value) => ({ field: usedVehicleFieldByKey(value.fieldKey), value: value.fieldValue }))
    .filter((entry): entry is { field: NonNullable<typeof entry.field>; value: string } => Boolean(entry.field));
  const embed = listing.embeds[0];
  const participantIdentity = await getParticipantIdentity();
  const participantIdentityId = participantIdentity?.id ?? null;
  const existingValuation = await getParticipantValuation(listing.id, participantIdentityId);
  const notificationOptIn = await getNotificationOptIn(listing.id, participantIdentityId);
  const aggregate = listing.resultVisibility === "PUBLIC" ? await getListingAggregate(listing.id) : null;
  // HIDDEN_UNTIL_RESPONSE: reveal the owner's expectation only once this
  // visitor has given their own opinion first — never before, so an early
  // look at the ask price can't anchor their answer (requirements §7.1).
  const showOwnerPrice = listing.ownerPriceVisibility === "VISIBLE"
    || (listing.ownerPriceVisibility === "HIDDEN_UNTIL_RESPONSE" && existingValuation !== null);

  const heroImage = listing.mediaAssets[0];
  const restImages = listing.mediaAssets.slice(1);

  return (
    <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <PendingLink href={`/${handle}`} className="text-sm font-semibold text-muted-fg transition hover:text-fg">
        ← {listing.creator.displayName}
      </PendingLink>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-black tracking-tight text-fg sm:text-4xl">{listing.title}</h1>
        <StatusPill status={listing.status} />
      </div>
      {listing.locationText && <p className="mt-1 text-sm font-semibold text-subtle-fg">{listing.locationText}</p>}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        {/* Left column — the listing itself */}
        <div className="min-w-0">
          {heroImage && (
            <div className="overflow-hidden rounded-3xl border border-border bg-muted">
              <div className="relative aspect-[16/10]">
                <Image
                  src={cloudinaryImageUrl({ publicId: heroImage.publicId })}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 720px, 100vw"
                  className="object-cover"
                  priority
                />
              </div>
              {restImages.length > 0 && (
                <div className="grid grid-cols-3 gap-1 p-1 sm:grid-cols-4">
                  {restImages.map((asset) => (
                    <div key={asset.id} className="relative aspect-square overflow-hidden rounded-xl bg-surface">
                      <Image
                        src={cloudinaryImageUrl({ publicId: asset.publicId })}
                        alt=""
                        fill
                        sizes="180px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {embed && (
            <div className="mt-4 aspect-video overflow-hidden rounded-3xl border border-border bg-muted">
              <iframe
                src={embed.url}
                title="Listing video"
                className="size-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {listing.description && (
            <p className="mt-6 whitespace-pre-line text-base leading-7 text-body">{listing.description}</p>
          )}

          {vehicleFields.length > 0 && (
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 rounded-3xl border border-border bg-surface p-6 sm:grid-cols-3">
              {vehicleFields.map(({ field, value }) => (
                <div key={field.key}>
                  <dt className="text-xs font-bold uppercase tracking-wide text-subtle-fg">{field.label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-fg">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          {listing.referenceLinks.length > 0 && (
            <div className="mt-6">
              <h2 className="text-xs font-black uppercase tracking-wide text-subtle-fg">References</h2>
              <ul className="mt-2 flex flex-col gap-1">
                {listing.referenceLinks.map((link) => (
                  <li key={link.id}>
                    <a href={link.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-accent-soft-fg hover:underline">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {listing.disclosureText && (
            <p className="mt-6 rounded-3xl border border-border bg-muted/50 p-4 text-xs leading-6 text-muted-fg">
              {listing.disclosureText}
            </p>
          )}
        </div>

        {/* Right column — the ask */}
        <div className="lg:sticky lg:top-24">
          {listing.status === "CLOSED" ? (
            <div className="rounded-3xl border border-border bg-surface p-6 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-subtle-fg">Closed</p>
              {listing.closureVisibility === "SHOW_OUTCOME" && listing.closureOutcome ? (
                <>
                  <p className="mt-2 text-2xl font-black text-fg">{CLOSURE_OUTCOME_LABEL[listing.closureOutcome]}</p>
                  {listing.closureOutcome === "SOLD" && listing.closureFinalPrice != null && (
                    <p className="tnum mt-1 text-sm text-muted-fg">
                      Final price: <span className="font-semibold text-fg">{currencyFormatter.format(Number(listing.closureFinalPrice))}</span>
                    </p>
                  )}
                  {listing.closureNote && <p className="mt-3 text-sm text-body">{listing.closureNote}</p>}
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-fg">This listing is no longer accepting responses.</p>
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-border bg-surface p-6">
              {showOwnerPrice && listing.ownerExpectedPrice != null && (
                <p className="text-sm text-muted-fg">
                  Owner expects{" "}
                  <span className="tnum font-black text-fg">{currencyFormatter.format(Number(listing.ownerExpectedPrice))}</span>
                </p>
              )}
              {listing.ownerPriceVisibility === "HIDDEN_UNTIL_RESPONSE" && !showOwnerPrice && (
                <p className="text-sm text-subtle-fg">Give your estimate to see what the owner is asking.</p>
              )}
              <p className="tnum mt-1 text-sm text-muted-fg">
                Response range:{" "}
                <span className="font-semibold text-fg">
                  {currencyFormatter.format(Number(listing.responseMin))} – {currencyFormatter.format(Number(listing.responseMax))}
                </span>
              </p>
              <div className="mt-6">
                <ValuationForm
                  listingId={listing.id}
                  status={listing.status}
                  currency={listing.currency}
                  min={Number(listing.responseMin)}
                  max={Number(listing.responseMax)}
                  increment={Number(listing.responseIncrement)}
                  initialValue={existingValuation?.value ?? null}
                  initialName={existingValuation?.contributorName ?? participantIdentity?.displayName ?? null}
                  initialAnonymous={existingValuation != null && existingValuation.contributorName === null}
                />
              </div>
              {listing.status === "LIVE" && existingValuation !== null && (
                <div className="mt-4">
                  <NotifyOptInForm listingId={listing.id} initiallyOptedIn={notificationOptIn?.verifiedAt != null} />
                </div>
              )}
            </div>
          )}

          {aggregate && (
            <div className="mt-4">
              <AggregateResultPanel aggregate={aggregate} currency={listing.currency} showComparison={showOwnerPrice} />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
