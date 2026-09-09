import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ListingCard } from "@/components/listing-card";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stat, StatRow } from "@/components/ui/stat";
import { getCurrentSession } from "@/server/auth/session";
import { listListingsForCreatorWithStats } from "@/server/listings/listing-service";
import { cloudinaryImageUrl } from "@/server/media/cloudinary";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?returnTo=/dashboard");

  const listings = await listListingsForCreatorWithStats(session.userId);
  const handle = session.user.profile?.handle;

  const liveCount = listings.filter((listing) => listing.status === "LIVE").length;
  const totalResponses = listings.reduce((sum, listing) => sum + listing.responseCount, 0);
  const needsOnboarding = !handle || listings.length === 0;

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

      {!needsOnboarding && (
        <StatRow className="mt-8 max-w-md">
          <Stat label="Listings" value={listings.length} />
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
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => {
            const cover = listing.mediaAssets[0];
            return (
              <ListingCard
                key={listing.id}
                href={`/dashboard/listings/${listing.id}/edit`}
                title={listing.title}
                coverUrl={cover ? cloudinaryImageUrl({ publicId: cover.publicId }) : null}
                status={listing.status}
                responseCount={listing.responseCount}
                meta={new Date(listing.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
