import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ValuationForm } from "@/components/valuation-form";
import { getListingByPublicId } from "@/server/listings/listing-service";
import { getAnonymousValuation } from "@/server/listings/response-service";
import { usedVehicleFieldByKey } from "@/server/listings/templates/used-vehicle";
import { cloudinaryImageUrl } from "@/server/media/cloudinary";
import { getParticipantIdentityId } from "@/server/participant/identity-service";

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
  const participantIdentityId = await getParticipantIdentityId();
  const existingValuation = await getAnonymousValuation(listing.id, participantIdentityId);

  return (
    <article className="mx-auto max-w-3xl px-5 py-12 lg:px-8">
      <Link href={`/${handle}`} className="text-sm font-semibold text-zinc-400 hover:text-zinc-600">
        {listing.creator.displayName}
      </Link>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900">{listing.title}</h1>
      <p className="mt-1 text-xs font-bold uppercase tracking-[.14em] text-zinc-400">
        {listing.status}{listing.locationText ? ` · ${listing.locationText}` : ""}
      </p>

      {listing.mediaAssets.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {listing.mediaAssets.map((asset, index) => (
            <div key={asset.id} className={`relative aspect-square overflow-hidden rounded-2xl bg-zinc-100 ${index === 0 ? "col-span-2 row-span-2 aspect-video sm:col-span-2" : ""}`}>
              <Image
                src={cloudinaryImageUrl({ publicId: asset.publicId })}
                alt=""
                fill
                sizes="(min-width: 768px) 640px, 100vw"
                className="object-cover"
                priority={index === 0}
              />
            </div>
          ))}
        </div>
      )}

      {embed && (
        <div className="mt-6 aspect-video overflow-hidden rounded-2xl bg-zinc-100">
          <iframe
            src={embed.url}
            title="Listing video"
            className="size-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {listing.description && <p className="mt-8 text-base leading-7 text-zinc-600">{listing.description}</p>}

      {vehicleFields.length > 0 && (
        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 rounded-2xl border border-zinc-200 bg-white p-6 sm:grid-cols-3">
          {vehicleFields.map(({ field, value }) => (
            <div key={field.key}>
              <dt className="text-xs font-bold uppercase tracking-wide text-zinc-400">{field.label}</dt>
              <dd className="mt-1 text-sm font-semibold text-zinc-900">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {listing.referenceLinks.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-black uppercase tracking-wide text-zinc-400">References</h2>
          <ul className="mt-2 flex flex-col gap-1">
            {listing.referenceLinks.map((link) => (
              <li key={link.id}>
                <a href={link.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-600 hover:underline">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {listing.disclosureText && (
        <p className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs leading-6 text-zinc-500">{listing.disclosureText}</p>
      )}

      <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-6">
        {listing.ownerPriceVisibility === "VISIBLE" && listing.ownerExpectedPrice != null && (
          <p className="text-sm text-zinc-500">
            Owner expects <span className="font-black text-zinc-900">{currencyFormatter.format(Number(listing.ownerExpectedPrice))}</span>
          </p>
        )}
        <p className="mt-1 text-sm text-zinc-500">
          Response range: <span className="font-semibold text-zinc-900">
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
            initialValue={existingValuation}
          />
        </div>
      </div>
    </article>
  );
}
