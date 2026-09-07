import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getSessionCookieName } from "@/server/auth/config";
import { hashSessionToken } from "@/server/auth/crypto";

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${getSessionCookieName()}=`))
    ?.split("=")[1];

  if (token) {
    await db.session.updateMany({
      where: { tokenHash: hashSessionToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSessionCookieName(), "", { path: "/", maxAge: 0 });
  return response;
}
