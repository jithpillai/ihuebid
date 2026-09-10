import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AggregateResultPanel } from "@/components/aggregate-result-panel";
import { CloseListingForm } from "@/components/close-listing-form";
import { ListingEmbedForm } from "@/components/listing-embed-form";
import { ListingGalleryUploader } from "@/components/listing-gallery-uploader";
import { ListingForm } from "@/components/listing-form";
import { ListingReferenceLinks } from "@/components/listing-reference-links";
import { PendingLink } from "@/components/pending-link";
import { PublishListingButton } from "@/components/publish-listing-button";
import { ShareListingPanel } from "@/components/share-listing-panel";
import { StatusPill } from "@/components/ui/pill";
import { AuthError } from "@/server/auth/auth-service";
import { getCurrentSession } from "@/server/auth/session";
import { getListingParticipantContacts } from "@/server/listings/interest-service";
import { getListingForOwner } from "@/server/listings/listing-service";
import { getListingAggregate } from "@/server/listings/response-service";
import { buildListingShareMessage } from "@/server/listings/share-message";
import { cloudinaryImageUrl } from "@/server/media/cloudinary";

export const metadata: Metadata = { title: "Edit listing", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

export default async function EditListingPage({ params }: Props) {
  const { id } = await params;
  const session = await getCurrentSession();
  if (!session) redirect(`/login?returnTo=/dashboard/listings/${id}/edit`);

  let listing: Awaited<ReturnType<typeof getListingForOwner>>;
  try {
    listing = await getListingForOwner(id, session);
  } catch (error) {
    if (error instanceof AuthError) notFound();
    throw error;
  }

  const handle = session.user.profile?.handle;
  const galleryAssets = listing.mediaAssets.map((asset) => ({ id: asset.id, url: cloudinaryImageUrl({ publicId: asset.publicId }) }));
  const canPublish = (listing.status === "DRAFT" || listing.status === "SCHEDULED") && handle;
  const canClose = listing.status === "LIVE" || listing.status === "PAUSED";
  const aggregate = listing.status !== "DRAFT" ? await getListingAggregate(listing.id) : null;
  const contacts = listing.status !== "DRAFT" ? await getListingParticipantContacts(listing.id) : [];
  const dateFormatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const isPublished = listing.status === "LIVE" || listing.status === "PAUSED" || listing.status === "CLOSED";
  const hasResponses = (aggregate?.all.count ?? 0) > 0;
  const listingFormInitial = {
    title: listing.title,
    description: listing.description ?? "",
    locationText: listing.locationText ?? "",
    currency: listing.currency,
    ownerExpectedPrice: listing.ownerExpectedPrice != null ? String(Number(listing.ownerExpectedPrice)) : "",
    ownerPriceVisibility: listing.ownerPriceVisibility,
    resultVisibility: listing.resultVisibility,
    responseMin: String(Number(listing.responseMin)),
    responseMax: String(Number(listing.responseMax)),
    responseIncrement: String(Number(listing.responseIncrement)),
    fieldValues: Object.fromEntries(listing.fieldValues.map((field) => [field.fieldKey, field.fieldValue])),
  };
  const profile = session.user.profile;
  const generatedShareMessage = isPublished && handle
    ? buildListingShareMessage({
        listing: {
          title: listing.title,
          fieldValues: listingFormInitial.fieldValues,
          ownerExpectedPrice: listing.ownerExpectedPrice != null ? Number(listing.ownerExpectedPrice) : null,
          currency: listing.currency,
          locationText: listing.locationText,
          description: listing.description,
        },
        profile: {
          brandName: profile?.brandName ?? null,
          location: profile?.location ?? null,
          contactPhone: profile?.contactPhone ?? null,
        },
        url: `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/${handle}/${listing.publicId}`,
      })
    : null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <PendingLink href="/dashboard" className="text-sm font-semibold text-muted-fg transition hover:text-fg">
        ← Your listings
      </PendingLink>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-black tracking-tight text-fg">{listing.title}</h1>
        <StatusPill status={listing.status} />
      </div>

      {(listing.status === "LIVE" || listing.status === "PAUSED" || listing.status === "CLOSED") && handle && (
        <PendingLink href={`/${handle}/${listing.publicId}`} className="mt-2 inline-block text-sm font-semibold text-accent-soft-fg hover:underline">
          View public listing →
        </PendingLink>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-black uppercase tracking-wide text-subtle-fg">Listing details</h2>
        <p className="mt-1 text-sm text-muted-fg">Fix mistakes in the vehicle facts, title, description, or pricing.</p>
        <div className="mt-4">
          <ListingForm mode="edit" listingId={listing.id} hasResponses={hasResponses} initial={listingFormInitial} />
        </div>
      </div>

      {generatedShareMessage && (
        <div className="mt-8 rounded-3xl border border-border bg-surface p-7 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wide text-subtle-fg">Share this listing</h2>
          <p className="mt-1 text-sm text-muted-fg">
            A ready-to-post WhatsApp message. Edit and save your own version — it&rsquo;s what the public share
            buttons use too.
          </p>
          <div className="mt-4">
            <ShareListingPanel
              // Remount when the effective message identity changes — after a
              // listing-detail edit + router.refresh(), the freshly generated
              // message must replace the panel's stale in-state copy.
              key={listing.shareMessage ?? generatedShareMessage}
              listingId={listing.id}
              generatedMessage={generatedShareMessage}
              savedMessage={listing.shareMessage}
              profileIncomplete={!profile?.brandName || !profile?.contactPhone}
            />
          </div>
        </div>
      )}

      {aggregate && (
        <div className="mt-8">
          <AggregateResultPanel aggregate={aggregate} currency={listing.currency} title="Audience responses (private to you)" />
        </div>
      )}

      {listing.status !== "DRAFT" && (
        <div className="mt-6 rounded-3xl border border-border bg-surface p-7 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wide text-subtle-fg">Interested participants</h2>
          <p className="mt-1 text-sm text-muted-fg">
            Everyone who left a verified email to hear about this listing. They agreed to share it with you so you can reach out.
          </p>
          {contacts.length === 0 ? (
            <p className="mt-4 text-sm text-subtle-fg">No one has left their email yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border">
              {contacts.map((contact) => (
                <li key={contact.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 bg-surface px-4 py-3">
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-sm font-semibold text-accent-soft-fg hover:underline"
                  >
                    {contact.email}
                  </a>
                  <span className="flex items-center gap-2">
                    {contact.stillInterestedAt ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-500/25 dark:text-emerald-300">
                        <span className="size-1.5 rounded-full bg-current" />
                        Still interested
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold uppercase tracking-wide text-subtle-fg">Opted in</span>
                    )}
                    <span className="tnum text-xs text-subtle-fg">{dateFormatter.format(contact.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-8 rounded-3xl border border-border bg-surface p-7 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-wide text-subtle-fg">Photos</h2>
        <p className="mt-1 text-sm text-muted-fg">The first photo is used as the cover.</p>
        <div className="mt-4">
          <ListingGalleryUploader listingId={listing.id} initialAssets={galleryAssets} />
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-surface p-7 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-wide text-subtle-fg">YouTube video</h2>
        <div className="mt-4">
          <ListingEmbedForm listingId={listing.id} initialUrl={listing.embeds[0]?.url ?? null} />
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-surface p-7 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-wide text-subtle-fg">Reference links</h2>
        <div className="mt-4">
          <ListingReferenceLinks listingId={listing.id} initialLinks={listing.referenceLinks} />
        </div>
      </div>

      {canPublish && (
        <div className="mt-8">
          <PublishListingButton listingId={listing.id} publicId={listing.publicId} handle={handle} />
          {listing.mediaAssets.length === 0 && (
            <p className="mt-2 text-center text-xs text-subtle-fg">Add at least one photo before publishing.</p>
          )}
        </div>
      )}

      {canClose && (
        <div className="mt-8 rounded-3xl border border-border bg-surface p-7 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wide text-subtle-fg">Close listing</h2>
          <p className="mt-1 text-sm text-muted-fg">Opted-in participants are emailed the outcome. This can&rsquo;t be undone.</p>
          <div className="mt-4">
            <CloseListingForm listingId={listing.id} />
          </div>
        </div>
      )}

      {listing.status === "CLOSED" && (
        <div className="mt-8 rounded-3xl border border-border bg-surface p-7 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wide text-subtle-fg">Closure summary</h2>
          <p className="mt-2 text-sm text-body">
            {listing.closureOutcome === "SOLD" && "Sold"}
            {listing.closureOutcome === "NOT_SOLD" && "Not sold"}
            {listing.closureOutcome === "REMOVED" && "Removed"}
            {listing.closureFinalPrice != null && ` — ${new Intl.NumberFormat("en-IN", { style: "currency", currency: listing.currency, maximumFractionDigits: 0 }).format(Number(listing.closureFinalPrice))}`}
          </p>
          {listing.closureNote && <p className="mt-1 text-sm text-muted-fg">{listing.closureNote}</p>}
          <p className="mt-4 text-sm text-muted-fg">
            Participants who confirmed interest after the close are marked{" "}
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">Still interested</span> in the list above.
          </p>
        </div>
      )}
    </section>
  );
}
