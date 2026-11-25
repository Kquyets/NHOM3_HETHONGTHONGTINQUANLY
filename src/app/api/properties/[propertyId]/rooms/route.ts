import { type NextRequest } from "next/server";
import { AppError } from "../../../../../errors/app-error";
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
      return errorResponse(new AppError("VALIDATION_ERROR", "Request body must be JSON."));
    }

    const { roomNumber, monthlyRent, areaM2, floor, maxOccupants, furnitureList } = body as Record<
      string,
      unknown
    >;

    if (typeof roomNumber !== "string" || !roomNumber.trim()) {
      return errorResponse(new AppError("VALIDATION_ERROR", "roomNumber is required."));
    }
    if (typeof monthlyRent !== "number" || !Number.isFinite(monthlyRent)) {
      return errorResponse(
        new AppError("VALIDATION_ERROR", "monthlyRent is required and must be a number."),
      );
    }

    const room = await createRoom(ctx.userId, ctx.role, propertyId, {
      roomNumber,
      monthlyRent,
      areaM2: typeof areaM2 === "number" && Number.isFinite(areaM2) ? areaM2 : null,
      floor: typeof floor === "number" && Number.isFinite(floor) ? floor : null,
      maxOccupants:
        typeof maxOccupants === "number" && Number.isFinite(maxOccupants) ? maxOccupants : null,
      furnitureList: Array.isArray(furnitureList)
        ? furnitureList.filter((item): item is string => typeof item === "string")
        : null,
    });

    return successResponse({ room }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
