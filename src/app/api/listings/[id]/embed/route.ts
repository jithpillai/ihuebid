import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { getCurrentSession } from "@/server/auth/session";
import { removeListingEmbed, setListingEmbed } from "@/server/listings/listing-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in to add a video.", 401);
    const { id } = await params;
    const body = await request.json() as { url?: unknown };
    if (typeof body.url !== "string") throw new AuthError("INVALID_EMBED", "Enter a YouTube video link.");
    await setListingEmbed(session, id, body.url);
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const session = await getCurrentSession();
    if (!session) throw new AuthError("AUTH_REQUIRED", "Sign in to remove this video.", 401);
    const { id } = await params;
    await removeListingEmbed(session, id);
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
