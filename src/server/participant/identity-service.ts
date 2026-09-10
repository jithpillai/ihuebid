import "server-only";

import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { createSessionToken, hashSessionToken } from "@/server/auth/crypto";
import { getParticipantCookieName } from "@/server/participant/config";

export type ParticipantIdentity = { id: string; displayName: string | null };

// Read-only lookup — safe to call from a Server Component (e.g. to prefill the
// slider and the remembered name on page load).
export async function getParticipantIdentity(): Promise<ParticipantIdentity | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getParticipantCookieName())?.value;
  if (!token) return null;
  const identity = await db.participantIdentity.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: { id: true, displayName: true },
  });
  return identity ?? null;
}

// Route-handler only: resolves the caller's existing participant identity, or
// creates one. `newToken` is non-null only when a fresh identity was created —
// the caller (a route handler) must then set it as a cookie.
export async function resolveOrCreateParticipantIdentity(): Promise<{
  id: string;
  displayName: string | null;
  newToken: string | null;
}> {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(getParticipantCookieName())?.value;
  if (existingToken) {
    const identity = await db.participantIdentity.findUnique({
      where: { tokenHash: hashSessionToken(existingToken) },
      select: { id: true, displayName: true },
    });
    if (identity) return { id: identity.id, displayName: identity.displayName, newToken: null };
  }

  const token = createSessionToken();
  const identity = await db.participantIdentity.create({
    data: { tokenHash: hashSessionToken(token) },
    select: { id: true, displayName: true },
  });
  return { id: identity.id, displayName: identity.displayName, newToken: token };
}
