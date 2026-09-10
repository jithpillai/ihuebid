import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { getCurrentSession } from "@/server/auth/session";
import { updateProfileDetails } from "@/server/account/profile-service";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in to update your profile.", 401);

    const body = await request.json() as {
      bio?: unknown;
      location?: unknown;
      brandName?: unknown;
      contactPhone?: unknown;
      links?: unknown;
    };

    const profile = await updateProfileDetails(session.userId, {
      bio: typeof body.bio === "string" ? body.bio : undefined,
      location: typeof body.location === "string" ? body.location : undefined,
      brandName: typeof body.brandName === "string" ? body.brandName : undefined,
      contactPhone: typeof body.contactPhone === "string" ? body.contactPhone : undefined,
      links: body.links,
    });
    return Response.json({ ok: true, profile });
  } catch (error) {
    return authErrorResponse(error);
  }
}
