import "server-only";

import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { createSessionToken, hashSessionToken } from "@/server/auth/crypto";
import { getParticipantCookieName } from "@/server/participant/config";

// Read-only lookup — safe to call from a Server Component (e.g. to prefill
// the slider with a participant's existing valuation on page load).
export async function getParticipantIdentityId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getParticipantCookieName())?.value;
  if (!token) return null;
  const identity = await db.participantIdentity.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: { id: true },
  });
  return identity?.id ?? null;
}

// Route-handler only: resolves the caller's existing participant identity,
// or creates one. `newToken` is non-null only when a fresh identity was
// created — the caller (a route handler) must then set it as a cookie.
export async function resolveOrCreateParticipantIdentity(): Promise<{ id: string; newToken: string | null }> {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(getParticipantCookieName())?.value;
  if (existingToken) {
    const identity = await db.participantIdentity.findUnique({
      where: { tokenHash: hashSessionToken(existingToken) },
      select: { id: true },
    });
    if (identity) return { id: identity.id, newToken: null };
  }

  const token = createSessionToken();
  const identity = await db.participantIdentity.create({ data: { tokenHash: hashSessionToken(token) } });
  return { id: identity.id, newToken: token };
}
