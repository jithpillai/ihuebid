"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function ProfileMenu({ displayName }: { displayName: string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex size-9 items-center justify-center rounded-full bg-fg text-sm font-bold text-bg transition hover:opacity-90"
      >
        {getInitials(displayName)}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-56 rounded-2xl border border-border bg-surface p-3 shadow-lg"
        >
          <p className="truncate px-1 text-sm font-semibold text-fg">{displayName}</p>
          <div className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
            <Link href="/dashboard" className="rounded-lg px-1 py-1.5 text-sm font-semibold text-body hover:bg-muted">
              Dashboard
            </Link>
            <Link href="/account/settings" className="rounded-lg px-1 py-1.5 text-sm font-semibold text-body hover:bg-muted">
              Account settings
            </Link>
          </div>
          <div className="mt-2 border-t border-border pt-2">
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  );
}
