import "server-only";

import { AuthError } from "@/server/auth/auth-service";
import { getCurrentSession } from "@/server/auth/session";

export async function requireSession() {
  const session = await getCurrentSession();
  if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in required.", 401);
  return session;
}

export async function requireAdminSession() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") throw new AuthError("ADMIN_REQUIRED", "You don't have access to this.", 403);
  return session;
}
