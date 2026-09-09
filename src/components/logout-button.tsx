"use client";

import { useState } from "react";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.assign("/");
      }}
      className="text-sm font-semibold text-muted-fg transition hover:text-fg disabled:cursor-wait disabled:opacity-60"
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
