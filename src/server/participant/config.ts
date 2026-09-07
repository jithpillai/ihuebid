// A signed, first-party token/cookie per browser, deliberately independent
// of the authenticated session cookie (requirements §9.1) — a participant
// never needs a User account.
export const PARTICIPANT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function getParticipantCookieName() {
  return process.env.NODE_ENV === "production" ? "__Secure-ihue_bid_participant" : "ihue_bid_participant";
}

export function getParticipantCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PARTICIPANT_MAX_AGE_SECONDS,
  };
}
