import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { getCurrentSession } from "@/server/auth/session";
import { addReferenceLink } from "@/server/listings/listing-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in to add a reference link.", 401);
    const { id } = await params;
    const body = await request.json() as { label?: unknown; url?: unknown };
    if (typeof body.label !== "string" || typeof body.url !== "string") {
      throw new AuthError("INVALID_LINK", "A label and URL are required.");
    }
    let url: URL;
    try {
      url = new URL(body.url);
    } catch {
      throw new AuthError("INVALID_LINK", "Enter a valid URL.");
    }
    const link = await addReferenceLink(session, id, body.label, url.toString());
    return Response.json({ ok: true, link });
  } catch (error) {
    return authErrorResponse(error);
  }
}
