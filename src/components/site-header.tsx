import Image from "next/image";
import Link from "next/link";

import { PendingLink } from "@/components/pending-link";
import { ProfileMenu } from "@/components/profile-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonClasses } from "@/components/ui/button";
import { getCurrentSession } from "@/server/auth/session";

export async function SiteHeader() {
  const session = await getCurrentSession();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center" aria-label="ihue Bid home">
          <Image
            src="/brand/logo.png"
            alt="ihue Bid"
            width={2172}
            height={724}
            priority
            className="h-11 w-auto dark:brightness-0 dark:invert"
          />
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {session ? (
            <>
              <PendingLink
                href="/dashboard"
                className="hidden rounded-full px-3 py-2 text-sm font-bold text-muted-fg transition hover:bg-muted hover:text-fg sm:inline-flex"
              >
                Dashboard
              </PendingLink>
              <PendingLink href="/dashboard/listings/new" className={buttonClasses({ size: "sm" })}>
                New listing
              </PendingLink>
              <ProfileMenu displayName={session.user.displayName} />
            </>
          ) : (
            <>
              <Link
                href="/#how-it-works"
                className="hidden rounded-full px-3 py-2 text-sm font-bold text-muted-fg transition hover:bg-muted hover:text-fg sm:inline-flex"
              >
                How it works
              </Link>
              <PendingLink href="/login" className={buttonClasses({ size: "sm" })}>
                Sign in
              </PendingLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
