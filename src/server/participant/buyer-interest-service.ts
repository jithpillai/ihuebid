import "server-only";

import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import {
  normalizeContactPhone,
  normalizeEventNotificationEmails,
} from "@/server/account/profile-service";
import { AuthError } from "@/server/auth/auth-service";
import { OTP_RESEND_SECONDS, OTP_TTL_SECONDS, getAuthSecret } from "@/server/auth/config";
import { createOtpCode, hashOtp, hashesMatch, isEmail, normalizeEmail } from "@/server/auth/crypto";
import { renderBuyerInterestAlertEmail } from "@/server/email/buyer-interest-alert-template";
import { renderBuyerInterestVerifyEmail } from "@/server/email/buyer-interest-verify-template";
import { getEmailProvider } from "@/server/email/provider";
import { EmailDeliveryError } from "@/server/email/types";
import { normalizeContributorName, snapResponseValue } from "@/server/listings/response-value";

const PURPOSE = "BUYER_INTEREST_VERIFY" as const;

function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

type BuyerContact = { name: string; email: string; phone: string };

// Validate the shared name/email/phone shape once. Throws an AuthError the
// client can surface; returns the normalized values otherwise.
function normalizeBuyerContact(input: { name: unknown; email: unknown; phone: unknown }): BuyerContact {
  const email = normalizeEmail(typeof input.email === "string" ? input.email : "");
  if (!isEmail(email)) throw new AuthError("INVALID_EMAIL", "Enter a valid email address.");

  const name = normalizeContributorName(input.name);
  if (!name) throw new AuthError("INVALID_NAME", "Enter your name.");

  const phone = normalizeContactPhone(input.phone);
  if (!phone) throw new AuthError("INVALID_PHONE", "Enter a valid phone number.");

  return { name, email, phone };
}

export async function requestBuyerInterestVerification(
  listingId: string,
  input: { name: unknown; email: unknown; phone: unknown },
) {
  const { email } = normalizeBuyerContact(input);

  const listing = await db.listing.findUnique({ where: { id: listingId }, select: { status: true, title: true } });
  if (!listing) throw new AuthError("LISTING_NOT_FOUND", "This listing could not be found.", 404);
  if (listing.status !== "LIVE") {
    throw new AuthError("LISTING_NOT_ACCEPTING_RESPONSES", "This listing isn't accepting responses right now.");
  }

  const now = new Date();
  const activeChallenge = await db.otpChallenge.findFirst({
    where: { normalizedEmail: email, purpose: PURPOSE, consumedAt: null, resendAvailableAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });
  if (activeChallenge) {
    throw new AuthError("RESEND_COOLDOWN", "Please wait before requesting another code.", 429);
  }

  const id = randomUUID();
  const code = createOtpCode();
  await db.otpChallenge.create({
    data: {
      id,
      normalizedEmail: email,
      purpose: PURPOSE,
      codeHash: hashOtp(id, email, code, getAuthSecret()),
      expiresAt: new Date(now.getTime() + OTP_TTL_SECONDS * 1000),
      resendAvailableAt: new Date(now.getTime() + OTP_RESEND_SECONDS * 1000),
    },
  });

  let provider: ReturnType<typeof getEmailProvider>;
  try {
    provider = getEmailProvider(email);
    await provider.sendTransactional({
      to: email,
      ...renderBuyerInterestVerifyEmail({ code, expiresInMinutes: OTP_TTL_SECONDS / 60, listingTitle: listing.title }),
    });
  } catch (error) {
    await db.otpChallenge.deleteMany({ where: { id, consumedAt: null } });
    if (error instanceof EmailDeliveryError) {
      console.error("Buyer interest verification email delivery failed", error.message);
      throw new AuthError("EMAIL_DELIVERY_UNAVAILABLE", "We could not send the verification email. Please try again shortly.", 503);
    }
    throw error;
  }

  return { email, developmentCode: provider.revealsDevelopmentCode ? code : undefined };
}

export async function verifyBuyerInterestAndRecord(
  listingId: string,
  participantIdentityId: string,
  input: { name: unknown; email: unknown; phone: unknown; code: unknown; value: unknown },
) {
  const { name, email, phone } = normalizeBuyerContact(input);
  const code = typeof input.code === "string" ? input.code : "";
  if (!/^\d{6}$/.test(code)) throw new AuthError("INVALID_CODE", "The verification code is invalid.");
  if (typeof input.value !== "number" || !Number.isFinite(input.value)) {
    throw new AuthError("INVALID_VALUE", "Set your estimate before submitting.");
  }
  const rawValue = input.value;

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: {
      status: true,
      title: true,
      publicId: true,
      currency: true,
      responseMin: true,
      responseMax: true,
      responseIncrement: true,
      creator: {
        select: {
          displayName: true,
          email: true,
          profile: { select: { handle: true, brandName: true, eventNotificationEmails: true } },
        },
      },
    },
  });
  if (!listing) throw new AuthError("LISTING_NOT_FOUND", "This listing could not be found.", 404);
  if (listing.status !== "LIVE") {
    throw new AuthError("LISTING_NOT_ACCEPTING_RESPONSES", "This listing isn't accepting responses right now.");
  }

  const now = new Date();
  const challenge = await db.otpChallenge.findFirst({
    where: { normalizedEmail: email, purpose: PURPOSE, consumedAt: null, expiresAt: { gt: now }, attemptCount: { lt: 5 } },
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

  const value = snapResponseValue(
    rawValue,
    Number(listing.responseMin),
    Number(listing.responseMax),
    Number(listing.responseIncrement),
  );

  const { alreadyRecorded } = await db.$transaction(async (tx) => {
    const consumed = await tx.otpChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) throw new AuthError("INVALID_CODE", "The verification code was already used.");

    const existing = await tx.notificationOptIn.findUnique({
      where: { listingId_participantIdentityId: { listingId, participantIdentityId } },
      select: { readyToBuyAt: true },
    });
    const wasReadyToBuy = existing?.readyToBuyAt != null;

    // The estimate is recorded as a named public estimate (contributorName set).
    await tx.response.upsert({
      where: { listingId_participantIdentityId: { listingId, participantIdentityId } },
      create: { listingId, participantIdentityId, value, contributorName: name, mode: "ANONYMOUS_VALUATION" },
      update: { value, contributorName: name, revisionCount: { increment: 1 } },
    });
    await tx.participantIdentity.update({ where: { id: participantIdentityId }, data: { displayName: name } });

    await tx.notificationOptIn.upsert({
      where: { listingId_participantIdentityId: { listingId, participantIdentityId } },
      create: { listingId, participantIdentityId, email, verifiedAt: now, buyerName: name, buyerPhone: phone, readyToBuyAt: now },
      // Once readyToBuyAt is set it is never changed — the buy signal can't be undone.
      update: wasReadyToBuy
        ? { email, verifiedAt: now }
        : { email, verifiedAt: now, buyerName: name, buyerPhone: phone, readyToBuyAt: now },
    });

    return { alreadyRecorded: wasReadyToBuy };
  });

  if (!alreadyRecorded) {
    await sendBuyerInterestAlert({
      listingTitle: listing.title,
      listingUrl: listing.creator.profile?.handle
        ? `${appUrl()}/${listing.creator.profile.handle}/${listing.publicId}`
        : appUrl(),
      currency: listing.currency,
      estimateValue: value,
      buyerName: name,
      buyerEmail: email,
      buyerPhone: phone,
      creatorEmail: listing.creator.email,
      creatorDisplayName: listing.creator.displayName,
      eventEmails: normalizeEventNotificationEmails(listing.creator.profile?.eventNotificationEmails),
    });
  }

  return { alreadyRecorded, value };
}

async function sendBuyerInterestAlert(args: {
  listingTitle: string;
  listingUrl: string;
  currency: string;
  estimateValue: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  creatorEmail: string;
  creatorDisplayName: string;
  eventEmails: string[];
}) {
  const recipients = Array.from(
    new Set([...args.eventEmails, args.creatorEmail].map((email) => email.toLowerCase())),
  );
  if (recipients.length === 0) return;

  const estimateFormatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: args.currency,
    maximumFractionDigits: 0,
  }).format(args.estimateValue);

  const message = renderBuyerInterestAlertEmail({
    listingTitle: args.listingTitle,
    listingUrl: args.listingUrl,
    buyerName: args.buyerName,
    buyerEmail: args.buyerEmail,
    buyerPhone: args.buyerPhone,
    estimateFormatted,
    creatorDisplayName: args.creatorDisplayName,
  });

  for (const recipient of recipients) {
    try {
      await getEmailProvider(recipient).sendTransactional({ to: recipient, ...message });
    } catch (error) {
      // One recipient's failure must not block the others or the submission.
      console.error("Buyer interest alert failed", recipient, error instanceof Error ? error.message : "Unknown error");
    }
  }
}

export async function getBuyerInterest(listingId: string, participantIdentityId: string | null) {
  if (!participantIdentityId) return null;
  return db.notificationOptIn.findUnique({
    where: { listingId_participantIdentityId: { listingId, participantIdentityId } },
    select: { readyToBuyAt: true },
  });
}
