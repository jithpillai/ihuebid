import "server-only";

import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { AuthError } from "@/server/auth/auth-service";
import { OTP_RESEND_SECONDS, OTP_TTL_SECONDS, getAuthSecret } from "@/server/auth/config";
import {
  createOtpCode,
  hashOtp,
  hashesMatch,
  isEmail,
  normalizeEmail,
} from "@/server/auth/crypto";
import { renderContactVerifyEmail } from "@/server/email/contact-verify-template";
import { getEmailProvider } from "@/server/email/provider";
import { EmailDeliveryError } from "@/server/email/types";

export async function requestContactVerification(listingId: string, emailValue: string) {
  const email = normalizeEmail(emailValue);
  if (!isEmail(email)) throw new AuthError("INVALID_EMAIL", "Enter a valid email address.");

  const listing = await db.listing.findUnique({ where: { id: listingId }, select: { status: true, title: true } });
  if (!listing) throw new AuthError("LISTING_NOT_FOUND", "This listing could not be found.", 404);
  if (listing.status !== "LIVE") {
    throw new AuthError("LISTING_NOT_ACCEPTING_RESPONSES", "This listing isn't accepting responses right now.");
  }

  const now = new Date();
  const activeChallenge = await db.otpChallenge.findFirst({
    where: {
      normalizedEmail: email,
      purpose: "CONTACT_VERIFY",
      consumedAt: null,
      resendAvailableAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });
  if (activeChallenge) {
    throw new AuthError("RESEND_COOLDOWN", "Please wait before requesting another code.", 429);
  }

  const id = randomUUID();
  const code = createOtpCode();
  const secret = getAuthSecret();
  await db.otpChallenge.create({
    data: {
      id,
      normalizedEmail: email,
      purpose: "CONTACT_VERIFY",
      codeHash: hashOtp(id, email, code, secret),
      expiresAt: new Date(now.getTime() + OTP_TTL_SECONDS * 1000),
      resendAvailableAt: new Date(now.getTime() + OTP_RESEND_SECONDS * 1000),
    },
  });

  let provider: ReturnType<typeof getEmailProvider>;
  try {
    provider = getEmailProvider(email);
    await provider.sendTransactional({
      to: email,
      ...renderContactVerifyEmail({ code, expiresInMinutes: OTP_TTL_SECONDS / 60, listingTitle: listing.title }),
    });
  } catch (error) {
    await db.otpChallenge.deleteMany({ where: { id, consumedAt: null } });
    if (error instanceof EmailDeliveryError) {
      console.error("Contact verification email delivery failed", error.message);
      throw new AuthError("EMAIL_DELIVERY_UNAVAILABLE", "We could not send the verification email. Please try again shortly.", 503);
    }
    throw error;
  }

  return { email, developmentCode: provider.revealsDevelopmentCode ? code : undefined };
}

export async function verifyContactCodeAndOptIn(
  listingId: string,
  participantIdentityId: string,
  emailValue: string,
  code: string,
) {
  const email = normalizeEmail(emailValue);
  if (!isEmail(email) || !/^\d{6}$/.test(code)) {
    throw new AuthError("INVALID_CODE", "The verification code is invalid.");
  }

  const now = new Date();
  const challenge = await db.otpChallenge.findFirst({
    where: {
      normalizedEmail: email,
      purpose: "CONTACT_VERIFY",
      consumedAt: null,
      expiresAt: { gt: now },
      attemptCount: { lt: 5 },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) throw new AuthError("INVALID_CODE", "The verification code is invalid or expired.");

  const candidateHash = hashOtp(challenge.id, email, code, getAuthSecret());
  if (!hashesMatch(candidateHash, challenge.codeHash)) {
    await db.otpChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null, attemptCount: { lt: challenge.maxAttempts } },
      data: { attemptCount: { increment: 1 } },
    });
    throw new AuthError("INVALID_CODE", "The verification code is invalid or expired.");
  }

  return db.$transaction(async (tx) => {
    const consumed = await tx.otpChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) throw new AuthError("INVALID_CODE", "The verification code was already used.");

    return tx.notificationOptIn.upsert({
      where: { listingId_participantIdentityId: { listingId, participantIdentityId } },
      create: { listingId, participantIdentityId, email, verifiedAt: now },
      update: { email, verifiedAt: now },
    });
  });
}

export async function getNotificationOptIn(listingId: string, participantIdentityId: string | null) {
  if (!participantIdentityId) return null;
  return db.notificationOptIn.findUnique({
    where: { listingId_participantIdentityId: { listingId, participantIdentityId } },
  });
}
