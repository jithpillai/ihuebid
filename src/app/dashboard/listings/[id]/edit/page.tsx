import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AggregateResult } from "@/components/aggregate-result";
import { ListingEmbedForm } from "@/components/listing-embed-form";
import { ListingGalleryUploader } from "@/components/listing-gallery-uploader";
import { ListingReferenceLinks } from "@/components/listing-reference-links";
import { PublishListingButton } from "@/components/publish-listing-button";
import { AuthError } from "@/server/auth/auth-service";
import { getCurrentSession } from "@/server/auth/session";
import { getListingForOwner } from "@/server/listings/listing-service";
import { getListingAggregate } from "@/server/listings/response-service";
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
  const aggregate = listing.status !== "DRAFT" ? await getListingAggregate(listing.id) : null;

  return (
    <section className="mx-auto max-w-2xl px-5 py-16 lg:px-8">
      <Link href="/dashboard" className="text-sm font-semibold text-zinc-400 hover:text-zinc-600">
        ← Your listings
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight text-zinc-900">{listing.title}</h1>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-zinc-500">{listing.status}</span>
      </div>

      {(listing.status === "LIVE" || listing.status === "PAUSED" || listing.status === "CLOSED") && handle && (
        <Link href={`/${handle}/${listing.publicId}`} className="mt-2 inline-block text-sm font-semibold text-blue-600 hover:underline">
          View public listing →
        </Link>
      )}

      {aggregate && (
        <div className="mt-8">
          <AggregateResult data={aggregate} currency={listing.currency} title="Audience responses (private to you)" />
        </div>
      )}

      <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-wide text-zinc-400">Photos</h2>
        <p className="mt-1 text-sm text-zinc-500">The first photo is used as the cover.</p>
        <div className="mt-4">
          <ListingGalleryUploader listingId={listing.id} initialAssets={galleryAssets} />
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-wide text-zinc-400">YouTube video</h2>
        <div className="mt-4">
          <ListingEmbedForm listingId={listing.id} initialUrl={listing.embeds[0]?.url ?? null} />
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-wide text-zinc-400">Reference links</h2>
        <div className="mt-4">
          <ListingReferenceLinks listingId={listing.id} initialLinks={listing.referenceLinks} />
        </div>
      </div>

      {canPublish && (
        <div className="mt-8">
          <PublishListingButton listingId={listing.id} publicId={listing.publicId} handle={handle} />
          {listing.mediaAssets.length === 0 && (
            <p className="mt-2 text-center text-xs text-zinc-400">Add at least one photo before publishing.</p>
          )}
        </div>
      )}
    </section>
  );
}
