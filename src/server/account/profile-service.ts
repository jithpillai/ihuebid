import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { AuthError } from "@/server/auth/auth-service";
import { isEmail, normalizeEmail } from "@/server/auth/crypto";
import { isReservedHandle } from "@/server/account/reserved-handles";

const HANDLE_PATTERN = /^[a-z0-9_-]+$/;

export function normalizeHandle(rawHandle: string) {
  return rawHandle.trim().toLowerCase();
}

export type HandleValidationResult =
  | { ok: true; handle: string }
  | { ok: false; code: "INVALID_HANDLE" | "HANDLE_RESERVED"; message: string };

export function validateHandleFormat(rawHandle: string): HandleValidationResult {
  const handle = normalizeHandle(rawHandle);
  if (handle.length < 3 || handle.length > 40) {
    return { ok: false, code: "INVALID_HANDLE", message: "Handle must be 3–40 characters." };
  }
  if (!HANDLE_PATTERN.test(handle)) {
    return { ok: false, code: "INVALID_HANDLE", message: "Use only lowercase letters, numbers, underscores, and hyphens." };
  }
  if (isReservedHandle(handle)) {
    return { ok: false, code: "HANDLE_RESERVED", message: "That handle is reserved and can't be used." };
  }
  return { ok: true, handle };
}

export async function setUserHandle(userId: string, rawHandle: string) {
  const result = validateHandleFormat(rawHandle);
  if (!result.ok) {
    throw new AuthError(result.code, result.message, result.code === "HANDLE_RESERVED" ? 409 : 400);
  }
  const { handle } = result;

  try {
    return await db.userProfile.upsert({
      where: { userId },
      create: { userId, handle },
      update: { handle },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AuthError("HANDLE_TAKEN", "That handle is already taken.", 409);
    }
    throw error;
  }
}

// --- Optional public profile details ---------------------------------------

export type ProfileLinks = {
  website?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
};

const PROFILE_LINK_KEYS = ["website", "instagram", "facebook", "youtube"] as const;
const MAX_LINK_LENGTH = 300;

// Keep only well-formed http(s) URLs, one per known network. Anything else is
// dropped silently so a stray value never ends up rendered as a link.
export function normalizeProfileLinks(raw: unknown): ProfileLinks {
  const source = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const links: ProfileLinks = {};
  for (const key of PROFILE_LINK_KEYS) {
    const value = typeof source[key] === "string" ? source[key].trim() : "";
    if (!value || value.length > MAX_LINK_LENGTH) continue;
    if (!/^https?:\/\/\S+$/i.test(value)) continue;
    links[key] = value;
  }
  return links;
}

// Strip to a single optional leading "+" and digits. Null unless it looks like
// a real phone number (7–15 digits, E.164's range).
export function normalizeContactPhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return hasPlus ? `+${digits}` : digits;
}

// Digits-only form for a wa.me / api.whatsapp.com link. A bare 10-digit number
// is assumed to be Indian (+91) since that's the product's market.
export function toWhatsAppDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

// Account-wide "event notification" recipients — alerted when a participant
// marks "Interested to Buy" on any of the creator's listings. Same
// JSON-blob-plus-pure-normalizer shape as `links`.
export const MAX_EVENT_NOTIFICATION_EMAILS = 10;

export function normalizeEventNotificationEmails(raw: unknown): string[] {
  const source = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const entry of source) {
    if (typeof entry !== "string") continue;
    const email = normalizeEmail(entry);
    if (!isEmail(email) || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
    if (emails.length >= MAX_EVENT_NOTIFICATION_EMAILS) break;
  }
  return emails;
}

export async function setEventNotificationEmails(userId: string, raw: unknown) {
  const emails = normalizeEventNotificationEmails(raw);
  const profile = await db.userProfile.upsert({
    where: { userId },
    create: { userId, eventNotificationEmails: emails },
    update: { eventNotificationEmails: emails },
    select: { eventNotificationEmails: true },
  });
  return { emails: normalizeEventNotificationEmails(profile.eventNotificationEmails) };
}

export type ProfileDetailsInput = {
  bio?: string;
  location?: string;
  brandName?: string;
  contactPhone?: string;
  links?: unknown;
};

function trimToNull(value: string | undefined, max: number): string | null {
  const trimmed = (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  return trimmed || null;
}

export async function updateProfileDetails(userId: string, input: ProfileDetailsInput) {
  const data = {
    bio: (input.bio ?? "").trim().slice(0, 500) || null,
    location: trimToNull(input.location, 200),
    brandName: trimToNull(input.brandName, 120),
    contactPhone: normalizeContactPhone(input.contactPhone),
    links: normalizeProfileLinks(input.links) as Prisma.InputJsonValue,
  };
  return db.userProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
    select: { bio: true, location: true, brandName: true, contactPhone: true, links: true },
  });
}

export const MAX_DISPLAY_NAME_LENGTH = 120;

export function normalizeDisplayName(rawName: string): string {
  return rawName.replace(/\s+/g, " ").trim().slice(0, MAX_DISPLAY_NAME_LENGTH);
}

export async function setUserDisplayName(userId: string, rawName: string) {
  const displayName = normalizeDisplayName(rawName);
  if (displayName.length < 2) {
    throw new AuthError("INVALID_DISPLAY_NAME", "Your name must be at least 2 characters.", 400);
  }
  return db.user.update({
    where: { id: userId },
    data: { displayName },
    select: { displayName: true },
  });
}

export async function getPublicProfileByHandle(handle: string) {
  return db.userProfile.findUnique({
    where: { handle: normalizeHandle(handle) },
    include: { user: true },
  });
}
