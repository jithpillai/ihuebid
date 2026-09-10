import "server-only";

import { db } from "@/lib/db";
import { AuthError } from "@/server/auth/auth-service";
import { isEmail, normalizeEmail } from "@/server/auth/crypto";
import { renderCollaboratorInviteEmail } from "@/server/email/collaborator-invite-template";
import { getEmailProvider } from "@/server/email/provider";
import { EmailDeliveryError } from "@/server/email/types";

// The product only needs "one or two people" (see requirements discussion).
export const MAX_ACCOUNT_COLLABORATORS = 2;

type ManagerSession = { userId: string; user: { role: string } };

function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

// True when `session` is allowed to act on the account owned by `ownerId`:
// the owner themselves, a platform admin, or a linked collaborator.
export async function isAccountManager(ownerId: string, session: ManagerSession): Promise<boolean> {
  if (session.userId === ownerId) return true;
  if (session.user.role === "ADMIN") return true;
  const link = await db.accountCollaborator.findFirst({
    where: { ownerId, memberId: session.userId },
    select: { id: true },
  });
  return link !== null;
}

export async function assertAccountManager(ownerId: string, session: ManagerSession) {
  if (!(await isAccountManager(ownerId, session))) {
    throw new AuthError("FORBIDDEN", "You don't have access to this account.", 403);
  }
}

export type CollaboratorRow = {
  id: string;
  email: string;
  status: "ACTIVE" | "PENDING";
  memberName: string | null;
  createdAt: Date;
};

export async function listAccountCollaborators(ownerId: string): Promise<CollaboratorRow[]> {
  const rows = await db.accountCollaborator.findMany({
    where: { ownerId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      createdAt: true,
      member: { select: { displayName: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    status: row.member ? "ACTIVE" : "PENDING",
    memberName: row.member?.displayName ?? null,
    createdAt: row.createdAt,
  }));
}

export async function inviteCollaborator(ownerId: string, ownerDisplayName: string, rawEmail: unknown) {
  const email = normalizeEmail(typeof rawEmail === "string" ? rawEmail : "");
  if (!isEmail(email)) throw new AuthError("INVALID_EMAIL", "Enter a valid email address.");

  const owner = await db.user.findUnique({ where: { id: ownerId }, select: { email: true } });
  if (owner && normalizeEmail(owner.email) === email) {
    throw new AuthError("INVALID_EMAIL", "That's your own account.");
  }

  const existing = await db.accountCollaborator.findUnique({
    where: { ownerId_email: { ownerId, email } },
    select: { id: true },
  });
  if (!existing) {
    const count = await db.accountCollaborator.count({ where: { ownerId } });
    if (count >= MAX_ACCOUNT_COLLABORATORS) {
      throw new AuthError("COLLABORATOR_LIMIT", `You can add up to ${MAX_ACCOUNT_COLLABORATORS} collaborators.`, 409);
    }
  }

  // Link immediately if this email already has an account.
  const member = await db.user.findUnique({ where: { email }, select: { id: true } });
  const now = new Date();
  const row = await db.accountCollaborator.upsert({
    where: { ownerId_email: { ownerId, email } },
    create: { ownerId, email, memberId: member?.id ?? null, linkedAt: member ? now : null },
    update: member ? { memberId: member.id, linkedAt: now } : {},
    select: { id: true, email: true, memberId: true, createdAt: true, member: { select: { displayName: true } } },
  });

  try {
    await getEmailProvider(email).sendTransactional({
      to: email,
      ...renderCollaboratorInviteEmail({ ownerName: ownerDisplayName, actionUrl: `${appUrl()}/dashboard` }),
    });
  } catch (error) {
    // The invite itself is saved; a failed notification email is non-fatal.
    console.error("Collaborator invite email failed", email, error instanceof EmailDeliveryError ? error.message : error);
  }

  return {
    id: row.id,
    email: row.email,
    status: (row.memberId ? "ACTIVE" : "PENDING") as "ACTIVE" | "PENDING",
    memberName: row.member?.displayName ?? null,
    createdAt: row.createdAt,
  } satisfies CollaboratorRow;
}

export async function revokeCollaborator(ownerId: string, collaboratorId: string) {
  const result = await db.accountCollaborator.deleteMany({ where: { id: collaboratorId, ownerId } });
  if (result.count === 0) throw new AuthError("NOT_FOUND", "That collaborator could not be found.", 404);
}

// Note: linking pending invites on sign-in is done inline in the auth services
// (auth-service.ts / google-auth-service.ts) to avoid an import cycle.

export type ManagedAccount = {
  id: string;
  displayName: string;
  handle: string | null;
  brandName: string | null;
  location: string | null;
  contactPhone: string | null;
};

// Accounts (other than their own) that `session` can act on.
export async function listManagedAccounts(session: ManagerSession): Promise<ManagedAccount[]> {
  const rows = await db.accountCollaborator.findMany({
    where: { memberId: session.userId },
    orderBy: { createdAt: "asc" },
    select: {
      owner: {
        select: {
          id: true,
          displayName: true,
          profile: { select: { handle: true, brandName: true, location: true, contactPhone: true } },
        },
      },
    },
  });
  return rows.map((row) => ({
    id: row.owner.id,
    displayName: row.owner.displayName,
    handle: row.owner.profile?.handle ?? null,
    brandName: row.owner.profile?.brandName ?? null,
    location: row.owner.profile?.location ?? null,
    contactPhone: row.owner.profile?.contactPhone ?? null,
  }));
}

type FullSession = ManagerSession & {
  user: { displayName: string; profile: { handle: string | null; brandName: string | null } | null };
};

export type CreatableAccount = { id: string; label: string; handle: string };

// Accounts under which `session` may create a new listing — i.e. that have a
// public handle (you can't publish without one).
export async function listCreatableAccounts(session: FullSession): Promise<CreatableAccount[]> {
  const accounts: CreatableAccount[] = [];
  if (session.user.profile?.handle) {
    accounts.push({
      id: session.userId,
      label: session.user.profile.brandName || session.user.displayName,
      handle: session.user.profile.handle,
    });
  }
  for (const managed of await listManagedAccounts(session)) {
    if (managed.handle) {
      accounts.push({ id: managed.id, label: managed.brandName || managed.displayName, handle: managed.handle });
    }
  }
  return accounts;
}
