import "server-only";

import { db } from "@/lib/db";
import type { RateLimitAction } from "@/generated/prisma/client";
import { AuthError } from "@/server/auth/auth-service";
import { getAuthSecret } from "@/server/auth/config";
import { hashNetworkValue } from "@/server/auth/crypto";
import { requestIp } from "@/server/auth/http";

// Same shape as ihueRating's internal-testers rate limiter: count recent
// rows for (action, ipHash) within the window, reject over threshold, else
// record this attempt. Fails open (no IP available) rather than blocking a
// legitimate request over a missing header — this is a baseline control, not
// the only line of defense.
export async function checkRateLimit(
  action: RateLimitAction,
  request: Request,
  { windowMinutes, maxAttempts }: { windowMinutes: number; maxAttempts: number },
) {
  const ip = requestIp(request);
  if (!ip) return;

  const ipHash = hashNetworkValue(ip, getAuthSecret());
  const since = new Date(Date.now() - windowMinutes * 60_000);
  const recentAttempts = await db.rateLimitAttempt.count({ where: { action, ipHash, createdAt: { gte: since } } });
  if (recentAttempts >= maxAttempts) {
    throw new AuthError("RATE_LIMITED", "Too many attempts. Please try again later.", 429);
  }

  await db.rateLimitAttempt.create({ data: { action, ipHash } });
}
