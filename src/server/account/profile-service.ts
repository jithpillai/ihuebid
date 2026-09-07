import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { AuthError } from "@/server/auth/auth-service";
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

export async function getPublicProfileByHandle(handle: string) {
  return db.userProfile.findUnique({
    where: { handle: normalizeHandle(handle) },
    include: { user: true },
  });
}
