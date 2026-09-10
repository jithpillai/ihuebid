import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ListingCard } from "@/components/listing-card";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stat, StatRow } from "@/components/ui/stat";
import { listManagedAccounts } from "@/server/account/collaborator-service";
import { getCurrentSession } from "@/server/auth/session";
import { listListingsForCreatorWithStats } from "@/server/listings/listing-service";
import { buildListingShareMessage } from "@/server/listings/share-message";
import { cloudinaryImageUrl } from "@/server/media/cloudinary";

const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const PUBLISHED = new Set(["LIVE", "PAUSED", "CLOSED"]);

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

type ShareProfile = { brandName: string | null; location: string | null; contactPhone: string | null };
type DashListing = Awaited<ReturnType<typeof listListingsForCreatorWithStats>>[number];

function ListingGrid({ listings, handle, profile }: { listings: DashListing[]; handle: string | null; profile: ShareProfile }) {
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing) => {
        const cover = listing.mediaAssets[0];
        const shareable = handle && PUBLISHED.has(listing.status);
        const shareUrl = shareable ? `${appUrl()}/${handle}/${listing.publicId}` : undefined;
        const copyText = shareUrl
          ? (listing.shareMessage ?? buildListingShareMessage({
              listing: {
                title: listing.title,
                fieldValues: Object.fromEntries(listing.fieldValues.map((f) => [f.fieldKey, f.fieldValue])),
                ownerExpectedPrice: listing.ownerExpectedPrice != null ? Number(listing.ownerExpectedPrice) : null,
                currency: listing.currency,
                locationText: listing.locationText,
                description: listing.description,
              },
              profile,
              url: shareUrl,
            }))
          : undefined;
        return (
          <ListingCard
            key={listing.id}
            href={`/dashboard/listings/${listing.id}/edit`}
            title={listing.title}
            coverUrl={cover ? cloudinaryImageUrl({ publicId: cover.publicId }) : null}
            status={listing.status}
            shareUrl={shareUrl}
            shareTitle={listing.title}
            copyText={copyText}
            responseCount={listing.responseCount}
            meta={new Date(listing.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          />
        );
      })}
    </div>
  );
}

async function ManagedAccountSection({
  account,
}: {
  account: Awaited<ReturnType<typeof listManagedAccounts>>[number];
}) {
  const listings = await listListingsForCreatorWithStats(account.id);
  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h2 className="text-sm font-black uppercase tracking-wide text-subtle-fg">
          Managing · {account.brandName || account.displayName}
        </h2>
        {account.handle && (
          <Link href={`/${account.handle}`} className="text-xs font-semibold text-accent-soft-fg hover:underline">
            bid.ihue.in/{account.handle}
          </Link>
        )}
      </div>
      {listings.length === 0 ? (
        <p className="mt-3 text-sm text-subtle-fg">No listings yet.</p>
      ) : (
        <ListingGrid
          listings={listings}
          handle={account.handle}
          profile={{ brandName: account.brandName, location: account.location, contactPhone: account.contactPhone }}
        />
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?returnTo=/dashboard");

  const [ownListings, managed] = await Promise.all([
    listListingsForCreatorWithStats(session.userId),
    listManagedAccounts(session),
  ]);
  const handle = session.user.profile?.handle;
  const ownProfile: ShareProfile = {
    brandName: session.user.profile?.brandName ?? null,
    location: session.user.profile?.location ?? null,
    contactPhone: session.user.profile?.contactPhone ?? null,
  };

  const liveCount = ownListings.filter((listing) => listing.status === "LIVE").length;
  const totalResponses = ownListings.reduce((sum, listing) => sum + listing.responseCount, 0);
  const needsOnboarding = (!handle || ownListings.length === 0) && managed.length === 0;

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-fg">Your listings</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {handle ? (
              <>Public profile: <Link href={`/${handle}`} className="font-semibold text-accent-soft-fg hover:underline">bid.ihue.in/{handle}</Link></>
            ) : (
              "Claim a handle to start publishing."
            )}
          </p>
        </div>
        <Link href="/dashboard/listings/new" className={buttonClasses()}>
          New listing
        </Link>
      </div>

      {!needsOnboarding && ownListings.length > 0 && (
        <StatRow className="mt-8 max-w-md">
          <Stat label="Listings" value={ownListings.length} />
          <Stat label="Live" value={liveCount} />
          <Stat label="Responses" value={totalResponses} />
        </StatRow>
      )}

      {needsOnboarding ? (
        <Card className="mt-8 p-7">
          <h2 className="text-lg font-black text-fg">Get your first listing live</h2>
          <ol className="mt-5 flex flex-col gap-4">
            <li className="flex gap-4">
              <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-black ${handle ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-accent text-accent-fg"}`}>
                {handle ? "✓" : "1"}
              </span>
              <div>
                <p className="font-bold text-fg">Claim your public handle</p>
                <p className="mt-0.5 text-sm text-muted-fg">
                  It appears in every listing URL you share.{" "}
                  {!handle && (
                    <Link href="/account/settings" className="font-semibold text-accent-soft-fg hover:underline">
                      Set it in account settings →
                    </Link>
                  )}
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-black text-muted-fg">2</span>
              <div>
                <p className="font-bold text-fg">Create a listing</p>
                <p className="mt-0.5 text-sm text-muted-fg">Add photos, details, and a price range — saved as a draft first.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-black text-muted-fg">3</span>
              <div>
                <p className="font-bold text-fg">Publish &amp; share the link</p>
                <p className="mt-0.5 text-sm text-muted-fg">Your audience prices it anonymously and a consensus forms.</p>
              </div>
            </li>
          </ol>
          <div className="mt-6">
            <Link
              href={handle ? "/dashboard/listings/new" : "/account/settings"}
              className={buttonClasses()}
            >
              {handle ? "Create your first listing" : "Claim your handle"}
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {ownListings.length > 0 ? (
            <>
              {managed.length > 0 && (
                <h2 className="mt-10 text-sm font-black uppercase tracking-wide text-subtle-fg">Your listings</h2>
              )}
              <ListingGrid listings={ownListings} handle={handle ?? null} profile={ownProfile} />
            </>
          ) : (
            <p className="mt-8 text-sm text-subtle-fg">You don&rsquo;t have any listings of your own yet.</p>
          )}

          {managed.map((account) => (
            <ManagedAccountSection key={account.id} account={account} />
          ))}
        </>
      )}
    </section>
  );
}
