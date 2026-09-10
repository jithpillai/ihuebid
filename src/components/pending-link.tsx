"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { createPortal } from "react-dom";
import { type ComponentProps } from "react";

// A fixed top progress bar, rendered while a <Link> navigation is pending.
// Must be a descendant of the <Link> — useLinkStatus only reports pending
// state from inside one. `pending` is only ever true after hydration, so
// `document` is safe to reach here.
function NavProgress() {
  const { pending } = useLinkStatus();
  if (!pending || typeof document === "undefined") return null;
  return createPortal(<div className="nav-progress" aria-hidden="true" />, document.body);
}

// Overlay for a card-shaped <Link>: dims the card and shows a spinner while
// its navigation is pending. Render as a direct child of the <Link>.
export function CardNavOverlay() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <div className="absolute inset-0 z-10 grid place-items-center rounded-3xl bg-bg/60 backdrop-blur-[1px]" aria-hidden="true">
      <span className="size-6 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
    </div>
  );
}

// Drop-in replacement for next/link's <Link> that shows a top progress bar
// while the transition is in flight. Use for plain page navigations that
// otherwise give no click feedback (header, back links).
export function PendingLink(props: ComponentProps<typeof Link>) {
  const { children, ...rest } = props;
  return (
    <Link {...rest}>
      {children}
      <NavProgress />
    </Link>
  );
}
