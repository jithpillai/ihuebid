import Image from "next/image";
import Link from "next/link";

import { getCurrentSession } from "@/server/auth/session";

export async function SiteFooter() {
  const session = await getCurrentSession();
  const handle = session?.user.profile?.handle;

  return (
    <footer className="border-t border-border bg-surface/50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="sm:col-span-2 lg:col-span-2">
          <Image
            src="/brand/logo.png"
            alt="ihue Bid"
            width={2172}
            height={724}
            className="h-9 w-auto dark:brightness-0 dark:invert"
          />
          <p className="mt-3 max-w-sm text-sm text-muted-fg">
            Publish a listing, let your audience price it anonymously, and get a
            defensible fair-value range — consensus, likely band, and confidence.
          </p>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-subtle-fg">Product</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm font-semibold text-muted-fg">
            <li><Link href="/#how-it-works" className="hover:text-fg">How it works</Link></li>
            <li><Link href="/#live" className="hover:text-fg">Live listings</Link></li>
            {session ? (
              <li><Link href="/dashboard" className="hover:text-fg">Dashboard</Link></li>
            ) : (
              <li><Link href="/login" className="hover:text-fg">Sign in</Link></li>
            )}
          </ul>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-subtle-fg">Account</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm font-semibold text-muted-fg">
            {session ? (
              <>
                <li><Link href="/account/settings" className="hover:text-fg">Settings</Link></li>
                {handle && <li><Link href={`/${handle}`} className="hover:text-fg">Your public profile</Link></li>}
                <li><Link href="/dashboard/listings/new" className="hover:text-fg">Create a listing</Link></li>
              </>
            ) : (
              <li><Link href="/login" className="hover:text-fg">Get started</Link></li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-5 text-xs text-subtle-fg sm:px-6 lg:px-8">
          © {new Date().getFullYear()} ihue · bid.ihue.in
        </div>
      </div>
    </footer>
  );
}
