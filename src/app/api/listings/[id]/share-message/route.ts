import { requireSession } from "@/server/auth/admin";
import { AuthError } from "@/server/auth/auth-service";
import { assertSameOrigin, authErrorResponse } from "@/server/auth/http";
import { setListingShareMessage } from "@/server/listings/listing-service";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    const { id } = await params;
    const body = await request.json() as { message?: unknown };
    if (typeof body.message !== "string" || !body.message.trim()) {
      throw new AuthError("MESSAGE_REQUIRED", "Enter a message to save.");
    }
    const result = await setListingShareMessage(session, id, body.message);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    const { id } = await params;
    const result = await setListingShareMessage(session, id, null);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return authErrorResponse(error);
  }
}
