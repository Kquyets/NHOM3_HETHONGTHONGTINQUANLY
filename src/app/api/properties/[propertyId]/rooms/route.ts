import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../../../lib/auth/with-auth";
import { createRoom, listRooms } from "../../../../../modules/rooms/room.service";
import { errorResponse, successResponse } from "../../../../../utils/api-response";

type Params = { params: Promise<{ propertyId: string }> };

// GET /api/properties/:propertyId/rooms
export async function GET(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { propertyId } = await params;
    const data = await listRooms(ctx.userId, ctx.role, propertyId);
    return successResponse({ rooms: data, total: data.length });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/properties/:propertyId/rooms
export async function POST(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { propertyId } = await params;
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse(Object.assign(new Error("Request body must be JSON."), { code: "VALIDATION_ERROR" }));
    }

    const { roomNumber, monthlyRent, areaM2 } = body as Record<string, unknown>;

    if (typeof roomNumber !== "string") {
      return errorResponse(Object.assign(new Error("roomNumber is required."), { code: "VALIDATION_ERROR" }));
    }
    if (typeof monthlyRent !== "number") {
      return errorResponse(Object.assign(new Error("monthlyRent is required and must be a number."), { code: "VALIDATION_ERROR" }));
    }

    const room = await createRoom(ctx.userId, ctx.role, propertyId, {
      roomNumber,
      monthlyRent,
      areaM2: typeof areaM2 === "number" ? areaM2 : null,
    });

    return successResponse({ room }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
