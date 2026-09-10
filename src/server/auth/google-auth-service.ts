import { db } from "@/lib/db";
import { getGoogleOAuthConfig, SESSION_MAX_AGE_SECONDS } from "./config";
import { createSessionToken, hashSessionToken, normalizeEmail } from "./crypto";
import { codeChallenge, type GoogleOAuthFlow } from "./google-flow";
import { GoogleOAuthError, validateGoogleIdToken } from "./google-token";

export function googleAuthorizationUrl(flow: GoogleOAuthFlow) {
  const config = getGoogleOAuthConfig();
  const parameters = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: codeChallenge(flow.codeVerifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${parameters}`;
}

async function exchangeAuthorizationCode(code: string, codeVerifier: string) {
  const config = getGoogleOAuthConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
    }),
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({})) as { id_token?: string };
  if (!response.ok || !result.id_token) throw new GoogleOAuthError("Google authorization-code exchange failed.");
  return result.id_token;
}

export async function completeGoogleSignIn(code: string, flow: GoogleOAuthFlow) {
  const config = getGoogleOAuthConfig();
  const idToken = await exchangeAuthorizationCode(code, flow.codeVerifier);
  const claims = await validateGoogleIdToken(idToken, { clientId: config.clientId, nonce: flow.nonce });
  const email = normalizeEmail(claims.email);
  const now = new Date();
  const token = createSessionToken();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);

  const user = await db.$transaction(async (tx) => {
    const linkedIdentity = await tx.externalIdentity.findUnique({
      where: { provider_providerSubject: { provider: "GOOGLE", providerSubject: claims.sub } },
      include: { user: true },
    });
    let user = linkedIdentity?.user;

    if (linkedIdentity) {
      await tx.externalIdentity.update({ where: { id: linkedIdentity.id }, data: { emailAtLink: email } });
    } else {
      const existingUser = await tx.user.findUnique({ where: { email } });
      user = existingUser ?? undefined;
      if (existingUser && !existingUser.emailVerifiedAt) {
        await tx.user.update({ where: { id: existingUser.id }, data: { emailVerifiedAt: now } });
      }
      if (!user) {
        user = await tx.user.create({
          data: {
            email,
            emailVerifiedAt: now,
            displayName: claims.name?.trim().slice(0, 120) || email.split("@")[0].slice(0, 120) || "Creator",
          },
        });
      }
      await tx.externalIdentity.create({
        data: { userId: user.id, provider: "GOOGLE", providerSubject: claims.sub, emailAtLink: email },
      });
    }

    if (!user) throw new GoogleOAuthError("ihue Bid could not resolve the Google account.");
    if (user.status !== "ACTIVE") throw new GoogleOAuthError("This ihue Bid account is unavailable.");
    await tx.session.create({ data: { userId: user.id, tokenHash: hashSessionToken(token), expiresAt } });
    return user;
  });

  await claimCollaboratorInvites(user.id, email, now);

  return { user, token, expiresAt };
}

// Link any pending collaborator invites addressed to this email now that the
// person has an account. Non-fatal — a failure here must not break sign-in.
async function claimCollaboratorInvites(userId: string, email: string, now: Date) {
  try {
    await db.accountCollaborator.updateMany({
      where: { email, memberId: null },
      data: { memberId: userId, linkedAt: now },
    });
  } catch (error) {
    console.error("Collaborator invite claim failed", error instanceof Error ? error.message : error);
  }
}
