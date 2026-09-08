import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublicProfileByHandle } from "@/server/account/profile-service";
import { listPublicListingsForHandle } from "@/server/listings/listing-service";
import { cloudinaryImageUrl } from "@/server/media/cloudinary";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getPublicProfileByHandle(handle);
  if (!profile) return { title: "Creator not found" };
  return {
    title: profile.user.displayName,
    description: profile.bio ?? undefined,
  };
}

export default async function CreatorProfilePage({ params }: Props) {
  const { handle } = await params;
  const profile = await getPublicProfileByHandle(handle);
  if (!profile) notFound();

  const listings = await listPublicListingsForHandle(profile.userId);
  const avatarUrl = profile.avatarPublicId
    ? cloudinaryImageUrl({ publicId: profile.avatarPublicId, deliveryType: "authenticated" })
    : null;

  return (
    <section className="mx-auto max-w-3xl px-5 py-16 lg:px-8">
      <div className="flex items-center gap-5">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
          {avatarUrl && <Image src={avatarUrl} alt="" fill sizes="80px" className="object-cover" />}
        </div>
        <div>
          <h1 className="text-2xl font-black text-zinc-900">
            {profile.user.displayName}
            {profile.verificationStatus === "MANUAL_VERIFIED" && (
              <span className="ml-2 rounded-full bg-blue-50 px-2.5 py-1 align-middle text-xs font-bold text-blue-600">Verified</span>
            )}
          </h1>
          <p className="text-sm font-semibold text-zinc-400">bid.ihue.in/{profile.handle}</p>
        </div>
      </div>

      {profile.bio && <p className="mt-6 max-w-xl text-base leading-7 text-zinc-600">{profile.bio}</p>}
      {profile.location && <p className="mt-2 text-sm text-zinc-400">{profile.location}</p>}

      <h2 className="mt-12 text-lg font-black text-zinc-900">Listings</h2>
      {listings.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-400">No published listings yet.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {listings.map((listing) => {
            const cover = listing.mediaAssets[0];
            return (
              <li key={listing.id}>
                <Link
                  href={`/${profile.handle}/${listing.publicId}`}
                  className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-3 transition hover:border-zinc-300 hover:shadow-sm"
                >
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                    {cover && (
                      <Image src={cloudinaryImageUrl({ publicId: cover.publicId })} alt="" fill sizes="64px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-zinc-900">{listing.title}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">{listing.status}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
