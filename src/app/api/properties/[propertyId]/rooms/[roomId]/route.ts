import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../../../../lib/auth/with-auth";
import { deleteRoom, getRoom, updateRoom } from "../../../../../../modules/rooms/room.service";
import { errorResponse, successResponse } from "../../../../../../utils/api-response";

type Params = { params: Promise<{ propertyId: string; roomId: string }> };

// GET /api/properties/:propertyId/rooms/:roomId
export async function GET(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { propertyId, roomId } = await params;
    const room = await getRoom(ctx.userId, ctx.role, propertyId, roomId);
    return successResponse({ room });
  } catch (error) {
    return errorResponse(error);
  }
}

// PATCH /api/properties/:propertyId/rooms/:roomId
export async function PATCH(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { propertyId, roomId } = await params;
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse(Object.assign(new Error("Request body must be JSON."), { code: "VALIDATION_ERROR" }));
    }

    const { roomNumber, monthlyRent, areaM2, status } = body as Record<string, unknown>;

    const room = await updateRoom(ctx.userId, ctx.role, propertyId, roomId, {
      roomNumber: typeof roomNumber === "string" ? roomNumber : undefined,
      monthlyRent: typeof monthlyRent === "number" ? monthlyRent : undefined,
      areaM2: areaM2 === null ? null : typeof areaM2 === "number" ? areaM2 : undefined,
      status: status === "ready" || status === "maintenance" ? status : undefined,
    });

    return successResponse({ room });
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/properties/:propertyId/rooms/:roomId
export async function DELETE(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { propertyId, roomId } = await params;
    await deleteRoom(ctx.userId, ctx.role, propertyId, roomId);
    return successResponse({ message: "Room deleted." });
  } catch (error) {
    return errorResponse(error);
  }
}
